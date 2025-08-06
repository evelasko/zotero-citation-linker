import { IService } from '../core/types'
import { serviceLogger as logger } from '../core/Logger'
import { UrlUtils } from '../utils/UrlUtils'
import { PDF_PROCESSING, DEFAULT_PREFERENCES, PLUGIN_NAME } from '../config/constants'

declare const Zotero: any
declare const OS: any
declare const PathUtils: any

/**
 * Service for processing PDF files from URLs
 * Handles downloading, text extraction, and metadata parsing
 */
export class PdfProcessor implements IService {
  private initialized = false
  private tempDirectory: string | null = null
  private maxPdfSize = PDF_PROCESSING.MAX_FILE_SIZE
  private maxExtractionPages = PDF_PROCESSING.MAX_EXTRACTION_PAGES

  /**
   * Initialize the PDF processor service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing PdfProcessor service')

    // Get temp directory for PDF downloads
    this.tempDirectory = Zotero.getTempDirectory().path

    // Load configuration from preferences
    this.maxPdfSize = Zotero.Prefs.get(`${PLUGIN_NAME}.maxPdfSize`) || DEFAULT_PREFERENCES.maxPdfSize || this.maxPdfSize
    this.maxExtractionPages = Zotero.Prefs.get(`${PLUGIN_NAME}.maxPdfPages`) || DEFAULT_PREFERENCES.maxPdfPages || this.maxExtractionPages

    this.initialized = true
    logger.info('PdfProcessor service initialized')
  }

  /**
   * Cleanup the PDF processor service
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up PdfProcessor service')
    this.initialized = false
  }

  /**
   * Process a PDF from URL
   * Downloads the PDF, extracts text, and looks for metadata/identifiers
   * @param url - URL of the PDF to process
   * @returns Processing result with extracted data
   */
  async processPdfFromUrl(url: string): Promise<PdfProcessingResult> {
    try {
      logger.info(`Processing PDF from URL: ${url}`)

      // Validate URL is a PDF
      if (!UrlUtils.isPdfUrl(url)) {
        logger.warn(`URL does not appear to be a PDF: ${url}`)
      }

      // Download PDF to temp location
      const tempFilePath = await this.downloadPdf(url)

      // Create temporary attachment item for text extraction
      const tempItem = await this.createTemporaryAttachment(tempFilePath, url)

      try {
        // Extract text using Zotero's PDFWorker
        const extractionResult = await this.extractTextFromPdf(tempItem.id)

        // Extract identifiers and metadata from text
        const metadata = await this.extractMetadataFromText(extractionResult.text)

        // Clean up temporary item
        await this.cleanupTemporaryItem(tempItem)

        // Clean up temp file
        await this.cleanupTempFile(tempFilePath)

        return {
          success: true,
          text: extractionResult.text,
          metadata,
          pages: {
            extracted: extractionResult.extractedPages,
            total: extractionResult.totalPages,
          },
          identifiers: metadata.identifiers,
          url,
        }
      } catch (error) {
        // Ensure cleanup happens even on error
        await this.cleanupTemporaryItem(tempItem)
        await this.cleanupTempFile(tempFilePath)
        throw error
      }
    } catch (error) {
      logger.error(`Failed to process PDF from URL ${url}: ${error}`)
      return {
        success: false,
        error: error.toString(),
        url,
      }
    }
  }

  /**
   * Download PDF from URL to temporary location
   * @param url - URL to download from
   * @returns Path to downloaded file
   */
  private async downloadPdf(url: string): Promise<string> {
    const filename = `${PDF_PROCESSING.TEMP_FILE_PREFIX}${Date.now()}.pdf`
    const tempPath = PathUtils.join(this.tempDirectory, filename)

    logger.info(`Downloading PDF to: ${tempPath}`)

    try {
      // Use Zotero.HTTP.download for HTTP(S) URLs
      await Zotero.HTTP.download(url, tempPath)

      // Verify file was downloaded and check size
      const fileInfo = await OS.File.stat(tempPath)
      if (fileInfo.size > this.maxPdfSize) {
        await OS.File.remove(tempPath)
        throw new Error(`PDF file too large: ${fileInfo.size} bytes (max: ${this.maxPdfSize})`)
      }

      logger.info(`PDF downloaded successfully: ${fileInfo.size} bytes`)
      return tempPath
    } catch (error) {
      logger.error(`Failed to download PDF: ${error}`)
      throw error
    }
  }

  /**
   * Create a temporary attachment item for PDF processing
   * @param filePath - Path to the PDF file
   * @param sourceUrl - Original URL of the PDF
   * @returns Temporary attachment item
   */
  private async createTemporaryAttachment(filePath: string, sourceUrl: string): Promise<any> {
    logger.info('Creating temporary attachment item')

    const attachment = new Zotero.Item('attachment')
    attachment.attachmentLinkMode = Zotero.Attachments.LINK_MODE_IMPORTED_FILE
    attachment.attachmentContentType = 'application/pdf'
    attachment.attachmentPath = filePath

    // Set minimal metadata
    attachment.setField('title', 'Temporary PDF for processing')
    attachment.setField('url', sourceUrl)
    attachment.setNote(`Temporary item created by CitationLinker for PDF processing at ${new Date().toISOString()}`)

    // Save without triggering notifiers to avoid side effects
    await attachment.save({
      skipNotifier: true,
      skipDateModifiedUpdate: true,
    })

    logger.info(`Created temporary attachment with ID: ${attachment.id}`)
    return attachment
  }

