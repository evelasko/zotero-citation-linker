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
    logger.info('Installing Zotero Citation Linker plugin with toolkit integration')

    try {
      // **PHASE 4: Initialize preferences during installation**
      this.initializePreferences()

      // Initialize enhanced context menu with toolkit
      this.initializeContextMenu()

      // Initialize keyboard shortcuts
      this.initializeKeyboardShortcuts()

      // Initialize API server
      this.initializeApiServer()

      // Register notifier for future features
      this.notifierID = Zotero.Notifier.registerObserver(this, ['item'])

      logger.info('Plugin installation completed successfully')
    } catch (error) {
      logger.error(`Error during plugin installation: ${error}`)
      throw error
    }
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
            // Translation successful - items are already saved by the translation system
            elogger.info(`Translation successful - using ${translationResult.items.length} already-saved items`)
            return await self._successResponse(translationResult.items, 'translation', translationResult.translator)
          } else {
            // Translation failed - return error without fallback
            elogger.info(`Translation failed: ${translationResult.reason}`)
            return self._errorResponse(422, `Translation failed: ${translationResult.reason}`)
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

    // Register the separate webpage save endpoint
    this.registerSaveWebpageEndpoint()
  }

  /**
   * Register the separate webpage save endpoint for explicit fallback saving
   */
  private registerSaveWebpageEndpoint() {
    const self = this
    const elogger = logger

    const SaveWebpageEndpoint = function() {}
    SaveWebpageEndpoint.prototype = {
      supportedMethods: ['POST'],
      supportedDataTypes: ['application/json'],

      init: async function(requestData: any) {
        elogger.info('SaveWebpage endpoint called')

        try {
          // Validate request data
          const validation = self._validateRequest(requestData)
          if (!validation.valid) {
            return self._errorResponse(400, validation.error)
          }

          const { url } = requestData.data

          elogger.info(`Processing URL as webpage: ${url}`)

          // Check if target library is editable
          const libraryID = Zotero.Libraries.userLibraryID
          const library = Zotero.Libraries.get(libraryID)
          if (!library || !library.editable) {
            return self._errorResponse(500, 'Target library is not editable')
          }

          // Save as webpage
          const webpageResult = await self._saveAsWebpage(url)
          if (webpageResult.success) {
            elogger.info('Webpage saved successfully')
            return await self._successResponse([webpageResult.item], 'webpage', 'Built-in webpage creator')
          } else {
            return self._errorResponse(500, `Failed to save as webpage: ${webpageResult.error}`)
          }

        } catch (error) {
          Zotero.logError(new Error(`CitationLinker SaveWebpage error: ${error.message}`))
          Zotero.logError(error)
          return self._errorResponse(500, `Internal server error: ${error.message}`)
        }
      },
    }

    // Register the endpoint
    Zotero.Server.Endpoints['/citationlinker/savewebpage'] = SaveWebpageEndpoint
    elogger.info('Registered /citationlinker/savewebpage endpoint')
  }

  /**
   * Cleanup the API server
   */
  private cleanupApiServer() {
    elogger.info('Cleaning up API server endpoints')

    try {
      // Remove our endpoints
      delete Zotero.Server.Endpoints['/citationlinker/processurl']
      delete Zotero.Server.Endpoints['/citationlinker/savewebpage']
      elogger.info('Removed /citationlinker/processurl and /citationlinker/savewebpage endpoints')
    } catch (error) {
      elogger.error(`Error cleaning up API endpoints: ${error}`)
    }
  }

  /**
   * Generate and copy Markdown citation to clipboard
   * **PHASE 4: Enhanced with professional CSL-based citation generation**
   * @param items - Array of Zotero items
   * @param format - Citation format ('markdown', 'plain', 'html')
   * @param citationStyle - Optional CSL style override
   */
  async generateAndCopyMarkdownLink(items: any[], format: string = 'markdown', citationStyle?: string) {
    elogger.info(`Generating ${format} citation for ${items.length} item(s)`)

    if (!items || items.length === 0) {
      elogger.error('No items provided')
      return false
    }

    try {
      // **PHASE 4: Professional Citation Generation**
      const citationResults = await this._generateProfessionalCitations(items, citationStyle)

      if (!citationResults.success) {
        throw new Error('Citation generation failed')
      }

      let finalOutput: string

      if (items.length === 1) {
        // Single item - create formatted link
        const item = items[0]
        const citation = citationResults.citations[0]
        const apiUrl = this._generateApiUrl(item)

        switch (format) {
          case 'markdown':
            finalOutput = `[${citation}](${apiUrl})`
            break
          case 'html':
            finalOutput = `<a href="${apiUrl}">${citation}</a>`
            break
          case 'plain':
          default:
            finalOutput = `${citation} - ${apiUrl}`
            break
        }
      } else {
        // Multiple items - create formatted list
        const formattedItems = items.map((item, index) => {
          const citation = citationResults.citations[index]
          const apiUrl = this._generateApiUrl(item)

          switch (format) {
            case 'markdown':
              return `- [${citation}](${apiUrl})`
            case 'html':
              return `<li><a href="${apiUrl}">${citation}</a></li>`
            case 'plain':
            default:
              return `${citation} - ${apiUrl}`
          }
        })

        if (format === 'html') {
          finalOutput = `<ul>\n${formattedItems.join('\n')}\n</ul>`
        } else {
          finalOutput = formattedItems.join('\n')
        }
      }

      // Copy to clipboard
      const clipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
        .getService(Components.interfaces.nsIClipboardHelper)
      clipboardHelper.copyString(finalOutput)

      elogger.info(`Generated ${format} citation: ${finalOutput.substring(0, 200)}...`)

      // Enhanced user feedback
      const itemText = items.length === 1 ? 'citation' : `${items.length} citations`
      ztoolkit.log(`Success: ${format} ${itemText} copied to clipboard`)

      return true
    } catch (error) {
      elogger.error(`Error generating ${format} citation: ${error}`)
      ztoolkit.log(`Error: Failed to generate ${format} citation: ${error.message}`)
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
   * **PHASE 4: Enhanced with comprehensive preference management**
   */
  getDefaultPreferences() {
    return {
      // Server Configuration
      'extensions.zotero-citation-linker.port': 23119,
      'extensions.zotero-citation-linker.serverEnabled': true,

      // Keyboard Shortcuts
      'extensions.zotero-citation-linker.shortcutEnabled': true,
      'extensions.zotero-citation-linker.shortcut': 'shift+ctrl+c',

      // Citation Generation
      'extensions.zotero-citation-linker.defaultCitationStyle': 'chicago-note-bibliography',
      'extensions.zotero-citation-linker.defaultOutputFormat': 'markdown',
      'extensions.zotero-citation-linker.includeApiUrls': true,
      'extensions.zotero-citation-linker.fallbackToBasicCitation': true,

      // User Interface
      'extensions.zotero-citation-linker.showSuccessNotifications': true,
      'extensions.zotero-citation-linker.showErrorNotifications': true,
      'extensions.zotero-citation-linker.contextMenuEnabled': true,

      // Development and Debugging
      'extensions.zotero-citation-linker.debug': false,
      'extensions.zotero-citation-linker.logLevel': 'info', // 'debug', 'info', 'warn', 'error'

      // API Server Enhancement
      'extensions.zotero-citation-linker.serverIncludeCitations': true,
      'extensions.zotero-citation-linker.serverTimeout': 30000,
    }
  }

  /**
   * Initialize default preferences
   * **PHASE 4: Robust preference initialization with validation**
   */
  private initializePreferences() {
    elogger.info('Initializing plugin preferences')

    try {
      const defaults = this.getDefaultPreferences()

      // Set default preferences if they don't exist
      for (const [key, value] of Object.entries(defaults)) {
        const currentValue = Zotero.Prefs.get(key, null)
        if (currentValue === null || currentValue === undefined) {
          Zotero.Prefs.set(key, value)
          elogger.info(`Set default preference: ${key} = ${value}`)
        }
      }

      // Validate critical preferences
      this.validatePreferences()

      elogger.info('Plugin preferences initialized successfully')
    } catch (error) {
      elogger.error(`Error initializing preferences: ${error}`)
    }
  }

  /**
   * Validate preferences for consistency and security
   * **PHASE 4: Preference validation and sanitization**
   */
  private validatePreferences() {
    try {
      // Validate port number
      const port = Zotero.Prefs.get('extensions.zotero-citation-linker.port')
      if (typeof port !== 'number' || port < 1024 || port > 65535) {
        elogger.info(`Invalid port ${port}, resetting to default`)
        Zotero.Prefs.set('extensions.zotero-citation-linker.port', 23119)
      }

      // Validate citation style
      const style = Zotero.Prefs.get('extensions.zotero-citation-linker.defaultCitationStyle')
      if (typeof style !== 'string' || style.length === 0) {
        elogger.info(`Invalid citation style ${style}, resetting to default`)
        Zotero.Prefs.set('extensions.zotero-citation-linker.defaultCitationStyle', 'chicago-note-bibliography')
      }

      // Validate output format
      const format = Zotero.Prefs.get('extensions.zotero-citation-linker.defaultOutputFormat')
      const validFormats = ['markdown', 'plain', 'html']
      if (typeof format !== 'string' || !validFormats.includes(format)) {
        elogger.info(`Invalid output format ${format}, resetting to default`)
        Zotero.Prefs.set('extensions.zotero-citation-linker.defaultOutputFormat', 'markdown')
      }

      // Validate log level
      const logLevel = Zotero.Prefs.get('extensions.zotero-citation-linker.logLevel')
      const validLogLevels = ['debug', 'info', 'warn', 'error']
      if (typeof logLevel !== 'string' || !validLogLevels.includes(logLevel)) {
        elogger.info(`Invalid log level ${logLevel}, resetting to default`)
        Zotero.Prefs.set('extensions.zotero-citation-linker.logLevel', 'info')
      }

      // Validate timeout
      const timeout = Zotero.Prefs.get('extensions.zotero-citation-linker.serverTimeout')
      if (typeof timeout !== 'number' || timeout < 5000 || timeout > 120000) {
        elogger.info(`Invalid timeout ${timeout}, resetting to default`)
        Zotero.Prefs.set('extensions.zotero-citation-linker.serverTimeout', 30000)
      }

    } catch (error) {
      elogger.error(`Error validating preferences: ${error}`)
    }
  }

  /**
   * Get preference with fallback to default
   * **PHASE 4: Safe preference getter with type validation**
   */
  private getPreference(key: string, defaultValue: any): any {
    try {
      const fullKey = key.startsWith('extensions.') ? key : `extensions.zotero-citation-linker.${key}`

      const value = Zotero.Prefs.get(fullKey)

      // Type validation
      if (value !== undefined && value !== null && typeof value === typeof defaultValue) {
        return value
      } else {
        elogger.info(`Type mismatch for preference ${fullKey}, using default`)
        return defaultValue
      }
    } catch (error) {
      elogger.error(`Error getting preference ${key}: ${error}`)
      return defaultValue
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
   * **PHASE 4 FIX: Enhanced translation detection and processing**
   */
  private async _attemptTranslation(url: string) {
    try {
      elogger.info(`Starting translation attempt for URL: ${url}`)

      // Load the webpage document
      let doc = await this._loadDocument(url)
      elogger.info('Document loaded successfully for translation')

      // **FIX: Use Zotero's wrapDocument method - the proper way to prepare docs for translation**
      try {
        doc = Zotero.HTTP.wrapDocument(doc, url)
        elogger.info(`Document wrapped successfully with Zotero.HTTP.wrapDocument for: ${url}`)
        elogger.info(`Document location href: ${doc.location?.href || 'undefined'}`)
      } catch (err) {
        elogger.error(`Failed to wrap document with Zotero.HTTP.wrapDocument: ${err}`)
        elogger.info('Continuing with translation using unwrapped document')
      }

      // **FIX: Enhanced translation setup with proper error handling**
      const translation = new Zotero.Translate.Web()

      // Set the document (URL is already embedded via wrapDocument)
      translation.setDocument(doc)

      elogger.info('Translation object created and configured')

      // Get available translators
      const translators = await translation.getTranslators()
      elogger.info(`Found ${translators.length} translators for this URL`)

      if (translators.length === 0) {
        elogger.info('No translators found for this URL')
        return { success: false, reason: 'No translators found for this URL' }
      }

      // Log available translators for debugging
      translators.forEach((translator, index) => {
        elogger.info(`Translator ${index + 1}: ${translator.label} (priority: ${translator.priority})`)
      })

      // Use the first (highest priority) translator
      const translator = translators[0]
      translation.setTranslator(translator)
      elogger.info(`Using translator: ${translator.label} with priority ${translator.priority}`)

      // **FIX: Direct translation execution using Zotero's standard approach**
      const items = await translation.translate()

      elogger.info(`Translation completed: ${items ? items.length : 0} items created`)

      // Convert items to proper format if they exist
      if (items && items.length > 0) {
        const formattedItems = items.map((item: any) => {
          const jsonItem = item.toJSON()
          jsonItem.key = item.key
          jsonItem.version = item.version
          jsonItem.itemID = item.id

          elogger.info(`Formatted item: ${jsonItem.title || 'No title'} (${jsonItem.itemType})`)
          return jsonItem
        })

        elogger.info(`Translation successful: ${formattedItems.length} items formatted`)
        return {
          success: true,
          items: formattedItems,
          translator: translator.label,
        }
      }

      // **FIX: If no items produced, return failure**
      elogger.info('Translation completed but produced no items')
      return { success: false, reason: 'Translation completed but produced no items' }

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
   * **PHASE 4 FIX: Corrected DOM parsing for Zotero 7 compatibility**
   */
  private async _loadDocument(url: string) {
    try {
      elogger.info(`Loading document from URL: ${url}`)

      // Use Zotero's HTTP system with proper headers
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: this.getPreference('serverTimeout', 30000),
        followRedirects: true,
      }

      const response = await Zotero.HTTP.request('GET', url, options)

      if (!response.responseText) {
        throw new Error('Empty response from URL')
      }

      elogger.info(`Received response: ${response.status} ${response.statusText}, content length: ${response.responseText.length}`)

      // **FIX: Use proper DOM document creation for Zotero 7**
      let doc: any
      try {
        // Method 1: Try using DOMParser from global context
        const globalWindow = ztoolkit.getGlobal('window') || globalThis
        if (globalWindow && globalWindow.DOMParser) {
          const parser = new globalWindow.DOMParser()
          doc = parser.parseFromString(response.responseText, 'text/html')
          elogger.info('Successfully used global DOMParser')
        } else {
          throw new Error('Global DOMParser not available')
        }
      } catch (e1) {
        try {
          // Method 2: Try using document.implementation
          const mainWindow = ztoolkit.getGlobal('window') || Services.wm.getMostRecentWindow('navigator:browser')
          if (mainWindow && mainWindow.document) {
            doc = mainWindow.document.implementation.createHTMLDocument('temp')
            doc.documentElement.innerHTML = response.responseText
            elogger.info('Successfully used document.implementation.createHTMLDocument')
          } else {
            throw new Error('Main window document not available')
          }
        } catch (e2) {
          try {
            // Method 3: Use Services to create document
            const docShell = Services.appShell.createWindowlessBrowser(false)
            const domWindow = docShell.document.defaultView
            doc = domWindow.document.implementation.createHTMLDocument('temp')
            doc.documentElement.innerHTML = response.responseText
            elogger.info('Successfully used windowless browser')
          } catch (e3) {
            // Method 4: Create minimal DOM structure as ultimate fallback
            try {
              elogger.info('Attempting to create minimal DOM structure as fallback')
              // Create a minimal document structure
              doc = {
                createElement: (tag: string) => ({ tagName: tag, setAttribute: () => {}, href: '', textContent: '' }),
                querySelector: (selector: string) => {
                  // Basic selector simulation for metadata extraction
                  if (selector === 'title') {
                    const titleMatch = response.responseText.match(/<title[^>]*>([^<]+)<\/title>/i)
                    return titleMatch ? { textContent: titleMatch[1].trim() } : null
                  }
                  if (selector.includes('meta')) {
                    const metaPattern = new RegExp(`<meta[^>]*${selector.replace(/[[\]"']/g, '')}[^>]*>`, 'i')
                    const match = response.responseText.match(metaPattern)
                    if (match) {
                      const contentMatch = match[0].match(/content=["']([^"']+)["']/i)
                      return contentMatch ? { getAttribute: () => contentMatch[1] } : null
                    }
                  }
                  return null
                },
                title: (() => {
                  const titleMatch = response.responseText.match(/<title[^>]*>([^<]+)<\/title>/i)
                  return titleMatch ? titleMatch[1].trim() : 'Unknown Title'
                })(),
                head: null,
                documentElement: { innerHTML: '' },
              }
              elogger.info('Successfully created minimal DOM structure')
            } catch (e4) {
              throw new Error(`All DOM parsing methods failed: ${e1.message} / ${e2.message} / ${e3.message} / ${e4.message}`)
            }
          }
        }
      }

      if (!doc) {
        throw new Error('Failed to create document')
      }

      // Set base URI for relative URLs
      try {
        const base = doc.createElement('base')
        base.href = url
        if (doc.head) {
          doc.head.insertBefore(base, doc.head.firstChild)
        }
      } catch (baseError) {
        elogger.info(`Warning: Could not set base URI: ${baseError.message}`)
      }

      elogger.info(`Successfully parsed document with title: ${doc.title || 'No title'}`)
      return doc

    } catch (error) {
      elogger.error(`Failed to load document from ${url}: ${error.message}`)
      throw new Error(`Failed to load document from ${url}: ${error.message}`)
    }
  }

  /**
   * Extract basic metadata from a document
   * **PHASE 4 FIX: Enhanced for academic sites like IEEE**
   */
  private _extractBasicMetadata(doc: any, url: string) {
    const metadata: any = {}

    try {
      // Enhanced title extraction for academic sites
      metadata.title = doc.querySelector('title')?.textContent?.trim() ||
                      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
                      doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')?.trim() ||
                      doc.querySelector('meta[name="citation_title"]')?.getAttribute('content')?.trim() ||
                      doc.querySelector('h1')?.textContent?.trim() ||
                      url

      // Enhanced site name extraction
      const urlObj = Services.io.newURI(url)
      metadata.websiteTitle = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
                             doc.querySelector('meta[name="application-name"]')?.getAttribute('content')?.trim() ||
                             doc.querySelector('meta[name="citation_publisher"]')?.getAttribute('content')?.trim() ||
                             urlObj.host

      // Enhanced description extraction for academic content
      metadata.abstractNote = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
                             doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
                             doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')?.trim() ||
                             doc.querySelector('meta[name="citation_abstract"]')?.getAttribute('content')?.trim() ||
                             doc.querySelector('.abstract')?.textContent?.trim() ||
                             doc.querySelector('[class*="abstract"]')?.textContent?.trim() ||
                             ''

      // Additional academic metadata
      if (doc.querySelector('meta[name="citation_author"]')) {
        metadata.author = doc.querySelector('meta[name="citation_author"]')?.getAttribute('content')?.trim()
      }

      if (doc.querySelector('meta[name="citation_date"]') || doc.querySelector('meta[name="citation_publication_date"]')) {
        metadata.date = doc.querySelector('meta[name="citation_date"]')?.getAttribute('content')?.trim() ||
                       doc.querySelector('meta[name="citation_publication_date"]')?.getAttribute('content')?.trim()
      }

      if (doc.querySelector('meta[name="citation_doi"]')) {
        metadata.DOI = doc.querySelector('meta[name="citation_doi"]')?.getAttribute('content')?.trim()
      }

      // Limit description length
      if (metadata.abstractNote && metadata.abstractNote.length > 500) {
        metadata.abstractNote = metadata.abstractNote.substring(0, 497) + '...'
      }

      elogger.info(`Extracted metadata - Title: "${metadata.title}", Site: "${metadata.websiteTitle}", DOI: "${metadata.DOI || 'None'}"`)

    } catch (error) {
      elogger.error(`Error extracting metadata: ${error.message}`)
      // Fallback metadata
      metadata.title = url
      metadata.websiteTitle = 'Unknown Site'
      metadata.abstractNote = ''
    }

    return metadata
  }

  /**
   * Generate success response
   * **PHASE 4: Enhanced with citation data and comprehensive metadata**
   */
  private async _successResponse(items: any[], method: string, translator: string) {
    try {
      // **PHASE 4: Generate citations for all items in server response**
      const enrichedItems = await Promise.all(items.map(async (item, index) => {
        try {
          // Create a mock Zotero item for citation generation if needed
          let zoteroItem = item
          if (!zoteroItem.getField) {
            // Convert JSON item back to Zotero item for citation generation
            const tempItem = await Zotero.Items.getAsync(item.itemID || item.id)
            if (tempItem) {
              zoteroItem = tempItem
            }
          }

          // Generate citation using our enhanced citation system
          const citationResults = await this._generateProfessionalCitations([zoteroItem])
          const citation = citationResults.success ? citationResults.citations[0] : null

          // Generate API URL
          const apiUrl = this._generateApiUrl(zoteroItem)

          // Create enriched item with citation data
          return {
            ...item,
            _meta: {
              index: index,
              citation: citation,
              apiUrl: apiUrl,
              citationStyle: citationResults.style || 'default',
              citationFormat: citationResults.format || 'unknown',
            },
          }
        } catch (error) {
          elogger.error(`Error enriching item ${index}: ${error}`)
          return {
            ...item,
            _meta: {
              index: index,
              citation: null,
              apiUrl: item.key ? `zotero://select/library/items/${item.key}` : null,
              error: `Citation generation failed: ${error.message}`,
            },
          }
        }
      }))

      const response = {
        status: 'success',
        method: method,
        translator: translator,
        itemCount: items.length,
        timestamp: new Date().toISOString(),
        items: enrichedItems,
        _links: {
          documentation: 'https://github.com/your-repo/zotero-citation-linker',
          zoteroApi: 'https://api.zotero.org/',
        },
      }

      elogger.info(`Successfully processed URL using ${method} (${translator}) with ${items.length} items enriched with citations`)
      return [200, 'application/json', JSON.stringify(response, null, 2)]

    } catch (error) {
      elogger.error(`Error generating enhanced success response: ${error}`)

      // Fallback to basic response
      const basicResponse = {
        status: 'success',
        method: method,
        translator: translator,
        itemCount: items.length,
        items: items,
        warning: `Citation enhancement failed: ${error.message}`,
      }

      return [200, 'application/json', JSON.stringify(basicResponse)]
    }
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

  // =================== PHASE 4: ENHANCED CITATION GENERATION METHODS ===================

  /**
   * Generate professional CSL-based citations using Zotero's QuickCopy system
   * **PHASE 4: Core citation generation with multiple style support**
   */
  private async _generateProfessionalCitations(items: any[], citationStyle?: string) {
    try {
      elogger.info(`Generating professional citations for ${items.length} item(s) with style: ${citationStyle || 'default'}`)

      // Get citation style - use provided style or user's default QuickCopy style
      let format: string
      if (citationStyle) {
        // Use custom style - format as bibliography mode
        format = `bibliography=${citationStyle}`
      } else {
        // Use user's default QuickCopy format
        format = Zotero.QuickCopy.getFormatFromURL(Zotero.QuickCopy.lastActiveURL)

        // If no QuickCopy format available or not bibliography, use default style
        if (!format || !format.startsWith('bibliography=')) {
          format = 'bibliography=chicago-note-bibliography'
        }
      }

      elogger.info(`Using citation format: ${format}`)

      // Generate citations using Zotero's QuickCopy system
      const citations: string[] = []

      for (const item of items) {
        try {
          // Generate citation for individual item
          const citationContent = Zotero.QuickCopy.getContentFromItems([item], format)

          let citation: string
          if (citationContent && citationContent.text) {
            citation = citationContent.text.trim()

            // Clean up the citation - remove extra whitespace and formatting
            citation = citation.replace(/\n+/g, ' ')
                             .replace(/\s+/g, ' ')
                             .replace(/^\s*[•\-*]\s*/, '') // Remove leading bullets
                             .trim()
          } else {
            // Fallback to basic citation if QuickCopy fails
            citation = this._generateFallbackCitation(item)
          }

          citations.push(citation)
          elogger.info(`Generated citation for item ${item.key}: ${citation.substring(0, 100)}...`)

        } catch (error) {
          elogger.error(`Error generating citation for item ${item.key}: ${error}`)
          // Use fallback citation for this item
          const fallbackCitation = this._generateFallbackCitation(item)
          citations.push(fallbackCitation)
        }
      }

      return {
        success: true,
        citations: citations,
        format: format,
        style: citationStyle || 'default',
      }

    } catch (error) {
      elogger.error(`Error in professional citation generation: ${error}`)

      // Return fallback citations for all items
      const fallbackCitations = items.map(item => this._generateFallbackCitation(item))

      return {
        success: true,
        citations: fallbackCitations,
        format: 'fallback',
        style: 'basic',
        warning: `Used fallback citation due to error: ${error.message}`,
      }
    }
  }

  /**
   * Generate fallback citation when CSL processing fails
   * **PHASE 4: Robust fallback citation generation**
   */
  private _generateFallbackCitation(item: any): string {
    try {
      const title = item.getField('title') || 'Untitled'
      const creators = item.getCreators()
      const year = item.getField('date') ? new Date(item.getField('date')).getFullYear() : ''

      // Create author-year citation
      let citation = ''
      if (creators.length > 0) {
        const firstCreator = creators[0]
        const author = firstCreator.lastName || firstCreator.name || 'Unknown Author'
        citation = year ? `${author} (${year})` : author
      } else {
        citation = year ? `(${year})` : title
      }

      // Add title if not already included and different from author info
      if (citation !== title && title !== 'Untitled') {
        citation += `: ${title}`
      }

      return citation

    } catch (error) {
      elogger.error(`Error in fallback citation generation: ${error}`)
      return item.getField('title') || item.key || 'Unknown Item'
    }
  }

  /**
   * Generate API URL for a Zotero item using Zotero's built-in URI generation
   * **PHASE 4: Using Zotero.URI.getItemURI() for proper API URL generation**
   */
  private _generateApiUrl(item: any): string {
    try {
      // Use Zotero's built-in URI generation method
      // This automatically handles user vs group libraries, user IDs, etc.
      const apiUrl = Zotero.URI.getItemURI(item)

      elogger.info(`Generated API URL using Zotero.URI.getItemURI(): ${apiUrl}`)
      return apiUrl

    } catch (error) {
      elogger.error(`Error using Zotero.URI.getItemURI() for item ${item.key}: ${error}`)

      try {
        // Fallback to manual construction if Zotero.URI.getItemURI() fails
        const library = item.library
        const itemKey = item.key

        // Check if this is a group library
        if ((library as any).type === 'group') {
          const fallbackUrl = `https://api.zotero.org/groups/${(library as any).id}/items/${itemKey}`
          elogger.info(`Using fallback group URL: ${fallbackUrl}`)
          return fallbackUrl
        } else {
          // For user libraries, use Zotero.Users.getCurrentUserID()
          const userID = Zotero.Users.getCurrentUserID()
          if (userID) {
            const fallbackUrl = `https://api.zotero.org/users/${userID}/items/${itemKey}`
            elogger.info(`Using fallback user URL: ${fallbackUrl}`)
            return fallbackUrl
          } else {
            // Ultimate fallback if no user ID available (offline mode)
            const localUrl = `zotero://select/library/items/${itemKey}`
            elogger.info(`Using local fallback URL: ${localUrl}`)
            return localUrl
          }
        }
      } catch (fallbackError) {
        elogger.error(`Fallback API URL generation also failed: ${fallbackError}`)
        // Ultimate fallback
        return `zotero://select/library/items/${item.key || 'unknown'}`
      }
    }
  }
}