# Security Policy

## 🔒 Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication with secure secret generation
- Environment-specific JWT secrets for staging/production
- API endpoint protection with middleware

### Data Protection
- SQLite database with WAL mode for better concurrency
- Input validation and sanitization
- CORS protection with configurable origins
- Helmet.js for security headers

### Infrastructure Security
- Docker containers run as non-root users
- Multi-stage Docker builds to minimize attack surface
- Health checks for service availability
- Resource limits in production deployments

### Development Security
- Automated dependency vulnerability scanning with Trivy
- npm audit in CI pipeline
- Pre-commit hooks for code quality
- Dead code detection to reduce attack surface

## 🚨 Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing us directly:

📧 **security@your-domain.com**

### What to Include

Please include the following information in your report:

1. **Type of issue** (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
2. **Full paths** of source file(s) related to the manifestation of the issue
3. **Location** of the affected source code (tag/branch/commit or direct URL)
4. **Special configuration** required to reproduce the issue
5. **Step-by-step instructions** to reproduce the issue
6. **Proof-of-concept or exploit code** (if possible)
7. **Impact** of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Assessment**: Within 7 days of initial response
- **Resolution**: Target 30 days for fixes, depending on complexity
- **Disclosure**: We follow coordinated disclosure practices

## 🎯 Bug Bounty Program

Currently, we do not have a formal bug bounty program. However, we greatly appreciate security researchers who help improve our security posture. 

We will:
- Acknowledge your contribution in our release notes (if desired)
- Provide attribution in our security advisories
- Consider financial rewards for critical vulnerabilities on a case-by-case basis

## 🔧 Security Best Practices for Contributors

### Environment Variables
- Never commit `.env` files or secrets to version control
- Use unique, strong secrets for each environment
- Rotate secrets regularly in production
- Use GitHub Secrets for CI/CD workflows

### Dependencies
- Keep dependencies up to date
- Review Dependabot PRs for security updates
- Run `npm audit` locally before committing
- Use `npm audit fix` to automatically fix known vulnerabilities

### Code Quality
- Follow OWASP security guidelines
- Validate all user inputs
- Use parameterized queries for database operations
- Implement proper error handling without information disclosure

### Docker Security
- Use official, minimal base images
- Run containers as non-root users
- Regularly update base images
- Use multi-stage builds to reduce image size
- Scan images for vulnerabilities

### API Security
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Validate and sanitize all inputs
- Implement proper CORS policies
- Use security headers (Helmet.js)

## 📋 Security Checklist

Before deploying to production:

- [ ] All environment variables are properly configured
- [ ] Database migrations are tested and reversible
- [ ] Docker images are built from latest base images
- [ ] Security scanning passes (Trivy, npm audit)
- [ ] HTTPS is properly configured
- [ ] Rate limiting is implemented
- [ ] Monitoring and alerting are configured
- [ ] Backup procedures are in place
- [ ] Incident response plan is documented

## 🔍 Vulnerability Disclosure Policy

### Scope
This security policy applies to:
- The main application (server and client)
- Docker containers and infrastructure
- CI/CD pipelines
- Dependencies and third-party integrations

### Out of Scope
- Social engineering attacks
- Physical security issues
- Issues in third-party services (Discord, Klaviyo, etc.)
- Issues that require physical access to infrastructure

### Legal Safe Harbor
We support security research and want to encourage it. We will not pursue legal action against researchers who:
- Make a good faith effort to avoid privacy violations and service disruption
- Do not access or modify data beyond what is necessary to demonstrate the vulnerability
- Report vulnerabilities promptly through the proper channels
- Do not publicly disclose vulnerabilities before we have had a chance to address them

## 📞 Contact Information

For security-related questions or concerns:

- **Security Issues**: security@your-domain.com
- **General Questions**: Use GitHub Discussions
- **Bug Reports**: Use GitHub Issues (for non-security bugs only)

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [GitHub Security Features](https://github.com/features/security)

---

**Last Updated**: January 2025

We appreciate your efforts to responsibly disclose security vulnerabilities and help us maintain a secure application for all users.