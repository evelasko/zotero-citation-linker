import path from 'path'
import fs from 'fs'
import esbuild from 'esbuild'
import { sync as rimrafSync } from 'rimraf'

// Clean previous build
rimrafSync('build')

// Import zotero-plugin utilities using dynamic imports
// Note: These modules may not support ES modules yet, so we'll handle errors gracefully
try {
  await import('zotero-plugin/copy-assets')
  await import('zotero-plugin/rdf')
  await import('zotero-plugin/version')
} catch (error) {
  console.log('Note: Some zotero-plugin utilities may not be available:', error.message)
}

function js(src) {
  return src.replace(/[.]ts$/, '.js')
}

async function copyAssets() {
  // Create build directory
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build')
  }

  // Copy manifest.json
  fs.copyFileSync('manifest.json', 'build/manifest.json')

  // Copy prefs.js if it exists
  if (fs.existsSync('prefs.js')) {
    fs.copyFileSync('prefs.js', 'build/prefs.js')
  }

  // Copy locale directory
  if (fs.existsSync('locale')) {
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }
      const files = fs.readdirSync(src)
      for (const file of files) {
        const srcPath = path.join(src, file)
        const destPath = path.join(dest, file)
        if (fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath)
        } else {
          fs.copyFileSync(srcPath, destPath)
        }
      }
    }
    copyDir('locale', 'build/locale')
  }

  console.log('* copying assets completed')
}

async function bundle(config) {
  config = {
    bundle: true,
    format: 'iife',
    target: ['firefox60'],
    inject: [],
    treeShaking: true,
    keepNames: true,
    ...config,
  }

  let target
  if (config.outfile) {
    target = config.outfile
  }
  else if (config.entryPoints.length === 1 && config.outdir) {
    target = path.join(config.outdir, js(path.basename(config.entryPoints[0])))
  }
  else {
    target = `${config.outdir} [${config.entryPoints.map(js).join(', ')}]`
  }

  const exportGlobals = config.exportGlobals
  delete config.exportGlobals
  if (exportGlobals) {
    const esm = await esbuild.build({ ...config, logLevel: 'silent', format: 'esm', metafile: true, write: false })
    if (Object.values(esm.metafile.outputs).length !== 1) throw new Error('exportGlobals not supported for multiple outputs')

    for (const output of Object.values(esm.metafile.outputs)) {
      if (output.entryPoint) {
        config.globalName = escape(`{ ${output.exports.sort().join(', ')} }`).replace(/%/g, '$')
        // make these var, not const, so they get hoisted and are available in the global scope.
      }
    }
  }

  console.log('* bundling', target)
  await esbuild.build(config)
  if (exportGlobals) {
    await fs.promises.writeFile(
      target,
      (await fs.promises.readFile(target, 'utf-8')).replace(config.globalName, unescape(config.globalName.replace(/[$]/g, '%'))),
    )
  }
}

async function build() {
  // Copy assets first
  await copyAssets()

  // Bundle bootstrap with export globals for Zotero 7 compatibility
  await bundle({
    exportGlobals: true,
    entryPoints: ['bootstrap.ts'],
    outdir: 'build',
    banner: { js: 'var Zotero;\n' },
  })

  // Bundle main library
  await bundle({
    entryPoints: ['lib.ts'],
    outdir: 'build',
  })

  console.log('Build completed successfully!')
  console.log('')
  console.log('To install the plugin in Zotero:')
  console.log('1. Open Zotero')
  console.log('2. Go to Tools > Add-ons')
  console.log('3. Click the gear icon and select "Install Add-on From File..."')
  console.log('4. Navigate to the "build" directory in this project')
  console.log('5. Select the manifest.json file from the build directory')
  console.log('')
  console.log('Note: Always install from the "build" directory, not the root project directory!')
}

build().catch(err => {
  console.error('Build failed:', err)
  process.exit(1)
})