# Quick Start Guide

Get started with DocHub Validator CLI in under 5 minutes!

## Prerequisites

- Node.js 20+ and npm 8.1+
- OR Docker 20+

## Installation

### Option 1: Local Node.js Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/dochub-validator-cli.git
cd dochub-validator-cli

# Install dependencies
npm install

# Link or clone DocHub
# Option A: Create symlink to existing DocHub installation
ln -s /path/to/DocHub dochub

# Option B: Clone DocHub as sibling directory
cd .. && git clone https://github.com/DocHubTeam/DocHub.git && cd dochub-validator-cli

# Option C: Use git submodule
git submodule add https://github.com/DocHubTeam/DocHub.git dochub
git submodule update --init --recursive

# Install DocHub dependencies (required)
cd ../DocHub && npm install && cd ../dochub-validator-cli
```

### Option 2: Docker Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/dochub-validator-cli.git
cd dochub-validator-cli

# Build Docker image
docker build -t dochub-validator-cli .

# Or use the wrapper script
./dochub-validate.sh --build
```

## Basic Usage

### Validate Current Directory

```bash
# Using Node.js
node src/cli.mjs

# Using Docker wrapper
./dochub-validate.sh

# Using Docker directly
docker run --rm -v $(pwd):/workspace dochub-validator-cli
```

### Validate Specific Directory

```bash
# Using Node.js
node src/cli.mjs --workspace /path/to/manifests

# Using Docker wrapper
./dochub-validate.sh --workspace /path/to/manifests

# Using Docker directly
docker run --rm -v /path/to/manifests:/workspace dochub-validator-cli
```

### Generate JSON Report

```bash
# Using Node.js
node src/cli.mjs --format json --output report.json

# Using Docker wrapper
./dochub-validate.sh -- --format json --output /workspace/report.json
```

## Example Architecture

Create a simple architecture to test:

```bash
mkdir my-architecture
cd my-architecture
```

Create `dochub.yaml`:

```yaml
docs:
  readme:
    type: markdown
    location: README.md

aspects:
  business:
    title: Business Architecture

components:
  web-app:
    title: Web Application
    entity: component
    aspects:
      - business
    description: Main web application

rules:
  validators: {}
```

Create `README.md`:

```markdown
# My Architecture

Simple architecture documentation.
```

Validate it:

```bash
# From parent directory
node ../dochub-validator-cli/src/cli.mjs --workspace my-architecture

# Or
cd ../dochub-validator-cli
./dochub-validate.sh --workspace ../my-architecture
```

## Understanding Output

### Exit Codes

- `0` - Validation passed ✓
- `1` - Architecture rule violations found ✗
- `2` - Loading/parsing errors (YAML syntax, file not found, etc.) ✗✗

### Text Output Example

```
DocHub Architecture Validation
==================================================

✓ Manifest loaded successfully
  Workspace: /workspace
  Root: /workspace/dochub.yaml

Summary:
  Total issues: 0
  Loading errors: 0
  Validation errors: 0

==================================================
✓ Validation PASSED
```

### JSON Output Example

```json
{
  "success": true,
  "manifest": {
    "loaded": true,
    "path": "/workspace/dochub.yaml",
    "workspace": "/workspace"
  },
  "stats": {
    "totalIssues": 0,
    "loadingErrors": 0,
    "validationErrors": 0
  },
  "problems": []
}
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/validate.yml`:

```yaml
name: Validate Architecture
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build validator
        run: |
          git clone https://github.com/yourusername/dochub-validator-cli.git
          cd dochub-validator-cli
          docker build -t dochub-validator-cli .

      - name: Validate architecture
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/workspace \
            dochub-validator-cli:latest
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
validate-architecture:
  image: docker:latest
  services:
    - docker:dind
  script:
    - git clone https://github.com/yourusername/dochub-validator-cli.git
    - cd dochub-validator-cli
    - docker build -t dochub-validator-cli .
    - docker run --rm -v $(pwd)/..:/workspace dochub-validator-cli
```

## Troubleshooting

### "DocHub not found" Error

Ensure DocHub is available:

```bash
# Check if dochub directory exists
ls -la dochub

# If not, create symlink or clone
ln -s /path/to/DocHub dochub
```

### "Root manifest not found" Error

Ensure your workspace has a `dochub.yaml` file:

```bash
ls -la /path/to/workspace/dochub.yaml
```

Or specify a different manifest:

```bash
node src/cli.mjs --root my-manifest.yaml
```

### Loading Errors in Output

File loading errors like `file:///metamodel/root.yaml` are normal - DocHub tries multiple fallback paths. As long as the final manifest loads successfully, these can be ignored.

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Add custom validators to your `dochub.yaml`
- Integrate into your CI/CD pipeline
- Join the community at Telegram @archascode

## Getting Help

- Documentation: https://dochub.info
- Issues: https://github.com/yourusername/dochub-validator-cli/issues
- DocHub GitHub: https://github.com/DocHubTeam/DocHub

Happy validating! 🚀
