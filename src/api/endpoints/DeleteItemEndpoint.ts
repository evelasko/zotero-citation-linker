import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for deleting Zotero items by their key
 */
export class DeleteItemEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.DELETE_ITEM, serviceManager, ['POST'])
  }

  /**
   * Handle delete item request
   * @param requestData - Request data containing itemKey
   * @returns Response indicating success or failure
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      // Extract and validate itemKey
      const { itemKey } = requestData.data || {}
      if (!itemKey || typeof itemKey !== 'string') {
        return this.validationErrorResponse('itemKey is required and must be a string')
      }

      logger.info(`Attempting to delete item with key: ${itemKey}`)

      // Check if library is editable
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 403)
      }

      // Try to get the item
      let item
      try {
        item = await Zotero.Items.getByLibraryAndKeyAsync(
          Zotero.Libraries.userLibraryID,
          itemKey,
        )
      } catch (error) {
        logger.warn(`Item with key ${itemKey} not found: ${error}`)
        return this.errorResponse(`Item with key ${itemKey} not found`, 404)
      }

      if (!item) {
        logger.warn(`Item with key ${itemKey} does not exist`)
        return this.errorResponse(`Item with key ${itemKey} not found`, 404)
      }

      // Store item info for response
      const itemInfo = {
        key: item.key,
        title: item.getField('title') || 'Untitled',
        itemType: item.itemType,
      }

      // Delete the item
      try {
        await item.eraseTx()
        logger.info(`Successfully deleted item: ${itemKey} (${itemInfo.title})`)

        return this.successResponse(
          {
            deleted: true,
            itemKey: itemKey,
            itemInfo: itemInfo,
          },
          {
            message: 'Item deleted successfully',
          },
        )
      } catch (error) {
        logger.error(`Failed to delete item ${itemKey}: ${error}`)
        return this.errorResponse(`Failed to delete item: ${error}`, 500)
      }
    } catch (error) {
      logger.error(`Error in DeleteItem endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }
}

