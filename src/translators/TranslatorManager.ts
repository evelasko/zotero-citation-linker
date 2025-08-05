import { IService, TranslationResult, ExtractedMetadata, ExtractedIdentifiers } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { serviceLogger as logger } from '../core/Logger'
import { WebTranslator } from './WebTranslator'
import { IdentifierTranslator } from './IdentifierTranslator'
import { MetadataExtractor } from './MetadataExtractor'

// Global declarations
/* eslint-disable no-unused-vars*/
declare const DOMParser: {
  new(): {
    parseFromString(str: string, contentType: string): any
  }
}
declare const URL: {
  new(url: string): any
}
/* eslint-enable no-unused-vars*/

export interface TranslationOptions {
  preferredMethod?: 'web' | 'identifier' | 'auto'
  validateItems?: boolean
  processDuplicates?: boolean
  extractMetadata?: boolean
}

export interface ComprehensiveTranslationResult extends TranslationResult {
  method: 'web' | 'identifier' | 'metadata' | 'mixed'
  metadata?: ExtractedMetadata
  identifiers?: ExtractedIdentifiers
  availableTranslators?: any[]
}

/**
 * Manager service for coordinating all translation operations
 * Provides unified interface for web translation, identifier translation, and metadata extraction
 */
export class TranslatorManager implements IService {
  private initialized = false
  private serviceManager: ServiceManager

  // Translator Services
  public webTranslator: WebTranslator
  public identifierTranslator: IdentifierTranslator
  public metadataExtractor: MetadataExtractor

  private translatorServices: Map<string, IService> = new Map()

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager

    // Initialize translator services
    this.webTranslator = new WebTranslator()
    this.identifierTranslator = new IdentifierTranslator(serviceManager)
    this.metadataExtractor = new MetadataExtractor()

    // Register services for lifecycle management
    this.translatorServices.set('webTranslator', this.webTranslator)
    this.translatorServices.set('identifierTranslator', this.identifierTranslator)
    this.translatorServices.set('metadataExtractor', this.metadataExtractor)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing TranslatorManager service')

