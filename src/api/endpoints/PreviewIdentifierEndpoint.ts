import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { WebTranslator } from '../../translators/WebTranslator'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for previewing identifier translations without saving to library
 *
 * This endpoint translates identifiers (DOI, PMID, ArXiv, etc.) into metadata
 * and immediately deletes the created items, returning only the metadata preview.
 */
export class PreviewIdentifierEndpoint extends BaseEndpoint {
  private webTranslator: WebTranslator

  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.PREVIEW_IDENTIFIER, serviceManager, ['POST'])
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
   * Handle identifier preview request
   * @param requestData - Request data containing identifier
   * @returns Response with item metadata preview
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateIdentifierRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { identifier } = validationResult
      logger.info(`Previewing identifier: ${identifier}`)

      // Check if library is editable (needed for temporary item creation)
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      // Extract identifier information
      const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier!.trim())
      let identifierType: string | null = null
      let identifierValue: string | null = null

      if (extractedIdentifiers.length > 0) {
        const extractedId = extractedIdentifiers[0] as any

        if ('DOI' in extractedId && extractedId.DOI) {
          identifierType = 'DOI'
          identifierValue = extractedId.DOI
        } else if ('PMID' in extractedId && extractedId.PMID) {
          identifierType = 'PMID'
          identifierValue = extractedId.PMID
        } else if ('arXiv' in extractedId && extractedId.arXiv) {
          identifierType = 'ARXIV'
          identifierValue = extractedId.arXiv
        } else if ('ISBN' in extractedId && extractedId.ISBN) {
          identifierType = 'ISBN'
          identifierValue = extractedId.ISBN
        }
      }

      logger.info(`Identified type: ${identifierType}, value: ${identifierValue}`)

      // Attempt to translate the identifier
      const translationResult = await this.webTranslator.attemptIdentifierTranslation(identifier!)

      if (translationResult.success && translationResult.items.length > 0) {
        logger.info(`Translation successful - ${translationResult.items.length} items created`)

        // Extract metadata from all translated items before deletion
        const previewData = await this.extractItemMetadata(translationResult.items)

        // Delete all created items immediately
        await this.deleteTranslatedItems(translationResult.items)

        logger.info(`Preview complete - deleted ${translationResult.items.length} temporary items`)

        // Return preview response
        return this.previewSuccessResponse(
          previewData,
          translationResult.translator || 'Unknown',
          identifierType,
          identifierValue,
        )
      } else {
        // Translation failed
        logger.info(`Identifier translation failed: ${translationResult.reason}`)
        return this.errorResponse(`Identifier translation failed: ${translationResult.reason}`, 422)
      }
    } catch (error) {
      logger.error(`Error in PreviewIdentifier endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }

  /**
   * Extract comprehensive metadata from translated items
   * @param items - Translated Zotero items
   * @returns Array of metadata objects
   */
  private async extractItemMetadata(items: any[]): Promise<any[]> {
    const metadataArray: any[] = []

    for (const item of items) {
      try {
        // Extract all item fields
        const itemData = item.toJSON ? item.toJSON() : {}

        // Get item type and key
        const itemType = item.itemType || itemData.itemType
        const itemKey = item.key || itemData.key

        // Build comprehensive metadata object
        const metadata: any = {
          // Core identifiers
          itemKey,
          itemType,
          libraryID: item.libraryID,

          // Basic fields
          title: item.getField('title') || itemData.title || '',
          abstractNote: item.getField('abstractNote') || itemData.abstractNote || '',
          date: item.getField('date') || itemData.date || '',
          url: item.getField('url') || itemData.url || '',
          accessDate: item.getField('accessDate') || itemData.accessDate || '',
          rights: item.getField('rights') || itemData.rights || '',
          extra: item.getField('extra') || itemData.extra || '',

          // Identifiers
          DOI: item.getField('DOI') || itemData.DOI || '',
          ISBN: item.getField('ISBN') || itemData.ISBN || '',
          ISSN: item.getField('ISSN') || itemData.ISSN || '',

          // Publication details
          publicationTitle: item.getField('publicationTitle') || itemData.publicationTitle || '',
          volume: item.getField('volume') || itemData.volume || '',
          issue: item.getField('issue') || itemData.issue || '',
          pages: item.getField('pages') || itemData.pages || '',
          series: item.getField('series') || itemData.series || '',
          seriesNumber: item.getField('seriesNumber') || itemData.seriesNumber || '',
          edition: item.getField('edition') || itemData.edition || '',
          place: item.getField('place') || itemData.place || '',
          publisher: item.getField('publisher') || itemData.publisher || '',

          // Type-specific fields
          language: item.getField('language') || itemData.language || '',
          callNumber: item.getField('callNumber') || itemData.callNumber || '',
          archive: item.getField('archive') || itemData.archive || '',
          archiveLocation: item.getField('archiveLocation') || itemData.archiveLocation || '',
          shortTitle: item.getField('shortTitle') || itemData.shortTitle || '',
        }

        // Add creators (authors, editors, etc.)
        const creators = item.getCreators ? item.getCreators() : (itemData.creators || [])
        metadata.creators = creators.map((creator: any) => ({
          creatorType: creator.creatorType,
          firstName: creator.firstName || '',
          lastName: creator.lastName || '',
          name: creator.name || '',
        }))

        // Add tags
        const tags = item.getTags ? item.getTags() : (itemData.tags || [])
        metadata.tags = tags.map((tag: any) => ({
          tag: tag.tag || tag.name || tag,
          type: tag.type || 0,
        }))

        // Add collections
        if (item.getCollections) {
          metadata.collections = item.getCollections()
        } else if (itemData.collections) {
          metadata.collections = itemData.collections
        } else {
          metadata.collections = []
        }

        // Add relations
        if (item.getRelations) {
          metadata.relations = item.getRelations()
        } else if (itemData.relations) {
          metadata.relations = itemData.relations
        } else {
          metadata.relations = {}
        }

        // Generate citation if possible
        try {
          const citation = this.serviceManager.citationGenerator.generateFallbackCitation(item)
          metadata.generatedCitation = citation
        } catch (citationError) {
          logger.warn(`Failed to generate citation: ${citationError}`)
          metadata.generatedCitation = null
        }

        // Add to metadata array
        metadataArray.push(metadata)

        logger.info(`Extracted metadata for item: ${itemType} - ${metadata.title}`)
      } catch (error) {
        logger.error(`Error extracting metadata from item: ${error}`)
        // Continue with other items even if one fails
        metadataArray.push({
          error: `Failed to extract metadata: ${error}`,
          itemKey: item.key,
          itemType: item.itemType,
        })
      }
    }

    return metadataArray
  }

  /**
   * Delete translated items from the library
   * @param items - Items to delete
   */
  private async deleteTranslatedItems(items: any[]): Promise<void> {
    const deletionResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const item of items) {
      try {
        const itemKey = item.key
        logger.info(`Deleting temporary item: ${itemKey}`)

        // Delete the item from the library
        await item.eraseTx()

        deletionResults.successful++
        logger.info(`Successfully deleted item: ${itemKey}`)
      } catch (error) {
        deletionResults.failed++
        const errorMsg = `Failed to delete item ${item.key}: ${error}`
        deletionResults.errors.push(errorMsg)
        logger.error(errorMsg)
      }
    }

    logger.info(
      `Deletion complete - ${deletionResults.successful} successful, ${deletionResults.failed} failed`,
    )

    if (deletionResults.failed > 0) {
      logger.warn(`Deletion errors: ${JSON.stringify(deletionResults.errors)}`)
    }
  }

  /**
   * Create preview success response
   * @param previewData - Array of preview metadata
   * @param translator - Translator name used
   * @param identifierType - Type of identifier (DOI, PMID, etc.)
   * @param identifierValue - Value of the identifier
   * @returns Formatted preview response
   */
  private previewSuccessResponse(
    previewData: any[],
    translator: string,
    identifierType: string | null,
    identifierValue: string | null,
  ): [number, string, string] {
    const response = {
      success: true,
      mode: 'preview',
      message: 'Identifier translated successfully - items not saved to library',
      timestamp: new Date().toISOString(),
      translator,
      itemCount: previewData.length,
      identifier: {
        type: identifierType,
        value: identifierValue,
      },
      items: previewData,
      _links: {
        documentation: 'https://github.com/evelasko/zotero-citation-linker',
        processEndpoint: API_ENDPOINTS.PROCESS_IDENTIFIER,
      },
      _note: 'This is a preview only. Use /processidentifier to save items to your library.',
    }

    logger.info(`Preview response created: ${previewData.length} items`)
    return [200, 'application/json', JSON.stringify(response, null, 2)]
  }
}

