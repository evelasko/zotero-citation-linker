/// <reference types="zotero-types/entries/mainWindow" />

import { Plugin } from './src/core/Plugin'
import { logger } from './src/core/Logger'
import { PLUGIN_VERSION } from './src/config/constants'

// Declare the toolkit variable that's passed from bootstrap.js
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
declare const ztoolkit: any

// Global URL constructor declaration for TypeScript
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
declare const URL: typeof globalThis.URL

const {
  utils: Cu,
} = Components

if (Zotero.platformMajorVersion < 102) {
  Cu.importGlobalProperties(['fetch', 'URL'])
} else {
  // Ensure URL is available for newer versions too
  try {
    Cu.importGlobalProperties(['URL'])
  } catch {
    // URL might already be available globally
  }
}

/**
 * Zotero Citation Linker Plugin
 *
 * A modular Zotero plugin that provides:
 * - Context menu integration for copying Markdown citations
 * - Keyboard shortcuts for quick citation copying
 * - HTTP API server for external integrations
 * - Web and identifier-based translation services
 * - Advanced duplicate detection and metadata validation
 * - Comprehensive citation generation in multiple formats
 *
 * Architecture:
 * - ServiceManager: Coordinates all core services
 * - UIManager: Manages context menus, shortcuts, and notifications
 * - TranslatorManager: Handles web and identifier translations
 * - ApiServer: Provides HTTP API endpoints
 * - Various utility services for validation, citation generation, etc.
 */
