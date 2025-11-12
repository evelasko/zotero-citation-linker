# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run lint                 # Run ESLint to check code quality
npm run build               # Compile TypeScript, bundle with esbuild, and copy assets
npm run start               # Quit Zotero and restart with the plugin loaded
npm run clean              # Remove build artifacts
```

### Version Management
```bash
npm run version:patch       # Increment patch version (e.g., 1.0.0 → 1.0.1)
npm run version:minor       # Increment minor version (e.g., 1.0.0 → 1.1.0)
npm run version:major       # Increment major version (e.g., 1.0.0 → 2.0.0)
```

### Release Workflow
```bash
npm run release:patch       # Version bump + build + commit + push
npm run release:minor       # Version bump + build + commit + push
npm run release:major       # Version bump + build + commit + push
```

### Validation
```bash
npm run ci:validate         # Run lint + build for CI validation
```

## High-Level Architecture

### Plugin Structure
ZoteroCitationLinker is a Zotero 7 plugin that provides citation linking functionality through:
- **Context Menu Integration**: Right-click menu items for copying markdown citations
- **HTTP API Server**: Local server on port 23119 for external tool integration (Obsidian, etc.)
- **Quality Control System**: Automatic validation and cleanup of imported items
- **Duplicate Detection**: Multi-algorithm duplicate detection system

### Core Components

#### Main Plugin Class (lib.ts)
The main entry point (~300 lines) contains:
- Plugin lifecycle management (install/uninstall/startup)
- Integration with modular service architecture
- Global plugin registration on Zotero namespace

#### Modular Architecture (src/)
The codebase uses a clean modular structure:

```
src/
├── core/                # Core plugin architecture
│   ├── Plugin.ts       # Main plugin orchestrator
│   ├── ServiceManager.ts  # Service coordination and lifecycle
│   ├── Logger.ts       # Logging utility
│   └── types.ts        # TypeScript interfaces
├── services/           # Business logic services
│   ├── ApiServer.ts    # HTTP server (10 API endpoints)
│   ├── CitationGenerator.ts  # Citation formatting
│   ├── CrossRefService.ts    # DOI validation & metadata
│   ├── DuplicateDetector.ts  # Duplicate detection algorithms
│   ├── ItemValidator.ts      # Quality control
│   ├── PdfProcessor.ts       # PDF text extraction
│   └── PerplexityService.ts  # AI integration
├── translators/        # Translation services
│   ├── TranslatorManager.ts  # Translator coordination
│   ├── WebTranslator.ts      # Web page translation
│   ├── IdentifierTranslator.ts  # DOI/PMID/ArXiv
│   └── MetadataExtractor.ts  # Metadata extraction
├── api/               # HTTP API endpoints
│   ├── BaseEndpoint.ts       # Base endpoint class
│   └── endpoints/            # Individual endpoints
│       ├── AnalyzeUrlEndpoint.ts
│       ├── ProcessUrlEndpoint.ts
│       ├── ProcessIdentifierEndpoint.ts
│       ├── PreviewUrlEndpoint.ts
│       ├── PreviewIdentifierEndpoint.ts
│       ├── GetItemEndpoint.ts
│       └── DeleteItemEndpoint.ts
├── ui/                # User interface
│   ├── UIManager.ts           # UI coordination
│   ├── ContextMenu.ts         # Right-click menus
│   ├── KeyboardShortcuts.ts   # Keyboard handling
│   └── StatusNotification.ts  # User notifications
├── utils/             # Utility functions
│   ├── StringUtils.ts         # String manipulation & similarity
│   ├── UrlUtils.ts            # URL processing
│   ├── IdentifierExtractor.ts # Identifier parsing
│   ├── ResponseBuilder.ts     # API responses
│   └── Prompts.ts             # AI prompts
└── config/
    └── constants.ts   # Configuration constants