  /**
   * Extract text from PDF using Zotero's PDFWorker
   * @param itemId - ID of the attachment item
   * @returns Extracted text and page information
   */
  private async extractTextFromPdf(itemId: number): Promise<{
    text: string
    extractedPages: number
    totalPages: number
  }> {
    logger.info(`Extracting text from PDF attachment: ${itemId}`)

    try {
      // Use Zotero's PDFWorker to extract text
      const result = await Zotero.PDFWorker.getFullText(
        itemId,
        this.maxExtractionPages, // Limit pages for initial analysis
      )

      if (!result || !result.text) {
        throw new Error('No text extracted from PDF')
      }

      logger.info(`Extracted ${result.text.length} characters from ${result.extractedPages}/${result.totalPages} pages`)

      return {
        text: result.text,
        extractedPages: result.extractedPages || 0,
        totalPages: result.totalPages || 0,
      }
    } catch (error) {
      logger.error(`Failed to extract text from PDF: ${error}`)
      throw error
    }
  }

  /**
   * Extract metadata and identifiers from PDF text
   * @param text - Extracted text from PDF
   * @returns Metadata object with identifiers
   */
  private async extractMetadataFromText(text: string): Promise<PdfMetadata> {
    logger.info('Extracting metadata from PDF text')

    const metadata: PdfMetadata = {
      identifiers: {
        doi: null,
        pmid: null,
        arxiv: null,
        isbn: null,
      },
      title: null,
      authors: [],
      abstract: null,
    }

    // Extract DOI
    const doiMatch = text.match(PDF_PROCESSING.IDENTIFIER_PATTERNS.DOI)
    if (doiMatch) {
      metadata.identifiers.doi = doiMatch[0]
      logger.info(`Found DOI: ${metadata.identifiers.doi}`)
    }

    // Extract arXiv ID
    const arxivMatch = text.match(PDF_PROCESSING.IDENTIFIER_PATTERNS.ARXIV)
    if (arxivMatch) {
      metadata.identifiers.arxiv = arxivMatch[1]
      logger.info(`Found arXiv ID: ${metadata.identifiers.arxiv}`)
    }

    // Extract PMID
    const pmidMatch = text.match(PDF_PROCESSING.IDENTIFIER_PATTERNS.PMID)
    if (pmidMatch) {
      metadata.identifiers.pmid = pmidMatch[1]
      logger.info(`Found PMID: ${metadata.identifiers.pmid}`)
    }

    // Extract ISBN
    const isbnMatch = text.match(PDF_PROCESSING.IDENTIFIER_PATTERNS.ISBN)
    if (isbnMatch) {
      metadata.identifiers.isbn = isbnMatch[1].replace(/-/g, '')
      logger.info(`Found ISBN: ${metadata.identifiers.isbn}`)
    }

    // Try to extract title (usually in larger font at the beginning)
    const titleMatch = text.match(/^(.{10,200})$/m)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim()
    }

    // Extract abstract if present
    const abstractMatch = text.match(/abstract\s*:?\s*(.{50,1500})/i)
    if (abstractMatch) {
      metadata.abstract = abstractMatch[1].trim()
    }

    return metadata
  }

  /**
   * Clean up temporary attachment item
   * @param item - Temporary item to delete
   */
  private async cleanupTemporaryItem(item: any): Promise<void> {
    if (!item) return

    try {
      logger.info(`Cleaning up temporary item: ${item.id}`)
      await item.eraseTx({
        skipNotifier: true,
        skipDeleteLog: true,
      })
    } catch (error) {
      logger.error(`Failed to cleanup temporary item: ${error}`)
    }
  }

  /**
   * Clean up temporary PDF file
   * @param filePath - Path to temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    if (!filePath) return

    try {
      logger.info(`Cleaning up temporary file: ${filePath}`)
      await OS.File.remove(filePath, { ignoreAbsent: true })
    } catch (error) {
      logger.error(`Failed to cleanup temp file: ${error}`)
    }
  }

  /**
   * Check if a URL points to a PDF file
   * @param url - URL to check
   * @returns True if URL likely points to a PDF
   */
  isPdfUrl(url: string): boolean {
    return UrlUtils.isPdfUrl(url)
  }
}

/**
 * Result of PDF processing
 */
export interface PdfProcessingResult {
  success: boolean
  text?: string
  metadata?: PdfMetadata
  pages?: {
    extracted: number
    total: number
  }
  identifiers?: {
    doi: string | null
    pmid: string | null
    arxiv: string | null
    isbn: string | null
  }
  url: string
  error?: string
}

/**
 * Metadata extracted from PDF
 */
export interface PdfMetadata {
  identifiers: {
    doi: string | null
    pmid: string | null
    arxiv: string | null
    isbn: string | null
  }
  title: string | null
  authors: string[]
  abstract: string | null
}