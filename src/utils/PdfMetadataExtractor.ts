import { apiLogger as logger } from '../core/Logger'

declare const Zotero: any

/**
 * Interface for extracted identifier
 */
export interface ExtractedIdentifier {
  type: 'DOI' | 'ISBN' | 'ARXIV' | 'PMID'
  value: string
  location: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Interface for PDF text extraction result
 */
export interface PdfTextExtraction {
  fullText: string
  pageTexts: { pageNumber: number; text: string }[]
  textLength: number
}

/**
 * Utility class for extracting metadata and identifiers from PDF content
 *
 * This class takes the raw output from Zotero's PDFWorker.getRecognizerData()
 * and extracts structured information including DOI, ISBN, arXiv, and PMID identifiers.
 */
export class PdfMetadataExtractor {
  // Regex patterns for identifier extraction
  // DOI pattern from Zotero's recognizeDocument.js:718
  private static readonly DOI_PATTERN = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g

  // arXiv pattern - matches formats like arXiv:1234.5678 or 1234.56789
  private static readonly ARXIV_PATTERN = /(?:arXiv:\s*)?(\d{4}\.\d{4,5}(?:v\d+)?)/gi

  // PMID pattern - matches formats like PMID: 12345678 or PMID:12345678
  private static readonly PMID_PATTERN = /PMID:\s*(\d{7,8})/gi

  // Alternative PMID pattern for URLs
  private static readonly PMID_URL_PATTERN = /pubmed\/(\d{7,8})/gi

  /**
   * Extract full text from PDFWorker output
   *
   * @param pdfData - Raw output from Zotero.PDFWorker.getRecognizerData()
   * @param maxPages - Maximum number of pages to extract (default: 10)
   * @returns Extracted text structure
   */
  static extractText(pdfData: any, maxPages: number = 10): PdfTextExtraction {
    const pageTexts: { pageNumber: number; text: string }[] = []
    let fullText = ''

    if (!pdfData || !pdfData.pages || !Array.isArray(pdfData.pages)) {
      logger.warn('Invalid PDF data structure')
      return { fullText: '', pageTexts: [], textLength: 0 }
    }

    // Process pages up to maxPages limit
    const pagesToProcess = Math.min(pdfData.pages.length, maxPages)

    for (let i = 0; i < pagesToProcess; i++) {
      const page = pdfData.pages[i]
      if (!page || !Array.isArray(page) || page.length < 3) {
        continue
      }

      // PDFWorker returns pages as: [pageNumber, dimensions, textBlocks]
      const pageNumber = page[0]
      const textBlocks = page[2]

      if (!Array.isArray(textBlocks)) {
        continue
      }

      // Extract text from all blocks on this page
      let pageText = ''
      for (const block of textBlocks) {
        if (Array.isArray(block) && block.length > 4) {
          // Text block format: [x, y, width, height, text, ...]
          const text = block[4]
          if (typeof text === 'string' && text.trim()) {
            pageText += text + ' '
          }
        }
      }

      if (pageText.trim()) {
        pageTexts.push({ pageNumber, text: pageText.trim() })
        fullText += pageText + '\n'
      }
    }

    return {
      fullText: fullText.trim(),
      pageTexts,
      textLength: fullText.length,
    }
  }

  /**
   * Extract DOI identifiers from text
   *
   * @param text - Text to search for DOIs
   * @param pageTexts - Page-by-page text for location tracking
   * @returns Array of extracted DOI identifiers
   */
  static extractDOIs(text: string, pageTexts: { pageNumber: number; text: string }[]): ExtractedIdentifier[] {
    const identifiers: ExtractedIdentifier[] = []
    const foundDOIs = new Set<string>()

    // Reset regex state
    PdfMetadataExtractor.DOI_PATTERN.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = PdfMetadataExtractor.DOI_PATTERN.exec(text)) !== null) {
      let doi = match[0]

      // Clean up trailing punctuation that might have been captured
      if (doi.endsWith(')') && !doi.includes('(')) {
        doi = doi.substring(0, doi.length - 1)
      }
      if (doi.endsWith('}') && !doi.includes('{')) {
        doi = doi.substring(0, doi.length - 1)
      }

      // Avoid duplicates
      if (foundDOIs.has(doi)) {
        continue
      }
      foundDOIs.add(doi)

      // Find which page this DOI appears on
      const location = this.findLocation(doi, pageTexts)

      // Determine confidence based on position and format
      let confidence: 'high' | 'medium' | 'low' = 'medium'
      if (location.includes('page 1') || location.includes('page 2')) {
        confidence = 'high'
      }

      identifiers.push({
        type: 'DOI',
        value: doi,
        location,
        confidence,
      })
    }

