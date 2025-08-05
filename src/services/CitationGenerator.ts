import { IService, CitationFormat } from '../core/types'
import { serviceLogger as logger } from '../core/Logger'
import { CITATION_FORMATS } from '../config/constants'
import { StringUtils } from '../utils/StringUtils'

export interface CitationResult {
  success: boolean
  citations: string[]
  format: string
  style: string
  warning?: string
}

/**
 * Service for generating citations in various formats
 */
export class CitationGenerator implements IService {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing CitationGenerator service')
    this.initialized = true
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up CitationGenerator service')
    this.initialized = false
  }

  /**
   * Generate and copy markdown link to clipboard
   * @param items - Array of Zotero items
   * @param format - Output format (markdown, html, plain)
   * @param citationStyle - Citation style to use
   * @returns Success status
   */
  async generateAndCopyMarkdownLink(
    items: any[],
    format: CitationFormat = 'markdown',
    citationStyle?: string,
  ): Promise<boolean> {
    logger.info(`Generating ${format} citation for ${items.length} item(s)`)

    if (!items || items.length === 0) {
      logger.error('No items provided')
      return false
    }

    try {
      // Generate professional citations
      const citationResults = await this.generateProfessionalCitations(items, citationStyle)

      if (!citationResults.success) {
        throw new Error('Citation generation failed')
      }

      let finalOutput: string

      if (items.length === 1) {
        // Single item - create formatted link
        const item = items[0]
        const citation = citationResults.citations[0]
        const apiUrl = this.generateApiUrl(item)

        finalOutput = this.formatSingleCitation(citation, apiUrl, format)
      } else {
        // Multiple items - create formatted list
        const formattedItems = items.map((item, index) => {
          const citation = citationResults.citations[index]
          const apiUrl = this.generateApiUrl(item)

          return this.formatSingleCitation(citation, apiUrl, format, true)
        })

        finalOutput = this.formatMultipleCitations(formattedItems, format)
      }

      // Copy to clipboard
      await this.copyToClipboard(finalOutput)

      logger.info(`Generated ${format} citation: ${StringUtils.truncate(finalOutput, 200)}...`)

      // Enhanced user feedback
      const itemText = items.length === 1 ? 'citation' : `${items.length} citations`
      if (typeof (globalThis as any).ztoolkit !== 'undefined') {
        (globalThis as any).ztoolkit.log(`Success: ${format} ${itemText} copied to clipboard`)
      }

      return true
    } catch (error) {
      logger.error(`Error generating ${format} citation: ${error}`)
      if (typeof (globalThis as any).ztoolkit !== 'undefined') {
        (globalThis as any).ztoolkit.log(`Error: Failed to generate ${format} citation: ${error}`)
      }
      return false
    }
  }

  /**
   * Generate professional citations for items
   * @param items - Array of Zotero items
   * @param citationStyle - Citation style to use
   * @returns Citation results
   */
  async generateProfessionalCitations(items: any[], citationStyle?: string): Promise<CitationResult> {
    try {
      logger.info(`Generating professional citations for ${items.length} item(s) with style: ${citationStyle || 'default'}`)

      // Generate inline citations using enhanced fallback method
      const citations: string[] = []

      for (const item of items) {
        try {
          const citation = this.generateFallbackCitation(item)
          citations.push(citation)
          logger.debug(`Generated citation for item ${item.key}: ${StringUtils.truncate(citation, 100)}...`)
        } catch (error) {
          logger.error(`Error generating citation for item ${item.key}: ${error}`)
          // Use basic fallback citation for this item
          const fallbackCitation = this.generateBasicFallbackCitation(item)
          citations.push(fallbackCitation)
        }
      }

      return {
        success: true,
        citations: citations,
        format: 'inline-fallback',
        style: citationStyle || 'enhanced-fallback',
      }
    } catch (error) {
      logger.error(`Error in professional citation generation: ${error}`)

      // Return fallback citations for all items
      const fallbackCitations = items.map(item => this.generateBasicFallbackCitation(item))

      return {
        success: true,
        citations: fallbackCitations,
        format: 'inline-fallback',
        style: 'enhanced-fallback',
        warning: `Used fallback citation due to error: ${error}`,
      }
    }
  }

  /**
   * Generate fallback inline citation when CSL processing fails
   * Creates author-year style citations similar to APA or Chicago
   * @param item - Zotero item
   * @returns Formatted citation string
   */
  generateFallbackCitation(item: any): string {
    try {
      const title = item.getField('title') || 'Untitled'
      const creators = item.getCreators()
      const dateField = item.getField('date')
      const year = dateField ? new Date(dateField).getFullYear() : ''

      // Create inline author-year citation
      let citation = ''

      if (creators && creators.length > 0) {
        const firstCreator = creators[0]
        const author = firstCreator.lastName || firstCreator.name || 'Unknown Author'

        if (creators.length === 1) {
          citation = year ? `(${author}, ${year})` : `(${author})`
        } else if (creators.length === 2) {
          const secondCreator = creators[1]
          const secondAuthor = secondCreator.lastName || secondCreator.name || 'Unknown'
          citation = year ? `(${author} & ${secondAuthor}, ${year})` : `(${author} & ${secondAuthor})`
        } else {
          citation = year ? `(${author} et al., ${year})` : `(${author} et al.)`
        }
      } else {
        // No author, use title and year
        const shortTitle = StringUtils.truncate(title, 30)
        citation = year ? `("${shortTitle}," ${year})` : `("${shortTitle}")`
      }

      return citation
    } catch (error) {
      logger.error(`Error in fallback citation generation: ${error}`)
      return this.generateBasicFallbackCitation(item)
    }
  }

  /**
   * Generate basic fallback citation as last resort
   * @param item - Zotero item
   * @returns Basic citation string
   */
  private generateBasicFallbackCitation(item: any): string {
    try {
      const title = item.getField('title') || item.key || 'Unknown Item'
      return `("${StringUtils.truncate(title, 50)}")`
    } catch (error) {
      logger.error(`Error in basic fallback citation generation: ${error}`)
      return '("Unknown Item")'
    }
  }

  /**
   * Generate API URL for a Zotero item
   * @param item - Zotero item
   * @returns API URL string
   */
  generateApiUrl(item: any): string {
    try {
      const library = item.library
      const itemKey = item.key

      // Check if this is a group library
      if ((library as any).type === 'group') {
        const fallbackUrl = `https://api.zotero.org/groups/${(library as any).id}/items/${itemKey}`
        logger.debug(`Using group API URL: ${fallbackUrl}`)
        return fallbackUrl
      } else {
        // For user libraries, use current user ID
        const userID = Zotero.Users.getCurrentUserID()
        if (userID) {
          const fallbackUrl = `https://api.zotero.org/users/${userID}/items/${itemKey}`
          logger.debug(`Using user API URL: ${fallbackUrl}`)
          return fallbackUrl
        } else {
          // Ultimate fallback if no user ID available (offline mode)
          const localUrl = Zotero.URI.getItemURI(item) || `zotero://select/library/items/${itemKey}`
          logger.debug(`Using local fallback URL: ${localUrl}`)
          return localUrl
        }
      }
    } catch (error) {
      logger.error(`API URL generation failed: ${error}`)
      // Ultimate fallback
      try {
        const apiUrl = Zotero.URI.getItemURI(item)
        logger.debug(`Generated API URL using Zotero.URI.getItemURI(): ${apiUrl}`)
        return apiUrl
      } catch (finalError) {
        logger.error(`Final fallback failed: ${finalError}`)
        return `zotero://select/library/items/${item.key || 'unknown'}`
      }
    }
  }

  /**
   * Format a single citation based on the output format
   * @param citation - Citation text
   * @param apiUrl - API URL for the item
   * @param format - Output format
   * @param isListItem - Whether this is part of a list
   * @returns Formatted citation string
   */
  private formatSingleCitation(
    citation: string,
    apiUrl: string,
    format: CitationFormat,
    isListItem: boolean = false,
  ): string {
    const prefix = isListItem ? '- ' : ''

    switch (format) {
      case CITATION_FORMATS.MARKDOWN:
        return `${prefix}[${citation}](${apiUrl})`
      case CITATION_FORMATS.HTML:
        if (isListItem) {
          return `<li><a href="${apiUrl}">${citation}</a></li>`
        }
        return `<a href="${apiUrl}">${citation}</a>`
      case CITATION_FORMATS.LATEX:
        return `${prefix}\\href{${apiUrl}}{${citation}}`
      case CITATION_FORMATS.ORG:
        return `${prefix}[[${apiUrl}][${citation}]]`
      case CITATION_FORMATS.WIKI:
        return `${prefix}[${apiUrl} ${citation}]`
      case CITATION_FORMATS.PLAIN:
      default:
        return `${prefix}${citation} - ${apiUrl}`
    }
  }

  /**
   * Format multiple citations based on the output format
   * @param formattedItems - Array of formatted citation strings
   * @param format - Output format
   * @returns Final formatted string
   */
  private formatMultipleCitations(formattedItems: string[], format: CitationFormat): string {
    switch (format) {
      case CITATION_FORMATS.HTML:
        return `<ul>\n${formattedItems.join('\n')}\n</ul>`
      case CITATION_FORMATS.LATEX:
        return `\\begin{itemize}\n\\item ${formattedItems.join('\n\\item ')}\n\\end{itemize}`
      default:
        return formattedItems.join('\n')
    }
  }

  /**
   * Copy text to clipboard
   * @param text - Text to copy
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      const clipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
        .getService(Components.interfaces.nsIClipboardHelper)
      clipboardHelper.copyString(text)
    } catch (error) {
      logger.error(`Error copying to clipboard: ${error}`)
      throw new Error('Failed to copy to clipboard')
    }
  }

  /**
   * Generate citation for enriched API response
   * @param items - Array of items
   * @returns Enriched items with citation metadata
   */
  async generateEnrichedResponse(items: any[]): Promise<any[]> {
    try {
      return await Promise.all(items.map(async (item, index) => {
        try {
          // Generate citation using our enhanced citation system
          const citationResults = await this.generateProfessionalCitations([item])
          const citation = citationResults.success ? citationResults.citations[0] : null

          // Generate API URL
          const apiUrl = this.generateApiUrl(item)

          // Create enriched item with citation data
          return {
            ...item,
            _meta: {
              index: index,
              citation: citation,
              apiUrl: apiUrl,
              citationStyle: citationResults.style || 'default',
              citationFormat: citationResults.format || 'unknown',
            },
          }
        } catch (error) {
          logger.error(`Error enriching item ${index}: ${error}`)
          return {
            ...item,
            _meta: {
              index: index,
              citation: null,
              apiUrl: item.key ? `zotero://select/library/items/${item.key}` : null,
              error: `Citation generation failed: ${error}`,
            },
          }
        }
      }))
    } catch (error) {
      logger.error(`Error in enriched response generation: ${error}`)
      // Return items with basic metadata
      return items.map((item, index) => ({
        ...item,
        _meta: {
          index: index,
          citation: null,
          apiUrl: item.key ? `zotero://select/library/items/${item.key}` : null,
          error: `Enrichment failed: ${error}`,
        },
      }))
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}