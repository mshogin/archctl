# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DocHub Validator CLI is a command-line tool for validating [DocHub](https://dochub.info) architecture manifests. It uses DocHub's validation engine as a library to check architecture descriptions for errors, inconsistencies, and rule violations without needing to run the full DocHub server.

## Common Development Commands

### Running the Validator

```bash
# Validate current directory
node src/cli.mjs

# Validate specific workspace
node src/cli.mjs --workspace /path/to/manifests

# JSON output for CI/CD
node src/cli.mjs --format json --output report.json

# Verbose debugging
node src/cli.mjs --verbose

# Test with DocHub's own documentation
npm run test

# Test with included examples
node src/cli.mjs --workspace examples/test-custom-validators
```

### Docker Workflow

```bash
# Build Docker image
docker build -t dochub-validator-cli .

# Or use wrapper script
./dochub-validate.sh --build

# Run validator in Docker
docker run --rm -v $(pwd):/workspace dochub-validator-cli

# Using wrapper script
./dochub-validate.sh --workspace /path/to/manifests
```

### Testing Workspace

The repository includes a test workspace at `test-workspace/` which mirrors DocHub's example structure and can be used for testing changes.

## Architecture

### Core Components

**Three-module architecture** for separation of concerns:

1. **cli.mjs** - Command-line interface layer
   - Uses `commander` for argument parsing
   - Suppresses DocHub's internal logging unless `--verbose`
   - Handles exit codes (0=success, 1=validation failed, 2=fatal error)
   - Loads `.env` files for configuration

2. **validator.mjs** - Validation orchestration engine
   - **Critical**: Must initialize DocHub environment *before* importing DocHub modules
   - Sets up global variables: `global.$paths`, `global.$listeners`, `global.$roles`
   - Dynamically imports DocHub modules to ensure proper initialization order
   - Replicates DocHub's validation workflow: load manifest → process entities → run validators
   - Filters out DocHub's internal loading errors (fallback path attempts)
   - 10-second timeout safety for validator execution

3. **formatter.mjs** - Output formatting
   - **Text format**: Human-readable with colors (uses `chalk`)
   - **JSON format**: Machine-parsable for CI/CD integration
   - Filters out noise: loading errors, empty validators, internal fallback attempts

### DocHub Integration Strategy

**DocHub as a Library Dependency:**

The CLI requires DocHub source code to be available in one of these locations (checked in order):
1. `./dochub/` - Git submodule (recommended)
2. `../DocHub/` - Sibling directory (development)
3. `./node_modules/dochub/` - npm package (future)

**Why Dynamic Imports:**
```javascript
// WRONG - imports before environment setup
import manifestParser from '../dochub/src/global/manifest/parser.mjs';

// CORRECT - dynamic import after environment setup
initializeDocHubEnvironment(workspaceDir);
const manifestParserModule = await import(`${dochubPath}/src/global/manifest/parser.mjs`);
```

Global state must be configured *before* DocHub modules are loaded because modules initialize based on these globals.

**Metamodel Handling:**
- Currently uses DocHub's built-in metamodel (`dochub/src/assets/base.yaml`)
- `metamodel/` directory contains reference copy but is not actively used
- This ensures compatibility and avoids path resolution issues

### Validation Flow

```
1. Initialize Environment
   └─> Set global.$paths, global.$listeners, global.$roles
   └─> Configure VUE_APP_DOCHUB_* environment variables

2. Load DocHub Modules (dynamic import)
   └─> manifestParser, cache, validators, datasetsHelper, etc.

3. Load Manifest
   └─> manifestParser.clean()
   └─> manifestParser.startLoad()
   └─> manifestParser.import('file:///$root$')
   └─> manifestParser.checkAwaitedPackages()
   └─> manifestParser.checkLoaded()
   └─> manifestParser.stopLoad()

4. Process Entities
   └─> entities(manifest)

5. Execute Validators
   └─> Built-in validators from DocHub metamodel
   └─> Custom validators from manifest's rules.validators section

6. Format and Return Results
   └─> Filter out loading errors and empty validators
   └─> Format as text or JSON
```

### Exit Codes

- **0**: Validation passed, no issues found
- **1**: Validation failed, architecture rule violations found
- **2**: Fatal error (file not found, YAML parsing error, etc.)

## Custom Validators

Custom validators are JSONata queries defined in the manifest's `rules.validators` section. They complement DocHub's built-in validators.

**Example structure:**
```yaml
rules:
  validators:
    custom.check.something:
      title: Human-readable title
      source: >
        (
          [collection.$spread().(
            $ID := $keys()[0];
            condition ? {
              "uid": "issue-id",
              "title": "Issue description",
              "location": "/architect/path",
              "correction": "How to fix"
            } : null
          )[$]]
        )
```

See `examples/README.md` for comprehensive examples and `examples/custom-validators.yaml` for reference implementations.

## Environment Variables

DocHub configuration (set in `.env` or shell):
```bash
VUE_APP_DOCHUB_ROOT_MANIFEST=dochub.yaml   # Root manifest filename
VUE_APP_DOCHUB_METAMODEL=<path>            # Custom metamodel (optional)
VUE_APP_DOCHUB_ROLES_MODEL=enabled         # Enable roles-based validation
VUE_APP_DOCHUB_ROLES=<path>                # Roles configuration file
```

## Key Implementation Details

### Console Output Suppression

DocHub generates verbose internal logging. The CLI suppresses this unless `--verbose`:

```javascript
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

if (!options.verbose) {
    console.log = () => {};
    console.error = () => {};
}
// ... run validation ...
console.log = originalConsoleLog;
console.error = originalConsoleError;
```

### Problem Filtering

Not all "problems" returned by DocHub are real issues:

```javascript
const realProblems = problems.filter(problem => {
    // Skip loading errors (internal DocHub fallback attempts)
    if (problem.id?.startsWith('$error')) return false;

    // Skip validators with no items
    if (!problem.items || problem.items.length === 0) return false;

    return true;
});
```

### Docker Considerations

The Dockerfile:
- Uses Alpine Linux for minimal size
- Clones DocHub as git submodule during build
- Sets `/workspace` as default mount point for user architectures
- App code lives in `/app`, user workspace in `/workspace`

## File Structure

```
dochub-validator-cli/
├── src/
│   ├── cli.mjs              # CLI interface (commander)
│   ├── validator.mjs        # Core validation orchestration
│   └── formatter.mjs        # Output formatting (text/JSON)
├── examples/
│   ├── README.md            # Custom validator documentation
│   ├── custom-validators.yaml
│   └── test-custom-validators/  # Test workspace for examples
├── test-workspace/          # Full test workspace (mirrors DocHub structure)
├── metamodel/              # Reference copy of DocHub metamodel
├── dochub/                 # Git submodule (DocHub source)
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── dochub-validate.sh      # Shell wrapper for Docker
└── package.json            # Node.js dependencies
```

## Dependencies

**Runtime:**
- `commander` - CLI argument parsing
- `chalk` - Terminal colors
- `dotenv` - Environment variable loading
- `yaml` - YAML parsing
- `jsonata` - JSONata query engine (used by DocHub)
- `ajv` + `ajv-formats` - JSON schema validation
- `md5`, `object-hash` - Hashing utilities

**DocHub dependency:**
- Must be available as git submodule or sibling directory
- Not in package.json (used as library, not npm dependency)

## Node.js Requirements

- Node.js ≥20.0.0
- npm ≥8.1.0
- Uses ES modules (`type: "module"` in package.json)
- All files use `.mjs` extension for clarity
