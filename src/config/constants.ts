/**
 * Constants for Zotero Citation Linker
 */

// Plugin Information
export const PLUGIN_NAME = 'ZoteroCitationLinker'
export const PLUGIN_ID = 'zotero-citation-linker@evelasko.com'
export const PLUGIN_VERSION = '1.4.0'

// API Configuration
export const DEFAULT_API_PORT = 23119
export const API_BASE_PATH = '/citationlinker'
export const API_TIMEOUT = 30000 // 30 seconds

// Default Preferences
export const DEFAULT_PREFERENCES = {
  apiPort: DEFAULT_API_PORT,
  citationStyle: 'markdown',
  duplicateThreshold: 0.8,
  enableKeyboardShortcuts: true,
  keyboardShortcutModifier: 'shift',
  keyboardShortcutKey: 'C',
  enableContextMenu: true,
  enableApiServer: true,
  enableDuplicateDetection: true,
  enableTitleValidation: true,
  enableAuthorValidation: true,
  minTitleLength: 3,
  minAuthorLength: 2,
  forbiddenTitlePatterns: ['untitled', 'no title', 'placeholder', 'document'],
  forbiddenAuthorPatterns: ['unknown', 'anonymous', '[s.n.]', 'n/a'],
  perplexityApiKey: '',
  // PDF Processing Configuration
  maxPdfSize: 50 * 1024 * 1024, // 50MB default limit
  maxPdfPages: 10, // Max pages to extract for initial analysis
  enablePdfProcessing: true, // Enable/disable PDF content extraction
}

// API Endpoints
export const API_ENDPOINTS = {
  ANALYZE_URL: `${API_BASE_PATH}/analyzeurl`,
  PROCESS_URL: `${API_BASE_PATH}/processurl`,
  PROCESS_URL_WITH_AI: `${API_BASE_PATH}/processurlwithai`,
  PROCESS_IDENTIFIER: `${API_BASE_PATH}/processidentifier`,
  DETECT_IDENTIFIER: `${API_BASE_PATH}/detectidentifier`,
  SAVE_WEBPAGE: `${API_BASE_PATH}/savewebpage`,
  ITEM_KEY_BY_URL: `${API_BASE_PATH}/itemkeybyurl`,
  CREATE_ITEM: `${API_BASE_PATH}/createitem`,
}

