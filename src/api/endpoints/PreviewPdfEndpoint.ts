import { BaseEndpoint } from '../BaseEndpoint'
import { ServiceManager } from '../../core/ServiceManager'
import { API_ENDPOINTS, DEFAULT_PREFERENCES } from '../../config/constants'
import { apiLogger as logger } from '../../core/Logger'
import { PdfMetadataExtractor } from '../../utils/PdfMetadataExtractor'

declare const Zotero: any
declare const IOUtils: any
declare const PathUtils: any

/**
 * Interface for multipart form field
 */
interface MultipartField {
  params: {
    name?: string
    filename?: string
    contentType?: string
  }
  body: string
}

/**
 * Endpoint for previewing PDF metadata extraction without saving to library
 *
 * This endpoint accepts PDF file uploads, extracts metadata using Zotero's
 * built-in PDFWorker, identifies DOI/ISBN/arXiv/PMID patterns, and returns
 * both raw PDF data and found identifiers. Temporary items are immediately
 * deleted after processing.
 */
export class PreviewPdfEndpoint extends BaseEndpoint {
  constructor(serviceManager: ServiceManager) {
    super(API_ENDPOINTS.PREVIEW_PDF, serviceManager, ['POST'])
    // Override supportedDataTypes to accept multipart/form-data
    this.supportedDataTypes = ['multipart/form-data']
  }

  /**
   * Initialize the endpoint
   */
  async initialize(): Promise<void> {
    logger.info('PreviewPdfEndpoint initialized')
  }

  /**
   * Cleanup the endpoint
   */
  async cleanup(): Promise<void> {
    logger.info('PreviewPdfEndpoint cleaned up')
  }

