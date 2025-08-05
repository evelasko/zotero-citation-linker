import { ValidationError } from '../../core/types'
import { utilLogger as logger } from '../../core/Logger'
import { UrlUtils } from '../../utils/UrlUtils'

/**
 * Request validation middleware for API endpoints
 */
export class RequestValidator {
  /**
   * Validate basic request structure
   * @param requestData - Raw request data
   * @returns Validation result
   */
  static validateRequest(requestData: any): { valid: boolean; error?: string } {
    try {
      if (!requestData) {
        return { valid: false, error: 'Request data is required' }
      }

      if (!requestData.data) {
        return { valid: false, error: 'Request data.data field is required' }
      }

      return { valid: true }
    } catch (error) {
      logger.error(`Request validation error: ${error}`)
      return { valid: false, error: 'Invalid request format' }
    }
  }

  /**
   * Validate URL in request data
   * @param requestData - Request data containing URL
   * @returns Validation result
   */
  static validateUrlRequest(requestData: any): { valid: boolean; error?: string; url?: string } {
    const basicValidation = RequestValidator.validateRequest(requestData)
    if (!basicValidation.valid) {
      return basicValidation
    }

    const { url } = requestData.data

    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required and must be a string' }
    }

    if (!UrlUtils.isValidUrl(url)) {
      return { valid: false, error: 'Invalid URL format' }
    }

    if (!UrlUtils.isSupportedScheme(url)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' }
    }

    return { valid: true, url }
  }

  /**
   * Validate identifier in request data
   * @param requestData - Request data containing identifier
   * @returns Validation result
   */
  static validateIdentifierRequest(requestData: any): { valid: boolean; error?: string; identifier?: string } {
    const basicValidation = RequestValidator.validateRequest(requestData)
    if (!basicValidation.valid) {
      return basicValidation
    }

    const { identifier } = requestData.data

    if (!identifier || typeof identifier !== 'string') {
      return { valid: false, error: 'Identifier is required and must be a string' }
    }

    if (identifier.trim().length === 0) {
      return { valid: false, error: 'Identifier cannot be empty' }
    }

    return { valid: true, identifier: identifier.trim() }
  }

  /**
   * Validate webpage save request
   * @param requestData - Request data for webpage saving
   * @returns Validation result
   */
  static validateWebpageRequest(requestData: any): { valid: boolean; error?: string; url?: string; title?: string } {
    const urlValidation = RequestValidator.validateUrlRequest(requestData)
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

  /**
   * Check if library is editable
   * @returns True if library can be written to
   */
  static checkLibraryEditable(): boolean {
    try {
      const { library } = (Zotero.Server as any).Connector.getSaveTarget()
      return library && library.editable
    } catch (error) {
      logger.error(`Error checking library editability: ${error}`)
      return false
    }
  }

  /**
   * Create validation error response
   * @param message - Error message
   * @returns Validation error
   */
  static createValidationError(message: string): ValidationError {
    return new ValidationError(message)
  }
}