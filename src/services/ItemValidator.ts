import { IService } from '../core/types'
import { serviceLogger as logger } from '../core/Logger'
import { VALIDATION } from '../config/constants'
import { StringUtils } from '../utils/StringUtils'

/**
 * Service for validating Zotero items and ensuring data quality
 */
export class ItemValidator implements IService {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing ItemValidator service')
    this.initialized = true
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up ItemValidator service')
    this.initialized = false
  }

  /**
   * Validate item data and return the item if valid, null if invalid
   * @param item - Zotero item to validate
   * @returns Validated item or null if invalid
   */
  validateItemData(item: any): any | null {
    try {
      if (!item) {
        logger.debug('Item validation failed: item is null or undefined')
        return null
      }

      // Validate title
      if (!this.validateTitle(item)) {
        return null
      }

      // Validate creators
      if (!this.validateCreators(item)) {
        return null
      }

      logger.debug(`Item validation passed for item ${item.key}`)
      return item
    } catch (error) {
      logger.error(`Error validating item data: ${error}`)
      return null
    }
  }

  /**
   * Validate item title
   * @param item - Zotero item
   * @returns True if title is valid
   */
  private validateTitle(item: any): boolean {
    const title = item.getField('title')

    if (!title || typeof title !== 'string') {
      logger.debug(`Item validation failed: no title found for item ${item.key}`)
      return false
    }

    const trimmedTitle = title.trim()

    // Check minimum length
    if (trimmedTitle.length < VALIDATION.MIN_TITLE_LENGTH) {
      logger.debug(`Item validation failed: title too short for item ${item.key}`)
      return false
    }

    // Check maximum length
    if (trimmedTitle.length > VALIDATION.MAX_TITLE_LENGTH) {
      logger.debug(`Item validation failed: title too long for item ${item.key}`)
      return false
    }

    // Check forbidden patterns
    if (StringUtils.matchesAnyPattern(trimmedTitle, VALIDATION.FORBIDDEN_TITLE_PATTERNS)) {
      logger.debug(`Item validation failed: invalid title pattern "${trimmedTitle}" for item ${item.key}`)
      return false
    }

    return true
  }

  /**
   * Validate item creators
   * @param item - Zotero item
   * @returns True if creators are valid
   */
  private validateCreators(item: any): boolean {
    const creators = item.getCreators()

    if (!creators || creators.length === 0) {
      logger.debug(`Item validation failed: no creators found for item ${item.key}`)
      return false
    }

    // Validate that at least one creator has a meaningful name
    const hasValidCreator = creators.some((creator: any) => {
      return this.validateCreator(creator)
    })

    if (!hasValidCreator) {
      logger.debug(`Item validation failed: no valid creators with names for item ${item.key}`)
      return false
    }

    return true
  }

  /**
   * Validate a single creator
   * @param creator - Creator object
   * @returns True if creator is valid
   */
  private validateCreator(creator: any): boolean {
    const lastName = creator.lastName?.trim()
    const firstName = creator.firstName?.trim()
    const name = creator.name?.trim()

    // Check if we have at least one non-empty name field
    const hasName = (lastName && lastName.length >= VALIDATION.MIN_AUTHOR_LENGTH) ||
                   (firstName && firstName.length >= VALIDATION.MIN_AUTHOR_LENGTH) ||
                   (name && name.length >= VALIDATION.MIN_AUTHOR_LENGTH)

    if (!hasName) {
      return false
    }

    // Check for forbidden author patterns
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || name || ''
    if (StringUtils.matchesAnyPattern(fullName, VALIDATION.FORBIDDEN_AUTHOR_PATTERNS)) {
      return false
    }

    return true
  }

  /**
   * Delete a Zotero item by its key
   * @param itemKey - The key of the item to delete
   * @throws Error if the item cannot be found or deleted
   */
  async deleteItemByKey(itemKey: string): Promise<void> {
    try {
      if (!itemKey || typeof itemKey !== 'string' || itemKey.trim().length === 0) {
        throw new Error('Invalid item key: must be a non-empty string')
      }

      logger.info(`Attempting to delete item with key: ${itemKey}`)

      // Find the item by key
      let item = Zotero.Items.getByLibraryAndKey(Zotero.Libraries.userLibraryID, itemKey)

      if (!item) {
        // Try to find in all libraries (including group libraries)
        item = await this.findItemInAllLibraries(itemKey)
        if (!item) {
          throw new Error(`Item with key "${itemKey}" not found in any library`)
        }
      }

      // Validate library permissions
      if (!this.canDeleteItem(item)) {
        throw new Error(`Cannot delete item "${itemKey}": library is not editable or item is already deleted`)
      }

      // Perform the deletion with timeout protection
      await this.performDeletion(item, itemKey)

      logger.info(`Successfully deleted item with key: ${itemKey}`)
    } catch (error) {
      logger.error(`Failed to delete item ${itemKey}: ${error}`)
      throw error
    }
  }

  /**
   * Find item in all libraries
   * @param itemKey - Item key to search for
   * @returns Found item or null
   */
  private async findItemInAllLibraries(itemKey: string): Promise<any | null> {
    const allLibraries = Zotero.Libraries.getAll()

    for (const library of allLibraries) {
      const item = Zotero.Items.getByLibraryAndKey(library.libraryID, itemKey)
      if (item) {
        return item
      }
    }

    return null
  }

  /**
   * Check if item can be deleted
   * @param item - Zotero item
   * @returns True if item can be deleted
   */
  private canDeleteItem(item: any): boolean {
    const library = item.library
    if (!library || !library.editable) {
      return false
    }

    if (item.deleted) {
      return false
    }

    return true
  }

  /**
   * Perform item deletion with timeout protection
   * @param item - Item to delete
   * @param itemKey - Item key for error messages
   */
  private async performDeletion(item: any, itemKey: string): Promise<void> {
    const deletePromise = item.eraseTx()
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer)
      timer.initWithCallback(() => {
        reject(new Error(`Deletion operation timed out after 10 seconds for item "${itemKey}"`))
      }, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT)
    })

    await Promise.race([deletePromise, timeoutPromise])
  }

  /**
   * Batch validate multiple items
   * @param items - Array of items to validate
   * @returns Object with valid and invalid items
   */
  batchValidate(items: any[]): { valid: any[], invalid: any[] } {
    const valid: any[] = []
    const invalid: any[] = []

    for (const item of items) {
      const validatedItem = this.validateItemData(item)
      if (validatedItem) {
        valid.push(validatedItem)
      } else {
        invalid.push(item)
      }
    }

    logger.info(`Batch validation completed: ${valid.length} valid, ${invalid.length} invalid`)
    return { valid, invalid }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}