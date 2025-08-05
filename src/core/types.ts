/// <reference types="zotero-types/entries/mainWindow" />

/**
 * Core type definitions for Zotero Citation Linker
 */

// API Request/Response Types
export interface ApiRequest {
  url?: string
  identifier?: string
  title?: string
  authors?: string[]
  [key: string]: any
}

export interface ApiResponse {
  success: boolean
  items?: any[]
  method?: string
  translator?: string
  errors?: string[]
  duplicateProcessing?: DuplicateProcessingResult
  [key: string]: any
}

export interface ValidationResult {
  valid: boolean
  message?: string
  statusCode?: number
}

// Item Processing Types
export interface TranslationResult {
  success: boolean
  items: any[]
  translator?: string
  reason?: string
  duplicateProcessing?: DuplicateProcessingResult
}

export interface DuplicateProcessingResult {
  hasDuplicates: boolean
  duplicateCount: number
  candidates?: DuplicateCandidate[]
  flaggedItems?: string[]
}

export interface DuplicateCandidate {
  key: string
  title: string
  creators: string
  year?: string
  itemType: string
  similarity: number
  matchType: string
}

// Identifier Types
export interface ExtractedIdentifiers {
  doi?: string[]
  isbn?: string[]
  issn?: string[]
  pmid?: string[]
  pmcid?: string[]
  arxiv?: string[]
  oclc?: string[]
  lccn?: string[]
}

// Metadata Types
export interface ExtractedMetadata {
  title?: string
  authors?: string[]
  publicationDate?: string
  journalTitle?: string
  volume?: string
  issue?: string
  pages?: string
  abstractNote?: string
  doi?: string
  isbn?: string
  issn?: string
  url?: string
  accessDate?: string
}

// Service Configuration Types
export interface PluginConfig {
  apiPort: number
  citationStyle: string
  duplicateThreshold: number
  enableKeyboardShortcuts: boolean
  keyboardShortcutModifier: string
  keyboardShortcutKey: string
  enableContextMenu: boolean
  enableApiServer: boolean
  enableDuplicateDetection: boolean
  enableTitleValidation: boolean
  enableAuthorValidation: boolean
  minTitleLength: number
  minAuthorLength: number
  forbiddenTitlePatterns: string[]
  forbiddenAuthorPatterns: string[]
}

// Service Interfaces
/* eslint-disable no-unused-vars */
export interface ILogger {
  info(message: string): void
  error(message: string): void
  debug(message: string): void
  warn(message: string): void
}

export interface IApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  handler(request: any): Promise<any>
}
/* eslint-enable no-unused-vars */

export interface IService {
  initialize(): Promise<void>
  cleanup(): Promise<void>
  isInitialized?(): boolean
}

// Event Types
export interface PluginEvent {
  type: string
  data?: any
}

// Citation Format Types
export type CitationFormat = 'markdown' | 'latex' | 'org' | 'wiki' | 'html' | 'plain'

// Error Types
export class PluginError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.name = 'PluginError'
    this.statusCode = statusCode
  }
}

export class ValidationError extends PluginError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

export class TranslationError extends PluginError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'TranslationError'
  }
}

// CrossRef API Types
export interface CrossRefWork {
  DOI: string
  title: string[]
  subtitle?: string[]
  'short-title'?: string[]
  author?: CrossRefAuthor[]
  'container-title'?: string[]
  ISSN?: string[]
  volume?: string
  issue?: string
  'published-print'?: CrossRefDate
  'published-online'?: CrossRefDate
  created?: CrossRefDate
  type: string
  publisher?: string
  URL?: string
  subject?: string[]
  abstract?: string
  license?: CrossRefLicense[]
  reference?: any[]
}

export interface CrossRefAuthor {
  family: string
  given?: string
  affiliation?: CrossRefAffiliation[]
  ORCID?: string
}

export interface CrossRefAffiliation {
  name: string
}

export interface CrossRefDate {
  'date-parts': number[][]
}

export interface CrossRefLicense {
  URL: string
  'content-version': string
  'delay-in-days': number
  start: CrossRefDate
}

export interface CrossRefApiResponse {
  status: string
  'message-type': string
  'message-version': string
  message: CrossRefWork | CrossRefWork[]
}

// DOI Disambiguation Types
export interface DisambiguationResult {
  doi: string
  finalScore: number
  titleSimilarity: number
  urlPriority: number
  contentPosition: number
  crossrefMetadata: CrossRefWork | null
  isValid: boolean
  confidence: 'high' | 'medium' | 'low'
}

export interface DOICandidate {
  doi: string
  extractionMethod: string
  position: DOIPosition
  context?: string
}

export type DOIPosition = 'url' | 'meta' | 'jsonld' | 'content' | 'references' | 'sidebar' | 'unknown'

export interface DOIDisambiguationConfig {
  maxCandidates: number
  titleSimilarityWeight: number
  urlPriorityWeight: number
  contentPositionWeight: number
  minimumConfidenceScore: number
}