# Security

## Reporting Security Issues

If you discover a security vulnerability, please report it by emailing the maintainer directly rather than opening a public issue.

## Supply Chain Security

This project takes supply chain security seriously:

### Dependency Management

- We use minimal dependencies to reduce attack surface
- Dependencies are regularly updated via Dependabot
- The `.npmrc` file disables automatic install scripts as an additional precaution

### Best Practices for Users

1. **Review dependencies**: Check package repositories before adding new dependencies
2. **Keep updated**: Regularly update dependencies to get security patches
3. **Use lockfiles in your apps**: While this library doesn't include a lockfile (libraries shouldn't), your application should use one

### If You Suspect a Compromised Package

1. Stop immediately and don't run additional install commands
2. Check your GitHub security logs: https://github.com/settings/security-log
3. Rotate any potentially exposed credentials
4. Remove `node_modules`, clear caches, and reinstall from a known-good state
5. Report the issue to the package maintainer and npm/bun

## Additional Resources

- [Socket.dev](https://socket.dev) - Package security analysis
- [Dependabot](https://github.com/dependabot) - Automated dependency updates
- [SLSA](https://slsa.dev/) - Supply chain security best practices
