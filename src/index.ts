/**
 * Example integration file showing how to use the new modular structure
 * This demonstrates how the existing lib.ts can be refactored to use the new modules
 */

import { Logger } from './core/Logger'
import { ServiceManager } from './core/ServiceManager'
import { StringUtils } from './utils/StringUtils'
import { UrlUtils } from './utils/UrlUtils'
import { ResponseBuilder } from './utils/ResponseBuilder'
import { ValidationError, DuplicateProcessingResult } from './core/types'
import { VALIDATION } from './config/constants'

// Example usage of the new modular structure:

/**
 * Example class showing how to integrate services into existing plugin architecture
 */
export class ModularPlugin {
  private serviceManager: ServiceManager
  private logger: Logger

  constructor() {
    this.serviceManager = new ServiceManager()
    this.logger = new Logger('ModularPlugin')
  }

  /**
   * Initialize the plugin with all services
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing modular plugin')
      await this.serviceManager.initialize()
      this.logger.info('Modular plugin initialization completed')
    } catch (error) {
      this.logger.error(`Plugin initialization failed: ${error}`)
      throw error
    }
  }

  /**
   * Cleanup plugin services
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up modular plugin')
      await this.serviceManager.cleanup()
      this.logger.info('Modular plugin cleanup completed')
    } catch (error) {
      this.logger.error(`Plugin cleanup failed: ${error}`)
    }
  }

  /**
   * Example: Validate and process an item using services
   */
  async processNewItem(item: any): Promise<{ valid: boolean; duplicates?: DuplicateProcessingResult }> {
    // Validate item using ItemValidator service
    const validatedItem = this.serviceManager.itemValidator.validateItemData(item)
    if (!validatedItem) {
      this.logger.warn(`Item validation failed for ${item.key}`)
      return { valid: false }
    }

    // Check for duplicates using DuplicateDetector service
    const duplicateResults = await this.serviceManager.duplicateDetector.detectDuplicates(validatedItem)

    this.logger.info(`Item ${item.key} processed: valid=${true}, duplicates=${duplicateResults.duplicateCount}`)

    return {
      valid: true,
      duplicates: duplicateResults,
    }
  }

  /**
   * Example: Generate citation using CitationGenerator service
   */
  async generateCitationForItems(items: any[], format: 'markdown' | 'html' | 'plain' = 'markdown'): Promise<boolean> {
    return await this.serviceManager.citationGenerator.generateAndCopyMarkdownLink(items, format)
  }

  /**
   * Example: Handle API request using new response builder
   */
  handleApiRequest(items: any[], method: string, translator: string): [number, string, string] {
    return ResponseBuilder.translationSuccess(items, method, translator)
  }

  /**
   * Example: URL processing with utilities
   */
  processUrl(url: string): { normalized: string; domain: string; valid: boolean } {
    const valid = UrlUtils.isValidUrl(url) && UrlUtils.isSupportedScheme(url)

    if (!valid) {
      this.logger.error(`Invalid URL: ${url}`)
      return { normalized: url, domain: '', valid: false }
    }

    const normalized = UrlUtils.normalizeUrl(url)
    const domain = UrlUtils.extractDomain(url)

    this.logger.info(`Processed URL: ${url} -> ${normalized}`)
    return { normalized, domain, valid }
  }

  /**
   * Get service status
   */
  getServiceStatus(): Record<string, boolean> {
    return this.serviceManager.getServicesStatus()
  }
}

// Utility functions that can be used independently
export function calculateSimilarity(title1: string, title2: string): number {
  return StringUtils.calculateTitleSimilarity(title1, title2)
}

export function normalizeAndCompareUrls(url1: string, url2: string): boolean {
  return UrlUtils.areEquivalent(url1, url2)
}

export function handleApiError(error: Error): [number, string, string] {
  if (error instanceof ValidationError) {
    return ResponseBuilder.validationError(error.message)
  }
  return ResponseBuilder.error(error)
}

export function validateItemTitle(title: string): boolean {
  if (!title || title.length < VALIDATION.MIN_TITLE_LENGTH) {
    return false
  }

  if (StringUtils.matchesAnyPattern(title, VALIDATION.FORBIDDEN_TITLE_PATTERNS)) {
    return false
  }

  return true
}

// Export all modules for direct use in lib.ts during migration
export { Logger } from './core/Logger'
export { ServiceManager } from './core/ServiceManager'
export { StringUtils } from './utils/StringUtils'
export { UrlUtils } from './utils/UrlUtils'
export { ResponseBuilder } from './utils/ResponseBuilder'
export { ItemValidator } from './services/ItemValidator'
export { DuplicateDetector } from './services/DuplicateDetector'
export { CitationGenerator } from './services/CitationGenerator'