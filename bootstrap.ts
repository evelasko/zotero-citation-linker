/// <reference types="zotero-types/entries/sandbox" />

import { Logger } from 'zotero-plugin/logger'
const logger = new Logger('ZoteroCitationLinker')

export async function install() {
  logger.info('Plugin installed')
}

export async function startup({ id, version, resourceURI, rootURI = resourceURI.spec }) {
  logger.info(`Starting up plugin v${version} [1] - ${id}`)

  try {
    // Load main library
    Services.scriptloader.loadSubScript(`${rootURI}lib.js`, { Zotero })

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

  logger.info('Plugin shutdown completed')
}

export function uninstall() {
  logger.info('Plugin uninstalled')
}
