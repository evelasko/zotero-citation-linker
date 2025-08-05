import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { WebTranslator } from '../../translators/WebTranslator'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for processing identifiers (DOI, PMID, ArXiv, etc.) and translating them to Zotero items
 */
export class ProcessIdentifierEndpoint extends BaseEndpoint {
  private webTranslator: WebTranslator

  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.PROCESS_IDENTIFIER, serviceManager, ['POST'])
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
   * Handle identifier processing request
   * @param requestData - Request data containing identifier
   * @returns Response with translated items
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateIdentifierRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { identifier } = validationResult
      logger.info(`Processing identifier: ${identifier}`)

      // Check if library is editable
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      // Attempt to translate the identifier
      const translationResult = await this.webTranslator.attemptIdentifierTranslation(identifier!)

      if (translationResult.success) {
        // Process items through validation and duplicate detection
        const processedItems = await this.processTranslatedItems(translationResult.items)

        logger.info(`Identifier translation successful - processed ${processedItems.validItems.length} items`)

        return this.translationSuccessResponse(
          processedItems.validItems,
          'identifier_translation',
          translationResult.translator || 'Unknown',
          processedItems.duplicateProcessing,
        )
      } else {
        // Translation failed
        logger.info(`Identifier translation failed: ${translationResult.reason}`)
        return this.errorResponse(`Identifier translation failed: ${translationResult.reason}`, 422)
      }
    } catch (error) {
      logger.error(`Error in ProcessIdentifier endpoint: ${error}`)
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