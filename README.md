# DocHub Validator CLI

A command-line tool for validating [DocHub](https://dochub.info) architecture manifests. This tool uses DocHub's validation engine to check your architecture descriptions for errors, inconsistencies, and rule violations.

## Features

- **Standalone CLI** - Run validation without starting the full DocHub server
- **Docker-based** - No local dependencies, runs anywhere Docker is available
- **CI/CD friendly** - Exit codes and JSON output for automation
- **Multiple output formats** - Human-readable text or machine-parsable JSON
- **Zero DocHub modifications** - Uses DocHub as a library, no changes to core
- **Extensible** - Supports all DocHub validators and custom rules

## Prerequisites

Choose one of the following:

### Option 1: Docker (Recommended)
- Docker 20.0 or higher
- Docker Compose 2.2.3 or higher (optional)

### Option 2: Node.js (Local Development)
- Node.js 20.0 or higher
- npm 8.1 or higher
- Git (for cloning DocHub)

## Installation

### Docker Installation

1. Clone this repository:
```bash
git clone https://github.com/mshogin/archctl.git
cd archctl
```

2. Build the Docker image:
```bash
docker build -t archctl .
```

Or using the wrapper script:
```bash
./dochub-validate.sh --build
```

### Local Installation

1. Clone this repository:
```bash
git clone https://github.com/mshogin/archctl.git
cd archctl
```

2. Install dependencies:
```bash
npm install
```

3. Clone DocHub as a Git submodule or create a symlink:
```bash
# Option A: Git submodule
git submodule add https://github.com/DocHubTeam/DocHub.git dochub
git submodule update --init --recursive

# Option B: Symlink to existing DocHub installation
ln -s /path/to/DocHub dochub
```

## Usage

### Using Docker (Recommended)

#### With wrapper script:
```bash
# Validate current directory
./dochub-validate.sh

# Validate specific directory
./dochub-validate.sh --workspace /path/to/manifests

# Generate JSON report
./dochub-validate.sh -- --format json --output /workspace/report.json

# Verbose output
./dochub-validate.sh -- --verbose
```

#### Direct Docker command:
```bash
# Validate current directory
docker run --rm -v $(pwd):/workspace archctl

# Validate specific directory
docker run --rm -v /path/to/manifests:/workspace archctl

# JSON output
docker run --rm -v $(pwd):/workspace archctl --format json

# Save report to file
docker run --rm \
  -v $(pwd):/workspace \
  archctl \
  --format json --output /workspace/validation-report.json
```

#### Using Docker Compose:
```bash
# Edit workspace path in docker-compose.yml, then:
docker-compose up validator

# For JSON report:
docker-compose --profile json-report up validator-json
```

### Using Node.js (Local)

```bash
# Validate current directory
node src/cli.mjs

# Or use npm script
npm run validate

# Validate specific workspace
node src/cli.mjs --workspace /path/to/manifests

# Custom root manifest
node src/cli.mjs --root my-manifest.yaml

# JSON output
node src/cli.mjs --format json

# Verbose mode
node src/cli.mjs --verbose

# Save to file
node src/cli.mjs --format json --output report.json
```

## Command-Line Options

```
Options:
  -V, --version          Output the version number
  -w, --workspace <dir>  Workspace directory containing manifests (default: current directory)
  -r, --root <file>      Root manifest file name (default: "dochub.yaml")
  -f, --format <type>    Output format: text, json (default: "text")
  --no-color             Disable colored output
  -v, --verbose          Enable verbose output
  --pretty               Pretty print JSON output (default: true)
  -o, --output <file>    Write output to file instead of stdout
  -h, --help             Display help information
```

## Exit Codes

- `0` - Validation passed (no errors found)
- `1` - Validation failed (architecture rule violations found)
- `2` - Loading/parsing errors or fatal error (YAML syntax errors, file not found, etc.)

## Output Formats

### Text Format (Default)

Human-readable output with colors (when terminal supports it):

```
DocHub Architecture Validation
==================================================

✓ Manifest loaded successfully
  Workspace: /workspace
  Root: /workspace/dochub.yaml

Summary:
  Total issues: 2
  Loading errors: 0
  Validation errors: 2

Found 2 issue(s):

[component-naming] Component naming convention
  ✗ Component "user-service" violates naming convention
    Location: /components/user-service
    Fix: Rename to "user.service"

[missing-docs] Missing documentation
  ✗ Component "payment-api" has no description
    Location: /components/payment-api
    Fix: Add description field

==================================================
✗ Validation FAILED
```

### JSON Format

Machine-parsable output for CI/CD integration:

```json
{
  "success": false,
  "manifest": {
    "loaded": true,
    "path": "/workspace/dochub.yaml",
    "workspace": "/workspace"
  },
  "stats": {
    "totalIssues": 2,
    "loadingErrors": 0,
    "validationErrors": 2
  },
  "problems": [
    {
      "id": "component-naming",
      "title": "Component naming convention",
      "items": [
        {
          "uid": "user-service",
          "title": "Component \"user-service\" violates naming convention",
          "location": "/components/user-service",
          "correction": "Rename to \"user.service\""
        }
      ]
    }
  ]
}
```

## Environment Variables

Configure DocHub behavior using environment variables:

```bash
# Root manifest path (relative to workspace)
export VUE_APP_DOCHUB_ROOT_MANIFEST=dochub.yaml

# Custom metamodel file
export VUE_APP_DOCHUB_METAMODEL=/workspace/custom-metamodel.yaml

# Enable roles-based validation
export VUE_APP_DOCHUB_ROLES_MODEL=enabled
export VUE_APP_DOCHUB_ROLES=/workspace/roles.yaml
```

Or create a `.env` file in your workspace:

```bash
VUE_APP_DOCHUB_ROOT_MANIFEST=dochub.yaml
VUE_APP_DOCHUB_METAMODEL=metamodel.yaml
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Architecture

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Validate DocHub Architecture
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/workspace \
            archctl:latest \
            --format json \
            --output /workspace/validation-report.json

      - name: Upload validation report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: validation-report.json

      - name: Check validation result
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/workspace \
            archctl:latest
```

### GitLab CI

```yaml
validate-architecture:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t archctl .
    - docker run --rm -v $(pwd):/workspace archctl --format json --output /workspace/report.json
  artifacts:
    reports:
      junit: report.json
    paths:
      - report.json
  only:
    - merge_requests
    - main
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('Validate Architecture') {
            steps {
                script {
                    docker.build('archctl')
                    docker.image('archctl').inside {
                        sh 'node src/cli.mjs --format json --output validation-report.json'
                    }
                }
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'validation-report.json', fingerprint: true
        }
    }
}
```

## Development

### Project Structure

```
archctl/
├── src/
│   ├── cli.mjs              # CLI interface (commander)
│   ├── validator.mjs        # Core validation logic
│   └── formatter.mjs        # Output formatting
├── metamodel/
│   ├── base.yaml            # DocHub metamodel (validators)
│   └── README.md            # Metamodel documentation
├── dochub/                  # DocHub git submodule
├── Dockerfile               # Docker image definition
├── docker-compose.yml       # Docker Compose configuration
├── dochub-validate.sh       # Shell wrapper script
├── package.json             # Node.js dependencies
└── README.md                # This file
```

### Metamodel

⚠️ **Note**: Currently, the CLI uses DocHub's **built-in metamodel** from `dochub/src/assets/base.yaml`.

The `metamodel/` directory contains a reference copy for documentation purposes. We use DocHub's built-in metamodel because:
- ✅ Always uses latest validators from DocHub
- ✅ No path resolution issues
- ✅ Simpler implementation

This means the CLI requires DocHub source to be available (via symlink, submodule, or sibling directory).

For more details, see `metamodel/README.md`.

### Testing Locally

```bash
# Test with DocHub's own documentation
npm run test

# Or manually
node src/cli.mjs --workspace ../DocHub/public/documentation --verbose
```

### Adding Custom Validators

Validators are defined in your DocHub manifest under `rules.validators`. This CLI tool will automatically execute all validators defined there.

**📚 See [examples/README.md](examples/README.md) for comprehensive custom validator examples!**

Quick example - check for empty contexts:

```yaml
rules:
  validators:
    custom.contexts.empty:
      title: Контексты без компонентов
      source: >
        (
          [contexts.$spread().(
            $CONTEXT_ID := $keys()[0];
            $COMPONENTS := *.components;

            $not($exists($COMPONENTS)) or $count($COMPONENTS) = 0 ? {
              "uid": "empty-context-" & $CONTEXT_ID,
              "title": "Context '" & $CONTEXT_ID & "' has no components",
              "location": "/architect/contexts/" & $CONTEXT_ID,
              "correction": "Add components to context or remove it"
            } : null
          )[$]]
        )
```

**Available example validators:**
- ✅ Empty contexts detection
- ✅ Component naming convention (kebab-case)
- ✅ Missing descriptions
- ✅ Missing entity types
- ✅ Orphaned aspects
- ✅ Too many links (God Object detection)

Try them out:
```bash
node src/cli.mjs --workspace examples/test-custom-validators
```

## Troubleshooting

### "DocHub not found" Error

Make sure DocHub is available:

```bash
# Using git submodule
git submodule update --init --recursive

# Or create symlink
ln -s /path/to/DocHub dochub
```

### "Root manifest not found" Error

Ensure your workspace contains a `dochub.yaml` file, or specify a custom path:

```bash
node src/cli.mjs --root my-custom-manifest.yaml
```

### Docker Permission Issues

If you get permission errors when running Docker:

```bash
# Add your user to docker group (Linux)
sudo usermod -aG docker $USER

# Restart session
logout
```

### Verbose Logging

Enable verbose mode to see detailed error information:

```bash
node src/cli.mjs --verbose
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Apache License 2.0

This tool uses [DocHub](https://dochub.info) as a library, which is also licensed under Apache License 2.0.

## Related Projects

- [DocHub](https://github.com/DocHubTeam/DocHub) - Architecture as Code platform
- [DocHub Examples](https://github.com/rpiontik/DocHubExamples) - Example architectures

## Support

- Documentation: https://dochub.info
- Issues: https://github.com/mshogin/archctl/issues
- Community: Telegram @archascode

## Acknowledgments

Built on top of the excellent [DocHub](https://dochub.info) project by Roman Piontik and contributors.
