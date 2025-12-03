# Security Measures

## NPM Supply Chain Attack Protection

This project has protections against npm supply chain attacks like SHA1-HULUD.

### Protection Measures

1. **Install Scripts Disabled** (`.npmrc`)
   - All npm install scripts (preinstall, install, postinstall, prepare) are disabled by default
   - This prevents malicious packages from executing arbitrary code during `npm install`
   - Configuration: `ignore-scripts=true` in `.npmrc`

2. **Audit Tool** (`scripts/npm-audit-scripts.sh`)
   - Run `./scripts/npm-audit-scripts.sh` to see which packages want to run install scripts
   - Helps identify suspicious packages before enabling their scripts
   - Shows exactly what commands would be executed

### How to Use

#### Normal Development

```bash
# Install packages safely (scripts won't run)
npm install

# Add a new package safely
npm install <package-name>

# Audit what scripts exist in your dependencies
./scripts/npm-audit-scripts.sh
```

#### When You Need to Run Install Scripts

Some legitimate packages require install scripts to build native modules (e.g., node-gyp packages). If you trust a package and need its install scripts:

```bash
# For a specific package
npm rebuild <package-name> --ignore-scripts=false

# Or temporarily disable protection for one install
npm install <package-name> --ignore-scripts=false
```

#### Best Practices

1. **Review before installing**: Check the package's repository and install scripts before adding new dependencies
2. **Audit regularly**: Run `./scripts/npm-audit-scripts.sh` after adding new packages
3. **Keep dependencies updated**: Regular updates include security patches
4. **Use `npm audit`**: Run periodically to check for known vulnerabilities

### Attack Detection

Watch for these red flags when auditing:
- Scripts named `setup_bun.js` or `bun_environment.js`
- Scripts that download additional code
- Scripts that access environment variables or `.git` directory
- Scripts that make network requests during install
- Obfuscated or minified install scripts

### Additional Security Tools

Consider using:
- **Socket.dev**: Real-time npm package analysis
- **StepSecurity**: Supply chain security platform
- **Dependabot**: Automated dependency updates (GitHub)
- **npm audit**: Built-in vulnerability scanner

### References

- [SHA1-HULUD Attack Details](https://www.stepsecurity.io/blog/sha1-hulud-the-second-coming-zapier-ens-domains-and-other-prominent-npm-packages-compromised)
- [npm Scripts Documentation](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [Supply Chain Security Best Practices](https://slsa.dev/)

### Emergency Response

If you suspect a compromised package:

1. **Stop immediately**: Don't run any more npm commands
2. **Check GitHub security logs**: https://github.com/settings/security-log
3. **Rotate credentials**: GitHub tokens, npm tokens, API keys, SSH keys
4. **Scan for malicious files**: `find . -name "*setup_bun*" -o -name "*bun_environment*"`
5. **Clean install**: Remove `node_modules`, clear npm cache, reinstall
6. **Report**: File an issue with npm and the package maintainer