  /**
   * Handle PDF preview request
   * @param requestData - Multipart form data containing PDF file
   * @returns Response with extracted metadata and identifiers
   */
  async handleRequest(requestData: any): Promise<[number, string, string]> {
    let tempFilePath: string | null = null
    let attachmentItem: any = null

    try {
      // Extract the actual data from the request object
      // In Zotero 7, requestData is an object with { method, pathname, data, headers, etc. }
      // The multipart decoded data is in requestData.data
      const data = requestData.data || requestData

      // Log what we received for debugging
      logger.info(`PreviewPdf received data type: ${typeof data}`)
      logger.info(`PreviewPdf data is array: ${Array.isArray(data)}`)
      if (Array.isArray(data)) {
        logger.info(`PreviewPdf multipart array length: ${data.length}`)
      }

      // Validate that request data is multipart form data
      if (!Array.isArray(data)) {
        return this.errorResponse(
          'Invalid request format. Expected multipart/form-data with PDF file.',
          400,
        )
      }

      logger.info(`Received multipart request with ${data.length} fields`)

      // Find the PDF file in the multipart data
      const pdfField = this.extractPdfField(data)
      if (!pdfField.valid) {
        return this.errorResponse(pdfField.error!, 400)
      }

      const { filename, body, contentType } = pdfField

      // Validate file size
      const maxSize = DEFAULT_PREFERENCES.maxPdfUploadSize
      const fileSize = body!.length
      if (fileSize > maxSize) {
        return this.errorResponse(
          `PDF file too large. Maximum size: ${maxSize / 1024 / 1024}MB, received: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
          413,
        )
      }

      logger.info(`Processing PDF: ${filename}, size: ${(fileSize / 1024).toFixed(2)}KB`)

      // Check if library is editable (needed for temporary item creation)
      if (!this.checkLibraryEditable()) {
        return this.errorResponse('Target library is not editable', 500)
      }

      // Create temporary file
      tempFilePath = await this.createTempFile(body!, filename!)
      logger.info(`Created temporary file: ${tempFilePath}`)

      // Create temporary attachment item
      attachmentItem = await this.createTempAttachment(tempFilePath, filename!)
      logger.info(`Created temporary attachment item: ${attachmentItem.key}`)

      // Extract PDF metadata using Zotero's PDFWorker
      const pdfData = await this.extractPdfMetadata(attachmentItem.id)
      logger.info('PDF metadata extracted successfully')

      // Calculate extraction statistics
      const pageCount = pdfData.pages ? pdfData.pages.length : 0
      const maxPagesToAnalyze = DEFAULT_PREFERENCES.maxPdfPagesToAnalyze

      // Extract identifiers
      const identifiers = PdfMetadataExtractor.extractAllIdentifiers(pdfData, maxPagesToAnalyze)

      // Get text sample
      const textSample = PdfMetadataExtractor.getTextSample(pdfData, 500)
      const textExtraction = PdfMetadataExtractor.extractText(pdfData, maxPagesToAnalyze)

      // Build response
      const response = this.buildSuccessResponse({
        filename: filename!,
        fileSize,
        contentType: contentType!,
        pageCount,
        pagesAnalyzed: Math.min(pageCount, maxPagesToAnalyze),
        textLength: textExtraction.textLength,
        hasText: textExtraction.textLength > 0,
        textSample,
        identifiers,
        rawData: pdfData,
      })

      // Cleanup temporary items
      await this.cleanupTempResources(attachmentItem, tempFilePath)

      return response
    } catch (error) {
      logger.error(`Error in PreviewPdf endpoint: ${error}`)

      // Attempt cleanup even on error
      if (attachmentItem || tempFilePath) {
        try {
          await this.cleanupTempResources(attachmentItem, tempFilePath)
        } catch (cleanupError) {
          logger.error(`Cleanup error: ${cleanupError}`)
        }
      }

      // Handle specific error types
      if (error.message && error.message.includes('password')) {
        return this.errorResponse('PDF is password-protected. Please provide an unencrypted PDF.', 422)
      }

      if (error.message && error.message.includes('not a PDF')) {
        return this.errorResponse('Invalid PDF file. The uploaded file does not appear to be a valid PDF.', 422)
      }

      if (error.name === 'PasswordException') {
        return this.errorResponse('PDF requires a password. Password-protected PDFs are not supported.', 422)
      }

      return this.errorResponse(`Failed to process PDF: ${error.message}`, 500)
    }
  }

  /**
   * Extract PDF field from multipart form data
   * @param fields - Multipart form fields
   * @returns Validation result with PDF field data
   */
  private extractPdfField(fields: MultipartField[]): {
    valid: boolean
    error?: string
    filename?: string
    body?: string
    contentType?: string
  } {
    // Find the first field that looks like a PDF
    for (const field of fields) {
      const params = field.params || {}
      const filename = params.filename || ''
      const contentType = params.contentType || ''

      // Check if this is a PDF file
      if (
        contentType === 'application/pdf' ||
        filename.toLowerCase().endsWith('.pdf')
      ) {
        if (!field.body || field.body.length === 0) {
          return {
            valid: false,
            error: 'PDF file is empty',
          }
        }

        return {
          valid: true,
          filename: this.sanitizeFilename(filename),
          body: field.body,
          contentType: contentType || 'application/pdf',
        }
      }
    }

    return {
      valid: false,
      error: 'No PDF file found in request. Please upload a PDF file.',
    }
  }

  /**
   * Sanitize filename to prevent path traversal and invalid characters
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    // Remove path components
    let sanitized = filename.replace(/^.*[\\/]/, '')

    // Remove invalid characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Ensure it has .pdf extension
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += '.pdf'
    }

    // Default name if empty
    if (!sanitized || sanitized === '.pdf') {
      sanitized = 'upload.pdf'
    }

    return sanitized
  }

  /**
   * Create temporary file from uploaded data
   * @param data - File data
   * @param filename - Original filename
   * @returns Path to temporary file
   */
  private async createTempFile(data: string, filename: string): Promise<string> {
    try {
      // Get Zotero's temp directory
      const tempDir = Zotero.getTempDirectory().path

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const sanitized = this.sanitizeFilename(filename)
      const tempFilename = `preview-${timestamp}-${sanitized}`
      const tempPath = PathUtils.join(tempDir, tempFilename)

      // Write file atomically
      // Convert string to Uint8Array if needed
      let fileData: Uint8Array
      if (typeof data === 'string') {
        // If data is a string, convert to bytes (assuming Latin-1 encoding for binary data)
        const bytes = new Uint8Array(data.length)
        for (let i = 0; i < data.length; i++) {
          bytes[i] = data.charCodeAt(i) & 0xff
        }
        fileData = bytes
      } else {
        fileData = new Uint8Array(data)
      }

      // Use IOUtils.write for modern Zotero/Firefox
      await IOUtils.write(tempPath, fileData, { tmpPath: tempPath + '.tmp' })

      logger.info(`Temporary file created: ${tempPath} (${fileData.length} bytes)`)
      return tempPath
    } catch (error) {
      logger.error(`Failed to create temporary file: ${error}`)
      throw new Error(`Failed to create temporary file: ${error.message}`)
    }
  }

  /**
   * Create temporary attachment item
   * @param filePath - Path to PDF file
   * @param filename - Original filename
   * @returns Attachment item
   */
  private async createTempAttachment(filePath: string, filename: string): Promise<any> {
    try {
      // Import file as attachment
      const attachmentItem = await Zotero.Attachments.importFromFile({
        file: filePath,
        libraryID: Zotero.Libraries.userLibraryID,
        title: `Temp PDF Preview: ${filename}`,
        contentType: 'application/pdf',
      })

      if (!attachmentItem) {
        throw new Error('Failed to create attachment item')
      }

      logger.info(`Temporary attachment created: ${attachmentItem.key}`)
      return attachmentItem
    } catch (error) {
      logger.error(`Failed to create temporary attachment: ${error}`)
      throw new Error(`Failed to create attachment: ${error.message}`)
    }
  }

  /**
   * Extract PDF metadata using Zotero's PDFWorker
   * @param itemId - Attachment item ID
   * @returns PDF metadata
   */
  private async extractPdfMetadata(itemId: number): Promise<any> {
    try {
      logger.info(`Extracting PDF metadata for item ${itemId}`)

      // Use Zotero's PDFWorker to extract recognizer data
      // isPriority = true to process immediately
      const pdfData = await Zotero.PDFWorker.getRecognizerData(itemId, true)

      if (!pdfData) {
        throw new Error('No data extracted from PDF')
      }

      // Check if PDF has any text
      if (!pdfData.pages || pdfData.pages.length === 0) {
        throw new Error('PDF has no pages')
      }

      let hasText = false
      for (const page of pdfData.pages) {
        if (Array.isArray(page) && page.length > 2 && Array.isArray(page[2]) && page[2].length > 0) {
          hasText = true
          break
        }
      }

      if (!hasText) {
        logger.warn('PDF appears to be scanned without OCR text')
        // Don't throw error, just return the data with no text
      }

      return pdfData
    } catch (error) {
      logger.error(`Failed to extract PDF metadata: ${error}`)

      // Check for specific error types
      if (error.name === 'PasswordException' || error.message.includes('password')) {
        throw new Error('PDF is password-protected')
      }

      if (error.message.includes('not a PDF') || error.message.includes('invalid PDF')) {
        throw new Error('Not a valid PDF file')
      }

      throw new Error(`PDF extraction failed: ${error.message}`)
    }
  }

  /**
   * Build success response
   * @param data - Response data
   * @returns Formatted HTTP response
   */
  private buildSuccessResponse(data: {
    filename: string
    fileSize: number
    contentType: string
    pageCount: number
    pagesAnalyzed: number
    textLength: number
    hasText: boolean
    textSample: string
    identifiers: any[]
    rawData: any
  }): [number, string, string] {
    const response = {
      success: true,
      mode: 'preview',
      message: 'PDF processed successfully',
      timestamp: new Date().toISOString(),
      fileInfo: {
        filename: data.filename,
        size: data.fileSize,
        contentType: data.contentType,
      },
      extraction: {
        pageCount: data.pageCount,
        pagesAnalyzed: data.pagesAnalyzed,
        textLength: data.textLength,
        hasText: data.hasText,
        textSample: data.textSample,
      },
      identifiers: data.identifiers,
      rawData: {
        pages: data.rawData.pages,
        metadata: data.rawData.metadata || {},
      },
      _links: {
        documentation: 'https://github.com/evelasko/zotero-citation-linker',
        processIdentifier: API_ENDPOINTS.PROCESS_IDENTIFIER,
      },
      _note: 'This is a preview only. No items were created. Use identifiers with /processidentifier to save to library.',
    }

    logger.info(
      `Preview response created: ${data.identifiers.length} identifiers found in ${data.pagesAnalyzed} pages`,
    )

    return [200, 'application/json', JSON.stringify(response, null, 2)]
  }

  /**
   * Cleanup temporary resources
   * @param attachmentItem - Temporary attachment item
   * @param tempFilePath - Temporary file path
   */
  private async cleanupTempResources(attachmentItem: any, tempFilePath: string | null): Promise<void> {
    // Delete attachment item
    if (attachmentItem) {
      try {
        logger.info(`Deleting temporary attachment: ${attachmentItem.key}`)
        await attachmentItem.eraseTx()
        logger.info('Temporary attachment deleted successfully')
      } catch (error) {
        logger.error(`Failed to delete temporary attachment: ${error}`)
        // Don't throw, continue with file cleanup
      }
    }

    // Delete temporary file
    if (tempFilePath) {
      try {
        const exists = await IOUtils.exists(tempFilePath)
        if (exists) {
          logger.info(`Deleting temporary file: ${tempFilePath}`)
          await IOUtils.remove(tempFilePath)
          logger.info('Temporary file deleted successfully')
        }
      } catch (error) {
        logger.error(`Failed to delete temporary file: ${error}`)
        // Don't throw, just log
      }
    }
  }
}

