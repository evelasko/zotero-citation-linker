/// <reference types="zotero-types/entries/mainWindow" />

import { Logger } from 'zotero-plugin/logger'
const logger = new Logger('ZoteroCitationLinker')
const elogger = new Logger('ZoteroCitationLinker Server Endpoint')

// Declare the toolkit variable that's passed from bootstrap.js
declare const ztoolkit: any

const {
  utils: Cu,
} = Components

if (Zotero.platformMajorVersion < 102) {
  Cu.importGlobalProperties(['fetch', 'URL'])
}

/**
 * Main plugin class for Zotero Citation Linker
 * Enhanced with zotero-plugin-toolkit for better menu management and functionality
 *
 * Provides functionality to:
 * 1. Copy Markdown citations with API links
 * 2. Local HTTP server for external applications
 * 3. Context menu integration (using toolkit MenuManager)
 * 4. Keyboard shortcuts (using toolkit KeyboardManager)
 */
;(Zotero as any).ZoteroCitationLinker = new class {
  private notifierID: string
  private apiServer: any = null
  private keyboardShortcutService: any = null

  /**
   * Get localized string with fallback
   * Helper method to safely get localized strings
   * @param key - The localization key
   * @param fallback - Fallback string if localization fails
   * @returns Localized string or fallback
   */
  private getLocalizedString(key: string, fallback: string): string {
    try {
      // Try to get localized string from Zotero
      // Note: This requires proper localization file registration
      const localized = Zotero.getString(key)
      return localized || fallback
    } catch {
      // If localization fails, log debug info and return fallback
      logger.debug(`Localization key '${key}' not found, using fallback`)
      return fallback
    }
  }

  /**
   * Install and initialize the plugin
   */
  install() {
    logger.info('Installing plugin services with toolkit')

    // TODO: Register localization files for proper i18n support
    // This would enable the getLocalizedString method to work with Zotero.getString()

    // Register for item notifications
    this.notifierID = Zotero.Notifier.registerObserver(this, ['item'])

    // Initialize services using toolkit
    this.initializeContextMenu()
    this.initializeKeyboardShortcuts()
    this.initializeApiServer()

    logger.info('Plugin services installed successfully')
  }

  /**
   * Uninstall and cleanup the plugin
   */
  uninstall() {
    logger.info('Uninstalling plugin services')

    // Unregister notifier
    if (this.notifierID) {
      Zotero.Notifier.unregisterObserver(this.notifierID)
    }

    // Cleanup services (toolkit will handle its own cleanup)
    this.cleanupKeyboardShortcuts()
    this.cleanupApiServer()

    logger.info('Plugin services uninstalled')
  }

  /**
   * Initialize context menu integration using toolkit MenuManager
   * Enhanced with proper global access and error handling
   */
  private initializeContextMenu() {
    logger.info('Initializing enhanced context menu integration with toolkit')

    try {
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

      logger.info('Enhanced context menu integration initialized successfully with toolkit')
    } catch (error) {
      logger.error(`Error initializing enhanced context menu with toolkit: ${error}`)
    }
  }

  /**
   * Handle the "Copy Markdown Link" context menu command
   */
  private async handleCopyMarkdownCommand() {
    logger.info('Copy Markdown Link command triggered')

    try {
      // Get ZoteroPane safely
      const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
      if (!ZoteroPane) {
        logger.error('ZoteroPane not available')
        ztoolkit.log('Error: ZoteroPane not available')
        return
      }

      // Get selected items from ZoteroPane
      const items = ZoteroPane.getSelectedItems()

      if (!items || items.length === 0) {
        logger.error('No items selected for Markdown link generation')
        ztoolkit.log('Warning: No items selected')
        return
      }

      // Validate items are regular items (not attachments, notes, etc.)
      const regularItems = items.filter(item => item.isRegularItem())
      if (regularItems.length === 0) {
        logger.error('No regular items selected for citation generation')
        ztoolkit.log('Warning: Please select bibliographic items for citation generation')
        return
      }

      // Generate and copy the Markdown link
      await this.generateAndCopyMarkdownLink(regularItems)

    } catch (error) {
      logger.error(`Error in handleCopyMarkdownCommand: ${error}`)
      ztoolkit.log(`Error: Failed to copy Markdown link: ${error.message}`)
    }
  }

  /**
   * Handle the "Copy API URL" context menu command
   */
  private async handleCopyApiUrlCommand() {
    logger.info('Copy API URL command triggered')

    try {
      // Get ZoteroPane safely
      const ZoteroPane = ztoolkit.getGlobal('ZoteroPane')
      if (!ZoteroPane) {
        logger.error('ZoteroPane not available')
        ztoolkit.log('Error: ZoteroPane not available')
        return
      }

      const items = ZoteroPane.getSelectedItems()

      if (!items || items.length === 0) {
        logger.error('No items selected for API URL generation')
        ztoolkit.log('Warning: No items selected for API URL generation')
        return
      }

      const regularItems = items.filter(item => item.isRegularItem())
      if (regularItems.length === 0) {
        logger.error('No regular items selected for API URL generation')
        ztoolkit.log('Warning: Please select bibliographic items for API URL generation')
        return
      }

      const firstItem = regularItems[0]
      const itemKey = firstItem.key
      const library = firstItem.library

      let apiUrl: string
      // Check if this is a group library
      if ((library as any).type === 'group') {
        apiUrl = `https://api.zotero.org/groups/${(library as any).id}/items/${itemKey}`
      } else {
        // For user libraries, use Zotero.Users.getCurrentUserID()
        const userID = Zotero.Users.getCurrentUserID()
        if (userID) {
          apiUrl = `https://api.zotero.org/users/${userID}/items/${itemKey}`
        } else {
          // Fallback if no user ID available (offline mode)
          apiUrl = `zotero://select/library/items/${itemKey}`
        }
      }

      const clipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
        .getService(Components.interfaces.nsIClipboardHelper)
      clipboardHelper.copyString(apiUrl)

      ztoolkit.log('API URL copied to clipboard')

    } catch (error) {
      logger.error(`Error in handleCopyApiUrlCommand: ${error}`)
      ztoolkit.log(`Error: Failed to copy API URL: ${error.message}`)
    }
  }

  /**
   * Initialize keyboard shortcuts using toolkit KeyboardManager
   * Enhanced implementation for Task 3
   */
  private initializeKeyboardShortcuts() {
    logger.info('Initializing keyboard shortcuts with toolkit (enhanced for Task 3)')

    try {
      // Register keyboard shortcut using toolkit
      ztoolkit.Keyboard.register((event: any) => {
        // Check if Ctrl+Shift+C (or Cmd+Shift+C on Mac)
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyC') {
          event.preventDefault()
          this.handleCopyMarkdownCommand()
        }
      })

      logger.info('Keyboard shortcuts initialized successfully with toolkit')
    } catch (error) {
      logger.error(`Error initializing keyboard shortcuts: ${error}`)
    }
  }

  /**
   * Cleanup keyboard shortcuts
   */
  private cleanupKeyboardShortcuts() {
    logger.info('Cleaning up keyboard shortcuts')
    // Toolkit will handle cleanup automatically through unregisterAll()
  }

  /**
   * > Initialize the local API server
   * Registers the /citationlinker/processurl endpoint
   */
  private initializeApiServer() {
    elogger.info('Initializing API server endpoints')
         try {
       // Ensure server is running
       if (!(Zotero.Server as any).port) {
         elogger.info('Zotero server not running, attempting to start...')
         const server = Zotero.Server as any
         server.init()
       }

       // Register our endpoint
       this.registerProcessUrlEndpoint()

       elogger.info(`API server initialized - endpoints available on port ${(Zotero.Server as any).port}`)
     } catch (error) {
       elogger.error(`Error initializing API server: ${error}`)
     }
   }

   /**
    * Register the processurl endpoint
    */
   private registerProcessUrlEndpoint() {
     const self = this

     // Define the endpoint constructor
     const ProcessUrlEndpoint = function() {}

     ProcessUrlEndpoint.prototype = {
      supportedMethods: ['POST'],
      supportedDataTypes: ['application/json'],

      init: async function(requestData) {
        try {
          // Validate request data
          const validationResult = self._validateRequest(requestData)
          if (!validationResult.valid) {
            return self._errorResponse(400, validationResult.error)
          }

          const { url } = requestData.data
          elogger.info(`Processing URL: ${url}`)

          // Check if library is editable
          const { library } = (Zotero.Server as any).Connector.getSaveTarget()
          if (!library.editable) {
            return self._errorResponse(500, 'Target library is not editable')
          }

          // Attempt to translate the URL
          const translationResult = await self._attemptTranslation(url)

          if (translationResult.success) {
            // Translation successful - save the items
            elogger.info(`Translation successful - saving ${translationResult.items.length} items`)
            const saveResult = await self._saveTranslatedItems(url, translationResult.items)
            if (saveResult.success) {
              elogger.info('Items saved successfully')
              return self._successResponse(saveResult.items, 'translation', translationResult.translator)
            } else {
              return self._errorResponse(500, `Failed to save translated items: ${saveResult.error}`)
            }
          } else {
            // Translation failed - fall back to webpage save
            elogger.info(`Translation failed (${translationResult.reason}), falling back to webpage save`)

            const webpageResult = await self._saveAsWebpage(url)
            if (webpageResult.success) {
              return self._successResponse([webpageResult.item], 'webpage', 'Built-in webpage creator')
            } else {
              return self._errorResponse(500, `Failed to save as webpage: ${webpageResult.error}`)
            }
          }

        } catch (error) {
          Zotero.logError(new Error(`CitationLinker error: ${error.message}`))
          Zotero.logError(error)
          return self._errorResponse(500, `Internal server error: ${error.message}`)
        }
      },
    }

    // Register the endpoint
    Zotero.Server.Endpoints['/citationlinker/processurl'] = ProcessUrlEndpoint
    elogger.info('Registered /citationlinker/processurl endpoint')
  }

  /**
   * Cleanup the API server
   */
  private cleanupApiServer() {
    elogger.info('Cleaning up API server endpoints')

    try {
      // Remove our endpoint
      delete Zotero.Server.Endpoints['/citationlinker/processurl']
      elogger.info('Removed /citationlinker/processurl endpoint')
    } catch (error) {
      elogger.error(`Error cleaning up API endpoints: ${error}`)
    }
  }

  /**
   * Generate and copy Markdown citation to clipboard
   * Enhanced with proper localization and better user feedback
   * @param items - Array of Zotero items
   */
  async generateAndCopyMarkdownLink(items: any[]) {
    elogger.info(`Generating Markdown link for ${items.length} item(s)`)

    if (!items || items.length === 0) {
      elogger.error('No items provided')
      return false
    }

    try {
      // Placeholder implementation - will be fully implemented in Task 4
      // For now, generate a simple citation with the first item
      const firstItem = items[0]
      const title = firstItem.getField('title') || 'Untitled'
      const creators = firstItem.getCreators()
      const year = firstItem.getField('date') ? new Date(firstItem.getField('date')).getFullYear() : ''

      // Create a simple author-year citation
      let citation = ''
      if (creators.length > 0) {
        const author = creators[0].lastName || creators[0].name
        citation = year ? `${author} (${year})` : author
      } else {
        citation = year ? `(${year})` : title
      }

      // Generate API URL using Zotero.Users.getCurrentUserID()
      const library = firstItem.library
      const itemKey = firstItem.key
      let apiUrl: string

      // Check if this is a group library
      if ((library as any).type === 'group') {
        apiUrl = `https://api.zotero.org/groups/${(library as any).id}/items/${itemKey}`
      } else {
        // For user libraries, use Zotero.Users.getCurrentUserID()
        const userID = Zotero.Users.getCurrentUserID()
        if (userID) {
          apiUrl = `https://api.zotero.org/users/${userID}/items/${itemKey}`
        } else {
          // Fallback if no user ID available (offline mode)
          apiUrl = `zotero://select/library/items/${itemKey}`
        }
      }

      // Create the Markdown link
      const markdownLink = `[${citation}](${apiUrl})`

      // Copy to clipboard
      const clipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
        .getService(Components.interfaces.nsIClipboardHelper)
      clipboardHelper.copyString(markdownLink)

      elogger.info(`Generated Markdown link: ${markdownLink}`)

      // Enhanced user feedback with fallback message
      ztoolkit.log('Success: Markdown link copied to clipboard')

      return true
    } catch (error) {
      elogger.error(`Error generating Markdown link: ${error}`)

      // Enhanced error feedback with fallback message
      ztoolkit.log(`Error: Failed to generate Markdown link: ${error.message}`)

      return false
    }
  }

  /**
   * Handle notifications from Zotero
   * @param event - The notification event
   * @param type - The type of object
   * @param ids - Array of object IDs
   * @param extraData - Additional data
   */
  public notify(event: string, type: string, ids: number[], extraData: any) {
    // Log notifications for debugging
    if (Zotero.Prefs.get('extensions.zotero-citation-linker.debug', false)) {
      elogger.info(`Notification: ${event} ${type} [${ids.join(', ')}] \n${JSON.stringify(extraData)}`)
    }

    // Handle specific events as needed
    // Currently just monitoring for future features
  }

  /**
   * Get default preferences for the plugin
   */
  getDefaultPreferences() {
    return {
      'extensions.zotero-citation-linker.port': 23119,
      'extensions.zotero-citation-linker.shortcutEnabled': true,
      'extensions.zotero-citation-linker.shortcut': 'shift+ctrl+c',
      'extensions.zotero-citation-linker.debug': false,
    }
  }

  // =================== SERVER ENDPOINT HELPER METHODS ===================

  /**
   * Validate the incoming request
   */
  private _validateRequest(requestData: any) {
    if (!requestData.data) {
      return { valid: false, error: 'No data provided' }
    }

    if (!requestData.data.url) {
      return { valid: false, error: 'URL is required' }
    }

    if (typeof requestData.data.url !== 'string') {
      return { valid: false, error: 'URL must be a string' }
    }

    // Validate URL format
    try {
      const url = Components.classes['@mozilla.org/network/io-service;1']
        .getService(Components.interfaces.nsIIOService)
        .newURI(requestData.data.url)
      if (!['http:', 'https:'].includes(url.scheme + ':')) {
        return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' }
      }
    } catch (e) {
      return { valid: false, error: `Invalid URL format: ${e.message}` }
    }

    return { valid: true }
  }

  /**
   * Attempt to translate the URL using Zotero's translation system
   */
  private async _attemptTranslation(url: string) {
    try {
      // Load the webpage document
      const doc = await this._loadDocument(url)
      elogger.info(`Loaded document for translation:\n ${JSON.stringify(doc).slice(0, 500)}...`)

      // Set up translation
      const translation = new Zotero.Translate.Web()
      translation.setDocument(doc)

      // Get available translators
      const translators = await translation.getTranslators()

      if (translators.length === 0) {
        elogger.info('No translators found for this URL')
        return { success: false, reason: 'No translators found for this URL' }
      }

      // Use the first (highest priority) translator
      const translator = translators[0]
      translation.setTranslator(translator)
      elogger.info(`Using translator: ${translator.label}`)

      // Perform translation with timeout
      const items = await Promise.race([
        new Promise((resolve, reject) => {
          const itemArray: any[] = []

          translation.setHandler('itemDone', (obj: any, dbItem: any) => {
            // Convert Zotero item to JSON format
            const jsonItem = dbItem.toJSON()
            jsonItem.key = dbItem.key
            jsonItem.version = dbItem.version
            jsonItem.itemID = dbItem.id
            itemArray.push(jsonItem)
            elogger.info(`Received item: ${JSON.stringify(jsonItem).slice(0, 500)}...`)
          })

          translation.setHandler('done', () => {
            elogger.info(`Translation completed with ${itemArray.length} items`)
            resolve(itemArray)
          })

          translation.setHandler('error', (translate: any, error: any) => {
            elogger.info(`Translation error: ${error.message || error}`)
            reject(new Error(`Translation error: ${error.message || error}`))
          })

          // Start translation
          translation.translate()
        }),
        Zotero.Promise.delay(30000).then(() => {
          throw new Error('Translation timeout after 30 seconds')
        }),
      ])

      if ((items as any[]).length === 0) {
        elogger.info('Translation completed but produced no items')
        return { success: false, reason: 'Translation completed but produced no items' }
      }

      return {
        success: true,
        items: items as any[],
        translator: translator.label,
      }

    } catch (error) {
      elogger.error(`Translation error: ${error.message}`)
      return {
        success: false,
        reason: error.message,
      }
    }
  }

  /**
   * Save translated items to the library
   */
  private async _saveTranslatedItems(url: string, items: any[]) {
    try {
      const sessionID = Zotero.Utilities.randomString()

      // Create request data for saveItems
      const saveRequestData = {
        method: 'POST',
        data: {
          sessionID: sessionID,
          items: items.map((item, index) => ({
            id: `citationlinker-${index}`,
            ...item,
          })),
          uri: url,
        },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zotero Citation Linker Plugin',
        },
      }

      // Use the connector's saveItems endpoint internally
      const saveItemsEndpoint = new (Zotero.Server as any).Connector.SaveItems()
      const result = await saveItemsEndpoint.init(saveRequestData)

      if (result[0] === 201) {
        // Get the session to retrieve saved items
        const session = (Zotero.Server as any).Connector.SessionManager.get(sessionID)
        if (session) {
          const savedItems = []
          for (let i = 0; i < items.length; i++) {
            const savedItem = session.getItemByConnectorKey(`citationlinker-${i}`)
            if (savedItem) {
              const jsonItem = savedItem.toJSON()
              jsonItem.key = savedItem.key
              jsonItem.version = savedItem.version
              jsonItem.itemID = savedItem.id
              savedItems.push(jsonItem)
            }
          }

          // Clean up session
          session.remove()

          return { success: true, items: savedItems }
        } else {
          return { success: false, error: 'Session not found after save' }
        }
      } else {
        const errorMsg = result[2] ? JSON.parse(result[2]).error : 'Unknown error'
        return { success: false, error: errorMsg }
      }

    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Save URL as a basic webpage item (fallback)
   */
  private async _saveAsWebpage(url: string) {
    try {
      // Extract basic metadata from the webpage
      const doc = await this._loadDocument(url)
      const metadata = this._extractBasicMetadata(doc, url)

      // Create webpage item
      const { library, collection } = (Zotero.Server as any).Connector.getSaveTarget()

      const item = new Zotero.Item('webpage')
      item.libraryID = library.libraryID
      item.setField('title', metadata.title)
      item.setField('url', url)
      item.setField('accessDate', 'CURRENT_TIMESTAMP')

      if (metadata.websiteTitle) {
        item.setField('websiteTitle', metadata.websiteTitle)
      }

      if (metadata.abstractNote) {
        item.setField('abstractNote', metadata.abstractNote)
      }

      if (collection) {
        item.setCollections([collection.id])
      }

      await item.saveTx()

      // Convert to JSON format
      const jsonItem = item.toJSON()

      return { success: true, item: jsonItem, itemKey: item.key, itemVersion: item.version, itemID: item.id }

    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Load a document from URL
   */
  private async _loadDocument(url: string) {
    try {
      // Use Zotero's HTTP system with proper headers
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
        },
        timeout: 30000,
      }

      const response = await Zotero.HTTP.request('GET', url, options)

      if (!response.responseText) {
        throw new Error('Empty response from URL')
      }

                    // Create a DOM document from the response
       const parser = Components.classes['@mozilla.org/xmlextras/domparser;1']
         .createInstance((Components.interfaces as any).nsIDOMParser)
       const doc = parser.parseFromString(response.responseText, 'text/html')

       // Set base URI for relative URLs
       const base = doc.createElement('base')
       base.href = url
       doc.head.insertBefore(base, doc.head.firstChild)

       return doc

    } catch (error) {
      throw new Error(`Failed to load document from ${url}: ${error.message}`)
    }
  }

  /**
   * Extract basic metadata from a document
   */
  private _extractBasicMetadata(doc: any, url: string) {
    const metadata: any = {}

    // Extract title
    metadata.title = doc.querySelector('title')?.textContent?.trim() ||
                    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
                    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')?.trim() ||
                    url

    // Extract site name
    const urlObj = Components.classes['@mozilla.org/network/io-service;1']
      .getService(Components.interfaces.nsIIOService)
      .newURI(url)
    metadata.websiteTitle = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
                           doc.querySelector('meta[name="application-name"]')?.getAttribute('content')?.trim() ||
                           urlObj.host

    // Extract description
    metadata.abstractNote = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
                           doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
                           doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')?.trim() ||
                           ''

    // Limit description length
    if (metadata.abstractNote.length > 500) {
      metadata.abstractNote = metadata.abstractNote.substring(0, 497) + '...'
    }

    return metadata
  }

  /**
   * Generate success response
   */
  private _successResponse(items: any[], method: string, translator: string) {
    const response = {
      status: 'success',
      method: method,
      translator: translator,
      itemCount: items.length,
      items: items,
    }

    elogger.info(`Successfully processed URL using ${method} (${translator})`)
    return [200, 'application/json', JSON.stringify(response)]
  }

  /**
   * Generate error response
   */
  private _errorResponse(statusCode: number, message: string) {
    const response = {
      status: 'error',
      message: message,
      timestamp: new Date().toISOString(),
    }

    elogger.error(`Error ${statusCode}: ${message}`)

    return [statusCode, 'application/json', JSON.stringify(response)]
  }
}