;(Zotero as any).ZoteroCitationLinker = new class {
  private plugin: Plugin

  constructor() {
    logger.info('Initializing Zotero Citation Linker with modular architecture')
    // Log plugin version for development verification
    logger.info(`Plugin Version: ${PLUGIN_VERSION}`)
    // Log environment mode
    logger.info(`Environment: ${process.env.NODE_ENV === 'development' ? 'Development' : 'Production'}`)
    this.plugin = new Plugin()
  }

  /**
   * Install and initialize the plugin
   * Called when the plugin is first loaded by Zotero
   */
  async install() {
    try {
      await this.plugin.install()
    } catch (error) {
      logger.error(`Plugin installation failed: ${error}`)
      // Show user-friendly error
      this.showError('Plugin Installation Failed', `Failed to install Zotero Citation Linker: ${error}`)
      throw error
    }
  }

  /**
   * Uninstall and cleanup the plugin
   * Called when the plugin is being disabled or removed
   */
  async uninstall() {
    try {
      await this.plugin.uninstall()
    } catch (error) {
      logger.error(`Plugin uninstallation failed: ${error}`)
      // Continue with uninstallation even if there are errors
    }
  }

  /**
   * Startup method - called after installation
   */
  async startup() {
    try {
      await this.plugin.startup()
    } catch (error) {
      logger.error(`Plugin startup failed: ${error}`)
      this.showError('Plugin Startup Failed', `Failed to start Zotero Citation Linker: ${error}`)
    }
  }

  /**
   * Shutdown method - called before uninstallation
   */
  async shutdown() {
    try {
      await this.plugin.shutdown()
    } catch (error) {
      logger.error(`Plugin shutdown failed: ${error}`)
    }
  }

  /**
   * Handle Zotero notifications
   * Delegates to the plugin's notification handler
   */
  notify(event: string, type: string, ids: number[]) {
    try {
      this.plugin.notify(event, type, ids)
    } catch (error) {
      logger.error(`Error handling notification: ${error}`)
    }
  }

  /**
   * Get the plugin instance (for advanced users and debugging)
   * @returns Plugin instance
   */
  getPlugin(): Plugin {
    return this.plugin
  }

  /**
   * Get plugin status (for debugging and troubleshooting)
   * @returns Plugin status information
   */
  getStatus() {
    return this.plugin.getStatus()
  }

  /**
   * Get plugin version information
   * @returns Version information
   */
  getVersion() {
    return this.plugin.getVersion()
  }

  /**
   * Show plugin status in user interface
   */
  showStatus() {
    this.plugin.showStatus()
  }

  /**
   * Restart the plugin (useful for development and troubleshooting)
   */
  async restart() {
    try {
      await this.plugin.restart()
      this.showSuccess('Plugin Restarted', 'Zotero Citation Linker has been restarted successfully')
    } catch (error) {
      logger.error(`Plugin restart failed: ${error}`)
      this.showError('Plugin Restart Failed', `Failed to restart plugin: ${error}`)
    }
  }

  /**
   * Access to service managers for advanced usage
   */
  get services() {
    return this.plugin.getServiceManager()
  }

  get ui() {
    return this.plugin.getServiceManager().uiManager
  }

  get translators() {
    return this.plugin.getServiceManager().translatorManager
  }

  get api() {
    return this.plugin.getServiceManager().apiServer
  }

  get citations() {
    return this.plugin.getServiceManager().citationGenerator
  }

  get duplicates() {
    return this.plugin.getServiceManager().duplicateDetector
  }

  get validator() {
    return this.plugin.getServiceManager().itemValidator
  }

  /**
   * Show success notification
   */
  private showSuccess(title: string, message: string) {
    try {
      if (this.plugin.isInitialized()) {
        this.plugin.getServiceManager().uiManager.showSuccess(title, message)
      } else {
        logger.info(`${title}: ${message}`)
      }
    } catch {
      logger.info(`${title}: ${message}`)
    }
  }

  /**
   * Show error notification
   */
  private showError(title: string, message: string) {
    try {
      if (this.plugin.isInitialized()) {
        this.plugin.getServiceManager().uiManager.showError(title, message)
      } else {
        // Fallback to Zotero's alert system
        const prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1']
          .getService(Components.interfaces.nsIPromptService)
        prompts.alert(null, title, message)
      }
    } catch {
      // Last resort - log to console
      // eslint-disable-next-line no-console
      console.error(`${title}: ${message}`)
    }
  }

  /**
   * Legacy compatibility methods
   * These provide backward compatibility with any external code that might be calling the old methods
   */

  /**
   * @deprecated Use services.citationGenerator.generateAndCopyMarkdownLink() instead
   */
  async generateAndCopyMarkdownLink(items: any[]) {
    logger.warn('Using deprecated method generateAndCopyMarkdownLink. Please use services.citationGenerator.generateAndCopyMarkdownLink() instead.')
    if (this.plugin.isInitialized()) {
      return await this.plugin.getServiceManager().citationGenerator.generateAndCopyMarkdownLink(items)
    }
    throw new Error('Plugin not initialized')
  }

  /**
   * @deprecated Use translators.attemptTranslation() instead
   */
  async processUrl(url: string) {
    logger.warn('Using deprecated method processUrl. Please use translators.attemptTranslation() instead.')
    if (this.plugin.isInitialized()) {
      return await this.plugin.getServiceManager().translatorManager.attemptTranslation(url)
    }
    throw new Error('Plugin not initialized')
  }

  /**
   * @deprecated Use duplicates.detectDuplicates() instead
   */
  async detectDuplicates(item: any) {
    logger.warn('Using deprecated method detectDuplicates. Please use duplicates.detectDuplicates() instead.')
    if (this.plugin.isInitialized()) {
      return await this.plugin.getServiceManager().duplicateDetector.detectDuplicates(item)
    }
    throw new Error('Plugin not initialized')
  }
}

// Export the plugin instance for external access if needed
export default (Zotero as any).ZoteroCitationLinker

/**
 * Plugin Development Utilities
 *
 * These utilities are available in the browser console for debugging and development:
 *
 * Examples:
 * - Zotero.ZoteroCitationLinker.getStatus() - Get plugin status
 * - Zotero.ZoteroCitationLinker.showStatus() - Show status in UI
 * - Zotero.ZoteroCitationLinker.restart() - Restart the plugin
 * - Zotero.ZoteroCitationLinker.services - Access ServiceManager
 * - Zotero.ZoteroCitationLinker.ui - Access UIManager
 * - Zotero.ZoteroCitationLinker.translators - Access TranslatorManager
 * - Zotero.ZoteroCitationLinker.api - Access ApiServer
 *
 * For debugging specific services:
 * - Zotero.ZoteroCitationLinker.services.getServicesStatus()
 * - Zotero.ZoteroCitationLinker.ui.getUIStatus()
 * - Zotero.ZoteroCitationLinker.translators.getTranslatorStatus()
 * - Zotero.ZoteroCitationLinker.api.getServerStatus()
 */
