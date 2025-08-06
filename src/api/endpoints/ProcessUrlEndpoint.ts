import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { WebTranslator } from '../../translators/WebTranslator'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'
import { UrlUtils } from '../../utils/UrlUtils'
import { PdfProcessor } from '../../services/PdfProcessor'

/**
 * Endpoint for processing URLs and translating them to Zotero items
 */
export class ProcessUrlEndpoint extends BaseEndpoint {
  private webTranslator: WebTranslator
  private pdfProcessor: PdfProcessor

  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.PROCESS_URL, serviceManager, ['POST'])
    this.webTranslator = new WebTranslator()
    this.pdfProcessor = new PdfProcessor()
  }

  /**
   * Initialize the endpoint and its dependencies
   */
  async initialize(): Promise<void> {
    await this.webTranslator.initialize()
    await this.pdfProcessor.initialize()
  }

  /**
   * Cleanup the endpoint and its dependencies
   */
  async cleanup(): Promise<void> {
    await this.webTranslator.cleanup()
    await this.pdfProcessor.cleanup()
  }

  /**
   * Handle URL processing request
   * @param requestData - Request data containing URL
   * @returns Response with translated items
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateUrlRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { url } = validationResult
      logger.info(`Processing URL: ${url}`)

      // Check if library is editable
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      // First, check if an item with this URL already exists in the library
      logger.info(`Checking for existing item with URL: ${url}`)
      const existingItem = await this.serviceManager.duplicateDetector.findItemByUrl(url!)

      if (existingItem) {
        logger.info(`Found existing item with URL: ${url}`)

        // Return the existing item using the standard translation success response
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

      // Check if URL is a PDF
      if (UrlUtils.isPdfUrl(url!)) {
        logger.info(`Detected PDF URL, attempting PDF processing: ${url}`)

        // Process PDF to extract identifiers and metadata
        const pdfResult = await this.pdfProcessor.processPdfFromUrl(url!)

        if (pdfResult.success && pdfResult.identifiers) {
          // Try to translate using extracted identifiers
          if (pdfResult.identifiers.doi) {
            logger.info(`Found DOI in PDF: ${pdfResult.identifiers.doi}`)
            const doiTranslationResult = await this.webTranslator.attemptIdentifierTranslation(pdfResult.identifiers.doi)

            if (doiTranslationResult.success) {
              const processedItems = await this.processTranslatedItems(doiTranslationResult.items)

              return this.translationSuccessResponse(
                processedItems.validItems,
                'pdf_doi_translation',
                doiTranslationResult.translator || 'DOI',
                {
                  ...processedItems.duplicateProcessing,
                  pdfProcessed: true,
                  extractedIdentifier: pdfResult.identifiers.doi,
                  pdfMetadata: pdfResult.metadata,
                },
              )
            }
          }

          // Try other identifiers if DOI failed
          if (pdfResult.identifiers.arxiv) {
            logger.info(`Found arXiv ID in PDF: ${pdfResult.identifiers.arxiv}`)
            const arxivTranslationResult = await this.webTranslator.attemptIdentifierTranslation(`arXiv:${pdfResult.identifiers.arxiv}`)

            if (arxivTranslationResult.success) {
              const processedItems = await this.processTranslatedItems(arxivTranslationResult.items)

              return this.translationSuccessResponse(
                processedItems.validItems,
                'pdf_arxiv_translation',
                arxivTranslationResult.translator || 'arXiv',
                {
                  ...processedItems.duplicateProcessing,
                  pdfProcessed: true,
                  extractedIdentifier: pdfResult.identifiers.arxiv,
                  pdfMetadata: pdfResult.metadata,
                },
              )
            }
          }

          // If no identifiers worked, return error with extracted metadata
          logger.info('PDF processing completed but no valid items created from identifiers')
          return this.errorResponse(
            `PDF processed but could not create item from extracted identifiers. Found: ${JSON.stringify(pdfResult.identifiers)}`,
            422,
            { pdfMetadata: pdfResult.metadata, identifiers: pdfResult.identifiers },
          )
        }

        // PDF processing failed or no identifiers found
        logger.info('PDF processing failed or no identifiers found, falling back to regular web translation')
      }

      // No existing item found, attempt regular web translation
      const translationResult = await this.webTranslator.attemptWebTranslation(url!)

      if (translationResult.success) {
        // Process items through validation and duplicate detection
        const processedItems = await this.processTranslatedItems(translationResult.items)

        logger.info(`Translation successful - processed ${processedItems.validItems.length} items`)

        return this.translationSuccessResponse(
          processedItems.validItems,
          'web_translation',
          translationResult.translator || 'Unknown',
          processedItems.duplicateProcessing,
        )
      } else {
        // Translation failed
        logger.info(`Translation failed: ${translationResult.reason}`)
        return this.errorResponse(`Translation failed: ${translationResult.reason}`, 422)
      }
    } catch (error) {
      logger.error(`Error in ProcessUrl endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }

  /**
   * Process translated items through validation and duplicate detection
   * @param items - Raw translated items
   * @returns Processed items with validation and duplicate results
   */
  private async processTranslatedItems(items: any[]): Promise<{
    validItems: any[]
    invalidItems: any[]
    duplicateProcessing: any
  }> {
    const validItems: any[] = []
    const invalidItems: any[] = []
    let duplicateProcessing: any = { processed: false }

    try {
      // Validate each item
      for (const item of items) {
        const validatedItem = this.serviceManager.itemValidator.validateItemData(item)
        if (validatedItem) {
          validItems.push(validatedItem)
        } else {
          invalidItems.push(item)
          // Delete invalid items
          try {
            await this.serviceManager.itemValidator.deleteItemByKey(item.key)
            logger.info(`Deleted invalid item: ${item.key}`)
          } catch (deleteError) {
            logger.error(`Failed to delete invalid item ${item.key}: ${deleteError}`)
          }
        }
      }

      // Process duplicates for valid items
      if (validItems.length > 0) {
        const duplicateResults = await Promise.all(
          validItems.map(item =>
            this.serviceManager.duplicateDetector.detectDuplicates(item),
          ),
        )

        // Aggregate duplicate processing results
        const totalDuplicates = duplicateResults.reduce((sum, result) => sum + result.duplicateCount, 0)
        const allCandidates = duplicateResults.flatMap(result => result.candidates || [])

        duplicateProcessing = {
          processed: true,
          duplicateCount: totalDuplicates,
          candidates: allCandidates.slice(0, 10), // Limit to top 10
          flaggedItems: duplicateResults.flatMap(result => result.flaggedItems || []),
        }
      }

      return {
        validItems,
        invalidItems,
        duplicateProcessing,
      }
    } catch (error) {
      logger.error(`Error processing translated items: ${error}`)
      return {
        validItems: items, // Return original items if processing fails
        invalidItems: [],
        duplicateProcessing: { processed: false, error: error.toString() },
      }
    }
  }
}