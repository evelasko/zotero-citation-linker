# 🤖 Automation & Release Workflow

This document explains the comprehensive automated release workflow for Zotero Citation Linker using GitHub Actions.

## 🚀 **Overview**

The automation system provides:

- **3 Different Release Triggers**: Manual, tag-based, and GitHub release
- **Comprehensive Testing**: Multi-OS, multi-Node.js version validation
- **Automatic Version Management**: Synchronized version bumps across files
- **Intelligent Changelog Generation**: Based on git commit history
- **Artifact Management**: XPI file creation and distribution
- **Security Scanning**: Dependency vulnerability checks

## 📦 **Available Workflows**

### 1. **Continuous Integration** (`.github/workflows/ci.yml`)

**Triggers**: Every push and pull request to `main`/`develop`

**What it does**:

- ✅ Runs ESLint and TypeScript compilation checks
- 🔨 Tests build process across multiple OS (Ubuntu, Windows, macOS)
- 🧪 Validates Node.js compatibility (v16, v18, v20)
- 🔍 Validates plugin structure and XPI creation
- 🔒 Scans for security vulnerabilities

### 2. **Release Workflow** (`.github/workflows/release.yml`)

**Triggers**:

- Publishing a GitHub release (manual)
- Pushing version tags (`v*.*.*`)
- Manual workflow dispatch

**What it does**:

- 🔍 Validates version format and extracts metadata
- 🔨 Builds and tests the plugin
- 📋 Generates automatic changelog from commits
- 🎉 Creates/updates GitHub release with XPI attachment
- 📢 Sends post-release notifications

## 🎯 **Release Methods**

### **Method 1: Automated Script Release** (Recommended)

Use the built-in version bump scripts:

```bash
# Patch release (1.1.0 → 1.1.1)
npm run release:patch

# Minor release (1.1.0 → 1.2.0)  
npm run release:minor

# Major release (1.1.0 → 2.0.0)
npm run release:major
```

**What happens**:

1. Updates version in `package.json`, `manifest.json`, and `bootstrap.ts`
2. Builds the plugin and creates XPI
3. Commits changes with standardized message
4. Pushes to GitHub
5. **Manual step**: Create GitHub release or push version tag

### **Method 2: Manual Version Control**

```bash
# Update version manually
node scripts/version-bump.js 1.2.0

# Or use increment
node scripts/version-bump.js patch

# Build and commit
npm run build
git add .
git commit -m "chore: bump version to 1.2.0"
git push

# Create release
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

### **Method 3: GitHub Release Interface**

1. Go to GitHub → **Releases** → **Create a new release**
2. Create new tag: `v1.2.0`
3. Fill release title: `Zotero Citation Linker 1.2.0`
4. **Publish release** → GitHub Actions will handle the rest

### **Method 4: GitHub Actions Manual Dispatch**

1. Go to GitHub → **Actions** → **🚀 Release Workflow**
2. Click **Run workflow**
3. Fill in parameters:
   - **Version**: `1.2.0`
   - **Create GitHub release**: ✅
   - **Pre-release**: ☐ (or ✅ for beta)
4. **Run workflow**

## 🔧 **Version Management**

### **Automatic Version Synchronization**

The `scripts/version-bump.js` script automatically updates:

- ✅ `package.json` → `"version": "1.2.0"`
- ✅ `manifest.json` → `"version": "1.2.0"`
- ✅ `bootstrap.ts` → `«1.2.0»` (if present)

### **Version Format Validation**

Supported formats:

- ✅ `1.2.3` (standard semver)
- ✅ `1.2.3-alpha` (pre-release)
- ✅ `1.2.3-beta.1` (pre-release with build)
- ❌ `v1.2.3` (no 'v' prefix)
- ❌ `1.2` (incomplete)

### **Pre-release Detection**

The system automatically detects pre-releases:

- Tags containing `alpha`, `beta`, or `rc` → Pre-release
- GitHub manual release with pre-release checkbox → Pre-release

## 📋 **Changelog Generation**

### **Automatic Changelog**

GitHub Actions generates changelogs from git commits:

```markdown
## 🚀 What's New in 1.2.0

### 📋 Changes

