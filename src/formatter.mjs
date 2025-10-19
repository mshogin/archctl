/*
DocHub Validator - Output formatting
Formats validation results for console or JSON output

Copyright (C) 2024
Licensed under the Apache License, Version 2.0
*/

import chalk from 'chalk';

/**
 * Format validation result as human-readable text
 * @param {Object} result - Validation result
 * @param {Object} options - Formatting options
 * @returns {string} Formatted text output
 */
export function formatText(result, options = {}) {
    const { color = true, verbose = false } = options;
    const lines = [];

    // Disable chalk if color is false
    if (!color) {
        chalk.level = 0;
    }

    // Header
    lines.push('');
    lines.push(chalk.bold('DocHub Architecture Validation'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    // Manifest info
    if (result.manifest.loaded) {
        lines.push(chalk.green('✓') + ' Manifest loaded successfully');
        lines.push(chalk.gray(`  Workspace: ${result.manifest.workspace}`));
        lines.push(chalk.gray(`  Root: ${result.manifest.path}`));
    } else {
        lines.push(chalk.red('✗') + ' Failed to load manifest');
        lines.push(chalk.gray(`  Path: ${result.manifest.path}`));
    }
    lines.push('');

    // Statistics - only show real validation errors
    if (result.stats && result.stats.validationErrors > 0) {
        lines.push(chalk.bold('Summary:'));
        lines.push(`  Validation issues: ${result.stats.validationErrors}`);
        lines.push('');
    }

    // Problems - filter out loading errors and empty validators
    const realProblems = (result.problems || []).filter(problem => {
        // Skip loading/network errors (these are internal DocHub fallback attempts)
        if (problem.id && problem.id.startsWith('$error')) {
            return false;
        }

        // Skip validators with no actual items
        if (!problem.items || problem.items.length === 0) {
            return false;
        }

        // Skip if only has critical error (not validation issues)
        if (problem.error && (!problem.items || problem.items.length === 0)) {
            return false;
        }

        return true;
    });

    if (realProblems.length > 0) {
        lines.push(chalk.bold.red(`Found ${realProblems.length} validation issue(s):`));
        lines.push('');

        realProblems.forEach((problem, index) => {
            // Validator header
            const validatorId = problem.id || 'unknown';
            const validatorTitle = problem.title || 'Untitled validator';

            lines.push(chalk.yellow(`[${validatorId}]`) + ' ' + chalk.bold(validatorTitle));

            // Critical error
            if (problem.error) {
                lines.push(chalk.red(`  ✗ ${problem.error}`));
                if (verbose && problem.stack) {
                    lines.push(chalk.gray(problem.stack.split('\n').map(l => `    ${l}`).join('\n')));
                }
            }

            // Validation items
            if (problem.items && problem.items.length > 0) {
                problem.items.forEach((item) => {
                    const title = item.title || 'Issue';
                    lines.push(chalk.red(`  ✗ ${title}`));

                    if (item.location) {
                        lines.push(chalk.gray(`    Location: ${item.location}`));
                    }

                    if (item.description && verbose) {
                        lines.push(chalk.gray(`    Description: ${item.description}`));
                    }

                    if (item.correction) {
                        lines.push(chalk.cyan(`    Fix: ${item.correction}`));
                    }

                    if (item.cause) {
                        lines.push(chalk.gray(`    Cause: ${item.cause}`));
                    }
                });
            }

            // Add spacing between validators
            if (index < realProblems.length - 1) {
                lines.push('');
            }
        });

        lines.push('');
    }

    // Final result
    lines.push(chalk.gray('='.repeat(50)));
    if (result.success) {
        lines.push(chalk.green.bold('✓ Validation PASSED'));
    } else {
        lines.push(chalk.red.bold('✗ Validation FAILED'));
    }
    lines.push('');

    return lines.join('\n');
}

/**
 * Format validation result as JSON
 * @param {Object} result - Validation result
 * @param {Object} options - Formatting options
 * @returns {string} JSON string
 */
export function formatJSON(result, options = {}) {
    const { pretty = true } = options;

    const output = {
        success: result.success,
        manifest: result.manifest,
        stats: result.stats,
        problems: result.problems.map(problem => ({
            id: problem.id,
            title: problem.title,
            error: problem.error,
            items: problem.items?.map(item => ({
                uid: item.uid,
                title: item.title,
                location: item.location,
                description: item.description,
                correction: item.correction,
                cause: item.cause
            }))
        }))
    };

    return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

/**
 * Format validation result based on format type
 * @param {Object} result - Validation result
 * @param {string} format - Format type: 'text' or 'json'
 * @param {Object} options - Formatting options
 * @returns {string} Formatted output
 */
export function format(result, formatType = 'text', options = {}) {
    switch (formatType.toLowerCase()) {
        case 'json':
            return formatJSON(result, options);
        case 'text':
        default:
            return formatText(result, options);
    }
}

export default format;
