import { ApiResponse, ValidationError, PluginError } from '../core/types'
import { HTTP_STATUS } from '../config/constants'
import { utilLogger as logger } from '../core/Logger'

/**
 * Response builder for standardized API responses
 */
export class ResponseBuilder {
  /**
   * Build a success response
   * @param data - Response data
   * @param metadata - Additional metadata
   * @returns Formatted response array [statusCode, contentType, body]
   */
  static success(data: any, metadata?: Record<string, any>): [number, string, string] {
    const response: ApiResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
      ...metadata,
    }

    logger.debug(`Success response: ${JSON.stringify(response)}`)
    return [HTTP_STATUS.OK, 'application/json', JSON.stringify(response, null, 2)]
  }

  /**
   * Build an error response
   * @param error - Error object or message
   * @param statusCode - HTTP status code
   * @param additionalData - Additional data to include in response
   * @returns Formatted error response array [statusCode, contentType, body]
   */
  static error(error: Error | string, statusCode?: number, additionalData?: any): [number, string, string] {
    let message: string
    let code: number

    if (error instanceof ValidationError) {
      message = error.message
      code = error.statusCode
    } else if (error instanceof PluginError) {
      message = error.message
      code = error.statusCode
    } else if (error instanceof Error) {
      message = error.message
      code = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    } else {
      message = error
      code = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    }

    const response = {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
      },
      ...(additionalData && { data: additionalData }),
    }

    logger.error(`Error response ${code}: ${message}`)
    return [code, 'application/json', JSON.stringify(response)]
  }

  /**
   * Build a validation error response
   * @param message - Validation error message
   * @param details - Additional error details
   * @returns Formatted validation error response
   */
  static validationError(message: string, details?: any): [number, string, string] {
    const response = {
      success: false,
      error: {
        type: 'ValidationError',
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    }

    logger.error(`Validation error: ${message}`)
    return [HTTP_STATUS.BAD_REQUEST, 'application/json', JSON.stringify(response)]
  }

  /**
   * Build a not found response
   * @param resource - Resource type that was not found
   * @param identifier - Resource identifier
   * @returns Formatted not found response
   */
  static notFound(resource: string, identifier?: string): [number, string, string] {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`

    const response = {
      success: false,
      error: {
        type: 'NotFoundError',
        message,
        timestamp: new Date().toISOString(),
      },
    }

    logger.warn(`Not found: ${message}`)
    return [HTTP_STATUS.NOT_FOUND, 'application/json', JSON.stringify(response)]
  }

  /**
   * Build a translation success response with item enrichment
   * @param items - Array of translated items
   * @param method - Translation method used
   * @param translator - Translator name
   * @param duplicateProcessing - Duplicate processing results
   * @returns Formatted success response with enriched items
   */
  static translationSuccess(
    items: any[],
    method: string,
    translator: string,
    duplicateProcessing?: any,
  ): [number, string, string] {
    const response = {
      success: true,
      method,
      translator,
      itemCount: items.length,
      timestamp: new Date().toISOString(),
      items: items.map((item, index) => {
        // Use toJSON() to get serializable item data instead of spreading all properties
        const serializedItem = item.toJSON ? item.toJSON() : item
        return {
          ...serializedItem,
          _meta: {
            index,
            itemKey: item.key,
            itemType: item.itemType,
            library: item.libraryID,
          },
        }
      }),
      duplicateInfo: duplicateProcessing ? {
        processed: duplicateProcessing.processed,
        autoMerged: duplicateProcessing.autoMerged || [],
        possibleDuplicates: duplicateProcessing.possibleDuplicates || [],
        ...(duplicateProcessing.errors?.length > 0 && {
          errors: duplicateProcessing.errors,
        }),
      } : { processed: false },
      _links: {
        documentation: 'https://github.com/evelasko/zotero-citation-linker',
        zoteroApi: 'https://api.zotero.org/',
      },
    }

    logger.info(`Translation success: ${method} (${translator}) with ${items.length} items`)
    return [HTTP_STATUS.OK, 'application/json', JSON.stringify(response, null, 2)]
  }

  /**
   * Build an analysis response
   * @param analysisData - Analysis results
   * @returns Formatted analysis response
   */
  static analysisResponse(analysisData: any): [number, string, string] {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: analysisData,
    }

    return [HTTP_STATUS.OK, 'application/json', JSON.stringify(response, null, 2)]
  }

  /**
   * Build a batch operation response
   * @param results - Array of operation results
   * @param operation - Operation name
   * @returns Formatted batch response
   */
  static batchResponse(results: any[], operation: string): [number, string, string] {
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    const response = {
      success: failed === 0,
      operation,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
      timestamp: new Date().toISOString(),
    }

    const statusCode = failed === 0 ? HTTP_STATUS.OK :
                      successful === 0 ? HTTP_STATUS.UNPROCESSABLE_ENTITY :
                      HTTP_STATUS.OK

    return [statusCode, 'application/json', JSON.stringify(response, null, 2)]
  }

  /**
   * Build a partial success response
   * @param successItems - Successfully processed items
   * @param failedItems - Failed items with reasons
   * @param operation - Operation name
   * @returns Formatted partial success response
   */
  static partialSuccess(
    successItems: any[],
    failedItems: Array<{ item: any; reason: string }>,
    operation: string,
  ): [number, string, string] {
    const response = {
      success: false,
      partial: true,
      operation,
      summary: {
        successful: successItems.length,
        failed: failedItems.length,
        total: successItems.length + failedItems.length,
      },
      successful: successItems,
      failed: failedItems,
      timestamp: new Date().toISOString(),
    }

    return [HTTP_STATUS.OK, 'application/json', JSON.stringify(response, null, 2)]
  }
}