    try {
      // Initialize all translator services in parallel
      const initPromises = Array.from(this.translatorServices.entries()).map(async ([name, service]) => {
        try {
          await service.initialize()
          logger.debug(`Translator service '${name}' initialized successfully`)
        } catch (error) {
          logger.error(`Failed to initialize translator service '${name}': ${error}`)
          throw error
        }
      })

      await Promise.all(initPromises)

      this.initialized = true
      logger.info(`TranslatorManager service initialized successfully with ${this.translatorServices.size} translator services`)
    } catch (error) {
      logger.error(`TranslatorManager initialization failed: ${error}`)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up TranslatorManager service')

    try {
      // Cleanup all translator services in parallel
      const cleanupPromises = Array.from(this.translatorServices.entries()).map(async ([name, service]) => {
        try {
          await service.cleanup()
          logger.debug(`Translator service '${name}' cleaned up successfully`)
        } catch (error) {
          logger.error(`Error cleaning up translator service '${name}': ${error}`)
        }
      })

      await Promise.all(cleanupPromises)

      this.initialized = false
      logger.info('TranslatorManager service cleaned up')
    } catch (error) {
      logger.error(`TranslatorManager cleanup failed: ${error}`)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Comprehensive translation attempt using multiple methods
   * @param input - URL or identifier to translate
   * @param options - Translation options
   * @returns Comprehensive translation result
   */
  async attemptTranslation(input: string, options: TranslationOptions = {}): Promise<ComprehensiveTranslationResult> {
    logger.info(`Starting comprehensive translation for: ${input}`)

    const {
      preferredMethod = 'auto',
    } = options

    // Extract metadata will be handled in individual methods

    try {
      // Determine input type and preferred method
      const inputType = this.determineInputType(input)
      const method = preferredMethod === 'auto' ? inputType : preferredMethod

      logger.info(`Input type detected: ${inputType}, using method: ${method}`)

      let result: ComprehensiveTranslationResult

      // Try primary method first
      if (method === 'web') {
        result = await this.attemptWebTranslation(input, options)
      } else if (method === 'identifier') {
        result = await this.attemptIdentifierTranslation(input)
      } else {
        // Fallback to metadata extraction
        result = await this.attemptMetadataExtraction(input)
      }

      // If primary method failed and we're in auto mode, try alternatives
      if (!result.success && preferredMethod === 'auto') {
        logger.info('Primary method failed, trying alternative methods')

        if (inputType === 'web') {
          // Try identifier extraction from URL
          const identifierResult = await this.extractIdentifiersFromUrl(input)
          if (identifierResult.identifiers && Object.keys(identifierResult.identifiers).length > 0) {
            // Try translating the first identifier found
            const firstIdentifier = Object.values(identifierResult.identifiers)[0]?.[0]
            if (firstIdentifier) {
              const altResult = await this.attemptIdentifierTranslation(firstIdentifier)
              if (altResult.success) {
                result = { ...altResult, method: 'mixed' }
              }
            }
          }
        } else if (inputType === 'identifier') {
          // Try web search if identifier fails
          const webSearchUrl = this.constructSearchUrl(input)
          if (webSearchUrl) {
            const altResult = await this.attemptWebTranslation(webSearchUrl, options)
            if (altResult.success) {
              result = { ...altResult, method: 'mixed' }
            }
          }
        }
      }

      logger.info(`Translation completed: ${result.success ? 'success' : 'failed'} using ${result.method} method`)
      return result

    } catch (error) {
      logger.error(`Comprehensive translation error: ${error}`)
      return {
        success: false,
        items: [],
        method: 'mixed',
        reason: `Translation error: ${error}`,
      }
    }
  }

  /**
   * Attempt web translation
   */
  private async attemptWebTranslation(url: string, options: TranslationOptions): Promise<ComprehensiveTranslationResult> {
    try {
      const result = await this.webTranslator.attemptWebTranslation(url)

      const comprehensiveResult: ComprehensiveTranslationResult = {
        ...result,
        method: 'web',
      }

      if (options.extractMetadata !== false) {
        try {
          comprehensiveResult.metadata = await this.extractMetadataFromUrl(url)
          const identifierResult = await this.extractIdentifiersFromUrl(url)
          comprehensiveResult.identifiers = identifierResult.identifiers
        } catch (error) {
          logger.warn(`Could not extract metadata for ${url}: ${error}`)
        }
      }

      return comprehensiveResult
    } catch (error) {
      logger.error(`Web translation error: ${error}`)
      return {
        success: false,
        items: [],
        method: 'web',
        reason: `Web translation error: ${error}`,
      }
    }
  }

  /**
   * Attempt identifier translation
   */
  private async attemptIdentifierTranslation(identifier: string): Promise<ComprehensiveTranslationResult> {
    try {
      const result = await this.identifierTranslator.attemptIdentifierTranslation(identifier)

      return {
        ...result,
        method: 'identifier',
      }
    } catch (error) {
      logger.error(`Identifier translation error: ${error}`)
      return {
        success: false,
        items: [],
        method: 'identifier',
        reason: `Identifier translation error: ${error}`,
      }
    }
  }

  /**
   * Attempt metadata extraction
   */
  private async attemptMetadataExtraction(input: string): Promise<ComprehensiveTranslationResult> {
    try {
      logger.info(`Attempting metadata extraction for: ${input}`)

      const metadata = await this.extractMetadataFromUrl(input)
      const identifierResult = await this.extractIdentifiersFromUrl(input)

      return {
        success: Object.keys(metadata).length > 0 || Object.keys(identifierResult.identifiers).length > 0,
        items: [],
        method: 'metadata',
        metadata,
        identifiers: identifierResult.identifiers,
        reason: Object.keys(metadata).length === 0 && Object.keys(identifierResult.identifiers).length === 0
          ? 'No metadata or identifiers could be extracted'
          : undefined,
      }
    } catch (error) {
      logger.error(`Metadata extraction error: ${error}`)
      return {
        success: false,
        items: [],
        method: 'metadata',
        reason: `Metadata extraction error: ${error}`,
      }
    }
  }

  /**
   * Extract metadata from URL
   */
  private async extractMetadataFromUrl(url: string): Promise<ExtractedMetadata> {
    try {
      // Load HTML content
      const response = await Zotero.HTTP.request('GET', url, {
        timeout: 30000,
      })

      if (!response.responseText) {
        return {}
      }

      return await this.metadataExtractor.extractMetadataFromHTML(response.responseText, url)
    } catch (error) {
      logger.error(`Error extracting metadata from URL: ${error}`)
      return {}
    }
  }

  /**
   * Extract identifiers from URL
   */
  private async extractIdentifiersFromUrl(url: string): Promise<{ identifiers: ExtractedIdentifiers }> {
    try {
      // Load HTML content
      const response = await Zotero.HTTP.request('GET', url, {
        timeout: 30000,
      })

      if (!response.responseText) {
        return { identifiers: {} }
      }

      const parser = new DOMParser()
      const document = parser.parseFromString(response.responseText, 'text/html')

      const identifiers = await this.metadataExtractor.extractIdentifiers(response.responseText, document)
      return { identifiers }
    } catch (error) {
      logger.error(`Error extracting identifiers from URL: ${error}`)
      return { identifiers: {} }
    }
  }

  /**
   * Determine input type (URL vs identifier)
   */
  private determineInputType(input: string): 'web' | 'identifier' {
    // Check if input looks like a URL
    try {
      new URL(input)
      return 'web'
    } catch {
      // Check if input looks like an identifier
      const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(input)
      return extractedIdentifiers.length > 0 ? 'identifier' : 'web'
    }
  }

  /**
   * Construct search URL for identifier
   */
  private constructSearchUrl(identifier: string): string | null {
    const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier)
    if (extractedIdentifiers.length === 0) return null

    const id = extractedIdentifiers[0]
    let idString: string

    // Handle different identifier types
    if (typeof id === 'string') {
      idString = id
    } else if (id && typeof id === 'object') {
      // Extract string value from identifier object
      idString = Object.values(id)[0] as string
    } else {
      return null
    }

    // Construct appropriate search URL based on identifier type
    if (idString.includes('10.')) {
      // DOI
      return `https://doi.org/${idString}`
    } else if (idString.match(/^\d{4}-\d{3}[\dX]$/)) {
      // ISSN - search on WorldCat
      return `https://www.worldcat.org/search?q=n2:${idString}`
    } else if (idString.match(/^[\d-]{10,17}$/)) {
      // ISBN - search on WorldCat
      return `https://www.worldcat.org/search?q=bn:${idString}`
    }

    return null
  }

  /**
   * Get translator service status
   */
  getTranslatorStatus(): {
    initialized: boolean
    services: Array<{
      name: string
      initialized: boolean
      status: string
    }>
  } {
    const services = Array.from(this.translatorServices.entries()).map(([name, service]) => ({
      name,
      initialized: service.isInitialized ? service.isInitialized() : false,
      status: service.isInitialized && service.isInitialized() ? 'active' : 'inactive',
    }))

    return {
      initialized: this.initialized,
      services,
    }
  }

  /**
   * Get supported identifier types
   */
  getSupportedIdentifierTypes(): string[] {
    return this.identifierTranslator.getSupportedIdentifierTypes()
  }

  /**
   * Check if all translator services are initialized
   */
  areAllServicesInitialized(): boolean {
    return Array.from(this.translatorServices.values()).every(service =>
      service.isInitialized ? service.isInitialized() : false,
    )
  }
}