import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { WebTranslator } from '../../translators/WebTranslator'
import { PdfProcessor } from '../../services/PdfProcessor'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'
import { UrlUtils } from '../../utils/UrlUtils'

/**
 * Endpoint for previewing URL translations without saving to library
 *
 * This endpoint translates URLs (including PDFs) into metadata
 * and immediately deletes the created items, returning only the metadata preview.
 */
export class PreviewUrlEndpoint extends BaseEndpoint {
  private webTranslator: WebTranslator
  private pdfProcessor: PdfProcessor

  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.PREVIEW_URL, serviceManager, ['POST'])
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
   * Handle URL preview request
   * @param requestData - Request data containing URL
   * @returns Response with item metadata preview
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateUrlRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { url } = validationResult
      logger.info(`Previewing URL: ${url}`)

      // Check if library is editable (needed for temporary item creation)
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      let translationResult: any = null
      let method = 'web_translation'
      let extractedIdentifier: string | null = null
      let pdfMetadata: any = null

      // Check if URL is a PDF
      if (UrlUtils.isPdfUrl(url!)) {
        logger.info(`Detected PDF URL, attempting PDF processing: ${url}`)

        // Process PDF to extract identifiers and metadata
        const pdfResult = await this.pdfProcessor.processPdfFromUrl(url!)

        if (pdfResult.success && pdfResult.identifiers) {
          pdfMetadata = pdfResult.metadata

          // Try to translate using extracted DOI
          if (pdfResult.identifiers.doi) {
            logger.info(`Found DOI in PDF: ${pdfResult.identifiers.doi}`)
            extractedIdentifier = pdfResult.identifiers.doi
            translationResult = await this.webTranslator.attemptIdentifierTranslation(pdfResult.identifiers.doi)

            if (translationResult.success) {
              method = 'pdf_doi_translation'
            }
          }

          // Try ArXiv if DOI failed
          if (!translationResult?.success && pdfResult.identifiers.arxiv) {
            logger.info(`Found arXiv ID in PDF: ${pdfResult.identifiers.arxiv}`)
            extractedIdentifier = pdfResult.identifiers.arxiv
            translationResult = await this.webTranslator.attemptIdentifierTranslation(
              `arXiv:${pdfResult.identifiers.arxiv}`,
            )

            if (translationResult.success) {
              method = 'pdf_arxiv_translation'
            }
          }

          // Try PMID if previous methods failed
          if (!translationResult?.success && pdfResult.identifiers.pmid) {
            logger.info(`Found PMID in PDF: ${pdfResult.identifiers.pmid}`)
            extractedIdentifier = pdfResult.identifiers.pmid
            translationResult = await this.webTranslator.attemptIdentifierTranslation(
              `PMID:${pdfResult.identifiers.pmid}`,
            )

            if (translationResult.success) {
              method = 'pdf_pmid_translation'
            }
          }
        }

        // If PDF identifier translation didn't work, fall back to web translation
        if (!translationResult?.success) {
          logger.info('PDF processing completed but identifier translation failed, falling back to web translation')
        }
      }

      // If no successful translation yet, attempt regular web translation
      if (!translationResult?.success) {
        translationResult = await this.webTranslator.attemptWebTranslation(url!)
        method = 'web_translation'
      }

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
          method,
          translationResult.translator || 'Unknown',
          url!,
          extractedIdentifier,
          pdfMetadata,
        )
      } else {
        // Translation failed
        logger.info(`URL translation failed: ${translationResult.reason}`)
        return this.errorResponse(`URL translation failed: ${translationResult.reason}`, 422)
      }
    } catch (error) {
      logger.error(`Error in PreviewUrl endpoint: ${error}`)
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
          websiteTitle: item.getField('websiteTitle') || itemData.websiteTitle || '',
          websiteType: item.getField('websiteType') || itemData.websiteType || '',
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

        // Add API URL
        try {
          const apiUrl = this.serviceManager.citationGenerator.generateApiUrl(item)
          metadata.apiUrl = apiUrl
        } catch (apiError) {
          logger.warn(`Failed to generate API URL: ${apiError}`)
          metadata.apiUrl = null
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
   * @param method - Translation method used
   * @param translator - Translator name used
   * @param url - Original URL
   * @param extractedIdentifier - Identifier extracted from PDF (if applicable)
   * @param pdfMetadata - PDF metadata (if applicable)
   * @returns Formatted preview response
   */
  private previewSuccessResponse(
    previewData: any[],
    method: string,
    translator: string,
    url: string,
    extractedIdentifier: string | null = null,
    pdfMetadata: any = null,
  ): [number, string, string] {
    const response: any = {
      success: true,
      mode: 'preview',
      message: 'URL translated successfully - items not saved to library',
      timestamp: new Date().toISOString(),
      method,
      translator,
      itemCount: previewData.length,
      url: {
        original: url,
        normalized: UrlUtils.normalizeUrl(url),
        isPdf: UrlUtils.isPdfUrl(url),
      },
      items: previewData,
      _links: {
        documentation: 'https://github.com/evelasko/zotero-citation-linker',
        processEndpoint: API_ENDPOINTS.PROCESS_URL,
      },
      _note: 'This is a preview only. Use /processurl to save items to your library.',
    }

    // Add PDF-specific information if applicable
    if (extractedIdentifier || pdfMetadata) {
      response.pdfProcessing = {
        pdfDetected: true,
        extractedIdentifier,
        metadata: pdfMetadata,
      }
    }

    logger.info(`Preview response created: ${previewData.length} items`)
    return [200, 'application/json', JSON.stringify(response, null, 2)]
  }
}

