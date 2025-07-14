# Changelog

All notable changes to the Zotero Citation Linker plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-20

### 🎯 Major Feature: Intelligent Duplicate Detection System

This release introduces a comprehensive duplicate detection and prevention system that maintains both library integrity and external reference consistency.

### ✅ Added

#### Core Duplicate Detection

- **Multi-Identifier Matching**: Perfect detection using DOI, ISBN, PMID, PMC ID, and ArXiv ID
- **Smart Fuzzy Matching**: Advanced Title + Author + Year similarity scoring with Levenshtein algorithm
- **URL Normalization**: Intelligent duplicate detection for web content through URL cleanup
- **Candidate Deduplication**: Merges multiple matches of same item with combined reasoning
- **Score-Based Processing**: Automated handling based on confidence levels (≥85: auto-merge, 70-84: warnings)

#### Enhanced Identifier Support

- **PMID (PubMed ID)**: Score 98 - Medical literature duplicate detection
- **PMC ID (PubMed Central)**: Score 98 - Open access medical content matching  
- **ArXiv ID**: Score 96 - Preprint and academic paper detection (both new and legacy formats)
- **DOI Matching**: Score 100 - Perfect duplicate detection for academic content
- **ISBN Matching**: Score 95 - Book duplicate prevention
- **URL Normalization**: Score 88 - Web content with tracking parameter cleanup

#### Data Integrity Protection

- **"Oldest Item Wins" Principle**: Always preserves existing items to maintain external references
- **External Reference Safety**: Protects Obsidian links, custom plugin references, and citations
- **Transaction Safety**: Proper database transaction handling with timeout protection
- **Graceful Degradation**: Converts high-confidence duplicates to warnings when deletion fails

#### Advanced Pattern Recognition

- **Regex Pattern Extraction**: Multiple format support for identifiers in extra fields
- **Academic Site Enhancement**: Enhanced metadata extraction for IEEE, PubMed, ArXiv
- **URL Cleanup**: Removes UTM parameters, normalizes domains, handles redirects
- **Multi-Source Detection**: Same content from different databases or access points

### 🛠️ Fixed

#### Critical Issues

- **Deletion Timeout Fix**: Resolved database transaction deadlocks with sync system
- **API Method Correction**: Fixed non-existent `Zotero.Items.getByField()` calls
- **Data Flow Integrity**: Corrected item formatting order to ensure response contains existing item data
- **Transaction Conflicts**: Removed unnecessary transaction wrapping around `eraseTx()`

#### Performance Improvements

- **5-Second Timeout Protection**: Prevents hanging deletion operations
- **Efficient Search Strategy**: Limited candidate sets with intelligent prioritization
- **Early Exit Optimization**: Stops processing at first high-confidence match
- **Memory Management**: Proper cleanup and limited scope searches

### 🔧 Enhanced

#### Server Response Format

**Enhanced Duplicate Information**:

```json
{
  "duplicateInfo": {
    "processed": true,
    "autoMerged": [
      {
        "action": "kept_existing",
        "keptItemKey": "EXISTING123",
        "deletedItemKey": "NEW456", 
        "reason": "DOI match + Title similarity",
        "score": 98,
        "message": "Preserved existing item to maintain external references"
      }
    ],
    "possibleDuplicates": [
      {
        "itemKey": "NEW789",
        "duplicateKey": "EXISTING012",
        "score": 75,
        "reason": "ArXiv ID match + URL similarity",
        "confidence": "medium"
      }
    ],
    "errors": []
  }
}
```

#### User Experience

- **Transparent Operations**: Clear logging shows which items were kept/deleted
- **Fast Response Times**: Maximum 5-second timeout prevents hanging requests
- **Detailed Feedback**: API responses explain duplicate detection reasoning
- **Error Categorization**: Timeout, transaction, and general error types

### 📊 Technical Implementation

#### Phase 1: Core Infrastructure

- Main orchestrator (`_processDuplicates`)
- Efficient DOI/ISBN search with Zotero's search API
- Basic identifier extraction and normalization

#### Phase 2: Enhanced Matching & Processing  

- Score-based duplicate handling (auto-delete ≥85, warn 70-84)
- Advanced fuzzy matching with Title + Author + Year combinations
- Safe deletion with transaction protection and error handling

#### Phase 3: Extended Identifier Support

- PMID, PMC ID, ArXiv ID extraction from extra fields
- URL normalization with tracking parameter removal
- Intelligent candidate deduplication and scoring

#### Performance Optimizations

- **Limited Search Scope**: Max 10 author matches, 5 title candidates per search
- **Indexed Lookups**: Uses Zotero's efficient field indexing
- **Smart Domain Filtering**: Domain-based URL matching for efficiency

### 🚨 Breaking Changes

- **Response Format**: Added `duplicateInfo` object to all translation responses
- **Item Keys**: When duplicates are found, response contains existing item key (not new item key)
- **Action Semantics**: Changed from `"replaced"` to `"kept_existing"` for clarity

### 🔄 Migration Notes

**For External Applications**:

- Update API response parsing to handle new `duplicateInfo` structure
- Existing integrations will continue working (new fields are additive)
- Item keys in responses may now point to existing items instead of newly created ones

**For Plugin Users**:

