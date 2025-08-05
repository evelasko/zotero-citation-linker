import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { WebTranslator } from '../../translators/WebTranslator'
import { IdentifierExtractor } from '../../utils/IdentifierExtractor'
import { UrlUtils } from '../../utils/UrlUtils'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for comprehensive URL analysis
 * Checks for existing items, extracts identifiers, and detects translators
 */
export class AnalyzeUrlEndpoint extends BaseEndpoint {
  private webTranslator: WebTranslator

  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.ANALYZE_URL, serviceManager, ['POST'])
    this.webTranslator = new WebTranslator()
  }

  /**
   * Initialize the endpoint and its dependencies
   */
  async initialize(): Promise<void> {
    await this.webTranslator.initialize()
  }

  /**
   * Cleanup the endpoint and its dependencies
   */
  async cleanup(): Promise<void> {
    await this.webTranslator.cleanup()
  }

  /**
   * Handle URL analysis request
   * @param requestData - Request data containing URL
   * @returns Analysis results
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateUrlRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { url } = validationResult
      logger.info(`Analyzing URL: ${url}`)

      // Initialize response structure
      const response = {
        itemKey: null,
        identifiers: [],
        validIdentifiers: [],
        webTranslators: [],
        status: 'success',
        timestamp: new Date().toISOString(),
        errors: [],
      }

      try {
        // Step 1: Check if items with same URL exist in library
        logger.info('Step 1: Checking for existing items with same URL')
        const existingItems = await this.findItemsByUrl(url!)

        if (existingItems && existingItems.length > 0) {
          const firstItem = existingItems[0]
          response.itemKey = firstItem.key
          logger.info(`Found existing item with same URL: ${firstItem.key}`)
          return this.successResponse(response)
        }

        // Step 2: Extract identifiers from URL itself (fast check)
        logger.info('Step 2: Extracting identifiers from URL')
        try {
          const urlIdentifierResults = await IdentifierExtractor.extractIdentifiersFromURL(url!)

          if (urlIdentifierResults.validIdentifiers.length > 0) {
            response.identifiers = urlIdentifierResults.identifiers
            response.validIdentifiers = urlIdentifierResults.validIdentifiers
            logger.info(`Found ${urlIdentifierResults.validIdentifiers.length} valid identifiers in URL`)
            return this.successResponse(response)
          }
        } catch (error) {
          logger.debug(`No identifiers found in URL: ${error}`)
        }

        // Step 3: Extract identifiers from HTML content
        logger.info('Step 3: Extracting identifiers from HTML content')
        try {
          // Load document
          const document = await IdentifierExtractor.loadDocument(url!)

          // Fetch HTML content
          const httpResponse = await Zotero.HTTP.request('GET', url!, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 30000,
            followRedirects: true,
          })

          if (httpResponse.responseText) {
            // Extract identifiers using both HTML and DOM methods
            const identifierResults = await IdentifierExtractor.extractIdentifiersFromHTML(
              httpResponse.responseText,
              document,
            )

            response.identifiers = identifierResults.identifiers
            response.validIdentifiers = identifierResults.validIdentifiers

            if (identifierResults.validIdentifiers.length > 0) {
              logger.info(`Found ${identifierResults.validIdentifiers.length} valid identifiers`)
              return this.successResponse(response)
            }
          } else {
            throw new Error('Empty HTML response from URL')
          }
        } catch (error) {
          logger.error(`Error extracting identifiers: ${error}`)
          response.errors.push(`Identifier extraction failed: ${error}`)
        }

        // Step 4: Detect web translators
        logger.info('Step 4: Detecting web translators')
        try {
          const webTranslators = await this.webTranslator.detectWebTranslators(url!)

          if (webTranslators && webTranslators.length > 0) {
            response.webTranslators = webTranslators.map(translator => ({
              translatorID: translator.translatorID,
              label: translator.label,
              creator: translator.creator,
              priority: translator.priority,
            }))
            logger.info(`Found ${webTranslators.length} web translators`)
            return this.successResponse(response)
          }
        } catch (error) {
          logger.error(`Error detecting web translators: ${error}`)
          response.errors.push(`Web translator detection failed: ${error}`)
        }

        // If we reach here, no analysis method found anything useful
        if (response.errors.length > 0) {
          response.status = 'partial_success'
          logger.warn(`URL analysis completed with errors: ${response.errors.join('; ')}`)
        } else {
          logger.info('URL analysis completed - no items, identifiers, or translators found')
        }

        return this.successResponse(response)

      } catch (error) {
        logger.error(`Error in URL analysis steps: ${error}`)
        response.errors.push(`Analysis failed: ${error}`)
        response.status = 'error'
        return this.successResponse(response)
      }
    } catch (error) {
      logger.error(`Error in AnalyzeUrl endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }

  /**
   * Find items in library by URL (exact and normalized matching)
   * @param url - URL to search for
   * @returns Array of matching items
   */
  private async findItemsByUrl(url: string): Promise<any[]> {
    try {
      const normalizedUrl = UrlUtils.normalizeUrl(url)
      const domain = UrlUtils.extractDomain(url)

      // Search for items with URLs from the same domain
      const search = new Zotero.Search()
      search.addCondition('url', 'contains', domain)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      // Filter items that have matching URLs (both exact and normalized)
      const matchingItems = []
      for (const item of items.slice(0, 50)) { // Increased limit for better coverage
        const itemUrl = item.getField('url')
        if (itemUrl) {
          const itemNormalizedUrl = UrlUtils.normalizeUrl(itemUrl)

          // Check both exact match and normalized match
          if (itemUrl === url || itemNormalizedUrl === normalizedUrl) {
            matchingItems.push(item)
          }
        }
      }

      // Sort by date added (most recent first) to return the most relevant item first
      matchingItems.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())

      logger.info(`Found ${matchingItems.length} items with matching URL`)
      return matchingItems
    } catch (error) {
      logger.error(`Error finding items by URL: ${error}`)
      return []
    }
  }
}