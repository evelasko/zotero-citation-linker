import { IService, TranslationResult } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { serviceLogger as logger } from '../core/Logger'

/**
 * Service for handling identifier-based translation using Zotero translators
 * Supports DOI, ISBN, PMID, ArXiv, and other scholarly identifiers
 */
export class IdentifierTranslator implements IService {
  private initialized = false
  private serviceManager: ServiceManager

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing IdentifierTranslator service')
    this.initialized = true
    logger.info('IdentifierTranslator service initialized successfully')
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up IdentifierTranslator service')
    this.initialized = false
    logger.info('IdentifierTranslator service cleaned up')
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Attempt to translate an identifier using Zotero's translation system
   * @param identifier - Identifier to translate (DOI, ISBN, PMID, etc.)
   * @returns Translation result with items and metadata
   */
  async attemptIdentifierTranslation(identifier: string): Promise<TranslationResult> {
    try {
      logger.info(`Starting identifier translation attempt for: ${identifier}`)

      // Extract identifiers using Zotero's utility function
      const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier)
      if (extractedIdentifiers.length === 0) {
        logger.info('No valid identifiers found in the input')
        return {
          success: false,
          items: [],
          reason: 'No valid identifiers found in the input',
        }
      }

      logger.info(`Extracted identifiers: ${JSON.stringify(extractedIdentifiers)}`)

      // Create a new Zotero.Translate.Search instance
      const search = new Zotero.Translate.Search()
      search.setIdentifier(extractedIdentifiers[0])

      logger.info('Search translation object created and configured')

      // Get available translators
      const translators = await search.getTranslators()
      logger.info(`Found ${translators.length} translators for this identifier`)

      if (translators.length === 0) {
        logger.info('No translators found for this identifier')
        return {
          success: false,
          items: [],
          reason: 'No translators found for this identifier',
        }
      }

      // Log available translators for debugging
      translators.forEach((translator, index) => {
        logger.info(`Translator ${index + 1}: ${translator.label} (priority: ${translator.priority})`)
      })

      // Use the first (highest priority) translator
      const translator = translators[0]
      search.setTranslator(translator)
      logger.info(`Using translator: ${translator.label} with priority ${translator.priority}`)

      // Execute the translation
      const items = await search.translate()

      if (!items) {
        logger.info('Identifier translation completed but produced no items')
        return {
          success: false,
          items: [],
          reason: 'Identifier translation completed but produced no items',
        }
      }

      logger.info(`Identifier translation completed: ${items.length} items created`)

      // Convert items to proper format if they exist
      if (items.length > 0) {
        const validItems = []

        for (const item of items) {
          const isValid = await this.validateItemData(item)
          if (!isValid) {
            logger.info(`Item: ${item.title} is not valid`)
            await this.deleteItemByKey(item.key)
          } else {
            validItems.push(item)
          }
        }

        if (validItems.length === 0) {
          logger.info('No valid items found after translation')
          return {
            success: false,
            items: [],
            reason: 'No valid items found after translation',
          }
        }

        // Process duplicates before formatting
        logger.info('Starting duplicate detection for translated items')
        const duplicateResults = await this.serviceManager.duplicateDetector.detectDuplicates(validItems[0])

        // Format the final items
        const formattedItems = validItems.map((item: any) => {
          const jsonItem = item.toJSON()
          jsonItem.key = item.key
          jsonItem.version = item.version
          jsonItem.itemID = item.id

          logger.info(`Formatted final item: ${jsonItem.title || 'No title'} (${jsonItem.itemType}) - Key: ${jsonItem.key}`)
          return jsonItem
        })

        logger.info(`Identifier translation successful: ${formattedItems.length} items formatted, duplicate processing completed`)
        return {
          success: true,
          items: formattedItems,
          translator: translator.label,
          duplicateProcessing: duplicateResults,
        }
      }

      // If no items produced, return failure
      logger.info('Identifier translation completed but produced no items')
      return {
        success: false,
        items: [],
        reason: 'Identifier translation completed but produced no items',
      }

    } catch (error) {
      logger.error(`Identifier translation error: ${error}`)
      return {
        success: false,
        items: [],
        reason: `Translation error: ${error}`,
      }
    }
  }

  /**
   * Detect available translators for an identifier
   * @param identifier - Identifier to check
   * @returns Array of available translators
   */
  async detectIdentifierTranslators(identifier: string): Promise<any[]> {
    try {
      logger.info(`Detecting translators for identifier: ${identifier}`)

      // Extract identifiers using Zotero's utility function
      const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier.trim())

      if (extractedIdentifiers.length === 0) {
        logger.info('No valid identifiers found')
        return []
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
              translators: translators || [],
              count: (translators || []).length,
            }
          } catch (error) {
            logger.error(`Error checking translators for ${extractedId}: ${error}`)
            return {
              identifier: extractedId,
              translators: [],
              count: 0,
              error: error.toString(),
            }
          }
        }),
      )

      const allTranslators = translatorResults.flatMap(result => result.translators)
      logger.info(`Found ${allTranslators.length} total translators for identifier`)

      return allTranslators
    } catch (error) {
      logger.error(`Error detecting identifier translators: ${error}`)
      return []
    }
  }

  /**
   * Get supported identifier types
   * @returns Array of supported identifier types
   */
  getSupportedIdentifierTypes(): string[] {
    return [
      'DOI',
      'ISBN',
      'ISSN',
      'PMID',
      'PMCID',
      'ArXiv',
      'OCLC',
      'LCCN',
    ]
  }

  /**
   * Check if an identifier type is supported
   * @param type - Identifier type to check
   * @returns True if supported
   */
  isIdentifierTypeSupported(type: string): boolean {
    return this.getSupportedIdentifierTypes()
      .map(t => t.toLowerCase())
      .includes(type.toLowerCase())
  }

  /**
   * Validate item data before processing
   * @param item - Zotero item to validate
   * @returns True if valid
   */
  private async validateItemData(item: any): Promise<boolean> {
    return this.serviceManager.itemValidator.validateItemData(item)
  }

  /**
   * Delete an item by key
   * @param key - Item key to delete
   */
  private async deleteItemByKey(key: string): Promise<void> {
    try {
      const item = await Zotero.Items.getByLibraryAndKeyAsync(Zotero.Libraries.userLibraryID, key)
      if (item) {
        await item.eraseTx()
        logger.info(`Deleted invalid item with key: ${key}`)
      }
    } catch (error) {
      logger.error(`Error deleting item with key ${key}: ${error}`)
    }
  }
}