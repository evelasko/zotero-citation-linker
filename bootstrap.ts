/// <reference types="zotero-types/entries/sandbox" />

import { Logger } from 'zotero-plugin/logger'
import { ZoteroToolkit } from 'zotero-plugin-toolkit'

const logger = new Logger('ZoteroCitationLinker')

// Create toolkit instance that will be available to lib.js
let ztoolkit: any

export async function install() {
  logger.info('Plugin installed')
}

export async function startup({ id, version, resourceURI, rootURI = resourceURI.spec }) {
  logger.info(`Starting up plugin v${version} «1.1.4» - ${id}`)

  try {
    // Initialize toolkit instance
    ztoolkit = new ZoteroToolkit()

    // Update toolkit with plugin information
    ztoolkit.updateOptions({
      log: {
        disableConsole: false,
        disableZLog: false,
        prefix: 'ZoteroCitationLinker',
      },
      api: {
        pluginID: id,
      },
    })

    // Load main library with toolkit available in the global scope
    Services.scriptloader.loadSubScript(`${rootURI}lib.js`, {
      Zotero,
      ztoolkit,
    })

    // Initialize the plugin (this will load the server endpoint)
    ;(Zotero as any).ZoteroCitationLinker.install()

    logger.info('Plugin startup completed successfully')
  }
  catch (err) {
    logger.error(`Startup error: ${err}: ${err.stack}`)
    throw err
  }
}

export function shutdown() {
  logger.info('Shutting down plugin')

  if ((Zotero as any).ZoteroCitationLinker) {
    ;(Zotero as any).ZoteroCitationLinker.uninstall()
    ;(Zotero as any).ZoteroCitationLinker = undefined
  }

  // Cleanup toolkit
  if (ztoolkit) {
    ztoolkit.unregisterAll()
    ztoolkit = undefined
  }

  logger.info('Plugin shutdown completed')
}

export function uninstall() {
  logger.info('Plugin uninstalled')
}
