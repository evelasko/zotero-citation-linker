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
The primary implementation file (~2000 lines) contains:
- Plugin lifecycle management (install/uninstall)
- HTTP server implementation with 6 API endpoints
- Citation generation logic
- Item validation and quality control
- Context menu and keyboard shortcut integration

#### HTTP API Endpoints
```
POST /citationlinker/analyzeurl        # Comprehensive URL analysis
POST /citationlinker/processidentifier # Direct DOI/PMID/ArXiv translation
POST /citationlinker/processurl        # URL to citation translation
GET  /citationlinker/detectidentifier  # Check translator availability
GET  /citationlinker/itemkeybyurl      # Find existing items by URL
POST /citationlinker/savewebpage       # Create webpage items
```

#### Build System
- **TypeScript**: All source code in TypeScript
- **esbuild**: Fast bundling and compilation
- **Bootstrap Pattern**: Follows Zotero 7 WebExtension standards
- **zotero-plugin-toolkit**: Enhanced plugin functionality

### Key Design Patterns

1. **Singleton Pattern**: Main plugin class uses singleton pattern
2. **Event-Driven**: Uses Zotero's notifier system for item changes
3. **Lazy Initialization**: HTTP server and keyboard shortcuts initialized on demand
4. **Validation Pipeline**: Items pass through quality checks before acceptance

### Quality Control Features
- Validates item metadata (title, authors) before processing
- Automatically deletes items that fail validation
- Prevents duplicate items through multi-identifier matching
- Supports fuzzy matching for near-duplicate detection

### Development Guidelines
- Follow existing TypeScript patterns in lib.ts
- Use zotero-plugin-toolkit for UI integration
- Implement proper error handling with try-catch blocks
- Add new preferences to prefs.js with appropriate defaults
- Update manifest.json version for releases
- Use conventional commits for changelog generation

### Modular Architecture (In Progress)
The codebase is being refactored from a monolithic lib.ts (3,716 lines) into a modular structure:

#### New Directory Structure
```
src/
├── config/          # Configuration and constants
│   └── constants.ts # Plugin constants and defaults
├── core/           # Core plugin functionality
│   ├── types.ts    # TypeScript interfaces and types
│   ├── Logger.ts   # Logging utility
│   └── ServiceManager.ts # Service coordination
├── utils/          # Utility functions
│   ├── StringUtils.ts    # String processing and similarity
│   ├── UrlUtils.ts       # URL parsing and normalization
│   └── ResponseBuilder.ts # API response formatting
├── services/       # Service modules
│   ├── ItemValidator.ts     # Item validation and quality control
│   ├── DuplicateDetector.ts # Duplicate detection algorithms
│   └── CitationGenerator.ts # Citation generation and formatting
├── api/           # (To be implemented in Phase 4)
└── index.ts       # Integration examples and exports
```

#### Using the New Modules
When adding new features or refactoring existing code:
1. Import utilities from their respective modules instead of duplicating code
2. Use `ServiceManager` from `src/core/ServiceManager.ts` to manage all services
3. Use `Logger` from `src/core/Logger.ts` for consistent logging
4. Use `StringUtils` for text processing and similarity calculations
5. Use `UrlUtils` for URL normalization and validation
6. Use `ResponseBuilder` for standardized API responses
7. Use `ItemValidator`, `DuplicateDetector`, and `CitationGenerator` services for core functionality
8. Reference `constants.ts` for configuration values

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
- `zotero-source/`: Complete Zotero source code for API reference
- `docs/AUTOMATION.md`: Release automation documentation
- `README.md`: User documentation and API examples
- `src/`: New modular structure (being implemented)