import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'
import { UrlUtils } from '../../utils/UrlUtils'
import { IdentifierExtractor } from '../../utils/IdentifierExtractor'

/**
 * Endpoint for processing URLs using AI to extract citation data and create Zotero items
 */
export class ProcessUrlWithAiEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.PROCESS_URL_WITH_AI, serviceManager, ['POST'])
  }

  /**
   * Initialize the endpoint
   */
  async initialize(): Promise<void> {
    // No specific initialization needed
  }

  /**
   * Cleanup the endpoint
   */
  async cleanup(): Promise<void> {
    // No specific cleanup needed
  }

  /**
   * Handle AI URL processing request
   * @param requestData - Request data containing URL
   * @returns Response with created Zotero item
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateUrlRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { url } = validationResult
      logger.info(`Processing URL with AI: ${url}`)

      // Check if library is editable
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      // Check if Perplexity service is initialized
      if (!this.serviceManager.perplexityService.isInitialized()) {
        return this.errorResponse('AI service not configured - please set your Perplexity API key', 422)
      }

      // First, check if an item with this URL already exists in the library
      logger.info(`Checking for existing item with URL: ${url}`)
      const existingItem = await this.serviceManager.duplicateDetector.findItemByUrl(url!)

      if (existingItem) {
        logger.info(`Found existing item with URL: ${url}`)

        return this.translationSuccessResponse(
          [existingItem],
          'existing_item',
          'Library lookup (URL)',
          {
            processed: true,
            duplicateCount: 0,
            existingItem: true,
            message: `Item already exists in library with URL: ${url}`,
            urlInfo: {
              url: url,
              normalizedUrl: UrlUtils.normalizeUrl(url!),
            },
          },
        )
      }

      // Fetch content and extract title for AI processing
      let pageTitle = ''
      try {
        logger.info('Fetching content for AI processing')
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
          const document = await IdentifierExtractor.loadDocument(url!)
          pageTitle = this.extractPageTitle(httpResponse.responseText, document)
          logger.info(`Extracted page title: "${pageTitle}"`)
        }
      } catch (fetchError) {
        logger.warn(`Could not fetch content for AI processing: ${fetchError}`)
        // Continue without title - AI can still work with just URL
      }

      // Use AI to extract citation data
      logger.info('Starting AI citation data extraction')
      let aiCitationData: any

      try {
        aiCitationData = await this.serviceManager.perplexityService.extractCitationData(url!, pageTitle || undefined)

        if (!aiCitationData || !aiCitationData.title) {
          return this.errorResponse('AI could not extract sufficient citation data from the URL', 422)
        }

        logger.info(`AI extracted citation data for type: ${aiCitationData.type}`)
      } catch (aiError) {
        logger.error(`AI citation data extraction failed: ${aiError}`)
        return this.errorResponse(`AI extraction failed: ${aiError}`, 422)
      }

      // Create Zotero item from AI-extracted data
      logger.info(`Creating Zotero item with type: ${aiCitationData.type}`)

      try {
        const newItem = new Zotero.Item(aiCitationData.type)

        // Set basic fields
        newItem.setField('title', aiCitationData.title)
        if (aiCitationData.url) {
          newItem.setField('url', aiCitationData.url)
        } else {
          newItem.setField('url', url!) // Use original URL if AI didn't provide one
        }

        // Set date if available
        if (aiCitationData.date) {
          newItem.setField('date', aiCitationData.date)
        }

        // Set publication fields based on item type
        if (aiCitationData.publication) {
          if (aiCitationData.type === 'journalArticle') {
            newItem.setField('publicationTitle', aiCitationData.publication)
          } else if (aiCitationData.type === 'blogPost' || aiCitationData.type === 'webpage') {
            newItem.setField('websiteTitle', aiCitationData.publication)
          } else if (aiCitationData.type === 'conferencePaper') {
            newItem.setField('proceedingsTitle', aiCitationData.publication)
          }
        }

        // Set publisher
        if (aiCitationData.publisher) {
          newItem.setField('publisher', aiCitationData.publisher)
        }

        // Set volume, issue, pages for articles
        if (aiCitationData.volume) {
          newItem.setField('volume', aiCitationData.volume)
        }
        if (aiCitationData.issue) {
          newItem.setField('issue', aiCitationData.issue)
        }
        if (aiCitationData.pages) {
          newItem.setField('pages', aiCitationData.pages)
        }

        // Set identifiers
        if (aiCitationData.doi) {
          newItem.setField('DOI', aiCitationData.doi)
        }
        if (aiCitationData.isbn) {
          newItem.setField('ISBN', aiCitationData.isbn)
        }
        if (aiCitationData.arxiv_id) {
          newItem.setField('arXiv', aiCitationData.arxiv_id)
        }

        // Set abstract
        if (aiCitationData.abstract) {
          newItem.setField('abstractNote', aiCitationData.abstract)
        }

        // Set language
        if (aiCitationData.language) {
          newItem.setField('language', aiCitationData.language)
        }

        // Add authors
        if (aiCitationData.authors && Array.isArray(aiCitationData.authors)) {
          for (const author of aiCitationData.authors) {
            if (author.name) {
              newItem.setCreator(newItem.getCreators().length, { name: author.name, creatorType: 'author' })
            }
          }
        }

        // Save the item
        await newItem.saveTx()
        logger.info(`Created new item with key: ${newItem.key}`)

        // The saved item is already available as newItem
        const savedItem = newItem

        // Validate the created item
        const isValid = await this.serviceManager.itemValidator.validateItemData(savedItem)
        if (!isValid.valid) {
          logger.warn(`Created item failed validation: ${isValid.errors.join(', ')}`)
        }

        return this.translationSuccessResponse(
          [savedItem],
          'ai_translation',
          'Perplexity AI',
          {
            processed: true,
            duplicateCount: 0,
            existingItem: false,
            message: 'Item created successfully using AI extraction',
            aiData: {
              extractedType: aiCitationData.type,
              pageTitle: pageTitle,
              fieldsExtracted: Object.keys(aiCitationData).length,
            },
            urlInfo: {
              url: url,
              normalizedUrl: UrlUtils.normalizeUrl(url!),
            },
          },
        )
      } catch (itemCreationError) {
        logger.error(`Error creating Zotero item: ${itemCreationError}`)
        return this.errorResponse(`Failed to create Zotero item: ${itemCreationError}`, 500)
      }

    } catch (error) {
      logger.error(`Error in ProcessUrlWithAI endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
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