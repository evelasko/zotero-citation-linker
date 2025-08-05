import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { UrlUtils } from '../../utils/UrlUtils'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for finding item keys by URL
 */
export class ItemKeyByUrlEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.ITEM_KEY_BY_URL, serviceManager, ['GET', 'POST'])
  }

  /**
   * Handle item key lookup request
   * @param requestData - Request data containing URL
   * @returns Response with matching item keys
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Support both query parameter and POST data
      let url: string

      if (requestData.query && requestData.query.url) {
        url = requestData.query.url
      } else {
        const validationResult = this.validateUrlRequest(requestData)
        if (!validationResult.valid) {
          return this.validationErrorResponse(validationResult.error!)
        }
        url = validationResult.url!
      }

      logger.info(`Looking up item key for URL: ${url}`)

      if (!url || typeof url !== 'string') {
        return this.validationErrorResponse('URL parameter is required and must be a string')
      }

      // Validate URL format
      if (!UrlUtils.isValidUrl(url)) {
        return this.validationErrorResponse('Invalid URL format')
      }

      if (!UrlUtils.isSupportedScheme(url)) {
        return this.validationErrorResponse('Only HTTP and HTTPS URLs are supported')
      }

      // Find items by URL
      const matchingItems = await this.findItemsByUrl(url)

      const response = {
        url: url,
        normalizedUrl: UrlUtils.normalizeUrl(url),
        itemCount: matchingItems.length,
        items: matchingItems.map(item => ({
          key: item.key,
          title: item.getField('title') || 'Untitled',
          itemType: item.itemType,
          dateAdded: item.dateAdded,
          url: item.getField('url'),
        })),
        timestamp: new Date().toISOString(),
      }

      logger.info(`Found ${matchingItems.length} items for URL`)
      return this.successResponse(response)

    } catch (error) {
      logger.error(`Error in ItemKeyByUrl endpoint: ${error}`)
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
      for (const item of items.slice(0, 50)) { // Limit for performance
        const itemUrl = item.getField('url')
        if (itemUrl) {
          const itemNormalizedUrl = UrlUtils.normalizeUrl(itemUrl)

          // Check both exact match and normalized match
          if (itemUrl === url || itemNormalizedUrl === normalizedUrl) {
            matchingItems.push(item)
          }
        }
      }

      // Sort by date added (most recent first)
      matchingItems.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())

      return matchingItems
    } catch (error) {
      logger.error(`Error finding items by URL: ${error}`)
      return []
    }
  }
}