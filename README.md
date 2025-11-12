# Zotero Citation Linker

A powerful Zotero 7 plugin that seamlessly bridges reference management with modern writing workflows. Generate inline citations with API links instantly, leverage AI-powered metadata extraction, and integrate external applications through a comprehensive HTTP server with advanced duplicate detection and quality control.

## 🚀 Quick Start

### Basic Usage (No Setup Required)

1. **Install the plugin** from the [Releases page](https://github.com/evelasko/zotero-citation-linker/releases)
2. **Right-click** any item in Zotero → **Copy Markdown Link**
3. **Paste** in your notes: `[Smith & Jones, 2023](https://api.zotero.org/users/.../items/...)`

### AI-Powered Setup (Optional, Recommended)

For AI-powered citation extraction from any URL:

```javascript
// In Zotero Tools → Developer → Run JavaScript
Zotero.Prefs.set('perplexityApiKey', 'pplx-your-api-key-here')
```

Get your API key: [Perplexity AI](https://www.perplexity.ai/)

Then use the API:

```bash
curl -X POST http://localhost:23119/citationlinker/processurlwithai \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

## 🌟 Features

### ✅ **AI-Powered Citation Extraction** 🆕

- **Perplexity AI Integration**: Extract citation metadata from any URL using advanced AI
- **Intelligent Fallback**: Multiple extraction methods (AI → Web Translation → CrossRef → PDF Processing)
- **Automatic Identifier Discovery**: AI detects DOIs, PMIDs, ArXiv IDs, ISBNs from content
- **Smart Citation Creation**: Automatically creates properly formatted Zotero items
- **Configurable API Key**: Easy setup through Zotero preferences

### ✅ **Advanced PDF Processing** 🆕

- **Direct PDF URL Support**: Process PDFs directly from URLs
- **Text Extraction**: Leverages Zotero's PDFWorker for accurate text extraction
- **Metadata Extraction**: Automatically extracts DOIs, PMIDs, ArXiv IDs, ISBNs from PDFs
- **Configurable Limits**: Control PDF size limits and page extraction
- **Temporary Processing**: Safe handling with automatic cleanup

### ✅ **CrossRef Integration** 🆕

- **DOI Validation**: Verify DOIs against CrossRef database
- **Metadata Retrieval**: Fetch complete citation metadata from CrossRef
- **DOI Disambiguation**: Smart matching of multiple DOI candidates using title similarity
- **Intelligent Scoring**: Weighted scoring system for accurate DOI selection
- **Response Caching**: Efficient caching of CrossRef responses

### ✅ **Intelligent Duplicate Detection**

- **Multi-Identifier Matching**: Perfect detection using DOI, ISBN, PMID, PMC ID, and ArXiv ID
- **Smart Fuzzy Matching**: Advanced Title + Author + Year similarity with Levenshtein algorithm
- **URL Normalization**: Detects web content duplicates through intelligent URL cleanup
- **Data Integrity Protection**: "Oldest item wins" principle preserves external references
- **Automated Processing**: Score-based handling (≥85: auto-merge, 70-84: warnings, <70: keep)
- **External Reference Safety**: Protects Obsidian links, custom plugin citations, and workflows

### ✅ **Automatic Quality Control**

- **Smart Item Validation**: Automatically validates translated items for quality
- **Title Validation**: Rejects items with invalid titles ("Untitled", "No title", empty, etc.)
- **Author Requirements**: Ensures at least one valid author/creator exists
- **Automatic Cleanup**: Invalid items are automatically deleted to maintain library quality
- **Quality Reporting**: Detailed logging of validation decisions and cleanup actions

### ✅ **Comprehensive HTTP Server**

- **URL Analysis**: `POST /citationlinker/analyzeurl` - Multi-method URL analysis
- **AI Translation**: `POST /citationlinker/processurlwithai` - AI-powered citation extraction 🆕
- **Web Translation**: `POST /citationlinker/processurl` - Standard Zotero web translation
- **URL Preview**: `POST /citationlinker/previewurl` - Preview URL metadata without saving 🆕
- **Identifier Processing**: `POST /citationlinker/processidentifier` - Direct DOI/PMID/ArXiv translation
- **Identifier Preview**: `POST /citationlinker/previewidentifier` - Preview metadata without saving 🆕
- **Translator Detection**: `GET /citationlinker/detectidentifier` - Check available translators
- **Item Lookup**: `GET /citationlinker/itemkeybyurl` - Find existing items by URL
- **Enhanced Responses**: Rich JSON with citations, metadata, duplicate info, quality validation

### ✅ **Markdown Citation Generation**

- **Inline Citations**: Generate clean, academic-style inline citations like `(Author, Year)`
- **Automatic API Links**: Creates properly formatted Zotero API URLs for web access
- **Multiple Formats**: Support for markdown, HTML, and plain text output
- **Smart Fallbacks**: Robust citation generation even when CSL styles fail

### ✅ **Context Menu Integration**

- **Copy Markdown Link**: Right-click any item to copy `[citation](url)` format
- **Copy API URL**: Quick access to raw Zotero API URLs
- **Smart Item Detection**: Only appears for bibliographic items (not attachments/notes)
- **Batch Support**: Works with single items or multiple selections

### ✅ **Keyboard Shortcuts**

- **Ctrl+Shift+C** (or Cmd+Shift+C on Mac): Quick markdown citation copying
- **Configurable**: Customize shortcuts through Zotero preferences
- **Global Access**: Works from anywhere in Zotero's interface

### ✅ **Advanced Configuration**

- **15+ Preferences**: Customize server port, shortcuts, citation styles, and more
- **Validation**: Automatic preference validation and sanitization
- **Debug Mode**: Enhanced logging for troubleshooting
- **Performance Tuning**: Configurable timeouts and processing options

## 🚀 Installation

### For Users

1. **Download**: Get the latest XPI file from [Releases](https://github.com/username/zotero-citation-linker/releases)
2. **Install**: In Zotero, go to `Tools → Add-ons → Install Add-on From File...`
3. **Select**: Choose the downloaded `.xpi` file
4. **Restart**: Restart Zotero when prompted

### For Developers

```bash
# Clone the repository
git clone https://github.com/username/zotero-citation-linker.git
cd zotero-citation-linker

# Install dependencies
npm install

# Build the plugin
npm run build

# Install in Zotero
# Navigate to Tools → Add-ons → Install Add-on From File...
# Select build/manifest.json
```

## 📖 Usage

### Context Menu

1. **Select Items**: Choose one or more bibliographic items in your Zotero library
2. **Right-Click**: Open the context menu
3. **Copy Markdown Link**: Click to copy formatted citations with API links
4. **Paste**: Use in your Markdown documents, note-taking apps, or anywhere

**Example Output**:

```markdown
[Smith & Jones, 2023](https://api.zotero.org/users/12345/items/ABC123)
```

### Keyboard Shortcuts

1. **Select Items**: Choose items in Zotero
2. **Press Shortcut**: Use `Ctrl+Shift+C` (Windows/Linux) or `Cmd+Shift+C` (Mac)
3. **Paste**: Citation is automatically copied to clipboard

### HTTP Server

The plugin runs a comprehensive local HTTP server (default port 23119) for external integrations:

#### AI-Powered URL Processing 🆕 ⭐ Recommended

```bash
curl -X POST http://localhost:23119/citationlinker/processurlwithai \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**Response with AI Extraction**:

```json
{
  "status": "success",
  "method": "ai_translation",
  "translator": "Perplexity AI",
  "itemCount": 1,
  "items": [{
    "key": "NEWITEM123",
    "title": "High-Quality Article Title",
    "creators": [{"firstName": "John", "lastName": "Smith"}],
    "itemType": "journalArticle",
    "_meta": {
      "citation": "(Smith, 2023)",
      "apiUrl": "https://api.zotero.org/users/12345/items/NEWITEM123"
    }
  }],
  "duplicateInfo": {
    "processed": true,
    "existingItem": false,
    "duplicateCount": 0
  },
  "qualityControl": {
    "itemsValidated": 1,
    "itemsRejected": 0
  }
}
```

**Note**: Requires Perplexity API key. Set via: `Zotero.Prefs.set('perplexityApiKey', 'pplx-...')`

#### Comprehensive URL Analysis

```bash
curl -X POST http://localhost:23119/citationlinker/analyzeurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**Response** (analyzes URL through multiple methods):

```json
{
  "itemKey": "EXISTING123",  // If item already exists
  "identifiers": ["10.1000/example.doi", "PMC1234567"],
  "validIdentifiers": ["10.1000/example.doi"],
  "webTranslators": [
    {
      "translatorID": "abc-123",
      "label": "Example Site",
      "priority": 100
    }
  ],
  "status": "success",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "errors": []
}
```

#### Process Identifier Directly 🆕

```bash
curl -X POST http://localhost:23119/citationlinker/processidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "10.1000/example.doi"}'
```

**Response with Quality Control**:

```json
{
  "status": "success",
  "method": "identifier_translation",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "items": [{
    "key": "NEWITEM123",
    "title": "High-Quality Article Title",
    "creators": [{"firstName": "John", "lastName": "Smith"}],
    "_meta": {
      "citation": "(Smith, 2023)",
      "apiUrl": "https://api.zotero.org/users/12345/items/NEWITEM123"
    }
  }],
  "duplicateInfo": {
    "processed": true,
    "autoMerged": [],
    "possibleDuplicates": []
  },
  "qualityControl": {
    "itemsValidated": 1,
    "itemsRejected": 0,
    "validationCriteria": ["title_quality", "author_presence"]
  }
}
```

#### Preview Identifier Metadata 🆕 (No Save)

Preview what an identifier would translate to without saving it to your library:

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "10.1000/example.doi"}'
```

**Response with Full Metadata Preview**:

```json
{
  "success": true,
  "mode": "preview",
  "message": "Identifier translated successfully - items not saved to library",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "identifier": {
    "type": "DOI",
    "value": "10.1000/example.doi"
  },
  "items": [{
    "itemKey": "TEMP123",
    "itemType": "journalArticle",
    "libraryID": 1,
    "title": "Example Article Title",
    "abstractNote": "Full abstract text here...",
    "date": "2023-05-15",
    "url": "https://doi.org/10.1000/example.doi",
    "DOI": "10.1000/example.doi",
    "publicationTitle": "Nature",
    "volume": "615",
    "issue": "7952",
    "pages": "123-130",
    "creators": [
      {
        "creatorType": "author",
        "firstName": "John",
        "lastName": "Smith"
      }
    ],
    "tags": [
      {"tag": "biology", "type": 0}
    ],
    "generatedCitation": "(Smith, 2023)",
    "collections": [],
    "relations": {}
  }],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processidentifier"
  },
  "_note": "This is a preview only. Use /processidentifier to save items to your library."
}
```

**Use Cases**:

- Preview metadata before committing to library
- Validate identifiers without creating items
- Extract citation data for external processing
- Test identifier translation without side effects

#### Check Identifier Support 🆕

Supports both GET and POST methods:

```bash
# GET request with query parameter
curl "http://localhost:23119/citationlinker/detectidentifier?identifier=10.1000/example.doi"

# POST request with JSON body
curl -X POST http://localhost:23119/citationlinker/detectidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "10.1000/example.doi"}'
```

**Response**:

```json
{
  "status": "success",
  "hasTranslators": true,
  "identifier": "10.1000/example.doi",
  "extractedIdentifiers": ["10.1000/example.doi"],
  "results": [
    {
      "identifier": "10.1000/example.doi",
      "hasTranslators": true,
      "translatorCount": 1
    }
  ],
  "message": "Translators available for one or more identifiers",
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

#### Find Existing Items by URL 🆕

```bash
curl "http://localhost:23119/citationlinker/itemkeybyurl?url=https://example.com/article"
```

**Response**:

```json
{
  "status": "success",
  "items": ["EXISTING123", "EXISTING456"],
  "count": 2,
  "url": "https://example.com/article",
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

#### Translate URL to Citation (Enhanced)

```bash
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**Enhanced Response with Quality Control**:

```json
{
  "status": "success",
  "method": "translation",
  "translator": "Example Site Translator",
  "itemCount": 1,
  "items": [{
    "key": "EXISTING123",
    "title": "High-Quality Article Title",
    "creators": [{"firstName": "John", "lastName": "Smith"}],
    "_meta": {
      "citation": "(Smith, 2023)",
      "apiUrl": "https://api.zotero.org/users/12345/items/EXISTING123"
    }
  }],
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
    "possibleDuplicates": [],
    "errors": []
  },
  "qualityControl": {
    "itemsValidated": 2,
    "itemsRejected": 1,
    "rejectionReasons": ["Invalid title: 'Untitled'"],
    "validationCriteria": ["title_quality", "author_presence"]
  }
}
```

#### Preview URL Metadata 🆕 (No Save)

Preview what a URL would translate to without saving it to your library. Supports both regular web pages and PDFs:

```bash
curl -X POST http://localhost:23119/citationlinker/previewurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**Response with Full Metadata Preview**:

```json
{
  "success": true,
  "mode": "preview",
  "message": "URL translated successfully - items not saved to library",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "method": "web_translation",
  "translator": "Example Site Translator",
  "itemCount": 1,
  "url": {
    "original": "https://example.com/article",
    "normalized": "https://example.com/article",
    "isPdf": false
  },
  "items": [{
    "itemKey": "TEMP123",
    "itemType": "journalArticle",
    "libraryID": 1,
    "title": "Example Article Title",
    "abstractNote": "Full abstract text here...",
    "date": "2023-05-15",
    "url": "https://example.com/article",
    "DOI": "10.1000/example.doi",
    "publicationTitle": "Nature",
    "volume": "615",
    "issue": "7952",
    "pages": "123-130",
    "creators": [
      {
        "creatorType": "author",
        "firstName": "John",
        "lastName": "Smith"
      }
    ],
    "tags": [
      {"tag": "biology", "type": 0}
    ],
    "generatedCitation": "(Smith, 2023)",
    "apiUrl": "https://api.zotero.org/users/12345/items/TEMP123",
    "collections": [],
    "relations": {}
  }],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processurl"
  },
  "_note": "This is a preview only. Use /processurl to save items to your library."
}
```

**PDF URL Example**:

When previewing a PDF URL, the endpoint automatically extracts identifiers from the PDF:

```bash
curl -X POST http://localhost:23119/citationlinker/previewurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/paper.pdf"}'
```

**PDF Response** (includes extracted identifier information):

```json
{
  "success": true,
  "mode": "preview",
  "method": "pdf_doi_translation",
  "translator": "DOI Content Negotiation",
  "url": {
    "original": "https://example.com/paper.pdf",
    "normalized": "https://example.com/paper.pdf",
    "isPdf": true
  },
  "pdfProcessing": {
    "pdfDetected": true,
    "extractedIdentifier": "10.1000/example.doi",
    "metadata": {
      "title": "Extracted PDF Title",
      "author": "PDF Author",
      "pageCount": 12
    }
  },
  "items": [...]
}
```

**Use Cases**:
- Preview web page translations before saving
- Validate PDF metadata extraction
- Test translator availability for URLs
- Extract citation data without library modifications
- Check translation quality before committing
- Support external workflow integrations

### Quality Control System 🆕

The plugin now automatically validates all imported items:

#### Validation Criteria

1. **Title Quality**:
   - Rejects "Untitled", "No title", "Unknown", empty titles
   - Case-insensitive pattern matching
   - Whitespace normalization

2. **Author Requirements**:
   - At least one creator with a meaningful name
   - Validates lastName, firstName, or single name fields
   - Rejects empty or whitespace-only creator names

#### Automatic Cleanup

- **Invalid Item Deletion**: Automatically removes items that fail validation
- **Library Quality**: Maintains high-quality metadata standards
- **Detailed Logging**: Comprehensive logs of validation decisions
- **Error Handling**: Graceful fallbacks if deletion fails

### Duplicate Detection

The plugin automatically detects and handles duplicates when processing URLs:

#### Detection Methods

1. **Perfect Matching** (Auto-merge):
   - **DOI**: Digital Object Identifiers (Score: 100)
   - **PMID**: PubMed IDs for medical literature (Score: 98)
   - **PMC ID**: PubMed Central IDs (Score: 98)
   - **ArXiv ID**: Preprint identifiers (Score: 96)
   - **ISBN**: Book identifiers (Score: 95)

2. **Fuzzy Matching** (Warnings for 70-84, Auto-merge for ≥85):
   - **Title + Author + Year**: Weighted similarity scoring
   - **URL Normalization**: Same content from different tracking URLs
   - **Levenshtein Distance**: Advanced string similarity algorithms

#### Duplicate Handling Logic

- **Score ≥ 85**: Auto-delete new item, keep existing item, preserve external references
- **Score 70-84**: Keep new item, flag as possible duplicate for user review
- **Score < 70**: Keep new item, no duplicate detected

#### Benefits

- **Reference Integrity**: External citations (Obsidian, custom tools) remain valid
- **Library Cleanliness**: Automatic duplicate prevention without user intervention
- **Cross-Platform Detection**: Same content from different sources (PubMed, ArXiv, journal sites)
- **Workflow Continuity**: Existing automation scripts and integrations unaffected

## ⚙️ Configuration

Access preferences through Zotero's preferences or via JavaScript console:

### AI Services 🆕

- **Perplexity API Key**: Configure AI-powered extraction (`perplexityApiKey`)
  - Set via console: `Zotero.Prefs.set('perplexityApiKey', 'pplx-your-key')`
  - Get key at: [Perplexity AI](https://www.perplexity.ai/)
  - Used for: AI-powered citation extraction from any URL

### Server Settings

- **Port**: Default 23119, customizable (`apiPort`)
- **Enable/Disable**: Toggle server functionality (`enableApiServer`)
- **Timeout**: Request timeout in milliseconds
- **Quality Control**: Enable/disable automatic item validation (`enableTitleValidation`, `enableAuthorValidation`)

### PDF Processing 🆕

- **Max PDF Size**: Maximum PDF file size to process (`maxPdfSize`, default: 50MB)
- **Max Pages**: Number of pages to extract for analysis (`maxPdfPages`, default: 10)
- **Enable Processing**: Toggle PDF content extraction (`enablePdfProcessing`)

### Citation Generation

- **Citation Style**: Default style for citations (`citationStyle`)
- **Output Format**: Markdown, HTML, or plain text
- **Include API URLs**: Toggle API URL generation
- **Fallback Citations**: Enable enhanced fallback when CSL fails

### Duplicate Detection 🆕

- **Enable Detection**: Toggle automatic duplicate detection (`enableDuplicateDetection`)
- **Duplicate Threshold**: Score threshold for automatic merging (default: 0.8)
- **Auto-Merge**: Automatically merge high-confidence duplicates (≥85 score)
- **Warning Threshold**: Flag medium-confidence matches (70-84 score)

### Quality Control

- **Enable Validation**: Toggle automatic quality control (`enableTitleValidation`)
- **Title Validation**: Configure title quality requirements (`minTitleLength`, `forbiddenTitlePatterns`)
- **Author Requirements**: Set minimum creator standards (`minAuthorLength`, `forbiddenAuthorPatterns`)
- **Cleanup Policy**: Control automatic deletion behavior

### User Interface

- **Context Menu**: Enable/disable menu items (`enableContextMenu`)
- **Keyboard Shortcuts**: Customize key combinations (`enableKeyboardShortcuts`, `keyboardShortcutModifier`, `keyboardShortcutKey`)
- **Notifications**: Control success/error messages

### Development

- **Debug Mode**: Enhanced logging
- **Log Level**: Control verbosity (debug, info, warn, error)

## 🔧 API Reference

### Server Endpoints

#### `POST /citationlinker/processurlwithai` 🆕 ⭐ Recommended

AI-powered citation extraction from any URL using Perplexity AI.

**Request**:

```json
{
  "url": "https://example.com/article"
}
```

**Success Response** (200):

```json
{
  "status": "success",
  "method": "ai_translation",
  "translator": "Perplexity AI",
  "itemCount": 1,
  "items": [/* Zotero items with AI-extracted metadata */],
  "duplicateInfo": {/* Duplicate detection results */},
  "qualityControl": {/* Validation results */}
}
```

**Error Response** (422):

```json
{
  "status": "error",
  "message": "AI service not configured - please set your Perplexity API key"
}
```

**Requirements**:

- Perplexity API key must be configured
- Uses `sonar-pro` model for comprehensive extraction
- Automatically creates Zotero item with extracted metadata

#### `POST /citationlinker/analyzeurl`

Performs comprehensive analysis of a URL using multiple detection methods.

**Request**:

```json
{
  "url": "https://example.com/article"
}
```

**Success Response** (200):

```json
{
  "itemKey": "EXISTING123",  // If already exists
  "identifiers": ["10.1000/example", "PMC123"],
  "validIdentifiers": ["10.1000/example"],
  "webTranslators": [/* Available translators */],
  "status": "success",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "errors": []
}
```

#### `POST /citationlinker/processidentifier` 🆕

Translates identifiers (DOI, PMID, ArXiv ID, etc.) directly to Zotero items.

**Request**:

```json
{
  "identifier": "10.1000/example.doi"
}
```

**Success Response** (200):

```json
{
  "status": "success",
  "method": "identifier_translation",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "items": [/* Validated Zotero items */],
  "duplicateInfo": {/* Duplicate detection results */},
  "qualityControl": {/* Validation results */}
}
```

#### `POST /citationlinker/detectidentifier` 🆕

Checks which translators are available for a given identifier. Supports both POST (with JSON body) and GET (with query parameter).

**Request (POST)**:

```json
{
  "identifier": "10.1000/example.doi"
}
```

**Request (GET)**: `?identifier=10.1000/example.doi`

**Success Response** (200):

```json
{
  "status": "success",
  "hasTranslators": true,
  "identifier": "10.1000/example.doi",
  "extractedIdentifiers": ["10.1000/example.doi"],
  "results": [
    {
      "identifier": "10.1000/example.doi",
      "hasTranslators": true,
      "translatorCount": 1
    }
  ],
  "message": "Translators available for one or more identifiers"
}
```

**Note**: Uses Zotero's `extractIdentifiers` utility to parse the input, so it can handle DOIs in various formats (e.g., `doi:10.1000/xxx`, `https://doi.org/10.1000/xxx`, or just `10.1000/xxx`).

#### `GET /citationlinker/itemkeybyurl` 🆕

Finds existing Zotero items that match a given URL.

**Request**: `?url=https://example.com/article`

**Success Response** (200):

```json
{
  "status": "success",
  "items": ["ITEM123", "ITEM456"],
  "count": 2,
  "url": "https://example.com/article"
}
```

#### `POST /citationlinker/processurl` (Enhanced)

Attempts to translate a URL using Zotero's translation system with quality control.

**Request**:

```json
{
  "url": "https://example.com/article"
}
```

**Success Response** (200):

```json
{
  "status": "success",
  "method": "translation",
  "translator": "Translator Name",
  "itemCount": 1,
  "items": [/* Validated Zotero items with citation metadata */],
  "duplicateInfo": {/* Duplicate detection results */},
  "qualityControl": {
    "itemsValidated": 1,
    "itemsRejected": 0,
    "validationCriteria": ["title_quality", "author_presence"]
  }
}
```

**Error Response** (422):

```json
{
  "status": "error",
  "message": "No valid items found after translation"
}
```

#### `POST /citationlinker/savewebpage` (Enhanced)

Saves a URL as a basic webpage item with quality validation.

**Request**: Same as processurl

**Success Response** (200):

```json
{
  "status": "success",
  "method": "webpage",
  "translator": "Built-in webpage creator",
  "itemCount": 1,
  "items": [/* Validated webpage item */],
  "qualityControl": {/* Validation results */}
}
```

## 🏗️ Development

### Project Structure

```text
zotero-citation-linker/
├── manifest.json           # WebExtension manifest
├── bootstrap.ts            # Plugin lifecycle (entry point)
├── lib.ts                  # Legacy compatibility wrapper
├── src/                    # Modular source code 🆕
│   ├── index.ts           # Main export
│   ├── core/              # Core plugin architecture
│   │   ├── Plugin.ts      # Main plugin orchestrator
│   │   ├── ServiceManager.ts  # Service coordination
│   │   ├── Logger.ts      # Logging utilities
│   │   └── types.ts       # TypeScript type definitions
│   ├── services/          # Business logic services
│   │   ├── ApiServer.ts   # HTTP server
│   │   ├── CitationGenerator.ts  # Citation formatting
│   │   ├── CrossRefService.ts    # DOI validation & metadata
│   │   ├── DuplicateDetector.ts  # Duplicate detection
│   │   ├── ItemValidator.ts      # Quality control
│   │   ├── PdfProcessor.ts       # PDF text extraction
│   │   └── PerplexityService.ts  # AI integration
│   ├── translators/       # Translation services
│   │   ├── TranslatorManager.ts  # Translator coordination
│   │   ├── WebTranslator.ts      # Web page translation
│   │   ├── IdentifierTranslator.ts  # DOI/PMID/ArXiv
│   │   └── MetadataExtractor.ts  # Metadata extraction
│   ├── api/               # HTTP API endpoints
│   │   ├── BaseEndpoint.ts       # Base endpoint class
│   │   └── endpoints/            # Individual endpoints
│   │       ├── ProcessUrlWithAiEndpoint.ts  # AI processing
│   │       ├── ProcessUrlEndpoint.ts        # Standard translation
│   │       ├── AnalyzeUrlEndpoint.ts
│   │       ├── ProcessIdentifierEndpoint.ts
│   │       └── ...
│   ├── ui/                # User interface
│   │   ├── UIManager.ts           # UI coordination
│   │   ├── ContextMenu.ts         # Right-click menus
│   │   ├── KeyboardShortcuts.ts   # Keyboard handling
│   │   └── StatusNotification.ts  # User notifications
│   ├── utils/             # Utility functions
│   │   ├── StringUtils.ts         # String manipulation
│   │   ├── UrlUtils.ts            # URL processing
│   │   ├── IdentifierExtractor.ts # Identifier parsing
│   │   ├── ResponseBuilder.ts     # API responses
│   │   └── Prompts.ts             # AI prompts
│   └── config/
│       └── constants.ts   # Configuration constants
├── build/                  # Compiled output
│   ├── bootstrap.js
│   ├── lib.js
│   └── manifest.json
├── locale/                 # Localization files
│   └── en-US/
│       └── zotero-citation-linker.ftl
├── package.json           # Dependencies and build scripts
├── tsconfig.json          # TypeScript configuration
├── esbuild.js             # Build configuration
└── README.md
```

### Build Commands

```bash
# Development build with linting
npm run build

# Lint only
npm run lint

# Production build (same as build)
npm run build

# Generate XPI package
npm run postbuild  # Runs automatically after build
```

### Technology Stack

#### Core Technologies

- **TypeScript 5.8+**: Type-safe development with modern JavaScript features
- **esbuild 0.25+**: Fast compilation and bundling
- **zotero-plugin-toolkit 5.0+**: Enhanced Zotero plugin development framework
- **Zotero 7**: Modern Zotero API and WebExtension compatibility

#### Development Tools

- **ESLint 9.22**: Code quality and consistency
- **TypeScript ESLint**: TypeScript-specific linting rules
- **WebExtension API**: Zotero 7 compatibility
- **Fluent**: Internationalization support

#### External Services

- **Perplexity AI**: Advanced AI-powered citation extraction
  - Models: `sonar` (identifier extraction), `sonar-pro` (citation metadata)
  - API: [Perplexity AI](https://www.perplexity.ai/)
- **CrossRef API**: DOI validation and metadata retrieval
  - Free service, no API key required
  - Rate limit: Polite usage (1 req/sec recommended)
- **Zotero PDFWorker**: Built-in PDF text extraction

#### Architecture

- **Modular Design**: Clean separation of concerns across services
- **Service Manager**: Centralized service lifecycle management
- **Dependency Injection**: Services injected through ServiceManager
- **Event-Driven**: Zotero notifier integration for item events
- **Error Resilience**: Comprehensive error handling and recovery

## 🐛 Troubleshooting

### Common Issues

**AI extraction not working** 🆕:

- Verify Perplexity API key is set: `Zotero.Prefs.get('perplexityApiKey')`
- Check API key format (should start with `pplx-`)
- Ensure API key has sufficient credits
- Check debug logs for detailed error messages
- Test with standard translation endpoint first

**Plugin not appearing in context menu**:

- Ensure you're right-clicking on bibliographic items (not attachments or notes)
- Restart Zotero after installation
- Check that the plugin is enabled in Add-ons manager
- Verify `enableContextMenu` preference is true

**Server not responding**:

- Check that port 23119 is available (or configured port)
- Verify server is enabled: `Zotero.Prefs.get('enableApiServer')`
- Look for firewall restrictions
- Test with: `curl http://localhost:23119/citationlinker/analyzeurl`

**Citations not generating**:

- Enable debug mode for detailed logs
- Check item metadata completeness (title, authors, year)
- Verify citation style availability
- Check fallback citation generation in logs

**Items being rejected during import**:

- Check debug logs for validation failure reasons
- Verify source material has proper titles and authors
- Adjust quality control settings: `enableTitleValidation`, `enableAuthorValidation`
- Consider manual import for edge cases
- Review `forbiddenTitlePatterns` and `forbiddenAuthorPatterns`

**Duplicate detection issues** 🆕:

- Check `enableDuplicateDetection` preference
- Review duplicate threshold: `duplicateThreshold` (default: 0.8)
- Check logs for duplicate detection scores and reasoning
- Verify identifiers (DOI, PMID, etc.) are properly formatted
- Test URL normalization with debug logging

**PDF processing failures** 🆕:

- Check PDF file size (default limit: 50MB)
- Verify `enablePdfProcessing` preference
- Ensure PDF URL is accessible
- Check Zotero's PDFWorker is functioning
- Review extraction page limit: `maxPdfPages`

**CrossRef API errors** 🆕:

- Verify internet connectivity
- Check for rate limiting (max 1 req/sec recommended)
- Ensure DOI format is correct (10.xxxx/xxxxx)
- Review debug logs for detailed API responses

### Debug Mode

Enable debug logging for detailed troubleshooting:

```javascript
// Enable debug mode in Zotero console
Zotero.Prefs.set('extensions.zotero.ZoteroCitationLinker.debugMode', true)

// View plugin status
Zotero.ZoteroCitationLinker.showStatus()

// Check service status
Zotero.ZoteroCitationLinker.getServiceManager().getServicesStatus()

// View Perplexity service status
Zotero.ZoteroCitationLinker.getServiceManager().perplexityService.isInitialized()

// Set API key programmatically
Zotero.Prefs.set('perplexityApiKey', 'pplx-your-key-here')
```

**Log Locations**:

- Standard logs: Zotero debug output (Help → Debug Output Logging)
- Service logs: Prefixed with service name (e.g., `PerplexityService:`, `CrossRefService:`)
- API logs: Prefixed with `API:` for endpoint requests/responses
- Quality control: Logged at debug level with validation details

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Zotero Team**: For the excellent reference management platform and comprehensive API
- **zotero-plugin-toolkit**: For the enhanced plugin development framework
- **Perplexity AI**: For powerful AI-powered citation extraction capabilities
- **CrossRef**: For the free DOI validation and metadata API
- **Community**: For feedback, feature requests, and bug reports

### Built With

- Advanced natural language processing via [Perplexity AI](https://www.perplexity.ai/)
- DOI metadata from [CrossRef](https://www.crossref.org/)
- PDF processing via Zotero's PDFWorker
- Modern TypeScript development with [esbuild](https://esbuild.github.io/)

## 📊 Compatibility

- **Zotero Version**: 7.0 and higher (WebExtension architecture)
- **Operating Systems**: Windows, macOS, Linux
- **Node.js**: 16+ (for development)
- **External Services**:
  - Perplexity AI: Optional, requires API key (for AI features)
  - CrossRef API: Optional, no API key required (for DOI validation)
  - Internet connection required for web translation and external services

### Browser/Network Requirements

- **HTTP Server**: Binds to localhost only (127.0.0.1) for security
- **Default Port**: 23119 (configurable)
- **CORS**: Disabled for security (local access only)
- **TLS**: Not required (local server)

## 🔒 Security & Privacy

- **Local Processing**: All processing happens locally in Zotero
- **API Keys**: Stored in Zotero preferences, never transmitted except to authorized services
- **Network Access**: Only for fetching metadata from:
  - Perplexity AI (if configured)
  - CrossRef API (public, no auth required)
  - Source websites (for translation)
- **Server Security**: HTTP server binds to localhost only, no remote access
- **Data Storage**: No data sent to third parties except explicitly configured services

---

**Version**: 1.5.0 [[memory:3298192]] | **Status**: Production Ready | **Architecture**: Modular | **Last Updated**: December 2024

**Key Features**: AI-Powered Extraction • CrossRef Integration • PDF Processing • Duplicate Detection • Quality Control • HTTP Server • Citation Generation

**Repository**: [github.com/evelasko/zotero-citation-linker](https://github.com/evelasko/zotero-citation-linker)