- Add duplicate detection for DOI and ISBN
- Fix context menu integration issues  
- Improve error handling in HTTP server
- Update TypeScript configuration
```

### **Commit Message Best Practices**

For better changelogs, use conventional commits:

```bash
git commit -m "feat: add duplicate detection system"
git commit -m "fix: resolve context menu positioning issue"
git commit -m "docs: update installation instructions"
git commit -m "chore: update dependencies"
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## 🔄 **Development Workflow**

### **Daily Development**

```bash
# 1. Work on features
git checkout -b feature/new-citation-format

# 2. Make changes and test
npm run build
npm run lint

# 3. Create PR
git push origin feature/new-citation-format
# → Opens PR with template checklist
```

### **Pre-Release Testing**

```bash
# Test locally
npm run ci:validate

# Create pre-release
npm run version:patch
git tag -a v1.1.1-beta -m "Beta release"
git push origin v1.1.1-beta
# → Creates pre-release on GitHub
```

### **Release Process**

```bash
# For maintainers
npm run release:minor
# → Version: 1.1.0 → 1.2.0
# → Commits, pushes, ready for GitHub release

# Create GitHub release manually or push tag
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
# → Triggers automated release workflow
```

## 🚨 **Troubleshooting**

### **Build Failures**

**Problem**: XPI not created during build

```bash
# Check build directory
ls -la build/
# Should contain: manifest.json, bootstrap.js, lib.js

# Manual XPI creation
cd build && zip -r ../xpi/plugin.xpi .
```

**Problem**: TypeScript compilation errors

```bash
# Check types
npm run lint
npx tsc --noEmit

# Fix common issues
npm install @types/node --save-dev
```

### **Release Failures**

**Problem**: GitHub Actions workflow fails

1. Check **Actions** tab for error details
2. Common issues:
   - Invalid version format
   - Missing required files
   - Permission issues

**Problem**: Version mismatch between files

```bash
# Re-run version bump
node scripts/version-bump.js 1.2.0
npm run build
git add . && git commit -m "fix: sync versions"
```

**Problem**: XPI not attached to release

1. Check workflow logs for "Upload XPI" step
2. Verify XPI file exists: `ls -la xpi/`
3. Re-run workflow or manually upload XPI

## 🔐 **Security & Permissions**

### **Required GitHub Secrets**

The workflows use these built-in secrets (no setup needed):

- `GITHUB_TOKEN` - For creating releases and uploading assets

### **Optional Notifications**

Add Discord/Slack notifications by uncommenting in `release.yml`:

```yaml
# Add to GitHub Secrets
DISCORD_WEBHOOK: https://discord.com/api/webhooks/...

# Uncomment in release.yml
- name: 📱 Discord notification
  uses: Ilshidur/action-discord@master
  env:
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
  with:
    args: 'New release: ${{ needs.validate.outputs.version }} 🎉'
```

## 📊 **Monitoring & Analytics**

### **Workflow Status**

Monitor automation health:

- **GitHub Actions tab** → View all workflow runs
- **Releases page** → See automated releases
- **Issues/PRs** → Templates guide contributors

### **Release Metrics**

Track release success:

- Download counts on release assets
- Build time trends in Actions
- Error rates and failure patterns

## 🎯 **Best Practices**

### **For Maintainers**

1. **Test Before Release**:

   ```bash
   npm run ci:validate
   npm run build && ls -la xpi/
   ```

2. **Use Semantic Versioning**:
   - Patch: Bug fixes, minor improvements
   - Minor: New features, backward compatible
   - Major: Breaking changes

3. **Review Generated Releases**:
   - Check changelog accuracy
   - Verify XPI attachment
   - Test download and installation

### **For Contributors**

1. **Follow PR Template**: Complete all checklist items
2. **Test Thoroughly**: Multiple OS and Zotero versions
3. **Write Good Commits**: Help with changelog generation
4. **Update Documentation**: Keep README current

## 🔗 **Related Files**

- 📋 [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml)
- 📝 [Pull Request Template](.github/pull_request_template.md)
- 🔨 [CI Workflow](.github/workflows/ci.yml)
- 🚀 [Release Workflow](.github/workflows/release.yml)
- 📦 [Version Bump Script](scripts/version-bump.js)
- 📖 [Main README](../README.md)

---

**Need help?** Open an issue with the `automation` label! 🤖
