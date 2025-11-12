import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for retrieving Zotero items by their key
 */
export class GetItemEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.GET_ITEM, serviceManager, ['GET'])
  }

  /**
   * Handle get item request
   * @param requestData - Request data containing query parameters
   * @returns Response with item data or error
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Extract key from query parameters
      // For GET requests, Zotero server provides searchParams (URLSearchParams)
      const itemKey = requestData.searchParams?.get('key')

      if (!itemKey || typeof itemKey !== 'string') {
        return this.validationErrorResponse('key query parameter is required and must be a string')
      }

      logger.info(`Retrieving item with key: ${itemKey}`)

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

      // Extract item data
      const itemData = await this.extractItemData(item)

      logger.info(`Successfully retrieved item: ${itemKey} (${itemData.title})`)

      return this.successResponse(
        itemData,
        {
          message: 'Item retrieved successfully',
        },
      )
    } catch (error) {
      logger.error(`Error in GetItem endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }

  /**
   * Extract comprehensive data from a Zotero item
   * @param item - Zotero item object
   * @returns Extracted item data
   */
  private async extractItemData(item: any): Promise<any> {
    const itemData: any = {
      key: item.key,
      version: item.version,
      itemType: item.itemType,
      libraryID: item.libraryID,
      dateAdded: item.dateAdded,
      dateModified: item.dateModified,
      fields: {},
      creators: [],
      tags: [],
      collections: [],
      relations: {},
      attachments: [],
      notes: [],
      raw: item,
    }

    // Extract all fields
    const fieldNames = item.getUsedFields()
    for (const fieldName of fieldNames) {
      try {
        const value = item.getField(fieldName)
        if (value) {
          itemData.fields[fieldName] = value
        }
      } catch (error) {
        logger.warn(`Could not get field ${fieldName}: ${error}`)
      }
    }

    // For backwards compatibility, include title and date at top level
    itemData.title = item.getField('title') || itemData.fields.title || 'Untitled'
    itemData.date = item.getField('date') || itemData.fields.date || ''

    // Extract creators
    const creators = item.getCreators()
    itemData.creators = creators.map((creator: any) => ({
      creatorType: creator.creatorType,
      firstName: creator.firstName || '',
      lastName: creator.lastName || '',
      name: creator.name || '',
    }))

    // Extract tags
    const tags = item.getTags()
    itemData.tags = tags.map((tag: any) => ({
      tag: tag.tag,
      type: tag.type || 0,
    }))

    // Extract collections
    const collections = item.getCollections()
    itemData.collections = collections

    // Extract relations
    itemData.relations = item.getRelations()

    // Extract attachments if this is a regular item
    if (item.isRegularItem()) {
      const attachmentIDs = item.getAttachments()
      itemData.attachments = await Promise.all(
        attachmentIDs.map(async (attachmentID: number) => {
          try {
            const attachment = await Zotero.Items.getAsync(attachmentID)
            return {
              key: attachment.key,
              title: attachment.getField('title'),
              contentType: attachment.attachmentContentType,
              path: attachment.attachmentPath,
              linkMode: attachment.attachmentLinkMode,
            }
          } catch (error) {
            logger.warn(`Could not get attachment ${attachmentID}: ${error}`)
            return null
          }
        }),
      )
      itemData.attachments = itemData.attachments.filter(Boolean)

      // Extract notes
      const noteIDs = item.getNotes()
      itemData.notes = await Promise.all(
        noteIDs.map(async (noteID: number) => {
          try {
            const note = await Zotero.Items.getAsync(noteID)
            return {
              key: note.key,
              note: note.getNote(),
              dateAdded: note.dateAdded,
              dateModified: note.dateModified,
            }
          } catch (error) {
            logger.warn(`Could not get note ${noteID}: ${error}`)
            return null
          }
        }),
      )
      itemData.notes = itemData.notes.filter(Boolean)
    }

    // Generate citation if citation service is available
    try {
      const citationResult = await this.serviceManager.citationGenerator.generateProfessionalCitations([item])
      if (citationResult.success && citationResult.citations.length > 0) {
        itemData.citation = citationResult.citations[0]
        itemData.citationFormat = citationResult.format
        itemData.citationStyle = citationResult.style
      }
    } catch (error) {
      logger.warn(`Could not generate citation: ${error}`)
    }

    // Generate API URL
    try {
      const userID = Zotero.Users.getCurrentUserID()
      if (userID) {
        itemData.apiURL = `https://api.zotero.org/users/${userID}/items/${item.key}`
      }
    } catch (error) {
      logger.warn(`Could not generate API URL: ${error}`)
    }

    // Generate web library URL
    try {
      const userID = Zotero.Users.getCurrentUserID()
      if (userID) {
        itemData.webURL = `https://www.zotero.org/users/${userID}/items/${item.key}`
      }
    } catch (error) {
      logger.warn(`Could not generate web URL: ${error}`)
    }

    return itemData
  }
}

