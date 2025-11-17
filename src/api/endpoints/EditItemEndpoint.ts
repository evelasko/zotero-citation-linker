import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'

/**
 * Endpoint for editing Zotero items by their key
 * Supports updating fields, creators, tags, collections, and relations
 */
export class EditItemEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.EDIT_ITEM, serviceManager, ['POST', 'PATCH'])
  }

  /**
   * Handle edit item request
   * @param requestData - Request data containing itemKey and update data
   * @returns Response with updated item data or error
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    try {
      // Validate request data
      const validationResult = this.validateRequest(requestData)
      if (!validationResult.valid) {
        return this.validationErrorResponse(validationResult.error!)
      }

      // Extract and validate itemKey and update data
      const { itemKey, fields, creators, tags, collections, relations, note } = requestData.data || {}

      if (!itemKey || typeof itemKey !== 'string') {
        return this.validationErrorResponse('itemKey is required and must be a string')
      }

      // Check if at least one update field is provided
      if (!fields && !creators && !tags && !collections && !relations && note === undefined) {
        return this.validationErrorResponse(
          'At least one of fields, creators, tags, collections, relations, or note must be provided',
        )
      }

      logger.info(`Attempting to edit item with key: ${itemKey}`)

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

      // Store original item info for logging
      const originalTitle = item.getField('title') || 'Untitled'
      const itemType = item.itemType

      logger.info(`Editing item: ${itemKey} (${originalTitle}, type: ${itemType})`)

      // Track what was updated for response
      const updatedFields: string[] = []
      const validationErrors: string[] = []

      // Update fields if provided
      if (fields && typeof fields === 'object') {
        const fieldUpdateResult = await this.updateItemFields(item, fields, itemType)
        updatedFields.push(...fieldUpdateResult.updated)
        validationErrors.push(...fieldUpdateResult.errors)
      }

      // Update note content if provided (for note items)
      if (note !== undefined && item.isNote()) {
        try {
          item.setNote(note)
          updatedFields.push('note')
          logger.debug('Updated note content')
        } catch (error) {
          validationErrors.push(`Failed to update note: ${error}`)
          logger.warn(`Failed to update note: ${error}`)
        }
      } else if (note !== undefined && !item.isNote()) {
        validationErrors.push('note field can only be set on note items')
      }

      // Update creators if provided
      if (creators !== undefined) {
        if (Array.isArray(creators)) {
          const creatorUpdateResult = this.updateItemCreators(item, creators, itemType)
          if (creatorUpdateResult.success) {
            updatedFields.push('creators')
          } else {
            validationErrors.push(creatorUpdateResult.error!)
          }
        } else {
          validationErrors.push('creators must be an array')
        }
      }

      // Update tags if provided
      if (tags !== undefined) {
        if (Array.isArray(tags)) {
          const tagUpdateResult = this.updateItemTags(item, tags)
          if (tagUpdateResult.success) {
            updatedFields.push('tags')
          } else {
            validationErrors.push(tagUpdateResult.error!)
          }
        } else {
          validationErrors.push('tags must be an array')
        }
      }

      // Update collections if provided
      if (collections !== undefined) {
        if (Array.isArray(collections)) {
          const collectionUpdateResult = await this.updateItemCollections(item, collections)
          if (collectionUpdateResult.success) {
            updatedFields.push('collections')
          } else {
            validationErrors.push(collectionUpdateResult.error!)
          }
        } else {
          validationErrors.push('collections must be an array')
        }
      }

      // Update relations if provided
      if (relations !== undefined) {
        if (typeof relations === 'object') {
          const relationUpdateResult = this.updateItemRelations(item, relations)
          if (relationUpdateResult.success) {
            updatedFields.push('relations')
          } else {
            validationErrors.push(relationUpdateResult.error!)
          }
        } else {
          validationErrors.push('relations must be an object')
        }
      }

      // Check if anything was actually updated
      if (updatedFields.length === 0 && validationErrors.length > 0) {
        return this.errorResponse(
          'No fields were updated due to validation errors',
          400,
          { errors: validationErrors },
        )
      }

      // Save the item
      try {
        await item.saveTx()
        logger.info(`Successfully saved item: ${itemKey}`)
      } catch (error) {
        logger.error(`Failed to save item ${itemKey}: ${error}`)
        return this.errorResponse(`Failed to save item: ${error}`, 500)
      }

      // Get updated item data
      const updatedTitle = item.getField('title') || 'Untitled'

      // Build response
      const response = {
        updated: true,
        itemKey: itemKey,
        itemType: itemType,
        title: updatedTitle,
        updatedFields: updatedFields,
        version: item.version,
        dateModified: item.dateModified,
      }

      const metadata: any = {
        message: 'Item updated successfully',
      }

      // Include validation errors if any (partial success)
      if (validationErrors.length > 0) {
        metadata.warnings = validationErrors
        logger.warn(`Item updated with warnings: ${validationErrors.join('; ')}`)
      }

      logger.info(`Successfully updated item: ${itemKey} (${updatedTitle}). Updated: ${updatedFields.join(', ')}`)

      return this.successResponse(response, metadata)
    } catch (error) {
      logger.error(`Error in EditItem endpoint: ${error}`)
      return this.errorResponse(`Internal server error: ${error}`, 500)
    }
  }

  /**
   * Update item fields with validation
   * @param item - Zotero item
   * @param fields - Fields to update
   * @param itemType - Item type for validation
   * @returns Update result with updated fields and errors
   */
  private async updateItemFields(
    item: any,
    fields: Record<string, any>,
    itemType: string,
  ): Promise<{ updated: string[]; errors: string[] }> {
    const updated: string[] = []
    const errors: string[] = []

    // Get valid fields for this item type
    const itemTypeID = Zotero.ItemTypes.getID(itemType)
    if (!itemTypeID) {
      errors.push(`Invalid item type: ${itemType}`)
      return { updated, errors }
    }
    const validFields = Zotero.ItemFields.getItemTypeFields(itemTypeID)
    const validFieldNames = validFields.map((fieldID: number) =>
      Zotero.ItemFields.getName(fieldID),
    )

    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        // Check if field is valid for this item type
        if (!validFieldNames.includes(fieldName)) {
          // Check if it's a base field that maps to a type-specific field
          const fieldID = Zotero.ItemFields.getID(fieldName)
          if (!fieldID) {
            errors.push(`Field "${fieldName}" does not exist in Zotero schema`)
            logger.warn(`Invalid field: ${fieldName}`)
            continue
          }

          // Check if field is valid for item type (including base field mapping)
          if (!Zotero.ItemFields.isValidForType(fieldID, itemTypeID)) {
            errors.push(`Field "${fieldName}" is not valid for item type "${itemType}"`)
            logger.warn(`Field "${fieldName}" not valid for ${itemType}`)
            continue
          }
        }

        // Set the field value
        const stringValue = value === null || value === undefined ? '' : String(value)
        item.setField(fieldName, stringValue)
        updated.push(fieldName)
        logger.debug(`Updated field ${fieldName} to "${stringValue}"`)
      } catch (error) {
        errors.push(`Failed to set field "${fieldName}": ${error}`)
        logger.warn(`Failed to set field ${fieldName}: ${error}`)
      }
    }

    return { updated, errors }
  }

  /**
   * Update item creators with validation
   * @param item - Zotero item
   * @param creators - Creators array to set
   * @param itemType - Item type for validation
   * @returns Update result
   */
  private updateItemCreators(
    item: any,
    creators: any[],
    itemType: string,
  ): { success: boolean; error?: string } {
    try {
      // Get valid creator types for this item type
      const itemTypeID = Zotero.ItemTypes.getID(itemType)
      if (!itemTypeID) {
        return { success: false, error: `Invalid item type: ${itemType}` }
      }
      const validCreatorTypes = Zotero.CreatorTypes.getTypesForItemType(itemTypeID)
      const validCreatorTypeNames = validCreatorTypes.map((ct: any) => ct.name)

      // Validate each creator
      const validatedCreators = []
      for (let i = 0; i < creators.length; i++) {
        const creator = creators[i]

        // Validate creator structure
        if (!creator.creatorType) {
          return {
            success: false,
            error: `Creator at index ${i} missing required field: creatorType`,
          }
        }

        // Validate creator type
        if (!validCreatorTypeNames.includes(creator.creatorType)) {
          return {
            success: false,
            error: `Invalid creator type "${creator.creatorType}" for item type "${itemType}"`,
          }
        }

        // Validate name fields
        if (creator.name) {
          // Single-field mode (institutions, mononyms)
          validatedCreators.push({
            creatorType: creator.creatorType,
            name: String(creator.name),
            fieldMode: 1,
          })
        } else if (creator.lastName) {
          // Two-field mode (most common)
          validatedCreators.push({
            creatorType: creator.creatorType,
            firstName: creator.firstName ? String(creator.firstName) : '',
            lastName: String(creator.lastName),
            fieldMode: 0,
          })
        } else {
          return {
            success: false,
            error: `Creator at index ${i} must have either "name" or "lastName"`,
          }
        }
      }

      // Set creators
      item.setCreators(validatedCreators)
      logger.debug(`Updated ${validatedCreators.length} creators`)

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to update creators: ${error}` }
    }
  }

  /**
   * Update item tags
   * @param item - Zotero item
   * @param tags - Tags array to set
   * @returns Update result
   */
  private updateItemTags(
    item: any,
    tags: any[],
  ): { success: boolean; error?: string } {
    try {
      // Validate and format tags
      const validatedTags = []
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i]

        if (typeof tag === 'string') {
          // Simple string tag
          validatedTags.push({ tag: tag, type: 0 })
        } else if (tag && typeof tag === 'object' && tag.tag) {
          // Tag object with optional type
          validatedTags.push({
            tag: String(tag.tag),
            type: tag.type === 1 ? 1 : 0, // 0 = manual, 1 = automatic
          })
        } else {
          return {
            success: false,
            error: `Invalid tag at index ${i}: must be a string or object with "tag" property`,
          }
        }
      }

      // Set tags
      item.setTags(validatedTags)
      logger.debug(`Updated ${validatedTags.length} tags`)

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to update tags: ${error}` }
    }
  }

  /**
   * Update item collections
   * @param item - Zotero item
   * @param collections - Collection keys array to set
   * @returns Update result
   */
  private async updateItemCollections(
    item: any,
    collections: any[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate collection keys
      const validatedCollectionIDs = []
      for (let i = 0; i < collections.length; i++) {
        const collectionKey = collections[i]

        if (typeof collectionKey !== 'string') {
          return {
            success: false,
            error: `Collection at index ${i} must be a string (collection key)`,
          }
        }

        // Try to get collection by key
        try {
          const collection = await Zotero.Collections.getByLibraryAndKeyAsync(
            Zotero.Libraries.userLibraryID,
            collectionKey,
          )

          if (!collection) {
            return {
              success: false,
              error: `Collection with key "${collectionKey}" not found`,
            }
          }

          validatedCollectionIDs.push(collection.id)
        } catch (error) {
          return {
            success: false,
            error: `Failed to get collection "${collectionKey}": ${error}`,
          }
        }
      }

      // Set collections
      item.setCollections(validatedCollectionIDs)
      logger.debug(`Updated to ${validatedCollectionIDs.length} collections`)

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to update collections: ${error}` }
    }
  }

  /**
   * Update item relations
   * @param item - Zotero item
   * @param relations - Relations object to set
   * @returns Update result
   */
  private updateItemRelations(
    item: any,
    relations: Record<string, any>,
  ): { success: boolean; error?: string } {
    try {
      // Validate relations structure
      for (const [predicate, objects] of Object.entries(relations)) {
        if (!Array.isArray(objects)) {
          return {
            success: false,
            error: `Relations predicate "${predicate}" must have an array value`,
          }
        }

        // Each object should be a URI string
        for (let i = 0; i < objects.length; i++) {
          if (typeof objects[i] !== 'string') {
            return {
              success: false,
              error: `Relation object at ${predicate}[${i}] must be a string (URI)`,
            }
          }
        }
      }

      // Clear existing relations and set new ones
      // Note: Zotero API expects each relation to be set individually
      for (const [predicate, objects] of Object.entries(relations)) {
        for (const object of objects) {
          item.addRelation(predicate, object)
        }
      }

      logger.debug(`Updated relations: ${Object.keys(relations).length} predicates`)

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to update relations: ${error}` }
    }
  }
}

