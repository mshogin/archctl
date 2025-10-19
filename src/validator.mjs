/*
DocHub Validator - Core validation orchestration
Reuses DocHub's validation engine to validate architecture manifests

Copyright (C) 2024
Licensed under the Apache License, Version 2.0
*/

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize DocHub environment with custom paths
 * Must be called BEFORE importing any DocHub modules
 */
function initializeDocHubEnvironment(workspaceDir) {
    const resolvedWorkspace = path.resolve(workspaceDir);

    // Set global paths before DocHub modules are loaded
    global.$paths = {
        public: resolvedWorkspace,
        dist: resolvedWorkspace,
        file_storage: resolvedWorkspace
    };

    global.$listeners = {
        onFoundLoadingError: null
    };

    global.$roles = {
        MODE: process.env.VUE_APP_DOCHUB_ROLES_MODEL,
        URI: process.env.VUE_APP_DOCHUB_ROLES
    };

    // Set default environment variables if not provided
    if (!process.env.VUE_APP_DOCHUB_ROOT_MANIFEST) {
        process.env.VUE_APP_DOCHUB_ROOT_MANIFEST = 'dochub.yaml';
    }
}

/**
 * Get the path to DocHub installation
 * Tries: local symlink -> git submodule -> node_modules -> sibling directory
 */
function getDocHubPath() {
    const possiblePaths = [
        path.resolve(__dirname, '../dochub'),                    // Git submodule
        path.resolve(__dirname, '../node_modules/dochub'),       // npm package (future)
        path.resolve(__dirname, '../../DocHub'),                 // Sibling directory for development
    ];

    for (const dochubPath of possiblePaths) {
        if (fs.existsSync(dochubPath)) {
            return dochubPath;
        }
    }

    throw new Error(
        'DocHub not found. Please ensure DocHub is available via:\n' +
        '  - Git submodule: git submodule update --init --recursive\n' +
        '  - Sibling directory: ../DocHub\n' +
        '  - Symlink: ln -s /path/to/DocHub dochub'
    );
}

/**
 * Main validation function
 * @param {Object} options - Validation options
 * @param {string} options.workspace - Workspace directory containing manifests
 * @param {string} options.rootManifest - Path to root manifest file
 * @param {boolean} options.verbose - Enable verbose logging
 * @returns {Promise<Object>} Validation result with manifest and problems
 */