- No user action required - duplicate detection is automatic
- Existing external references (Obsidian, etc.) are preserved
- Enhanced duplicate warnings appear in API responses

### 📋 Real-World Benefits

#### Academic Research Workflow

- **Medical Literature**: Automatic PMID/PMC duplicate prevention
- **Preprint Management**: ArXiv ID matching prevents duplicate papers across versions
- **Cross-Platform**: Same paper from PubMed, ArXiv, and journal websites detected

#### Reference Management

- **Citation Consistency**: Prevents broken links in note-taking applications
- **Library Organization**: Maintains clean library without manual duplicate removal
- **Workflow Continuity**: External citations remain valid when duplicates are processed

#### Integration Support

- **Obsidian Plugin Compatibility**: Links like `zotero://select/library/items/ABC123` remain stable
- **Custom Citation Tools**: Item key references don't break when duplicates are merged
- **Automation Scripts**: Reliable item identification across duplicate detection operations

---

## [0.1.0] - 2024-12-19

### Initial Production Release

This is the first production-ready release of Zotero Citation Linker, featuring comprehensive citation generation, context menu integration, keyboard shortcuts, and HTTP server capabilities.

### ✅ Added

#### Core Features

- **Inline Citation Generation**: Professional academic-style inline citations like `(Author, Year)`
- **Context Menu Integration**: Right-click any bibliographic item to copy Markdown links
- **Keyboard Shortcuts**: Configurable shortcuts (default: Ctrl+Shift+C / Cmd+Shift+C)
- **HTTP Server**: Local server for external application integration (default port: 23119)

#### Citation Features

- **Multiple Output Formats**: Markdown, HTML, and plain text citation formats
- **Smart Fallback System**: Robust citation generation even when CSL processing fails
- **API URL Generation**: Automatic Zotero API URLs using `Zotero.URI.getItemURI()`
- **Batch Processing**: Support for single items and multiple selections
- **Enhanced Author Handling**: Proper formatting for single, dual, and multiple authors

#### Context Menu

- **Copy Markdown Link**: Generates `[citation](url)` format for Markdown documents
- **Copy API URL**: Quick access to raw Zotero API URLs
- **Smart Item Detection**: Only appears for bibliographic items (excludes attachments/notes)
- **Visual Feedback**: Success/error notifications with detailed messages

#### HTTP Server Integration

- **URL Translation Endpoint**: `POST /citationlinker/processurl` - Translate web URLs to Zotero items
- **Webpage Saving Endpoint**: `POST /citationlinker/savewebpage` - Save URLs as basic webpage items
- **Rich JSON Responses**: Include citations, metadata, and API links
- **Error Handling**: Comprehensive error responses with HTTP status codes
- **Citation Enhancement**: Automatic citation generation for server responses

#### Advanced Configuration

- **15+ Configurable Preferences**: Server port, shortcuts, citation styles, UI settings
- **Validation System**: Automatic preference validation and sanitization
- **Debug Mode**: Enhanced logging for troubleshooting
- **Performance Tuning**: Configurable timeouts and processing options

#### Developer Experience

- **TypeScript Implementation**: Type-safe development with modern JavaScript features
- **zotero-plugin-toolkit Integration**: Enhanced plugin development framework
- **ESLint Configuration**: Code quality and consistency enforcement
- **esbuild Compilation**: Fast compilation and bundling
- **XPI Generation**: Automated plugin packaging

### 🔧 Technical Implementation

#### Architecture

- **Modern WebExtension**: Zotero 7 compatible manifest and APIs
- **Bootstrap System**: Proper plugin lifecycle management
- **Modular Design**: Separation of concerns with focused modules
- **Error Resilience**: Comprehensive error handling and recovery

#### Citation Processing

- **Enhanced Fallback Citations**: Academic-style inline format generation
- **API Integration**: Uses Zotero's native URI generation methods
- **Style Support**: Respects user's QuickCopy preferences where applicable
- **Metadata Extraction**: Enhanced extraction from academic websites (IEEE, etc.)

#### Server Implementation

- **Translation System**: Deep integration with Zotero's translation infrastructure
- **Document Processing**: Multi-layer DOM parsing with fallback systems
- **Session Management**: Proper handling of translation sessions
- **Response Enrichment**: Automatic citation generation for translated items

#### Quality Assurance

- **Linter Integration**: Pre-build code quality checks
- **Type Safety**: Comprehensive TypeScript type definitions
- **Version Tracking**: Systematic version numbering through development
- **Build Validation**: Automated build verification and XPI generation

### 🏗️ Development History

This release represents the culmination of systematic development through multiple phases:

- **Phases 1-2**: Foundation and context menu integration
- **Phase 3**: Keyboard shortcuts and preference system  
- **Phase 4**: Enhanced citation generation and server integration
- **Versions 7-21**: Iterative improvements and bug fixes

### 🔄 Migration Notes

This is the initial release, so no migration is required.

### 🐛 Known Issues

- Complex CSL citation processing is disabled in favor of reliable fallback citations
- Server endpoints require local access (localhost only for security)

### 📋 Next Release Plans

Future releases may include:

- Advanced CSL citation style support
- Preferences UI panel
- Batch URL processing
- Additional export formats
- Integration with popular note-taking applications

---

**Full Changelog**: Initial release
