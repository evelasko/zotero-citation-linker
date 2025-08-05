import { IService, TranslationResult } from '../core/types'
import { serviceLogger as logger } from '../core/Logger'

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')

/**
 * Service for handling web translation using Zotero translators
 */
export class WebTranslator implements IService {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing WebTranslator service')
    this.initialized = true
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up WebTranslator service')
    this.initialized = false
  }

  /**
   * Attempt web translation of a URL
   * @param url - URL to translate
   * @returns Translation result
   */
  async attemptWebTranslation(url: string): Promise<TranslationResult> {
    try {
      logger.info(`Attempting web translation for URL: ${url}`)

      // Load and wrap the document first
      const doc = await this.loadWrappedDocument(url)

      // Create a new Zotero translator
      const translate = new Zotero.Translate.Web()
      translate.setDocument(doc)  // Use setDocument, not setURL

      // Get available translators
      const translators = await translate.getTranslators()

      if (!translators || translators.length === 0) {
        logger.info('No translators available for this URL')
        return {
          success: false,
          items: [],
          reason: 'No suitable translators found for this URL',
        }
      }

      // Use the first available translator
      const translator = translators[0]
      translate.setTranslator(translator)

      logger.info(`Using translator: ${translator.label}`)

      // Perform translation
      const translatedItems = await translate.translate()

      if (!translatedItems || translatedItems.length === 0) {
        return {
          success: false,
          items: [],
          reason: 'Translation completed but no items were created',
        }
      }

      logger.info(`Translation successful: ${translatedItems.length} items created`)

      return {
        success: true,
        items: translatedItems,
        translator: translator.label,
      }
    } catch (error) {
      logger.error(`Web translation failed: ${error}`)
      return {
        success: false,
        items: [],
        reason: `Translation error: ${error}`,
      }
    }
  }

  /**
   * Attempt identifier translation (DOI, PMID, etc.)
   * @param identifier - Identifier to translate
   * @returns Translation result
   */
  async attemptIdentifierTranslation(identifier: string): Promise<TranslationResult> {
    try {
      logger.info(`Attempting identifier translation for: ${identifier}`)

      // Create search translator
      const search = new Zotero.Translate.Search()

      // Extract and set identifier
      const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier)
      if (extractedIdentifiers.length === 0) {
        return {
          success: false,
          items: [],
          reason: 'No valid identifiers found in the provided string',
        }
      }

      search.setIdentifier(extractedIdentifiers[0])

      // Get available translators
      const translators = await search.getTranslators()

      if (!translators || translators.length === 0) {
        return {
          success: false,
          items: [],
          reason: 'No suitable translators found for this identifier',
        }
      }

      // Use the first available translator
      const translator = translators[0]
      search.setTranslator(translator)

      logger.info(`Using translator: ${translator.label}`)

      // Perform translation
      const translatedItems = await search.translate()

      if (!translatedItems || translatedItems.length === 0) {
        return {
          success: false,
          items: [],
          reason: 'Translation completed but no items were created',
        }
      }

      logger.info(`Identifier translation successful: ${translatedItems.length} items created`)

      return {
        success: true,
        items: translatedItems,
        translator: translator.label,
      }
    } catch (error) {
      logger.error(`Identifier translation failed: ${error}`)
      return {
        success: false,
        items: [],
        reason: `Translation error: ${error}`,
      }
    }
  }

  /**
   * Detect available web translators for a URL
   * @param url - URL to check
   * @returns Array of available translators
   */
  async detectWebTranslators(url: string): Promise<any[]> {
    try {
      logger.info(`Detecting web translators for URL: ${url}`)

      // Load and wrap the document first
      const doc = await this.loadWrappedDocument(url)

      const translate = new Zotero.Translate.Web()
      translate.setDocument(doc)  // Use setDocument, not setURL

      const translators = await translate.getTranslators()

      logger.info(`Found ${translators?.length || 0} web translators`)
      return translators || []
    } catch (error) {
      logger.error(`Error detecting web translators: ${error}`)
      return []
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Load and wrap a document from URL for translation
   * @param url - URL to load
   * @returns Wrapped document
   */
  private async loadWrappedDocument(url: string): Promise<any> {
    try {
      // Load the webpage document
      const doc = await this.loadDocument(url)
      logger.info('Document loaded successfully for translation')

      // Use Zotero's wrapDocument method - the proper way to prepare docs for translation
      try {
        const wrappedDoc = Zotero.HTTP.wrapDocument(doc, url)
        logger.info(`Document wrapped successfully with Zotero.HTTP.wrapDocument for: ${url}`)
        logger.info(`Document location href: ${wrappedDoc.location?.href || 'undefined'}`)
        return wrappedDoc
      } catch (err) {
        logger.error(`Failed to wrap document with Zotero.HTTP.wrapDocument: ${err}`)
        logger.info('Continuing with translation using unwrapped document')
        return doc
      }
    } catch (error) {
      logger.error(`Failed to load wrapped document: ${error}`)
      throw error
    }
  }

  /**
   * Load a document from URL
   * @param url - URL to load
   * @returns Document object
   */
  private async loadDocument(url: string): Promise<any> {
    try {
      logger.info(`Loading document from URL: ${url}`)

      // Use Zotero's HTTP system with proper headers
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 30000,
        followRedirects: true,
      }

      const response = await Zotero.HTTP.request('GET', url, options)

      if (!response.responseText) {
        throw new Error('Empty response from URL')
      }

      logger.info(`Received response: ${response.status} ${response.statusText}, content length: ${response.responseText.length}`)

      // Use proper DOM document creation for Zotero 7
      let doc: any
      try {
        // Method 1: Try using DOMParser from global context
        const globalWindow = (globalThis as any).window || globalThis
        if (globalWindow && globalWindow.DOMParser) {
          const parser = new globalWindow.DOMParser()
          doc = parser.parseFromString(response.responseText, 'text/html')
          logger.info('Successfully used global DOMParser')
        } else {
          throw new Error('Global DOMParser not available')
        }
      } catch (e1) {
        try {
          // Method 2: Try using document.implementation
          const mainWindow = Services.wm.getMostRecentWindow('navigator:browser')
          if (mainWindow && mainWindow.document) {
            doc = mainWindow.document.implementation.createHTMLDocument('temp')
            doc.documentElement.innerHTML = response.responseText
            logger.info('Successfully used document.implementation.createHTMLDocument')
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
            logger.info('Successfully used windowless browser')
          } catch (e3) {
            // Method 4: Create minimal DOM structure as ultimate fallback
            try {
              logger.info('Attempting to create minimal DOM structure as fallback')
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
              logger.info('Successfully created minimal DOM structure')
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
        logger.info(`Warning: Could not set base URI: ${baseError.message}`)
      }

      logger.info(`Successfully parsed document with title: ${doc.title || 'No title'}`)
      return doc

    } catch (error) {
      logger.error(`Failed to load document from ${url}: ${error.message}`)
      throw new Error(`Failed to load document from ${url}: ${error.message}`)
    }
  }
}