```

#### HTTP API Endpoints
```
POST /citationlinker/analyzeurl        # Comprehensive URL analysis
POST /citationlinker/processidentifier # Direct DOI/PMID/ArXiv translation
POST /citationlinker/processurl        # URL to citation translation
POST /citationlinker/processurlwithai  # AI-powered citation extraction
GET  /citationlinker/detectidentifier  # Check translator availability
GET  /citationlinker/itemkeybyurl      # Find existing items by URL
POST /citationlinker/previewurl        # Preview URL metadata without saving
POST /citationlinker/previewidentifier # Preview identifier metadata without saving
GET  /citationlinker/item/:itemKey     # Get item by key
DELETE /citationlinker/item/:itemKey   # Delete item by key
```

#### Build System
- **TypeScript**: All source code in TypeScript
- **esbuild**: Fast bundling and compilation (esbuild.js)
- **Bootstrap Pattern**: Follows Zotero 7 WebExtension standards
- **zotero-plugin-toolkit**: Enhanced plugin functionality

### Key Design Patterns

1. **Service Manager Pattern**: ServiceManager coordinates all service lifecycle (initialization, cleanup)
2. **Singleton Pattern**: Main plugin class uses singleton pattern on Zotero namespace
3. **Event-Driven**: Uses Zotero's notifier system for item changes
4. **Lazy Initialization**: Services initialized on demand through ServiceManager
5. **Validation Pipeline**: Items pass through quality checks before acceptance
6. **Clean Architecture**: Clear separation between services, translators, API, and UI

### Quality Control Features
- Validates item metadata (title, authors) before processing
- Automatically deletes items that fail validation
- Prevents duplicate items through multi-identifier matching
- Supports fuzzy matching for near-duplicate detection

### Development Guidelines
- Follow existing TypeScript patterns in src/
- Use ServiceManager for accessing services
- Implement proper error handling with try-catch blocks
- Add new preferences to prefs.js with appropriate defaults
- Update manifest.json version for releases
- Use conventional commits for changelog generation

### Using the Modular Structure
When adding new features or modifying existing code:
1. Import services from `ServiceManager` in `src/core/ServiceManager.ts`
2. Use `Logger` from `src/core/Logger.ts` for consistent logging
3. Use utility functions from `src/utils/` instead of duplicating code
4. Follow the pattern of existing endpoints in `src/api/endpoints/`
5. Reference `constants.ts` for configuration values

#### Service Integration Example
```typescript
import { ServiceManager } from './src/core/ServiceManager'

const serviceManager = new ServiceManager()
await serviceManager.initialize()

// Validate an item
const validItem = serviceManager.itemValidator.validateItemData(item)

// Check for duplicates
const duplicates = await serviceManager.duplicateDetector.detectDuplicates(item)

// Generate citations
await serviceManager.citationGenerator.generateAndCopyMarkdownLink([item])
```

### Reference Resources
- `.cursor/rules/`: Comprehensive development rules and Zotero API reference
- `zotero-source/`: Complete Zotero source code for API reference (if available)
- `docs/`: API documentation and automation guides
- `README.md`: User documentation and API examples
- `src/`: Modular source structure

## Zotero-Specific APIs

### Citation Generation
Use Zotero's QuickCopy system:
```typescript
const format = Zotero.QuickCopy.getFormatFromURL(Zotero.QuickCopy.lastActiveURL)
const content = Zotero.QuickCopy.getContentFromItems(items, format)
```

### Context Menu Integration
Add items to existing context menus by creating XUL elements:
```typescript
const menu = doc.getElementById('zotero-itemmenu')
const menuitem = doc.createXULElement('menuitem')
```

### HTTP Server
Register endpoints on Zotero's server:
```typescript
Zotero.Server.Endpoints["/citationlinker/endpoint"] = EndpointClass
```

### Web Translation
Use Zotero's translation system:
```typescript
const translation = new Zotero.Translate.Web()
translation.setDocument(document)
const translators = await translation.getTranslators()
```

## External Service Integration

### Perplexity AI
- API key stored in Zotero preferences: `perplexityApiKey`
- Used for AI-powered citation extraction from any URL
- Models: `sonar` (identifier extraction), `sonar-pro` (citation metadata)

### CrossRef API
- Free service for DOI validation and metadata retrieval
- No API key required
- Rate limit: 1 req/sec recommended

### PDF Processing
- Uses Zotero's built-in PDFWorker for text extraction
- Configurable size limits and page extraction
- Automatic identifier extraction from PDF content

## TypeScript Build Configuration

### Key Build Settings (tsconfig.json)
- **Target**: ES2017 for Firefox 115+ compatibility
- **Module**: CommonJS for Zotero environment
- **Types**: zotero-types for Zotero API definitions

### Build Process (esbuild.js)
1. Compile TypeScript files (bootstrap.ts, lib.ts)
2. Bundle with esbuild (no bundling, IIFE format)
3. Copy static files (manifest.json, locale/, etc.)
4. Create XPI package for distribution

## Testing & Debugging

### Manual Testing in Zotero
- Use `npm run start` to quit and restart Zotero with the plugin
- Check Zotero Error Console (Tools → Developer → Error Console)
- Enable debug mode: `Zotero.Prefs.set('extensions.zotero.ZoteroCitationLinker.debugMode', true)`

### Debugging Commands
```javascript
// In Zotero console
Zotero.ZoteroCitationLinker.showStatus()
Zotero.ZoteroCitationLinker.getServiceManager().getServicesStatus()
```

## Common Patterns

### Error Handling
```typescript
try {
  const result = await someOperation()
  return result
} catch (error) {
  logger.error(`Operation failed: ${error}`)
  throw error
}
```

### Service Access
```typescript
// Access services through ServiceManager
this.serviceManager.itemValidator.validateItemData(item)
this.serviceManager.duplicateDetector.detectDuplicates(item)
this.serviceManager.citationGenerator.generateAndCopyMarkdownLink(items)
```

### API Response Formatting
```typescript
import { ResponseBuilder } from './src/utils/ResponseBuilder'

// Success response
return ResponseBuilder.translationSuccess(items, method, translator)

// Error response
return ResponseBuilder.error(error)
```