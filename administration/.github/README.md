# GitHub Actions CI/CD

This directory contains the GitHub Actions workflows and templates for the Club Management System.

## 🔄 Workflows

### `ci.yml` - Continuous Integration
Runs on every push to `main` and all pull requests.

**Jobs:**
- **🔍 Lint & Code Quality** - ESLint, dead code detection
- **🔧 TypeScript** - Type checking across all workspaces
- **🧪 Unit & Integration Tests** - Matrix testing on Node.js 18, 20, 22
- **🏗️ Build Verification** - Ensures all packages build successfully
- **🐳 Docker Build** - Validates Docker images build correctly
- **🎭 E2E Tests** - Full application testing with Playwright
- **🗄️ Database Operations** - Migration, seeding, and codegen tests
- **🔒 Security Scan** - npm audit and Trivy vulnerability scanning
- **✅ CI Success** - Summary job that gates all other workflows

**Caching:**
- npm dependencies cached per Node.js version
- Docker layer caching for faster builds
- Turbo build cache (if configured)

### `deploy.yml` - Deployment Pipeline
Runs on pushes to `main` and manual workflow dispatch.

**Jobs:**
- **🏗️ Build & Push Images** - Builds and pushes to GitHub Container Registry
- **🚀 Deploy to Staging** - Automatic deployment on main branch pushes
- **🚀 Deploy to Production** - Manual deployment via workflow dispatch
- **📢 Notify Deployment** - Success/failure notifications

**Environments:**
- `staging` - Auto-deployed from main branch
- `production` - Manual deployment with approval gates

## 🤖 Dependabot

Automated dependency updates configured in `dependabot.yml`:

- **Weekly updates** every Monday at 9:00 AM
- **Grouped updates** for related dependencies
- **Separate configs** for each workspace (root, server, client, tests)
- **GitHub Actions** and **Docker** updates included
- **Auto-assigned** to reviewers with appropriate labels

## 📋 Issue Templates

### Bug Report (`bug_report.yml`)
Structured form for reporting bugs with:
- Detailed reproduction steps
- Environment information
- Component identification
- Error logs and screenshots

### Feature Request (`feature_request.yml`)
Comprehensive feature request form with:
- Problem statement and proposed solution
- User stories and acceptance criteria
- Priority and user type identification
- Technical considerations

### Configuration (`config.yml`)
- Disables blank issues
- Provides links to discussions, documentation, and quick start guide

## 📝 Pull Request Template

Standardized PR template (`pull_request_template.md`) includes:
- Summary and change type classification
- Testing checklist
- Code quality verification steps
- Related issue linking

## 🔧 Required Secrets

### CI/CD Secrets
- `TURBO_TOKEN` - Turbo build cache token (optional)
- `TURBO_TEAM` - Turbo team identifier (optional)

### Staging Environment
- `STAGING_JWT_SECRET` - JWT signing key for staging
- `STAGING_KLAVIYO_API_KEY` - Klaviyo API key for staging
- `STAGING_DISCORD_BOT_TOKEN` - Discord bot token for staging
- `STAGING_EVENTBRITE_API_TOKEN` - Eventbrite API token for staging
- `STAGING_PATREON_CLIENT_ID` - Patreon client ID for staging
- `STAGING_PATREON_CLIENT_SECRET` - Patreon client secret for staging

### Production Environment
- `PROD_JWT_SECRET` - JWT signing key for production
- `PROD_KLAVIYO_API_KEY` - Klaviyo API key for production
- `PROD_DISCORD_BOT_TOKEN` - Discord bot token for production
- `PROD_EVENTBRITE_API_TOKEN` - Eventbrite API token for production
- `PROD_PATREON_CLIENT_ID` - Patreon client ID for production
- `PROD_PATREON_CLIENT_SECRET` - Patreon client secret for production

## 🏷️ Container Registry

Images are pushed to GitHub Container Registry:
- Server: `ghcr.io/vcarl/hmu-bot/server`
- Client: `ghcr.io/vcarl/hmu-bot/client`

**Tags:**
- `latest` - Latest build from main branch
- `main-<sha>` - Specific commit from main branch
- `pr-<number>` - Pull request builds
- `<branch>` - Branch-specific builds

## 🚀 Deployment

### Staging Deployment
- **Trigger:** Every push to `main` branch
- **Environment:** `staging`
- **URL:** `https://staging.your-domain.com`
- **Auto-deploy:** Yes

### Production Deployment
- **Trigger:** Manual workflow dispatch
- **Environment:** `production`
- **URL:** `https://your-domain.com`
- **Approval:** Required (configured in GitHub environment settings)

### Deployment Process
1. Build and push Docker images
2. Generate environment-specific docker-compose files
3. Deploy to target environment
4. Run health checks
5. Send notifications

## 🔍 Monitoring & Observability

### Health Checks
- Application health endpoint: `/health`
- Environment configuration: `/health/env`
- Docker container health checks included

### Security Scanning
- **npm audit** for dependency vulnerabilities
- **Trivy** for container and filesystem scanning
- **SARIF** reports uploaded to GitHub Security tab

### Test Coverage
- **Codecov** integration for coverage reports
- Coverage uploaded from Node.js 20 matrix job
- Combined server and client coverage

## 🛠️ Development Workflow

### Creating a Pull Request
1. Create feature branch from `main`
2. Make your changes
3. Ensure all tests pass locally: `npm run lint && npm run typecheck && npm test`
4. Push branch and create PR
5. CI will automatically run all checks
6. Address any CI failures
7. Request review and merge

### Deployment Workflow
1. Merge PR to `main` branch
2. Staging deployment runs automatically
3. Test in staging environment
4. For production: Go to Actions → Deploy → Run workflow → Select "production"
5. Approve deployment in GitHub environments (if configured)
6. Monitor deployment and health checks

## 🐛 Troubleshooting

### Common CI Issues

**E2E Tests Failing:**
- Check if services started properly in CI logs
- Verify wait-on timeouts are sufficient
- Check for port conflicts or timing issues

**Docker Build Failures:**
- Verify Dockerfiles are using correct base images
- Check if all required files are copied
- Review build context and .dockerignore files

**Dependency Issues:**
- Check for conflicting package versions
- Verify all workspaces have correct dependencies
- Review Dependabot PRs for breaking changes

**Environment Configuration:**
- Ensure all required secrets are set
- Check environment variable names match
- Verify staging/production configurations

### Getting Help
- Check workflow logs in GitHub Actions tab
- Review individual job outputs for specific failures
- Use GitHub Discussions for workflow questions
- Create issues using the bug report template for persistent problems