// Identifier Patterns - Context-aware patterns to avoid false positives
export const IDENTIFIER_PATTERNS = {
  // DOI patterns - require proper context (doi.org URL, doi: prefix, or meta tags)
  DOI: {
    patterns: [
      /doi\.org\/(10\.\d{4,}\/[^\s"<>]+)/gi,
      /doi:\s*(10\.\d{4,}\/[^\s"<>]+)/gi,
      /<meta\s+name=["']citation_doi["']\s+content=["']([^"']+)["']/gi,
      /<meta\s+name=["']dc\.identifier["']\s+content=["'](10\.\d{4,}\/[^"']+)["']/gi,
      /<meta\s+name=["']bepress_citation_doi["']\s+content=["']([^"']+)["']/gi,
    ],
  },
  // ISBN patterns - require ISBN prefix or meta tag context
  ISBN: {
    patterns: [
      /isbn[:\s-]*([0-9-]{10,17})/gi,
      /<meta\s+name=["']citation_isbn["']\s+content=["']([^"']+)["']/gi,
      /<meta\s+name=["']dc\.identifier\.isbn["']\s+content=["']([^"']+)["']/gi,
    ],
  },
  // ISSN patterns - require ISSN prefix or meta tag context
  ISSN: {
    patterns: [
      /issn[:\s-]*([0-9]{4}-[0-9]{3}[0-9X])/gi,
      /<meta\s+name=["']citation_issn["']\s+content=["']([^"']+)["']/gi,
      /<meta\s+name=["']dc\.identifier\.issn["']\s+content=["']([^"']+)["']/gi,
    ],
  },
  // PMID patterns - require PMID/PubMed prefix or meta tag context
  PMID: {
    patterns: [
      /pmid[:\s-]*(\d+)/gi,
      /pubmed[:\s-]*(\d+)/gi,
      /<meta\s+name=["']citation_pmid["']\s+content=["']([^"']+)["']/gi,
      /<meta\s+name=["']dc\.identifier\.pmid["']\s+content=["']([^"']+)["']/gi,
    ],
  },
  // ArXiv patterns - require arxiv.org URL or arxiv: prefix
  ARXIV: {
    patterns: [
      /arxiv\.org\/abs\/(\d+\.\d+)/gi,
      /arxiv[:\s-]*(\d+\.\d+)/gi,
      /<meta\s+name=["']citation_arxiv_id["']\s+content=["']([^"']+)["']/gi,
    ],
  },
  // OCLC patterns - require OCLC prefix or worldcat URL
  OCLC: {
    patterns: [
      /oclc[:\s-]*(\d+)/gi,
      /worldcat\.org\/oclc\/(\d+)/gi,
      /<meta\s+name=["']citation_oclc["']\s+content=["']([^"']+)["']/gi,
    ],
  },
  // LCCN patterns - require LCCN prefix or meta tag
  LCCN: {
    patterns: [
      /lccn[:\s-]*([a-z]{2,3}\d{6})/gi,
      /<meta\s+name=["']citation_lccn["']\s+content=["']([^"']+)["']/gi,
    ],
  },
}

// DOM Selectors for Identifier Extraction
export const IDENTIFIER_SELECTORS = {
  DOI: [
    '.doi',
    '[data-doi]',
    'a[href*="doi.org"]',
    'meta[name="citation_doi"]',
    'meta[name="dc.identifier"]',
    'meta[name="bepress_citation_doi"]',
  ],
  ISBN: [
    '[data-isbn]',
    'meta[name="citation_isbn"]',
    'meta[name="dc.identifier.isbn"]',
  ],
  ISSN: [
    '[data-issn]',
    'meta[name="citation_issn"]',
    'meta[name="dc.identifier.issn"]',
  ],
  PMID: [
    '[data-pmid]',
    'meta[name="citation_pmid"]',
    'meta[name="dc.identifier.pmid"]',
  ],
  ARXIV: [
    '[data-arxiv]',
    'meta[name="citation_arxiv_id"]',
  ],
  OCLC: [
    '[data-oclc]',
    'meta[name="citation_oclc"]',
  ],
  LCCN: [
    '[data-lccn]',
    'meta[name="citation_lccn"]',
  ],
}

// Duplicate Detection Configuration
export const DUPLICATE_DETECTION = {
  TITLE_WEIGHT: 0.4,
  AUTHOR_WEIGHT: 0.3,
  YEAR_WEIGHT: 0.2,
  IDENTIFIER_WEIGHT: 0.1,
  MIN_TITLE_SIMILARITY: 0.7,
  MIN_AUTHOR_SIMILARITY: 0.6,
}

// Validation Configuration
export const VALIDATION = {
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 500,
  MIN_AUTHOR_LENGTH: 2,
  MAX_AUTHOR_LENGTH: 100,
  FORBIDDEN_TITLE_PATTERNS: [
    /^untitled$/i,
    /^no\s*title$/i,
    /^placeholder$/i,
    /^document$/i,
    /^\s*$/,
  ],
  FORBIDDEN_AUTHOR_PATTERNS: [
    /^unknown$/i,
    /^anonymous$/i,
    /^\[s\.n\.\]$/i,
    /^n\/a$/i,
    /^\s*$/,
  ],
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
}

// Citation Formats
export const CITATION_FORMATS = {
  MARKDOWN: 'markdown',
  LATEX: 'latex',
  ORG: 'org',
  WIKI: 'wiki',
  HTML: 'html',
  PLAIN: 'plain',
}

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
}

// PDF Processing Configuration
export const PDF_PROCESSING = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_EXTRACTION_PAGES: 10, // Pages to extract for initial analysis
  EXTRACTION_TIMEOUT: 30000, // 30 seconds
  TEMP_FILE_PREFIX: 'citationlinker_',
  // Patterns for extracting identifiers from PDF text
  IDENTIFIER_PATTERNS: {
    DOI: /10\.\d{4,}(?:\.\d+)*\/[-._;()/:a-zA-Z0-9]+/gi,
    ARXIV: /arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)/gi,
    PMID: /PMID\s*:?\s*(\d{7,8})/gi,
    ISBN: /ISBN[\s-]*(?:13|10)?[\s-]*:?\s*([\d-]{10,17})/gi,
  },
}