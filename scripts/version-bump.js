#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Automated Version Bump Script
 * Updates version numbers in package.json and manifest.json
 * Usage: node scripts/version-bump.js [major|minor|patch|<specific-version>]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

function updateVersion(type = 'patch') {
  console.log(`🔄 Starting version bump: ${type}`)

  // Read package.json
  const packagePath = path.join(__dirname, '..', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

  // Read manifest.json
  const manifestPath = path.join(__dirname, '..', 'manifest.json')
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  const currentVersion = packageJson.version
  console.log(`📦 Current version: ${currentVersion}`)

  let newVersion

  if (type.match(/^\d+\.\d+\.\d+/)) {
    // Specific version provided
    newVersion = type
  } else {
    // Calculate new version based on type
    const [major, minor, patch] = currentVersion.split('.').map(Number)

    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`
        break
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`
        break
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`
        break
    }
  }

  console.log(`🆕 New version: ${newVersion}`)

  // Update package.json
  packageJson.version = newVersion
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log('✅ Updated package.json')

  // Update manifest.json
  manifestJson.version = newVersion
  fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2) + '\n')
  console.log('✅ Updated manifest.json')

  // Update version in bootstrap.ts (if it contains version info)
  const bootstrapPath = path.join(__dirname, '..', 'bootstrap.ts')
  if (fs.existsSync(bootstrapPath)) {
    let bootstrapContent = fs.readFileSync(bootstrapPath, 'utf8')

    // Look for version strings like «1.1.0» and update them
    const versionRegex = /«(\d+\.\d+\.\d+)»/g
    if (bootstrapContent.match(versionRegex)) {
      bootstrapContent = bootstrapContent.replace(versionRegex, `«${newVersion}»`)
      fs.writeFileSync(bootstrapPath, bootstrapContent)
      console.log('✅ Updated version in bootstrap.ts')
    }
  }

  console.log(`🎉 Version bump completed: ${currentVersion} → ${newVersion}`)
  console.log('\n📋 Next steps:')
  console.log('   1. Review changes: git diff')
  console.log(`   2. Commit changes: git add . && git commit -m "chore: bump version to ${newVersion}"`)
  console.log(`   3. Create tag: git tag -a v${newVersion} -m "Release version ${newVersion}"`)
  console.log('   4. Push changes: git push origin main --tags')
  console.log('   5. Create GitHub release or let Actions handle it automatically')

  return newVersion
}

// ES module equivalents of __filename and __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Run if called directly
if (process.argv[1] === __filename) {
  const type = process.argv[2] || 'patch'
  updateVersion(type)
}

export { updateVersion }