    return identifiers
  }

  /**
   * Extract ISBN identifiers from text using Zotero's cleanISBN utility
   *
   * @param text - Text to search for ISBNs
   * @param pageTexts - Page-by-page text for location tracking
   * @returns Array of extracted ISBN identifiers
   */
  static extractISBNs(text: string, pageTexts: { pageNumber: number; text: string }[]): ExtractedIdentifier[] {
    const identifiers: ExtractedIdentifier[] = []
    const foundISBNs = new Set<string>()

    // ISBN pattern to find potential ISBNs in text
    // Matches ISBN-10 and ISBN-13 formats
    const isbnPattern = /(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\s]){3})[-\s0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[-\s]){4})[-\s0-9]{17}$)(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9X]/gi

    let match: RegExpExecArray | null
    while ((match = isbnPattern.exec(text)) !== null) {
      const candidate = match[0]

      // Use Zotero's cleanISBN to validate and normalize
      const cleanedISBN = Zotero.Utilities.cleanISBN(candidate)

      if (cleanedISBN && !foundISBNs.has(cleanedISBN)) {
        foundISBNs.add(cleanedISBN)

        const location = this.findLocation(candidate, pageTexts)

        identifiers.push({
          type: 'ISBN',
          value: cleanedISBN,
          location,
          confidence: 'medium',
        })
      }
    }

    return identifiers
  }

  /**
   * Extract arXiv identifiers from text
   *
   * @param text - Text to search for arXiv IDs
   * @param pageTexts - Page-by-page text for location tracking
   * @returns Array of extracted arXiv identifiers
   */
  static extractArXiv(text: string, pageTexts: { pageNumber: number; text: string }[]): ExtractedIdentifier[] {
    const identifiers: ExtractedIdentifier[] = []
    const foundArXiv = new Set<string>()

    // Reset regex state
    PdfMetadataExtractor.ARXIV_PATTERN.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = PdfMetadataExtractor.ARXIV_PATTERN.exec(text)) !== null) {
      const arxivId = match[1]

      if (foundArXiv.has(arxivId)) {
        continue
      }
      foundArXiv.add(arxivId)

      const location = this.findLocation(arxivId, pageTexts)

      // Higher confidence if found on first few pages
      let confidence: 'high' | 'medium' | 'low' = 'medium'
      if (location.includes('page 1')) {
        confidence = 'high'
      }

      identifiers.push({
        type: 'ARXIV',
        value: arxivId,
        location,
        confidence,
      })
    }

    return identifiers
  }

  /**
   * Extract PMID identifiers from text
   *
   * @param text - Text to search for PMIDs
   * @param pageTexts - Page-by-page text for location tracking
   * @returns Array of extracted PMID identifiers
   */
  static extractPMIDs(text: string, pageTexts: { pageNumber: number; text: string }[]): ExtractedIdentifier[] {
    const identifiers: ExtractedIdentifier[] = []
    const foundPMIDs = new Set<string>()

    // Reset regex state
    PdfMetadataExtractor.PMID_PATTERN.lastIndex = 0
    PdfMetadataExtractor.PMID_URL_PATTERN.lastIndex = 0

    // Extract from "PMID: 12345678" format
    let match: RegExpExecArray | null
    while ((match = PdfMetadataExtractor.PMID_PATTERN.exec(text)) !== null) {
      const pmid = match[1]

      if (foundPMIDs.has(pmid)) {
        continue
      }
      foundPMIDs.add(pmid)

      const location = this.findLocation(pmid, pageTexts)

      identifiers.push({
        type: 'PMID',
        value: pmid,
        location,
        confidence: 'high',
      })
    }

    // Extract from PubMed URLs
    while ((match = PdfMetadataExtractor.PMID_URL_PATTERN.exec(text)) !== null) {
      const pmid = match[1]

      if (foundPMIDs.has(pmid)) {
        continue
      }
      foundPMIDs.add(pmid)

      const location = this.findLocation(pmid, pageTexts)

      identifiers.push({
        type: 'PMID',
        value: pmid,
        location,
        confidence: 'medium',
      })
    }

    return identifiers
  }

  /**
   * Find the page location of a text fragment
   *
   * @param fragment - Text fragment to locate
   * @param pageTexts - Page-by-page text
   * @returns Location description
   */
  private static findLocation(
    fragment: string,
    pageTexts: { pageNumber: number; text: string }[],
  ): string {
    for (const page of pageTexts) {
      if (page.text.includes(fragment)) {
        return `page ${page.pageNumber}`
      }
    }
    return 'unknown page'
  }

  /**
   * Extract all identifiers from PDF data
   *
   * @param pdfData - Raw output from Zotero.PDFWorker.getRecognizerData()
   * @param maxPages - Maximum number of pages to analyze
   * @returns Array of all extracted identifiers
   */
  static extractAllIdentifiers(pdfData: any, maxPages: number = 10): ExtractedIdentifier[] {
    logger.info(`Extracting identifiers from PDF (max ${maxPages} pages)`)

    // Extract text from PDF
    const textExtraction = this.extractText(pdfData, maxPages)

    if (!textExtraction.fullText) {
      logger.warn('No text extracted from PDF')
      return []
    }

    logger.info(`Extracted ${textExtraction.textLength} characters from ${textExtraction.pageTexts.length} pages`)

    // Extract all identifier types
    const identifiers: ExtractedIdentifier[] = []

    identifiers.push(...this.extractDOIs(textExtraction.fullText, textExtraction.pageTexts))
    identifiers.push(...this.extractISBNs(textExtraction.fullText, textExtraction.pageTexts))
    identifiers.push(...this.extractArXiv(textExtraction.fullText, textExtraction.pageTexts))
    identifiers.push(...this.extractPMIDs(textExtraction.fullText, textExtraction.pageTexts))

    logger.info(
      `Found ${identifiers.length} identifiers: ${identifiers.map((id) => `${id.type}=${id.value}`).join(', ')}`,
    )

    return identifiers
  }

  /**
   * Get a text sample from the PDF
   *
   * @param pdfData - Raw output from Zotero.PDFWorker.getRecognizerData()
   * @param maxLength - Maximum length of sample (default: 500)
   * @returns Text sample
   */
  static getTextSample(pdfData: any, maxLength: number = 500): string {
    const textExtraction = this.extractText(pdfData, 3) // First 3 pages for sample
    if (!textExtraction.fullText) {
      return ''
    }

    if (textExtraction.fullText.length <= maxLength) {
      return textExtraction.fullText
    }

    return textExtraction.fullText.substring(0, maxLength) + '...'
  }
}

