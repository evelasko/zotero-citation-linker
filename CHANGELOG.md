# Changelog

All notable changes to the Zotero Citation Linker plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
