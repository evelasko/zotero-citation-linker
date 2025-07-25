# Zotero Citation Linker

A powerful Zotero plugin that seamlessly bridges reference management with Markdown-based writing workflows. Generate inline citations with API links instantly, and integrate external applications through a comprehensive local HTTP server.

## 🌟 Features

### ✅ **Automatic Quality Control** 🆕

- **Smart Item Validation**: Automatically validates translated items for quality
- **Title Validation**: Rejects items with invalid titles ("Untitled", "No title", empty, etc.)
- **Author Requirements**: Ensures at least one valid author/creator exists
- **Automatic Cleanup**: Invalid items are automatically deleted to maintain library quality
- **Quality Reporting**: Detailed logging of validation decisions and cleanup actions

### ✅ **Intelligent Duplicate Detection**

- **Multi-Identifier Matching**: Perfect detection using DOI, ISBN, PMID, PMC ID, and ArXiv ID
- **Smart Fuzzy Matching**: Advanced Title + Author + Year similarity with Levenshtein algorithm
- **URL Normalization**: Detects web content duplicates through intelligent URL cleanup
- **Data Integrity Protection**: "Oldest item wins" principle preserves external references
- **Automated Processing**: Score-based handling (≥85: auto-merge, 70-84: warnings, <70: keep)
- **External Reference Safety**: Protects Obsidian links, custom plugin citations, and workflows

### ✅ **Enhanced Server Integration** 🆕

- **Comprehensive URL Analysis**: `POST /citationlinker/analyzeurl` - Full URL analysis with multiple detection methods
- **Identifier Processing**: `POST /citationlinker/processidentifier` - Direct DOI/PMID/ArXiv translation
- **Translator Detection**: `GET /citationlinker/detectidentifier` - Check available translators for identifiers
- **Item Lookup**: `GET /citationlinker/itemkeybyurl` - Find existing items by URL
- **Enhanced Responses**: Rich JSON with citations, metadata, duplicate info, and quality validation

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

#### Comprehensive URL Analysis 🆕

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

#### Check Identifier Support 🆕

```bash
curl "http://localhost:23119/citationlinker/detectidentifier?identifier=10.1000/example.doi"
```

**Response**:

```json
{
  "status": "success",
  "translators": [
    {
      "translatorID": "doi-negotiation",
      "label": "DOI Content Negotiation",
      "priority": 100
    }
  ],
  "count": 1,
  "identifier": "10.1000/example.doi",
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

Access preferences through Zotero's standard preferences system:

### Server Settings

- **Port**: Default 23119, customizable
- **Enable/Disable**: Toggle server functionality
- **Timeout**: Request timeout in milliseconds
- **Quality Control**: Enable/disable automatic item validation

### Citation Generation

- **Citation Style**: Default style for citations
- **Output Format**: Markdown, HTML, or plain text
- **Include API URLs**: Toggle API URL generation
- **Fallback Citations**: Enable enhanced fallback when CSL fails

### Quality Control 🆕

- **Enable Validation**: Toggle automatic quality control
- **Title Validation**: Configure title quality requirements
- **Author Requirements**: Set minimum creator standards
- **Cleanup Policy**: Control automatic deletion behavior

### User Interface

- **Context Menu**: Enable/disable menu items
- **Keyboard Shortcuts**: Customize key combinations
- **Notifications**: Control success/error messages

### Development

- **Debug Mode**: Enhanced logging
- **Log Level**: Control verbosity (debug, info, warn, error)

## 🔧 API Reference

### Server Endpoints

#### `POST /citationlinker/analyzeurl` 🆕

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

#### `GET /citationlinker/detectidentifier` 🆕

Checks which translators are available for a given identifier.

**Request**: `?identifier=10.1000/example.doi`

**Success Response** (200):

```json
{
  "status": "success",
  "translators": [/* Available translators */],
  "count": 1,
  "identifier": "10.1000/example.doi"
}
```

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
├── bootstrap.ts            # Plugin lifecycle management  
├── lib.ts                  # Main plugin implementation
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

- **TypeScript**: Type-safe development with modern JavaScript features
- **esbuild**: Fast compilation and bundling
- **zotero-plugin-toolkit**: Enhanced Zotero plugin development framework
- **ESLint**: Code quality and consistency
- **WebExtension API**: Zotero 7 compatibility
- **Fluent**: Internationalization support

## 🐛 Troubleshooting

### Common Issues

**Plugin not appearing in context menu**:

- Ensure you're right-clicking on bibliographic items (not attachments or notes)
- Restart Zotero after installation
- Check that the plugin is enabled in Add-ons manager

**Server not responding**:

- Check that port 23119 is available
- Verify server is enabled in preferences
- Look for firewall restrictions

**Citations not generating**:

- Enable debug mode for detailed logs
- Check item metadata completeness
- Verify citation style availability

**Items being rejected during import** 🆕:

- Check debug logs for validation failure reasons
- Verify source material has proper titles and authors
- Adjust quality control settings if needed
- Consider manual import for edge cases

### Debug Mode

Enable debug logging in preferences for detailed troubleshooting information. Logs appear in Zotero's debug output (Help → Debug Output Logging). Quality control decisions are logged at debug level.

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

- **Zotero Team**: For the excellent reference management platform
- **zotero-plugin-toolkit**: For the enhanced plugin development framework
- **Community**: For feedback and feature requests

## 📊 Compatibility

- **Zotero Version**: 7.0 and higher
- **Operating Systems**: Windows, macOS, Linux
- **Node.js**: 16+ (for development)

---

**Version**: 1.2.0 | **Status**: Production Ready | **Last Updated**: December 2024
