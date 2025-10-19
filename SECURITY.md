# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Model

DocHub Validator CLI is designed as a **read-only validation tool**. It:

- ✅ **Reads** architecture manifest files from the workspace
- ✅ **Validates** architecture against DocHub rules
- ✅ **Outputs** validation results to console or file
- ❌ **Does NOT modify** any files in the workspace (read-only access)
- ❌ **Does NOT execute** arbitrary code from manifests
- ❌ **Does NOT make** network requests (except when DocHub loads remote schemas)

## Threat Model

### In Scope
- Path traversal vulnerabilities
- Command injection via user inputs
- Dependency vulnerabilities
- Information disclosure through error messages
- Docker container security

### Out of Scope
- DoS attacks via large manifest files (use resource limits)
- Attacks requiring physical access to the machine
- Social engineering attacks

## Security Features

### 1. Input Validation

**Path Resolution:**
```javascript
// All user-provided paths are resolved to absolute paths
const workspaceDir = path.resolve(workspace);
const manifestPath = path.resolve(workspaceDir, rootManifest);

// Existence checks before access
if (!fs.existsSync(workspaceDir)) {
    throw new Error(`Workspace directory not found: ${workspaceDir}`);
}
```

**No Command Execution:**
- CLI uses `spawn()` with array arguments (not shell strings) to prevent injection
- No use of `eval()` or `Function()` constructors
- JSONata queries are sandboxed by DocHub's engine

### 2. Least Privilege

**Docker Container:**
- Workspace mounted as read-only: `-v "$WORKSPACE_DIR:/workspace:ro"`
- Runs as non-root user (Node.js Alpine image defaults)
- No privileged mode or host network access
- Minimal attack surface with Alpine Linux base

**File Permissions:**
- CLI only reads files, never writes to workspace
- Output files (reports) are written to user-specified locations only
- Uses `--ignore-scripts` during npm install to prevent malicious package scripts

### 3. Dependency Security

**Current Status:** ✅ No known vulnerabilities

```bash
npm audit
# 0 vulnerabilities found
```

**Dependency Management:**
- Production dependencies only in Docker image
- Regular updates via Dependabot (recommended)
- Lock file (`package-lock.json`) committed for reproducible builds

### 4. Information Disclosure Protection

**Error Handling:**
- Stack traces only shown with `--verbose` flag
- Default output sanitizes internal DocHub errors
- No exposure of system paths in production mode
- Exit codes are informative but not detailed:
  - 0: Success
  - 1: Validation failed
  - 2: Fatal error

**Verbose Mode Warning:**
When using `--verbose`, be aware that:
- Full file paths are displayed
- Internal DocHub errors are shown
- Stack traces are included
- Only use in trusted environments

### 5. Environment Variable Safety

**Secure Defaults:**
```bash
# .env is ignored by git
# .env.example shows safe defaults (no secrets)
```

**No Secrets Required:**
- CLI does not require API keys, tokens, or credentials
- Optional Redis password is for caching only
- All sensitive config is in user's `.env` (not committed)

## Best Practices for Users

### 1. Running Locally

```bash
# Always review manifests before validation
cd /path/to/your/architecture
arch-validate

# Use --verbose only when debugging
arch-validate --verbose
```

### 2. Running in Docker

```bash
# Always mount workspace as read-only
docker run --rm -v $(pwd):/workspace:ro dochub-validator-cli

# Don't expose Docker socket or use privileged mode
# ❌ NEVER do this:
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock ...
```

### 3. CI/CD Integration

```yaml
# GitHub Actions example
- name: Validate Architecture
  run: |
    docker run --rm \
      -v ${{ github.workspace }}:/workspace:ro \
      dochub-validator-cli:latest
```

**CI/CD Security Checklist:**
- ✅ Use pinned Docker image versions (not `latest` in production)
- ✅ Run validation in isolated environment
- ✅ Don't pass secrets as environment variables
- ✅ Review validation reports before merging
- ✅ Use read-only file system mounts

### 4. Custom Validators

Custom validators use JSONata, which is sandboxed but can be complex:

```yaml
rules:
  validators:
    custom.check:
      source: >
        # JSONata is safe but review carefully:
        # - No access to filesystem
        # - No network access
        # - Only processes manifest data
```

**Custom Validator Security:**
- ✅ JSONata is sandboxed and cannot execute arbitrary code
- ✅ Validators only process manifest data (no file I/O)
- ⚠️ Complex validators may cause performance issues
- ⚠️ Review custom validators from untrusted sources

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability:

### 🔒 Private Disclosure (Preferred)

**For sensitive vulnerabilities:**
1. **DO NOT** open a public issue
2. Email the maintainer directly (see package.json for contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### 📢 Public Disclosure

**For low-severity issues:**
1. Open a GitHub issue with the `security` label
2. Provide detailed description
3. Suggest mitigation if possible

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 7 days
- **Fix Release:** Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next regular release

## Security Updates

Security updates will be:
- Released as patch versions (1.0.x)
- Documented in CHANGELOG.md
- Announced in GitHub Releases
- Tagged with `security` label

## Known Limitations

### 1. Large Manifest Files
**Issue:** Very large manifests can cause memory exhaustion
**Mitigation:** Use Docker with memory limits:
```bash
docker run --rm -m 2g -v $(pwd):/workspace:ro dochub-validator-cli
```

### 2. JSONata Performance
**Issue:** Complex validators can be slow
**Mitigation:** 10-second timeout on validator execution

### 3. DocHub Dependency
**Issue:** CLI relies on DocHub source code
**Mitigation:**
- Use git submodule with pinned commit
- Regularly update DocHub dependency
- Review DocHub security advisories

## Security Checklist for Contributors

Before submitting PRs that modify core functionality:

- [ ] No use of `eval()`, `Function()`, or similar
- [ ] No shell command construction from user input
- [ ] All paths resolved with `path.resolve()`
- [ ] File operations include existence checks
- [ ] Error messages don't leak sensitive information
- [ ] New dependencies reviewed for vulnerabilities
- [ ] Tests cover security-relevant code paths
- [ ] Documentation updated with security implications

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [npm Security](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities)

## License

This security policy is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
