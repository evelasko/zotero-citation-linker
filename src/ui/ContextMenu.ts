import { IService } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { uiLogger as logger } from '../core/Logger'

declare const ztoolkit: any

/**
 * Context menu service for Zotero items
 * Handles menu integration using zotero-plugin-toolkit
 */
export class ContextMenu implements IService {
  private initialized = false
  private serviceManager: ServiceManager

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing enhanced context menu integration with toolkit')

    try {
      await this.registerMenuItems()
      this.initialized = true
      logger.info('Enhanced context menu integration initialized successfully with toolkit')
    } catch (error) {
      logger.error(`Error initializing enhanced context menu with toolkit: ${error}`)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up context menu service')

    try {
      // Toolkit will handle cleanup automatically through unregisterAll()
      this.initialized = false
      logger.info('Context menu service cleaned up')
    } catch (error) {
      logger.error(`Error cleaning up context menu service: ${error}`)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Register context menu items with Zotero
   */
  private async registerMenuItems(): Promise<void> {
    // Add a separator before our menu items for better organization
    ztoolkit.Menu.register('item', {
      tag: 'menuseparator',
      id: 'zotero-citation-linker-separator',
    })

    // Main "Copy Markdown Link" menu item
    ztoolkit.Menu.register('item', {
      tag: 'menuitem',
      id: 'zotero-citation-linker-copy-markdown',
      label: 'Copy Markdown Link',
      icon: 'chrome://zotero/skin/citation.png',
      commandListener: () => {
        this.handleCopyMarkdownCommand()
      },
      isHidden: () => {
        try {
          const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
          if (!ZoteroPane) return true
          const items = ZoteroPane.getSelectedItems()
          if (!items || items.length === 0) return true
          return !items.some(item => item.isRegularItem())
        } catch (error) {
          logger.debug(`Error in isHidden callback: ${error}`)
          return true
        }
      },
      onShowing: (elem: any) => {
        elem.setAttribute('tooltiptext', 'Copy a formatted Markdown citation with API link')
      },
    })

    // Additional menu item for copying just the API URL
    ztoolkit.Menu.register('item', {
      tag: 'menuitem',
      id: 'zotero-citation-linker-copy-api-url',
      label: 'Copy API URL',
      icon: 'chrome://zotero/skin/link.png',
      commandListener: () => {
        this.handleCopyApiUrlCommand()
      },
      isHidden: () => {
        try {
          const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
          if (!ZoteroPane) return true
          const items = ZoteroPane.getSelectedItems()
          if (!items || items.length === 0) return true
          return !items.some(item => item.isRegularItem())
        } catch (error) {
          logger.debug(`Error in isHidden callback: ${error}`)
          return true
        }
      },
      onShowing: (elem: any) => {
        elem.setAttribute('tooltiptext', 'Copy the Zotero API URL for this item')
      },
    })
  }

  /**
   * Handle the "Copy Markdown Link" context menu command
   */
  private async handleCopyMarkdownCommand(): Promise<void> {
    logger.info('Copy Markdown Link command triggered')

    try {
      // Get ZoteroPane safely
      const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
      if (!ZoteroPane) {
        logger.error('ZoteroPane not available')
        return
      }

      const selectedItems = ZoteroPane.getSelectedItems()
      if (!selectedItems || selectedItems.length === 0) {
        logger.warn('No items selected')
        return
      }

      // Filter to regular items only
      const regularItems = selectedItems.filter(item => item.isRegularItem())
      if (regularItems.length === 0) {
        logger.warn('No regular items selected')
        return
      }

      // Generate and copy markdown links directly
      try {
        await this.serviceManager.citationGenerator.generateAndCopyMarkdownLink(regularItems)
      } catch (error) {
        logger.error(`Error generating markdown links: ${error}`)
        return
      }

      logger.info(`Successfully copied ${regularItems.length} citation(s) to clipboard`)
    } catch (error) {
      logger.error(`Error in handleCopyMarkdownCommand: ${error}`)
    }
  }

  /**
   * Handle the "Copy API URL" context menu command
   */
  private async handleCopyApiUrlCommand(): Promise<void> {
    logger.info('Copy API URL command triggered')

    try {
      const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
      if (!ZoteroPane) {
        logger.error('ZoteroPane not available')
        return
      }

      const selectedItems = ZoteroPane.getSelectedItems()
      if (!selectedItems || selectedItems.length === 0) {
        logger.warn('No items selected')
        return
      }

      const regularItems = selectedItems.filter(item => item.isRegularItem())
      if (regularItems.length === 0) {
        logger.warn('No regular items selected')
        return
      }

      // Generate API URLs for all selected items
      const apiUrls: string[] = []
      const apiServer = this.serviceManager.apiServer

      for (const item of regularItems) {
        try {
          const apiUrl = this.generateApiUrl(item, apiServer.getServerPort())
          if (apiUrl) {
            apiUrls.push(apiUrl)
          }
        } catch (error) {
          logger.error(`Error generating API URL for item ${item.key}: ${error}`)
        }
      }

      if (apiUrls.length === 0) {
        logger.warn('No API URLs could be generated')
        return
      }

      // Copy to clipboard
      const urlText = apiUrls.join('\n')
      this.copyToClipboard(urlText)

      logger.info(`Successfully copied ${apiUrls.length} API URL(s) to clipboard`)
    } catch (error) {
      logger.error(`Error in handleCopyApiUrlCommand: ${error}`)
    }
  }

  /**
   * Generate API URL for an item
   * @param item - Zotero item
   * @param port - API server port
   * @returns API URL string
   */
  private generateApiUrl(item: any, port: number): string {
    const libraryID = item.libraryID || Zotero.Libraries.userLibraryID
    const itemKey = item.key
    return `http://localhost:${port}/citationlinker/item/${libraryID}/${itemKey}`
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
}