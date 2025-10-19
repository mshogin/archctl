# Changelog

## [1.0.0] - 2024-10-19

### Added
- Initial release of DocHub Validator CLI
- Command-line interface for validating DocHub architecture manifests
- Support for text and JSON output formats
- Docker containerization support
- Shell wrapper script for easy Docker usage
- Custom metamodel copy for independence from DocHub
- Comprehensive documentation (README.md, QUICK_START.md, USAGE_RU.md)
- Example workspaces for testing

### Features
- ✅ Validates architecture manifests without running full DocHub server
- ✅ Executes all DocHub validators (metamodel + custom)
- ✅ Clean output - only shows real validation errors
- ✅ Proper exit codes (0=success, 1=validation errors, 2=critical errors)
- ✅ CI/CD friendly (JSON output, exit codes)
- ✅ Docker-based for easy distribution
- ✅ Uses DocHub as library (no code duplication)
- ✅ Independent metamodel (stable, customizable)

### Technical Details
- Uses DocHub validation engine directly
- Suppresses internal logging (clean output)
- Filters out loading errors and empty validators
- Properly sets environment variables for manifest loading
- Async validator execution with timeout
- Comprehensive error handling

### Documentation
- README.md - Complete English documentation
- QUICK_START.md - Quick start guide
- USAGE_RU.md - Russian usage guide
- metamodel/README.md - Metamodel documentation
- ABOUT_ERRORS.md - Understanding validation output
- Inline code documentation

### Known Issues
- Requires DocHub source to be available (via symlink, submodule, or sibling directory)
- Validators run asynchronously with 10-second timeout
- Base metamodel tries to load additional files (expected fallback errors)

### Dependencies
- Node.js >= 20.0.0
- npm >= 8.1.0
- DocHub (as library dependency)
- commander, chalk, dotenv, yaml, jsonata, ajv, object-hash, md5
