import { IService } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { uiLogger as logger } from '../core/Logger'

declare const ztoolkit: any

/**
 * Keyboard shortcuts service for Zotero Citation Linker
 * Handles keyboard shortcut registration using zotero-plugin-toolkit
 */
export class KeyboardShortcuts implements IService {
  private initialized = false
  private serviceManager: ServiceManager

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing keyboard shortcuts with toolkit (enhanced for Task 3)')

    try {
      await this.registerShortcuts()
      this.initialized = true
      logger.info('Keyboard shortcuts initialized successfully with toolkit')
    } catch (error) {
      logger.error(`Error initializing keyboard shortcuts: ${error}`)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up keyboard shortcuts')

    try {
      // Toolkit will handle cleanup automatically through unregisterAll()
      this.initialized = false
      logger.info('Keyboard shortcuts cleaned up')
    } catch (error) {
      logger.error(`Error cleaning up keyboard shortcuts: ${error}`)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Register keyboard shortcuts with Zotero
   */
  private async registerShortcuts(): Promise<void> {
    // Register keyboard shortcut using toolkit
    ztoolkit.Keyboard.register((event: any) => {
      // Check if Ctrl+Shift+C (or Cmd+Shift+C on Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyC') {
        event.preventDefault()
        this.handleCopyMarkdownShortcut()
      }
    })

    logger.debug('Registered Ctrl+Shift+C (Cmd+Shift+C on Mac) shortcut for copying Markdown links')
  }

  /**
   * Handle the keyboard shortcut for copying Markdown links
   */
  private async handleCopyMarkdownShortcut(): Promise<void> {
    logger.info('Keyboard shortcut Ctrl+Shift+C triggered for copying Markdown link')

    try {
      // Get ZoteroPane safely
      const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
      if (!ZoteroPane) {
        logger.error('ZoteroPane not available')
        return
      }

      const selectedItems = ZoteroPane.getSelectedItems()
      if (!selectedItems || selectedItems.length === 0) {
        logger.warn('No items selected for keyboard shortcut')
        return
      }

      // Filter to regular items only
      const regularItems = selectedItems.filter(item => item.isRegularItem())
      if (regularItems.length === 0) {
        logger.warn('No regular items selected for keyboard shortcut')
        return
      }

      // Generate and copy markdown links directly
      try {
        await this.serviceManager.citationGenerator.generateAndCopyMarkdownLink(regularItems)
      } catch (error) {
        logger.error(`Error generating markdown links via keyboard shortcut: ${error}`)
        return
      }

      logger.info(`Successfully copied ${regularItems.length} citation(s) to clipboard via keyboard shortcut`)
    } catch (error) {
      logger.error(`Error in handleCopyMarkdownShortcut: ${error}`)
    }
  }

  /**
   * Copy text to clipboard using Zotero's clipboard helper
   * @param text - Text to copy
   */
  private copyToClipboard(text: string): void {
    try {
      Components.classes['@mozilla.org/widget/clipboardhelper;1']
        .getService(Components.interfaces.nsIClipboardHelper)
        .copyString(text)
    } catch (error) {
      logger.error(`Error copying to clipboard: ${error}`)
      throw error
    }
  }

  /**
   * Get current shortcut configuration
   * @returns Shortcut configuration object
   */
  getShortcutConfig(): {
    enabled: boolean
    shortcut: string
    description: string
  } {
    return {
      enabled: true,
      shortcut: 'Ctrl+Shift+C (Cmd+Shift+C on Mac)',
      description: 'Copy Markdown citation link for selected items',
    }
  }

  /**
   * Check if shortcuts are enabled
   * @returns True if shortcuts are enabled
   */
  isShortcutEnabled(): boolean {
    try {
      const enabled = Zotero.Prefs.get('extensions.zotero-citation-linker.shortcutEnabled', true)
      return Boolean(enabled)
    } catch (error) {
      logger.debug(`Error checking shortcut preference: ${error}`)
      return true
    }
  }

  /**
   * Enable or disable shortcuts
   * @param enabled - Whether to enable shortcuts
   */
  setShortcutEnabled(enabled: boolean): void {
    try {
      Zotero.Prefs.set('extensions.zotero-citation-linker.shortcutEnabled', enabled)
      logger.info(`Keyboard shortcuts ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      logger.error(`Error setting shortcut preference: ${error}`)
    }
  }
}