export async function validateManifest(options = {}) {
    const {
        workspace = process.cwd(),
        rootManifest = 'dochub.yaml',
        verbose = false
    } = options;

    const workspaceDir = path.resolve(workspace);
    const manifestPath = path.resolve(workspaceDir, rootManifest);

    // Verify workspace and manifest exist
    if (!fs.existsSync(workspaceDir)) {
        throw new Error(`Workspace directory not found: ${workspaceDir}`);
    }

    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Root manifest not found: ${manifestPath}`);
    }

    // NOTE: We have a copy of metamodel in ../metamodel/base.yaml for reference,
    // but currently we use DocHub's built-in metamodel because of path resolution issues.
    // DocHub expects metamodel paths to be relative to workspace, which doesn't work for CLI.
    // TODO: Find a way to use custom metamodel without path issues

    // Don't set VUE_APP_DOCHUB_METAMODEL - let DocHub use its default
    if (verbose) {
        console.log('Using DocHub built-in metamodel');
    }

    // Initialize environment BEFORE importing DocHub modules
    initializeDocHubEnvironment(workspaceDir);

    // Set root manifest path - use relative path from workspace, not absolute path
    // DocHub expects this to be relative to the workspace directory
    process.env.VUE_APP_DOCHUB_ROOT_MANIFEST = rootManifest;

    // Get DocHub path
    const dochubPath = getDocHubPath();

    if (verbose) {
        console.log(`Using DocHub from: ${dochubPath}`);
        console.log(`Workspace: ${workspaceDir}`);
        console.log(`Root manifest: ${manifestPath}`);
    }

    // Dynamically import DocHub modules after environment is set
    const manifestParserModule = await import(`${dochubPath}/src/global/manifest/parser.mjs`);
    const manifestParser = manifestParserModule.default;

    const cacheModule = await import(`${dochubPath}/src/backend/storage/cache.mjs`);
    const cache = cacheModule.default;

    const validatorsModule = await import(`${dochubPath}/src/global/rules/validators.mjs`);
    const validators = validatorsModule.default;

    const datasetsHelperModule = await import(`${dochubPath}/src/backend/helpers/datasets.mjs`);
    const datasetsHelper = datasetsHelperModule.default;

    const entitiesModule = await import(`${dochubPath}/src/backend/entities/entities.mjs`);
    const entities = entitiesModule.default;

    const jsonataDriverModule = await import(`${dochubPath}/src/global/jsonata/driver.mjs`);
    const jsonataDriver = jsonataDriverModule.default;

    const jsonataFunctionsModule = await import(`${dochubPath}/src/global/jsonata/functions.mjs`);
    const jsonataFunctions = jsonataFunctionsModule.default;

    // Assign cache to parser
    manifestParser.cache = cache;

    // Setup logging callbacks - suppress internal logging
    manifestParser.onError = (error) => {
        // Suppress error logging unless verbose mode
        if (verbose) {
            console.error(`Error loading manifest: ${error}`);
        }
    };

    manifestParser.onStartReload = () => {
        // Suppress unless verbose
        if (verbose) {
            console.log('Starting manifest reload...');
        }
    };

    manifestParser.onReloaded = () => {
        // Suppress unless verbose
        if (verbose) {
            console.log('Manifest reloaded successfully');
        }
    };

    // Clear error cache
    cache.errorClear();

    try {
        // Load manifest - replicates manager.mjs::reloadManifest()
        await manifestParser.clean();
        await manifestParser.startLoad();
        await manifestParser.import('file:///$root$');
        await manifestParser.checkAwaitedPackages();
        await manifestParser.checkLoaded();
        await manifestParser.stopLoad();

        const manifest = manifestParser.manifest;

        // Process entities
        entities(manifest);

        // Collect loading errors
        const problems = Object.keys(cache.errors || {}).map((key) => cache.errors[key]) || [];

        // Setup custom JSONata functions
        const customFunctions = jsonataFunctions(jsonataDriver, manifest.functions || {});
        jsonataDriver.customFunctions = () => customFunctions;

        // Create app-like object for datasets helper
        const app = {
            storage: {
                manifest: manifest,
                md5Map: {},
                roleId: 'default'
            }
        };

        // Create datasets using backend helper
        const datasets = datasetsHelper(app);

        // Run validators - replicates validators.mjs
        const validatorResults = [];
        const validatorCount = Object.keys(manifest?.rules?.validators || {}).length;
        let completedCount = 0;

        if (verbose) {
            console.log(`Found ${validatorCount} validators to execute`);
        }

        const validationPromise = new Promise((resolve) => {
            if (validatorCount === 0) {
                if (verbose) {
                    console.log('No validators defined, skipping validation');
                }
                resolve();
                return;
            }

            const onValidatorComplete = (validator) => {
                validatorResults.push(validator);
                completedCount++;

                if (verbose) {
                    console.log(`Validator [${validator.id}] completed: ${validator.items?.length || 0} issues found`);
                }

                if (completedCount >= validatorCount) {
                    resolve();
                }
            };

            validators(
                datasets,
                manifest,
                onValidatorComplete,  // success callback
                onValidatorComplete   // reject callback
            );

            // Safety timeout - if validators don't complete in 10 seconds, continue anyway
            setTimeout(() => {
                if (completedCount < validatorCount) {
                    if (verbose) {
                        console.log(`Warning: Only ${completedCount}/${validatorCount} validators completed before timeout`);
                    }
                    resolve();
                }
            }, 10000);
        });

        // Wait for validators to complete
        await validationPromise;

        // Combine problems
        const allProblems = [...problems, ...validatorResults];

        // Filter to get real validation issues (not loading errors or empty validators)
        const realValidationIssues = validatorResults.filter(v =>
            v.items && v.items.length > 0 && !v.id.startsWith('$error')
        );

        if (verbose) {
            console.log(`Validation complete. Found ${realValidationIssues.length} real validation issues.`);
        }

        return {
            success: realValidationIssues.length === 0,
            manifest: {
                loaded: true,
                path: manifestPath,
                workspace: workspaceDir
            },
            problems: allProblems,
            stats: {
                totalIssues: allProblems.length,
                loadingErrors: problems.length,
                validationErrors: realValidationIssues.length
            }
        };

    } catch (error) {
        // Handle critical errors
        return {
            success: false,
            manifest: {
                loaded: false,
                path: manifestPath,
                workspace: workspaceDir
            },
            problems: [{
                id: 'critical-error',
                title: 'Critical Error',
                error: error.message,
                stack: verbose ? error.stack : undefined
            }],
            stats: {
                totalIssues: 1,
                loadingErrors: 1,
                validationErrors: 0
            }
        };
    }
}

export default validateManifest;
