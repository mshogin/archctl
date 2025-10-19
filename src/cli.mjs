#!/usr/bin/env node

/*
DocHub Validator CLI - Command-line interface
Validates DocHub architecture manifests

Copyright (C) 2024
Licensed under the Apache License, Version 2.0
*/

import { Command } from 'commander';
import dotenv from 'dotenv';
import { validateManifest } from './validator.mjs';
import { format } from './formatter.mjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file if exists
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// Read package.json for version
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create CLI program
const program = new Command();

program
    .name('dochub-validate')
    .description('Validate DocHub architecture manifests')
    .version(packageJson.version)
    .option('-w, --workspace <dir>', 'Workspace directory containing manifests', process.cwd())
    .option('-r, --root <file>', 'Root manifest file name', 'dochub.yaml')
    .option('-f, --format <type>', 'Output format: text, json', 'text')
    .option('--no-color', 'Disable colored output')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('--pretty', 'Pretty print JSON output (only for JSON format)', true)
    .option('-o, --output <file>', 'Write output to file instead of stdout')
    .action(async (options) => {
        try {
            // Validate options
            if (!['text', 'json'].includes(options.format.toLowerCase())) {
                console.error(`Error: Invalid format "${options.format}". Must be "text" or "json".`);
                process.exit(2);
            }

            // Suppress DocHub internal logging unless verbose mode
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;

            if (!options.verbose) {
                // Redirect internal logs to /dev/null
                console.log = () => {};
                console.error = () => {};
            }

            // Run validation
            if (options.verbose) {
                originalConsoleLog('Starting validation...');
                originalConsoleLog(`Workspace: ${options.workspace}`);
                originalConsoleLog(`Root manifest: ${options.root}`);
                originalConsoleLog('');
            }

            const result = await validateManifest({
                workspace: options.workspace,
                rootManifest: options.root,
                verbose: options.verbose
            });

            // Restore console
            console.log = originalConsoleLog;
            console.error = originalConsoleError;

            // Format output
            const output = format(result, options.format, {
                color: options.color,
                verbose: options.verbose,
                pretty: options.pretty
            });

            // Write output
            if (options.output) {
                fs.writeFileSync(options.output, output, 'utf8');
                if (options.verbose) {
                    console.log(`Output written to: ${options.output}`);
                }
            } else {
                console.log(output);
            }

            // Exit with appropriate code
            if (result.success) {
                process.exit(0);
            } else {
                // Check if we have loading errors vs validation errors
                const hasLoadingErrors = result.stats.loadingErrors > 0;
                process.exit(hasLoadingErrors ? 2 : 1);
            }

        } catch (error) {
            console.error('Fatal error:', error.message);
            if (options.verbose) {
                console.error(error.stack);
            }
            process.exit(2);
        }
    });

// Add examples to help
program.addHelpText('after', `

Examples:
  $ dochub-validate
    Validate current directory (looks for dochub.yaml)

  $ dochub-validate --workspace /path/to/manifests
    Validate specific workspace directory

  $ dochub-validate --root my-manifest.yaml
    Use custom root manifest file

  $ dochub-validate --format json --output report.json
    Generate JSON validation report

  $ dochub-validate --verbose
    Enable detailed logging

  $ dochub-validate --no-color
    Disable colored output (useful for CI/CD)

Exit codes:
  0 - Validation passed
  1 - Validation failed (architecture issues found)
  2 - Loading/parsing errors or fatal error

Environment variables:
  VUE_APP_DOCHUB_ROOT_MANIFEST     Path to root manifest
  VUE_APP_DOCHUB_METAMODEL         Custom metamodel file
  VUE_APP_DOCHUB_ROLES_MODEL       Enable roles mode
  VUE_APP_DOCHUB_ROLES             Path to roles configuration

For more information, visit: https://dochub.info
`);

// Parse command line arguments
program.parse();
