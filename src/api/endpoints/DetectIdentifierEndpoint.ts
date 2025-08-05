import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for detecting if identifiers can be translated
 */
export class DetectIdentifierEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.DETECT_IDENTIFIER, serviceManager, ['POST'])
  }

  /**
   * Handle identifier detection request
   * @param requestData - Request data containing identifier
   * @returns Detection results
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Support both query parameter and POST data
      let identifier: string

      if (requestData.query && requestData.query.identifier) {
        identifier = requestData.query.identifier
      } else {
        const validationResult = this.validateIdentifierRequest(requestData)
        if (!validationResult.valid) {
          return this.validationErrorResponse(validationResult.error!)
        }
        identifier = validationResult.identifier!
      }

      logger.info(`Detecting translators for identifier: ${identifier}`)

      if (!identifier || typeof identifier !== 'string') {
        return this.validationErrorResponse('Identifier parameter is required and must be a string')
      }

      // Extract identifiers using Zotero's utility
      const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier.trim())

      if (extractedIdentifiers.length === 0) {
        return this.successResponse({
          hasTranslators: false,
          identifier: identifier,
          extractedIdentifiers: [],
          message: 'No valid identifiers found in the provided string',
        })
      }

      // Check if translators are available for each extracted identifier
      const translatorResults = await Promise.all(
        extractedIdentifiers.map(async (extractedId) => {
          try {
            const search = new Zotero.Translate.Search()
            search.setIdentifier(extractedId)
            const translators = await search.getTranslators()

            return {
              identifier: extractedId,
              hasTranslators: (translators || []).length > 0,
              translatorCount: (translators || []).length,
            }
          } catch (error) {
            logger.error(`Error checking translators for ${extractedId}: ${error}`)
            return {
              identifier: extractedId,
              hasTranslators: false,
              translatorCount: 0,
              error: error.toString(),
            }
          }
        }),
      )

      const hasAnyTranslators = translatorResults.some(result => result.hasTranslators)

      const response = {
        hasTranslators: hasAnyTranslators,
        identifier: identifier,
        extractedIdentifiers: extractedIdentifiers,
        results: translatorResults,
        message: hasAnyTranslators
          ? 'Translators available for one or more identifiers'
          : 'No translators available for any of the extracted identifiers',
      }

      logger.info(`Identifier detection completed: ${hasAnyTranslators ? 'found' : 'no'} translators`)
      return this.successResponse(response)

    } catch (error) {
      logger.error(`Error in DetectIdentifier endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }
}