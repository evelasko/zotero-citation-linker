import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { WebTranslator } from '../../translators/WebTranslator'
import { IdentifierExtractor } from '../../utils/IdentifierExtractor'
import { UrlUtils } from '../../utils/UrlUtils'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'
import { PdfProcessor } from '../../services/PdfProcessor'

/**
 * Endpoint for comprehensive URL analysis
 * Checks for existing items, extracts identifiers, and detects translators
 */
export class AnalyzeUrlEndpoint extends BaseEndpoint {
  private webTranslator: WebTranslator
  private pdfProcessor: PdfProcessor

  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.ANALYZE_URL, serviceManager, ['POST'])
    this.webTranslator = new WebTranslator()
    this.pdfProcessor = new PdfProcessor()
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
      const response: any = {
        itemKey: null,
        identifiers: [],
        validIdentifiers: [],
        webTranslators: [],
        status: 'success',
        processingRecommendation: null,
        urlAccessible: false,
        contentType: 'unknown',
        httpStatusCode: null,
        timestamp: new Date().toISOString(),
        errors: [],
        // DOI disambiguation fields (optional)
        primaryDOI: undefined,
        primaryDOIScore: undefined,
        primaryDOIConfidence: undefined,
        alternativeDOIs: undefined,
        disambiguationUsed: false,
        // AI translation fields
        aiTranslation: false,
      }

      // Shared variables for HTML content and page title
      let httpResponse: any = null
      let pageTitle = ''

      try {
        //: Step 1: Check if items with same URL exist in library
        logger.info('Step 1: Checking for existing items with same URL')
        const existingItems = await this.findItemsByUrl(url!)

        if (existingItems && existingItems.length > 0) {
          const firstItem = existingItems[0]
          response.itemKey = firstItem.key
          response.processingRecommendation = 'already-stored'
          logger.info(`Found existing item with same URL: ${firstItem.key}`)
          return this.successResponse(response)
        }

        //: Step 2: Extract identifiers from URL itself (fast check)
        logger.info('Step 2: Extracting identifiers from URL')
        try {
          const urlIdentifierResults = await IdentifierExtractor.extractIdentifiersFromURL(url!)

          if (urlIdentifierResults.validIdentifiers.length > 0) {
            response.identifiers = urlIdentifierResults.identifiers
            response.validIdentifiers = urlIdentifierResults.validIdentifiers
            response.processingRecommendation = 'extractable'
            logger.info(`Found ${urlIdentifierResults.validIdentifiers.length} valid identifiers in URL`)
            return this.successResponse(response)
          }
        } catch (error) {
          logger.debug(`No identifiers found in URL: ${error}`)
        }

        //: Step 3: Check URL accessibility and determine content type
        logger.info('Step 3: Checking URL accessibility and content type')
        try {
          // Perform initial HEAD/GET request to check accessibility
          httpResponse = await Zotero.HTTP.request('GET', url!, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
              'Accept': 'text/html,application/xhtml+xml,application/xml,application/pdf;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 30000,
            followRedirects: true,
          })

          response.httpStatusCode = httpResponse.status
          response.urlAccessible = httpResponse.status === 200

          if (httpResponse.status !== 200) {
            response.processingRecommendation = 'unreachable'
            logger.warn(`URL not accessible: HTTP ${httpResponse.status}`)
            return this.successResponse(response)
          }

          // Determine content type
          const contentTypeHeader = httpResponse.getResponseHeader('content-type') || ''
          if (contentTypeHeader.includes('application/pdf') || UrlUtils.isPdfUrl(url!)) {
            response.contentType = 'pdf'
          } else if (contentTypeHeader.includes('text/html') || contentTypeHeader.includes('application/xhtml+xml')) {
            response.contentType = 'html'
          } else {
            response.contentType = 'unknown'
          }

          logger.info(`URL accessible (HTTP ${httpResponse.status}), content type: ${response.contentType}`)

        } catch (error) {
          logger.error(`Error checking URL accessibility: ${error}`)
          response.httpStatusCode = 0
          response.processingRecommendation = 'unreachable'
          response.errors.push(`URL accessibility check failed: ${error}`)
          return this.successResponse(response)
        }

        //: Step 3.1: Extract identifiers from PDF content
        if (response.contentType === 'pdf') {
          logger.info('Processing PDF content for identifier extraction')
          try {
            const pdfResult = await this.pdfProcessor.processPdfFromUrl(url!)

            if (pdfResult.success && pdfResult.identifiers) {
              // Process and validate PDF identifiers
              const validIdentifiers = []
              const allIdentifiers = []

              // Extract identifiers from pdfResult and validate them
              Object.values(pdfResult.identifiers).forEach((identifier) => {
                if (identifier) {
                  allIdentifiers.push(identifier)
                  // TODO: Add proper validation for each identifier type
                  validIdentifiers.push(identifier)
                }
              })

              if (validIdentifiers.length > 0) {
                response.identifiers = allIdentifiers
                response.validIdentifiers = validIdentifiers
                response.processingRecommendation = 'extractable'
                logger.info(`Found ${validIdentifiers.length} valid identifiers in PDF`)
                return this.successResponse(response)
              }
            }

            // If no identifiers found in PDF but content is accessible, mark as AI-resolvable
            if (response.urlAccessible) {
              response.processingRecommendation = 'ai-resolvable'
              response.aiTranslation = true
              logger.info('No identifiers found in PDF, but content is accessible for AI processing')
              return this.successResponse(response)
            }

          } catch (error) {
            logger.error(`Error processing PDF: ${error}`)
            response.errors.push(`PDF processing failed: ${error}`)
            // Continue to other processing steps
          }
        }

        //: Step 3.2: Extract identifiers from HTML content
        if (response.contentType === 'html' || response.contentType === 'unknown') {
          logger.info('Processing HTML/unknown content for identifier extraction')
          try {
            // Load document
            const document = await IdentifierExtractor.loadDocument(url!)

            // Use existing httpResponse from accessibility check

          if (httpResponse.responseText) {
            // Extract page title for DOI disambiguation
            pageTitle = this.extractPageTitle(httpResponse.responseText, document)
            logger.debug(`Extracted page title: "${pageTitle}"`)

            // Extract identifiers using both HTML and DOM methods
            const identifierResults = await IdentifierExtractor.extractIdentifiersFromHTML(
              httpResponse.responseText,
              document,
            )

            response.identifiers = identifierResults.identifiers
            response.validIdentifiers = identifierResults.validIdentifiers

            if (identifierResults.validIdentifiers.length > 0) {
              logger.info(`Found ${identifierResults.validIdentifiers.length} valid identifiers`)
              response.processingRecommendation = 'extractable'

              // Enhanced: Use DOI disambiguation if multiple DOIs found
              if (identifierResults.validIdentifiers.length > 1) {
                // Filter only DOI identifiers for disambiguation
                const doiIdentifiers = identifierResults.validIdentifiers.filter(id =>
                  id.toLowerCase().includes('10.') && id.includes('/'),
                )

                if (doiIdentifiers.length > 1 && pageTitle) {
                  logger.info(`Disambiguating ${doiIdentifiers.length} DOI candidates using CrossRef`)

                  try {
                    const disambiguationResults = await this.serviceManager.crossRefService
                      .disambiguateDOIs(doiIdentifiers, pageTitle)

                    if (disambiguationResults.length > 0) {
                      const bestMatch = disambiguationResults[0]
                      logger.info(`Best DOI match: ${bestMatch.doi} (score: ${bestMatch.finalScore}, confidence: ${bestMatch.confidence})`)

                      // Update response with disambiguation results
                      response.primaryDOI = bestMatch.doi
                      response.primaryDOIScore = bestMatch.finalScore
                      response.primaryDOIConfidence = bestMatch.confidence
                      response.alternativeDOIs = disambiguationResults.slice(1, 3).map(result => ({
                        doi: result.doi,
                        score: result.finalScore,
                        confidence: result.confidence,
                      }))
                      response.disambiguationUsed = true

                      // Set the best match as the first in validIdentifiers
                      response.validIdentifiers = [
                        bestMatch.doi,
                        ...identifierResults.validIdentifiers.filter(id => id !== bestMatch.doi),
                      ]
                    }
                  } catch (error) {
                    logger.warn(`DOI disambiguation failed: ${error}`)
                    response.errors.push(`DOI disambiguation failed: ${error}`)
                  }
                }
              }

              return this.successResponse(response)
            }
          } else {
            throw new Error('Empty HTML response from URL')
          }
          } catch (error) {
            logger.error(`Error extracting HTML identifiers: ${error}`)
            response.errors.push(`HTML identifier extraction failed: ${error}`)
          }
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
            response.processingRecommendation = 'translatable'
            logger.info(`Found ${webTranslators.length} web translators`)
            return this.successResponse(response)
          }
        } catch (error) {
          logger.error(`Error detecting web translators: ${error}`)
          response.errors.push(`Web translator detection failed: ${error}`)
        }

        // Step 5: AI Identifier Extraction using Perplexity (fallback when no other methods work)
        logger.info('Step 5: Attempting AI identifier extraction using Perplexity')
        try {
          // Check if Perplexity service is available and configured
          if (this.serviceManager.perplexityService.isInitialized()) {
            // Try to fetch content if we don't have it yet
            if (!httpResponse || !httpResponse.responseText) {
              try {
                httpResponse = await Zotero.HTTP.request('GET', url!, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                  },
                  timeout: 30000,
                  followRedirects: true,
                })

                if (httpResponse && httpResponse.responseText) {
                  const document = await IdentifierExtractor.loadDocument(url!)
                  pageTitle = this.extractPageTitle(httpResponse.responseText, document)
                }
              } catch (fetchError) {
                logger.warn(`Could not fetch content for AI analysis: ${fetchError}`)
                response.errors.push(`Content fetch for AI failed: ${fetchError}`)
                // Continue without content - AI can still work with just URL
              }
            }

            logger.info(`Starting AI identifier extraction with title: "${pageTitle}"`)

            // Try AI identifier extraction only
            try {
              const aiIdentifiers = await this.serviceManager.perplexityService.extractIdentifiers(url!, pageTitle || undefined)

              if (aiIdentifiers && aiIdentifiers.length > 0) {
                response.validIdentifiers = aiIdentifiers
                response.primaryDOI = aiIdentifiers[0] // First identifier gets priority
                response.primaryDOIScore = 0.95 // High confidence for AI-found identifiers
                response.primaryDOIConfidence = 'high'
                response.aiTranslation = true
                response.processingRecommendation = 'extractable'
                logger.info(`AI extracted ${aiIdentifiers.length} identifiers successfully`)
                return this.successResponse(response)
              }
            } catch (identifierError) {
              logger.warn(`AI identifier extraction failed: ${identifierError}`)
              response.errors.push(`AI identifier extraction failed: ${identifierError}`)
            }

          } else {
            logger.debug('Perplexity service not initialized - skipping AI translation')
          }
        } catch (error) {
          logger.error(`Error in AI identifier extraction step: ${error}`)
          response.errors.push(`AI identifier extraction failed: ${error}`)
        }

        // Final processing recommendation based on what we found
        if (!response.processingRecommendation) {
          if (response.urlAccessible) {
            response.processingRecommendation = 'ai-resolvable'
            response.aiTranslation = true
            logger.info('URL is accessible but no identifiers/translators found - AI processing available')
          } else {
            response.processingRecommendation = 'errored'
            logger.warn('URL analysis completed with no viable processing options')
          }
        }

        // Update status based on errors and success
        if (response.errors.length > 0) {
          response.status = 'partial_success'
          logger.warn(`URL analysis completed with errors: ${response.errors.join('; ')}`)
        } else {
          logger.info(`URL analysis completed - processing recommendation: ${response.processingRecommendation}`)
        }

        return this.successResponse(response)

      } catch (error) {
        logger.error(`Error in URL analysis steps: ${error}`)
        response.errors.push(`Analysis failed: ${error}`)
        response.status = 'error'
        response.processingRecommendation = 'errored'
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

  /**
   * Extract page title from HTML content and DOM document
   * @param htmlContent - Raw HTML content
   * @param document - DOM document (optional)
   * @returns Extracted title or empty string
   */
  private extractPageTitle(htmlContent: string, document?: any): string {
    try {
      // Method 1: Try to get title from DOM if available
      if (document && document.title) {
        const domTitle = document.title.trim()
        if (domTitle && domTitle.length > 0) {
          logger.debug(`Title extracted from DOM: "${domTitle}"`)
          return this.cleanTitle(domTitle)
        }
      }

      // Method 2: Extract from HTML using regex
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch && titleMatch[1]) {
        const htmlTitle = titleMatch[1].trim()
        if (htmlTitle && htmlTitle.length > 0) {
          logger.debug(`Title extracted from HTML: "${htmlTitle}"`)
          return this.cleanTitle(htmlTitle)
        }
      }

      // Method 3: Try meta tags
      const metaTitleMatch = htmlContent.match(/<meta[^>]+name=['"]title['"][^>]+content=['"]([^'"]+)['"][^>]*>/i) ||
                           htmlContent.match(/<meta[^>]+property=['"]og:title['"][^>]+content=['"]([^'"]+)['"][^>]*>/i) ||
                           htmlContent.match(/<meta[^>]+name=['"]citation_title['"][^>]+content=['"]([^'"]+)['"][^>]*>/i)

      if (metaTitleMatch && metaTitleMatch[1]) {
        const metaTitle = metaTitleMatch[1].trim()
        if (metaTitle && metaTitle.length > 0) {
          logger.debug(`Title extracted from meta tags: "${metaTitle}"`)
          return this.cleanTitle(metaTitle)
        }
      }

      logger.debug('No title found in HTML content')
      return ''
    } catch (error) {
      logger.warn(`Error extracting page title: ${error}`)
      return ''
    }
  }

  /**
   * Clean and normalize extracted title
   * @param title - Raw title string
   * @returns Cleaned title
   */
  private cleanTitle(title: string): string {
    try {
      return title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } catch (error) {
      logger.warn(`Error cleaning title: ${error}`)
      return title
    }
  }
}