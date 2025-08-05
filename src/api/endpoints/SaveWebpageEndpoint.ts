import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for saving webpages as Zotero items
 */
export class SaveWebpageEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.SAVE_WEBPAGE, serviceManager, ['POST'])
  }

  /**
   * Handle webpage save request
   * @param requestData - Request data containing URL and optional title
   * @returns Response with created item
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateWebpageRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      const { url, title } = validationResult
      logger.info(`Saving webpage: ${url}`)

      // Check if library is editable
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      // Create webpage item
      const webpageResult = await this.createWebpageItem(url!, title)

      if (webpageResult.success) {
        logger.info(`Webpage saved successfully: ${webpageResult.item.key}`)

        return this.translationSuccessResponse(
          [webpageResult.item],
          'webpage_save',
          'Built-in webpage creator',
          undefined,
        )
      } else {
        return this.errorResponse(`Failed to save as webpage: ${webpageResult.error}`, 500)
      }
    } catch (error) {
      logger.error(`Error in SaveWebpage endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }

  /**
   * Create a webpage item in Zotero
   * @param url - URL of the webpage
   * @param title - Optional title for the webpage
   * @returns Result with created item or error
   */
  private async createWebpageItem(url: string, title?: string): Promise<{
    success: boolean
    item?: any
    error?: string
  }> {
    try {
      // Get target library
      const { library } = (Zotero.Server as any).Connector.getSaveTarget()

      // Create new webpage item
      const item = new Zotero.Item('webpage')
      item.libraryID = library.libraryID

      // Set basic fields
      item.setField('url', url)
      item.setField('accessDate', new Date().toISOString().split('T')[0])

      // Set title (either provided or extracted from URL)
      if (title) {
        item.setField('title', title)
      } else {
        // Try to extract title from the webpage
        try {
          const extractedTitle = await this.extractTitleFromUrl(url)
          item.setField('title', extractedTitle || url)
        } catch {
          item.setField('title', url)
        }
      }

      // Save the item
      await item.saveTx()

      logger.info(`Webpage item created with key: ${item.key}`)

      return {
        success: true,
        item: item,
      }
    } catch (error) {
      logger.error(`Error creating webpage item: ${error}`)
      return {
        success: false,
        error: error.toString(),
      }
    }
  }

  /**
   * Extract title from webpage URL
   * @param url - URL to extract title from
   * @returns Extracted title or null
   */
  private async extractTitleFromUrl(url: string): Promise<string | null> {
    try {
      const response = await Zotero.HTTP.request('GET', url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
        },
        timeout: 10000,
      })

      if (response.responseText) {
        const titleMatch = response.responseText.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
          return titleMatch[1].trim()
        }
      }

      return null
    } catch (error) {
      logger.debug(`Could not extract title from ${url}: ${error}`)
      return null
    }
  }

  /**
   * Validate webpage save request
   * @param requestData - Request data
   * @returns Validation result
   */
  private validateWebpageRequest(requestData: any): {
    valid: boolean
    error?: string
    url?: string
    title?: string
  } {
    const urlValidation = this.validateUrlRequest(requestData)
    if (!urlValidation.valid) {
      return urlValidation
    }

    const { title } = requestData.data

    // Title is optional but if provided must be a non-empty string
    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return { valid: false, error: 'Title must be a non-empty string if provided' }
    }

    return {
      valid: true,
      url: urlValidation.url,
      title: title ? title.trim() : undefined,
    }
  }
}