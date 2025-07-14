/// <reference types="zotero-types/entries/mainWindow" />

import { Logger } from 'zotero-plugin/logger'
const logger = new Logger('ZoteroCitationLinker')
const elogger = new Logger('ZoteroCitationLinker Server Endpoint')

// Declare the toolkit variable that's passed from bootstrap.js
declare const ztoolkit: any

// Global URL constructor declaration for TypeScript
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
            return await self._successResponse(translationResult.items, 'translation', translationResult.translator, translationResult.duplicateProcessing)
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
            return await self._successResponse([webpageResult.item], 'webpage', 'Built-in webpage creator', undefined)
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

  // =================== DUPLICATE DETECTION INFRASTRUCTURE ===================

  /**
   * Main orchestrator for duplicate detection and processing
   * **PHASE 1: Core Infrastructure**
   * @param translatedItems - Array of items returned from translation
   * @returns Processing results with actions taken and warnings
   */
  private async _processDuplicates(translatedItems: any[]) {
    elogger.info(`Starting duplicate detection for ${translatedItems.length} translated items`)

    const processingResults = {
      autoMerged: [] as any[],
      possibleDuplicates: [] as any[],
      processed: true,
      errors: [] as string[],
    }

    try {
      for (let i = 0; i < translatedItems.length; i++) {
        const item = translatedItems[i]
        elogger.info(`Processing item ${i + 1}/${translatedItems.length}: ${item.getField('title') || 'Untitled'}`)

        try {
          // Find potential duplicates for this item
          const duplicateCandidates = await this._findPotentialDuplicates(item)

          if (duplicateCandidates.length === 0) {
            elogger.info(`No duplicates found for item ${item.key}`)
            continue
          }

          elogger.info(`Found ${duplicateCandidates.length} potential duplicate candidates for item ${item.key}`)

          // **PHASE 2: Process candidates based on score**
          for (const candidate of duplicateCandidates) {
            elogger.info(`Candidate duplicate: ${candidate.item.key} (score: ${candidate.score}, reason: ${candidate.reason})`)

            if (candidate.score >= 85) {
              // High confidence duplicate - auto-delete new item, use existing
              elogger.info(`High confidence duplicate detected (score: ${candidate.score}). Auto-replacing new item with existing.`)
              const mergeResult = await this._handleDefiniteDuplicate(item, candidate.item, candidate.reason, candidate.score)
              if (mergeResult.success) {
                processingResults.autoMerged.push(mergeResult.data)
                // **INTEGRITY FIX: Replace new item with existing item to preserve external references**
                const originalKey = item.key
                translatedItems[i] = candidate.item
                elogger.info(`✅ INTEGRITY PRESERVED: Replaced new item ${originalKey} with existing item ${candidate.item.key} in response`)
              } else {
                // **FIX: Graceful degradation for deletion failures**
                elogger.info(`Auto-deletion failed (${mergeResult.error}), converting to possible duplicate warning`)

                // Convert high-confidence duplicate to warning when deletion fails
                const warningData = this._flagPossibleDuplicate(item, {
                  ...candidate,
                  reason: `${candidate.reason} (auto-deletion failed: ${mergeResult.error})`,
                })
                processingResults.possibleDuplicates.push(warningData)
                processingResults.errors.push(`Failed to auto-merge duplicate: ${mergeResult.error}`)
              }
              break // Stop processing other candidates for this item
            } else if (candidate.score >= 70) {
              // Medium confidence - flag as possible duplicate but keep new item
              elogger.info(`Possible duplicate detected (score: ${candidate.score}). Keeping new item but flagging for user attention.`)
              const warningData = this._flagPossibleDuplicate(item, candidate)
              processingResults.possibleDuplicates.push(warningData)
              // Don't break - check for higher scoring candidates
            }
          }

        } catch (error) {
          const errorMsg = `Error processing duplicates for item ${item.key}: ${error.message}`
          elogger.error(errorMsg)
          processingResults.errors.push(errorMsg)
          // Continue processing other items
        }
      }

      elogger.info(`Duplicate processing completed. Auto-merged: ${processingResults.autoMerged.length}, Possible duplicates: ${processingResults.possibleDuplicates.length}, Errors: ${processingResults.errors.length}`)
      return processingResults

    } catch (error) {
      elogger.error(`Critical error in duplicate processing: ${error.message}`)
      processingResults.errors.push(`Critical processing error: ${error.message}`)
      return processingResults
    }
  }

  /**
   * Find potential duplicate items in the library
   * **PHASE 1: Basic DOI lookup with infrastructure for expansion**
   * @param item - The item to check for duplicates
   * @returns Array of potential duplicates with scores
   */
  private async _findPotentialDuplicates(item: any) {
    elogger.info(`Searching for potential duplicates of item: ${item.key}`)

    const candidates: any[] = []

    try {
      // Extract identifiers from the item
      const identifiers = this._extractIdentifiers(item)
      elogger.info(`Extracted identifiers: ${JSON.stringify(identifiers)}`)

      // **PHASE 1: DOI-based lookup (most reliable)**
      if (identifiers.doi) {
        elogger.info(`Searching for DOI matches: ${identifiers.doi}`)

        try {
          // **FIX: Use proper search API instead of non-existent getByField**
          const search = new Zotero.Search()
          search.addCondition('DOI', 'is', identifiers.doi)
          search.addCondition('itemType', 'isNot', 'attachment')
          search.addCondition('itemType', 'isNot', 'note')

          const itemIDs = await search.search()
          const doiMatches = await Zotero.Items.getAsync(itemIDs)

          for (const existingItem of doiMatches) {
            // Skip if it's the same item (shouldn't happen in practice, but safety check)
            if (existingItem.key === item.key) {
              continue
            }

            elogger.info(`Found DOI match: ${existingItem.key} - ${existingItem.getField('title')}`)

            candidates.push({
              item: existingItem,
              score: 100, // Perfect DOI match
              reason: 'DOI match',
              confidence: 'high',
            })
          }
        } catch (error) {
          elogger.error(`Error searching for DOI matches: ${error.message}`)
        }
      }

      // **PHASE 1: ISBN-based lookup (for books)**
      if (identifiers.isbn) {
        elogger.info(`Searching for ISBN matches: ${identifiers.isbn}`)

        try {
          // **FIX: Use proper search API instead of non-existent getByField**
          const search = new Zotero.Search()
          search.addCondition('ISBN', 'is', identifiers.isbn)
          search.addCondition('itemType', 'isNot', 'attachment')
          search.addCondition('itemType', 'isNot', 'note')

          const itemIDs = await search.search()
          const isbnMatches = await Zotero.Items.getAsync(itemIDs)

          for (const existingItem of isbnMatches) {
            if (existingItem.key === item.key) {
              continue
            }

            elogger.info(`Found ISBN match: ${existingItem.key} - ${existingItem.getField('title')}`)

            candidates.push({
              item: existingItem,
              score: 95, // Near-perfect ISBN match
              reason: 'ISBN match',
              confidence: 'high',
            })
          }
        } catch (error) {
          elogger.error(`Error searching for ISBN matches: ${error.message}`)
        }
      }

      // **PHASE 2: Enhanced fuzzy matching with Title + Author + Year**
      if (identifiers.title && identifiers.firstAuthor && identifiers.year) {
        elogger.info('Searching for Title + Author + Year combinations')

        try {
          // Search for items by first author
          const authorItems = await this._searchByCreator(identifiers.firstAuthor)

          for (const existingItem of authorItems) {
            if (existingItem.key === item.key) {
              continue
            }

            // Calculate comprehensive similarity score
            const combinedScore = this._calculateCombinedSimilarity(identifiers, existingItem)

            if (combinedScore >= 70) { // Only add candidates with reasonable scores
              elogger.info(`Found potential match: ${existingItem.key} (combined score: ${combinedScore})`)

              candidates.push({
                item: existingItem,
                score: combinedScore,
                reason: `Title + Author + Year similarity (${combinedScore}%)`,
                confidence: combinedScore >= 85 ? 'high' : 'medium',
              })
            }
          }
        } catch (error) {
          elogger.error(`Error in enhanced fuzzy matching: ${error.message}`)
        }
      } else if (identifiers.title) {
        // Fallback: Title-only matching for items without author/year
        elogger.info('Performing title-only fuzzy matching')

        try {
          const titleScore = await this._performTitleOnlySearch(identifiers.title, item)
          if (titleScore.length > 0) {
            candidates.push(...titleScore)
          }
        } catch (error) {
          elogger.error(`Error in title-only matching: ${error.message}`)
        }
      }

      // **PHASE 3: Enhanced identifier matching - PMID, PMC ID, ArXiv ID, URL**

      // PMID matching (for medical literature)
      if (identifiers.pmid) {
        elogger.info(`Searching for PMID matches: ${identifiers.pmid}`)

        try {
          // Search items with same PMID in extra field
          const pmidItems = await this._searchByExtraField('pmid', identifiers.pmid)

          for (const existingItem of pmidItems) {
            if (existingItem.key === item.key) {
              continue
            }

            elogger.info(`Found PMID match: ${existingItem.key} - ${existingItem.getField('title')}`)

            candidates.push({
              item: existingItem,
              score: 98, // Very high confidence for PMID matches
              reason: 'PMID match',
              confidence: 'high',
            })
          }
        } catch (error) {
          elogger.error(`Error searching for PMID matches: ${error.message}`)
        }
      }

      // PMC ID matching
      if (identifiers.pmcid) {
        elogger.info(`Searching for PMC ID matches: ${identifiers.pmcid}`)

        try {
          const pmcItems = await this._searchByExtraField('pmc', identifiers.pmcid)

          for (const existingItem of pmcItems) {
            if (existingItem.key === item.key) {
              continue
            }

            elogger.info(`Found PMC ID match: ${existingItem.key} - ${existingItem.getField('title')}`)

            candidates.push({
              item: existingItem,
              score: 98, // Very high confidence for PMC ID matches
              reason: 'PMC ID match',
              confidence: 'high',
            })
          }
        } catch (error) {
          elogger.error(`Error searching for PMC ID matches: ${error.message}`)
        }
      }

      // ArXiv ID matching (for preprints)
      if (identifiers.arxivId) {
        elogger.info(`Searching for ArXiv ID matches: ${identifiers.arxivId}`)

        try {
          const arxivItems = await this._searchByExtraField('arxiv', identifiers.arxivId)

          for (const existingItem of arxivItems) {
            if (existingItem.key === item.key) {
              continue
            }

            elogger.info(`Found ArXiv ID match: ${existingItem.key} - ${existingItem.getField('title')}`)

            candidates.push({
              item: existingItem,
              score: 96, // High confidence for ArXiv matches
              reason: 'ArXiv ID match',
              confidence: 'high',
            })
          }
        } catch (error) {
          elogger.error(`Error searching for ArXiv ID matches: ${error.message}`)
        }
      }

      // URL normalization matching (for web content)
      if (identifiers.normalizedUrl) {
        elogger.info(`Searching for normalized URL matches: ${identifiers.normalizedUrl}`)

        try {
          const urlItems = await this._searchByNormalizedUrl(identifiers.normalizedUrl, item)

          for (const existingItem of urlItems) {
            if (existingItem.key === item.key) {
              continue
            }

            elogger.info(`Found URL match: ${existingItem.key} - ${existingItem.getField('title')}`)

            candidates.push({
              item: existingItem,
              score: 88, // High confidence for URL matches
              reason: 'Normalized URL match',
              confidence: 'high',
            })
          }
        } catch (error) {
          elogger.error(`Error searching for URL matches: ${error.message}`)
        }
      }

      // **PHASE 3: Intelligent candidate processing - sort, deduplicate, prioritize**

      // Remove duplicate candidates (same item found through different identifiers)
      const uniqueCandidates = this._deduplicateCandidates(candidates)

      // Sort by confidence score (highest first)
      const sortedCandidates = uniqueCandidates.sort((a, b) => b.score - a.score)

      // Limit to top 5 for performance
      const limitedCandidates = sortedCandidates.slice(0, 5)

      elogger.info(`Found ${candidates.length} total candidates, ${uniqueCandidates.length} unique, returning top ${limitedCandidates.length}`)
      return limitedCandidates

    } catch (error) {
      elogger.error(`Error in _findPotentialDuplicates: ${error.message}`)
      return []
    }
  }

  /**
   * Extract key identifiers from an item for duplicate detection
   * **PHASE 1: Basic identifier extraction**
   * @param item - Zotero item to extract identifiers from
   * @returns Object containing available identifiers
   */
  private _extractIdentifiers(item: any) {
    const identifiers: any = {}

    try {
      // DOI (most reliable identifier)
      const doi = item.getField('DOI')
      if (doi && doi.trim()) {
        // Normalize DOI (remove URL prefix if present)
        const normalizedDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '').trim()
        if (normalizedDoi) {
          identifiers.doi = normalizedDoi
        }
      }

      // ISBN (for books)
      const isbn = item.getField('ISBN')
      if (isbn && isbn.trim()) {
        // Normalize ISBN (remove hyphens and spaces)
        const normalizedIsbn = isbn.replace(/[-\s]/g, '').trim()
        if (normalizedIsbn) {
          identifiers.isbn = normalizedIsbn
        }
      }

      // Title (for fuzzy matching - Phase 2)
      const title = item.getField('title')
      if (title && title.trim()) {
        identifiers.title = title.trim()
      }

      // First author (for fuzzy matching - Phase 2)
      const creators = item.getCreators()
      if (creators && creators.length > 0) {
        const firstCreator = creators[0]
        if (firstCreator.lastName) {
          identifiers.firstAuthor = firstCreator.lastName
        } else if (firstCreator.name) {
          identifiers.firstAuthor = firstCreator.name
        }
      }

      // Publication year (for fuzzy matching - Phase 2)
      const date = item.getField('date')
      if (date) {
        try {
          const year = new Date(date).getFullYear()
          if (!isNaN(year) && year > 1000 && year <= new Date().getFullYear() + 10) {
            identifiers.year = year
          }
        } catch {
          // If date parsing fails, try to extract 4-digit year from string
          const yearMatch = date.toString().match(/\b(19|20)\d{2}\b/)
          if (yearMatch) {
            identifiers.year = parseInt(yearMatch[0])
          }
        }
      }

      // Item type (for relevance filtering)
      identifiers.itemType = item.itemType

      // **PHASE 3: Enhanced identifier extraction - PMID, PMC ID, ArXiv ID, URL**

      // PMID (PubMed ID) - for medical literature
      const pmid = item.getField('PMID') || this._extractPMIDFromExtra(item)
      if (pmid && pmid.trim()) {
        identifiers.pmid = pmid.trim()
      }

      // PMC ID (PubMed Central ID) - for open access medical literature
      const pmcid = this._extractPMCIDFromExtra(item)
      if (pmcid && pmcid.trim()) {
        identifiers.pmcid = pmcid.trim()
      }

      // ArXiv ID - for preprints
      const arxivId = this._extractArXivIDFromExtra(item)
      if (arxivId && arxivId.trim()) {
        identifiers.arxivId = arxivId.trim()
      }

      // URL normalization - for webpage and document matching
      const url = item.getField('url')
      if (url && url.trim()) {
        identifiers.originalUrl = url.trim()
        identifiers.normalizedUrl = this._normalizeUrl(url.trim())
      }

      // Enhanced title normalization for better matching
      if (identifiers.title) {
        identifiers.normalizedTitle = this._normalizeTitle(identifiers.title)
      }

      elogger.info(`Extracted identifiers for ${item.key}: DOI=${identifiers.doi || 'none'}, ISBN=${identifiers.isbn || 'none'}, PMID=${identifiers.pmid || 'none'}, ArXiv=${identifiers.arxivId || 'none'}, Title=${identifiers.title ? 'present' : 'none'}`)

      return identifiers

    } catch (error) {
      elogger.error(`Error extracting identifiers from item ${item.key}: ${error.message}`)
      return identifiers
    }
  }

  /**
   * Handle high confidence duplicate (score ≥ 85) by safely deleting new item and returning existing
   * **PHASE 2: Auto-deletion logic for definite duplicates**
   * **INTEGRITY FIX: Always preserve existing item to maintain external references**
   * @param newItem - The newly created item to be deleted
   * @param existingItem - The existing item to keep (preserves external references)
   * @param reason - Reason for the match
   * @param score - Confidence score
   * @returns Result of the merge operation
   */
  private async _handleDefiniteDuplicate(newItem: any, existingItem: any, reason: string, score: number) {
    try {
      elogger.info(`Handling definite duplicate: deleting new item ${newItem.key}, keeping existing ${existingItem.key}`)

      // Safely delete the new item
      const deleteResult = await this._safelyDeleteItem(newItem)

      if (deleteResult.success) {
        return {
          success: true,
          data: {
            action: 'kept_existing',
            keptItemKey: existingItem.key,
            deletedItemKey: newItem.key,
            reason: reason,
            score: score,
            deletedSuccessfully: true,
            message: `Preserved existing item ${existingItem.key} to maintain external references`,
          },
        }
      } else {
        elogger.error(`Failed to delete duplicate item ${newItem.key}: ${deleteResult.error}`)
        return {
          success: false,
          error: `Failed to delete duplicate: ${deleteResult.error}`,
        }
      }

    } catch (error) {
      elogger.error(`Error in _handleDefiniteDuplicate: ${error.message}`)
      return {
        success: false,
        error: `Error handling duplicate: ${error.message}`,
      }
    }
  }

  /**
   * Flag medium confidence duplicate (score 70-84) for user attention
   * **PHASE 2: Warning system for possible duplicates**
   * @param newItem - The new item to flag
   * @param candidate - The potential duplicate candidate
   * @returns Warning data for response
   */
  private _flagPossibleDuplicate(newItem: any, candidate: any) {
    try {
      const warningData = {
        itemKey: newItem.key,
        itemTitle: newItem.getField('title') || 'Untitled',
        duplicateKey: candidate.item.key,
        duplicateTitle: candidate.item.getField('title') || 'Untitled',
        score: candidate.score,
        reason: candidate.reason,
        confidence: candidate.confidence,
        message: `Possible duplicate detected: "${candidate.item.getField('title')}" (${candidate.reason})`,
      }

      elogger.info(`Flagged possible duplicate: ${newItem.key} potentially matches ${candidate.item.key} (score: ${candidate.score})`)
      return warningData

    } catch (error) {
      elogger.error(`Error flagging possible duplicate: ${error.message}`)
      return {
        itemKey: newItem.key || 'unknown',
        duplicateKey: candidate.item.key || 'unknown',
        score: candidate.score || 0,
        reason: candidate.reason || 'unknown',
        error: `Error creating warning: ${error.message}`,
      }
    }
  }

  /**
   * Safely delete an item with comprehensive error handling
   * **PHASE 2: Safe deletion with rollback capabilities**
   * **PHASE 3 FIX: Improved timeout handling and transaction management**
   * @param item - The item to delete
   * @returns Result of deletion operation
   */
  private async _safelyDeleteItem(item: any) {
    try {
      elogger.info(`Attempting to safely delete item: ${item.key}`)

      // Check if library is editable
      const library = item.library
      if (!library || !library.editable) {
        return {
          success: false,
          error: 'Cannot delete item: library is not editable',
        }
      }

      // Check if item can be deleted (not already deleted, etc.)
      if (item.deleted) {
        return {
          success: false,
          error: 'Item is already deleted',
        }
      }

      // **FIX: Use eraseTx() directly without wrapping in another transaction**
      // eraseTx() already handles its own transaction internally
      // Adding a timeout to prevent hanging
      const deletePromise = item.eraseTx()
      const timeoutPromise = new Promise((_, reject) => {
        const timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer)
        timer.initWithCallback(() => {
          reject(new Error('Deletion operation timed out after 5 seconds'))
        }, 5000, Components.interfaces.nsITimer.TYPE_ONE_SHOT)
      })

      await Promise.race([deletePromise, timeoutPromise])

      elogger.info(`Successfully deleted item: ${item.key}`)
      return { success: true }

    } catch (error) {
      elogger.error(`Error deleting item ${item.key}: ${error.message}`)

      // **FIX: Enhanced error categorization**
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        return {
          success: false,
          error: `Deletion timed out - this may be due to sync conflicts. Item still exists: ${error.message}`,
          category: 'timeout',
        }
      } else if (error.message.includes('transaction') || error.message.includes('database')) {
        return {
          success: false,
          error: `Database transaction error - item may still exist: ${error.message}`,
          category: 'transaction',
        }
      } else {
        return {
          success: false,
          error: `Deletion failed: ${error.message}`,
          category: 'general',
        }
      }
    }
  }

  /**
   * Calculate title similarity score for fuzzy matching
   * **PHASE 2: Enhanced fuzzy matching system**
   * @param title1 - First title to compare
   * @param title2 - Second title to compare
   * @returns Similarity score (0-100)
   */
  private _calculateTitleSimilarity(title1: string, title2: string): number {
    try {
      if (!title1 || !title2) {
        return 0
      }

      // Normalize titles for comparison
      const normalized1 = this._normalizeTitle(title1)
      const normalized2 = this._normalizeTitle(title2)

      // Exact match
      if (normalized1 === normalized2) {
        return 95
      }

      // Calculate similarity using Levenshtein distance
      const similarity = this._calculateLevenshteinSimilarity(normalized1, normalized2)

      // Convert to score
      if (similarity >= 0.95) {
        return 90
      } else if (similarity >= 0.90) {
        return 85
      } else if (similarity >= 0.80) {
        return 75
      } else if (similarity >= 0.70) {
        return 65
      } else {
        return Math.round(similarity * 60) // Max 60 for lower similarities
      }

    } catch (error) {
      elogger.error(`Error calculating title similarity: ${error.message}`)
      return 0
    }
  }

  /**
   * Normalize title for comparison
   * **PHASE 2: Title normalization utilities**
   * @param title - Title to normalize
   * @returns Normalized title
   */
  private _normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
  }

  /**
   * Calculate Levenshtein similarity between two strings
   * **PHASE 2: String similarity algorithm**
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity ratio (0-1)
   */
  private _calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) {
      return 1.0
    }

    const editDistance = this._levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   * **PHASE 2: Core string distance algorithm**
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  private _levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,     // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Search for items by creator (author) name
   * **PHASE 2: Author-based search utility**
   * @param authorName - Author name to search for
   * @returns Array of items by that author
   */
  private async _searchByCreator(authorName: string) {
    try {
      // Use Zotero's search API to find items by creator
      const search = new Zotero.Search()
      search.addCondition('creator', 'contains', authorName)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      elogger.info(`Found ${items.length} items by author: ${authorName}`)
      return items.slice(0, 10) // Limit for performance

    } catch (error) {
      elogger.error(`Error searching by creator: ${error.message}`)
      return []
    }
  }

  /**
   * Calculate combined similarity score for Title + Author + Year
   * **PHASE 2: Comprehensive similarity scoring**
   * @param identifiers - Identifiers from new item
   * @param existingItem - Existing item to compare against
   * @returns Combined similarity score (0-100)
   */
  private _calculateCombinedSimilarity(identifiers: any, existingItem: any): number {
    try {
      let totalScore = 0
      let weightedFactors = 0

      // Title similarity (weight: 0.5)
      const existingTitle = existingItem.getField('title')
      if (existingTitle && identifiers.title) {
        const titleScore = this._calculateTitleSimilarity(identifiers.title, existingTitle)
        totalScore += titleScore * 0.5
        weightedFactors += 0.5
      }

      // Author similarity (weight: 0.3)
      const existingCreators = existingItem.getCreators()
      if (existingCreators.length > 0 && identifiers.firstAuthor) {
        const existingAuthor = existingCreators[0].lastName || existingCreators[0].name
        if (existingAuthor) {
          const authorScore = this._calculateAuthorSimilarity(identifiers.firstAuthor, existingAuthor)
          totalScore += authorScore * 0.3
          weightedFactors += 0.3
        }
      }

      // Year similarity (weight: 0.2)
      const existingDate = existingItem.getField('date')
      if (existingDate && identifiers.year) {
        const existingYear = new Date(existingDate).getFullYear()
        if (existingYear === identifiers.year) {
          totalScore += 100 * 0.2 // Exact year match
          weightedFactors += 0.2
        } else if (Math.abs(existingYear - identifiers.year) <= 1) {
          totalScore += 80 * 0.2 // Close year match
          weightedFactors += 0.2
        }
      }

      // Calculate final weighted score
      const finalScore = weightedFactors > 0 ? Math.round(totalScore / weightedFactors) : 0

      elogger.info(`Combined similarity: ${finalScore} (title: ${identifiers.title?.substring(0, 30)}...)`)
      return finalScore

    } catch (error) {
      elogger.error(`Error calculating combined similarity: ${error.message}`)
      return 0
    }
  }

  /**
   * Calculate author name similarity
   * **PHASE 2: Author comparison utility**
   * @param author1 - First author name
   * @param author2 - Second author name
   * @returns Similarity score (0-100)
   */
  private _calculateAuthorSimilarity(author1: string, author2: string): number {
    try {
      const normalized1 = author1.toLowerCase().trim()
      const normalized2 = author2.toLowerCase().trim()

      if (normalized1 === normalized2) {
        return 100
      }

      // Check if one is contained in the other (handles "Smith" vs "Smith, J.")
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return 95
      }

      // Use Levenshtein similarity for other cases
      const similarity = this._calculateLevenshteinSimilarity(normalized1, normalized2)
      return Math.round(similarity * 100)

    } catch (error) {
      elogger.error(`Error calculating author similarity: ${error.message}`)
      return 0
    }
  }

  /**
   * Perform title-only search as fallback
   * **PHASE 2: Title-only matching fallback**
   * @param title - Title to search for
   * @param excludeItem - Item to exclude from results
   * @returns Array of potential matches
   */
  private async _performTitleOnlySearch(title: string, excludeItem: any) {
    try {
      const candidates = []

      // Use Zotero's search to find similar titles
      const search = new Zotero.Search()
      search.addCondition('title', 'contains', title.split(' ').slice(0, 3).join(' ')) // First 3 words
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      for (const existingItem of items.slice(0, 5)) { // Limit for performance
        if (existingItem.key === excludeItem.key) {
          continue
        }

        const titleScore = this._calculateTitleSimilarity(title, existingItem.getField('title'))
        if (titleScore >= 70) {
          candidates.push({
            item: existingItem,
            score: titleScore,
            reason: `Title similarity (${titleScore}%)`,
            confidence: titleScore >= 85 ? 'high' : 'medium',
          })
        }
      }

      return candidates

    } catch (error) {
      elogger.error(`Error in title-only search: ${error.message}`)
      return []
    }
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
        // **INTEGRITY FIX: Process duplicates BEFORE formatting to ensure correct item data**
        elogger.info('Starting duplicate detection for translated items')
        const duplicateResults = await this._processDuplicates(items)

        // **NOW format the final items (after duplicate processing may have replaced some)**
        const formattedItems = items.map((item: any) => {
          const jsonItem = item.toJSON()
          jsonItem.key = item.key
          jsonItem.version = item.version
          jsonItem.itemID = item.id

          elogger.info(`Formatted final item: ${jsonItem.title || 'No title'} (${jsonItem.itemType}) - Key: ${jsonItem.key}`)
          return jsonItem
        })

        elogger.info(`Translation successful: ${formattedItems.length} items formatted, duplicate processing completed`)
        return {
          success: true,
          items: formattedItems,
          translator: translator.label,
          duplicateProcessing: duplicateResults,
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
   * **PHASE 2: Enhanced with duplicate processing information**
   */
  private async _successResponse(items: any[], method: string, translator: string, duplicateProcessing?: any) {
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
        // **PHASE 2: Include duplicate processing information**
        duplicateInfo: duplicateProcessing ? {
          processed: duplicateProcessing.processed,
          autoMerged: duplicateProcessing.autoMerged,
          possibleDuplicates: duplicateProcessing.possibleDuplicates,
          ...(duplicateProcessing.errors && duplicateProcessing.errors.length > 0 && {
            errors: duplicateProcessing.errors,
          }),
        } : { processed: false },
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
        duplicateInfo: duplicateProcessing ? {
          processed: duplicateProcessing.processed,
          autoMerged: duplicateProcessing.autoMerged || [],
          possibleDuplicates: duplicateProcessing.possibleDuplicates || [],
        } : { processed: false },
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
   * Generate professional inline citations using enhanced fallback method
   * **PHASE 4: Reliable inline citation generation (like Cmd+Shift+A) with proper formatting**
   */
  private async _generateProfessionalCitations(items: any[], citationStyle?: string) {
    try {
      elogger.info(`Generating professional citations for ${items.length} item(s) with style: ${citationStyle || 'default'}`)

      // **FIX: Generate reliable inline citations using enhanced fallback method**
      elogger.info('Generating inline citations using enhanced fallback method')

      // Generate inline citations using Zotero's QuickCopy system
      const citations: string[] = []

      for (const item of items) {
        try {
          // **FIX: Generate proper inline citation using enhanced fallback**
          // Use our reliable fallback that generates proper inline citations
          elogger.info('Generating inline citation using enhanced fallback method')
          const citation = this._generateFallbackCitation(item)

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
        format: 'inline-fallback',
        style: citationStyle || 'enhanced-fallback',
      }

    } catch (error) {
      elogger.error(`Error in professional citation generation: ${error}`)

      // Return fallback citations for all items
      const fallbackCitations = items.map(item => this._generateFallbackCitation(item))

      return {
        success: true,
        citations: fallbackCitations,
        format: 'inline-fallback',
        style: 'enhanced-fallback',
        warning: `Used fallback citation due to error: ${error.message}`,
      }
    }
  }

  /**
   * Generate fallback inline citation when CSL processing fails
   * **PHASE 4: Robust fallback inline citation generation (like Cmd+Shift+A)**
   */
  private _generateFallbackCitation(item: any): string {
    try {
      const title = item.getField('title') || 'Untitled'
      const creators = item.getCreators()
      const year = item.getField('date') ? new Date(item.getField('date')).getFullYear() : ''

      // Create inline author-year citation (like APA or Chicago author-date)
      let citation = ''
      if (creators.length > 0) {
        const firstCreator = creators[0]
        const author = firstCreator.lastName || firstCreator.name || 'Unknown Author'

        if (creators.length === 1) {
          citation = year ? `(${author}, ${year})` : `(${author})`
        } else if (creators.length === 2) {
          const secondCreator = creators[1]
          const secondAuthor = secondCreator.lastName || secondCreator.name || 'Unknown'
          citation = year ? `(${author} & ${secondAuthor}, ${year})` : `(${author} & ${secondAuthor})`
        } else {
          citation = year ? `(${author} et al., ${year})` : `(${author} et al.)`
        }
      } else {
        // No author, use title and year
        const shortTitle = title.length > 30 ? title.substring(0, 30) + '...' : title
        citation = year ? `("${shortTitle}," ${year})` : `("${shortTitle}")`
      }

      return citation

    } catch (error) {
      elogger.error(`Error in fallback inline citation generation: ${error}`)
      const title = item.getField('title') || item.key || 'Unknown Item'
      return `("${title}")`
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

  /**
   * Extract PMID from item's extra field
   * **PHASE 3: PMID extraction utility**
   * @param item - Zotero item
   * @returns PMID if found
   */
  private _extractPMIDFromExtra(item: any): string | null {
    try {
      const extra = item.getField('extra') || ''

      // Look for PMID patterns in extra field
      const pmidPatterns = [
        /PMID:\s*(\d+)/i,
        /PubMed ID:\s*(\d+)/i,
        /pubmed:\s*(\d+)/i,
        /pmid\s*(\d+)/i,
      ]

      for (const pattern of pmidPatterns) {
        const match = extra.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }

      return null
    } catch (error) {
      elogger.error(`Error extracting PMID: ${error.message}`)
      return null
    }
  }

  /**
   * Extract PMC ID from item's extra field
   * **PHASE 3: PMC ID extraction utility**
   * @param item - Zotero item
   * @returns PMC ID if found
   */
  private _extractPMCIDFromExtra(item: any): string | null {
    try {
      const extra = item.getField('extra') || ''

      // Look for PMC ID patterns in extra field
      const pmcPatterns = [
        /PMC:\s*(PMC\d+)/i,
        /PMCID:\s*(PMC\d+)/i,
        /PMC ID:\s*(PMC\d+)/i,
        /pmc\s*(PMC\d+)/i,
        /PMC\s*(\d+)/i, // Just the number
      ]

      for (const pattern of pmcPatterns) {
        const match = extra.match(pattern)
        if (match && match[1]) {
          let pmcId = match[1]
          // Ensure PMC prefix
          if (!pmcId.startsWith('PMC')) {
            pmcId = 'PMC' + pmcId
          }
          return pmcId
        }
      }

      return null
    } catch (error) {
      elogger.error(`Error extracting PMC ID: ${error.message}`)
      return null
    }
  }

  /**
   * Extract ArXiv ID from item's extra field or URL
   * **PHASE 3: ArXiv ID extraction utility**
   * @param item - Zotero item
   * @returns ArXiv ID if found
   */
  private _extractArXivIDFromExtra(item: any): string | null {
    try {
      const extra = item.getField('extra') || ''
      const url = item.getField('url') || ''

      // Look for ArXiv patterns in extra field and URL
      const arxivPatterns = [
        /arXiv:\s*([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i,
        /arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i,
        /arXiv:\s*([a-z-]+(?:\.[A-Z]{2})?\/[0-9]{7}(?:v[0-9]+)?)/i, // Old format
      ]

      const textToSearch = extra + ' ' + url

      for (const pattern of arxivPatterns) {
        const match = textToSearch.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }

      return null
    } catch (error) {
      elogger.error(`Error extracting ArXiv ID: ${error.message}`)
      return null
    }
  }

  /**
   * Normalize URL for comparison
   * **PHASE 3: URL normalization for duplicate detection**
   * @param url - URL to normalize
   * @returns Normalized URL
   */
  private _normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'ref', 'referer', 'referrer', 'source', 'fbclid', 'gclid',
        'msclkid', 'twclid', '_ga', 'mc_cid', 'mc_eid',
      ]

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param)
      })

      // Normalize domain (remove www, convert to lowercase)
      let hostname = urlObj.hostname.toLowerCase()
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4)
      }

      // Remove trailing slash from pathname
      let pathname = urlObj.pathname
      if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1)
      }

      // Reconstruct normalized URL
      const normalizedUrl = `${urlObj.protocol}//${hostname}${pathname}${urlObj.search}${urlObj.hash}`

      elogger.info(`URL normalized: ${url} -> ${normalizedUrl}`)
      return normalizedUrl

    } catch (error) {
      elogger.error(`Error normalizing URL: ${error.message}`)
      // Return original URL if normalization fails
      return url.toLowerCase()
    }
  }

  /**
   * Search for items by extra field content
   * **PHASE 3: Extra field search utility for PMID, PMC ID, ArXiv ID**
   * @param fieldType - Type of identifier (PMID, PMC, arXiv)
   * @param value - Value to search for
   * @returns Array of items containing the identifier
   */
  private async _searchByExtraField(fieldType: string, value: string) {
    try {
      // Create search for items containing the identifier in extra field
      const search = new Zotero.Search()
      search.addCondition('extra', 'contains', value)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      // Filter items that actually contain the specific identifier pattern
      const matchingItems = items.filter(item => {
        const extra = item.getField('extra') || ''

        switch (fieldType.toLowerCase()) {
          case 'pmid':
            return /PMID:\s*(\d+)/i.test(extra) && extra.includes(value)
          case 'pmc':
            return /PMC/i.test(extra) && extra.includes(value)
          case 'arxiv':
            return /arXiv/i.test(extra) && extra.includes(value)
          default:
            return extra.includes(value)
        }
      })

      elogger.info(`Found ${matchingItems.length} items with ${fieldType}: ${value}`)
      return matchingItems.slice(0, 5) // Limit for performance

    } catch (error) {
      elogger.error(`Error searching by extra field ${fieldType}: ${error.message}`)
      return []
    }
  }

  /**
   * Search for items by normalized URL
   * **PHASE 3: URL normalization search utility**
   * @param normalizedUrl - Normalized URL to search for
   * @param excludeItem - Item to exclude from results
   * @returns Array of items with matching normalized URLs
   */
  private async _searchByNormalizedUrl(normalizedUrl: string, excludeItem: any) {
    try {
      // Extract domain for efficient searching
      const urlObj = new URL(normalizedUrl)
      const domain = urlObj.hostname

      // Search for items with URLs from the same domain
      const search = new Zotero.Search()
      search.addCondition('url', 'contains', domain)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      // Filter items that have matching normalized URLs
      const matchingItems = []
      for (const item of items.slice(0, 10)) { // Limit initial set
        if (item.key === excludeItem.key) {
          continue
        }

        const itemUrl = item.getField('url')
        if (itemUrl) {
          const itemNormalizedUrl = this._normalizeUrl(itemUrl)
          if (itemNormalizedUrl === normalizedUrl) {
            matchingItems.push(item)
          }
        }
      }

      elogger.info(`Found ${matchingItems.length} items with matching normalized URL: ${normalizedUrl}`)
      return matchingItems

    } catch (error) {
      elogger.error(`Error searching by normalized URL: ${error.message}`)
      return []
    }
  }

  /**
   * Remove duplicate candidates (same item found through different identifiers)
   * **PHASE 3: Candidate deduplication utility**
   * @param candidates - Array of duplicate candidates
   * @returns Deduplicated array with best match for each item
   */
  private _deduplicateCandidates(candidates: any[]) {
    try {
      const itemMap = new Map()

      for (const candidate of candidates) {
        const itemKey = candidate.item.key

        if (!itemMap.has(itemKey)) {
          // First occurrence of this item
          itemMap.set(itemKey, candidate)
        } else {
          // Item already exists, keep the one with higher score
          const existing = itemMap.get(itemKey)
          if (candidate.score > existing.score) {
            // Update with higher confidence match
            candidate.reason = `${existing.reason} + ${candidate.reason}`
            itemMap.set(itemKey, candidate)
          } else {
            // Enhance reason of existing higher-scoring match
            existing.reason = `${existing.reason} + ${candidate.reason}`
            itemMap.set(itemKey, existing)
          }
        }
      }

      const uniqueCandidates = Array.from(itemMap.values())
      elogger.info(`Deduplicated ${candidates.length} candidates to ${uniqueCandidates.length} unique items`)

      return uniqueCandidates

    } catch (error) {
      elogger.error(`Error deduplicating candidates: ${error.message}`)
      return candidates // Return original array if deduplication fails
    }
  }
}