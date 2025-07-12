# Zotero Citation Linker

A Zotero plugin that bridges the gap between Zotero's reference management capabilities and Markdown-based note-taking applications.

## Features

🔗 **Copy Markdown Citations**: Generate formatted Markdown citations with API links directly from your Zotero library

🖱️ **Context Menu Integration**: Right-click on selected items to copy Markdown links ✅ **IMPLEMENTED**

⌨️ **Keyboard Shortcuts**: Configurable keyboard shortcuts for quick citation copying (Coming in Task 3)

🌐 **Local API Server**: HTTP server for external applications to programmatically add items to Zotero (Coming in Task 5)

⚙️ **Configurable Preferences**: Customize server port, shortcuts, and citation formats

## Development Status

This plugin is currently under development. **Task 2: Context Menu Integration** has been completed!

### Current Implementation Progress

✅ **Task 1: Setup WebExtension Project Structure** - Complete  
✅ **Task 2: Context Menu Integration** - Complete
- Context menu item "Copy Markdown Link" added to item right-click menu
- Basic citation generation with author-year format
- API URL generation for Zotero web library links
- Clipboard integration with user notifications
- Proper cleanup and error handling

🔄 **Task 3: Keyboard Shortcut Functionality** - Next Up  
🔄 **Task 4: Citation Generation Service** - Planned  
🔄 **Task 5: Local HTTP Server** - Planned  
🔄 **Task 6: URL Translation Endpoint** - Planned  
🔄 **Task 7: Error Handling & Validation** - Planned

### How Context Menu Works (Task 2)

The plugin adds a "Copy Markdown Link" option to Zotero's item context menu that:

1. **Validates Selection**: Ensures regular bibliographic items are selected
2. **Generates Citations**: Creates simple author-year citations from item metadata
3. **Creates API URLs**: Generates proper Zotero API URLs for web access
4. **Formats Markdown**: Combines citation and URL into `[citation](url)` format
5. **Copies to Clipboard**: Uses system clipboard with success notifications

**Example Output**: `[Smith (2023)](https://api.zotero.org/users/12345/items/ABCD1234)`

## Installation (Development)

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`
4. The plugin files will be in the `build/` directory
5. Install in Zotero by going to Tools → Add-ons → Install Add-on From File → Select `build/manifest.json`

## Building

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Lint code
npm run lint
```

## Project Structure

```
zotero-citation-linker/
├── manifest.json           # WebExtension manifest
├── bootstrap.ts            # Plugin lifecycle management
├── lib.ts                  # Main plugin implementation
├── build/                  # Compiled output (generated)
│   ├── manifest.json
│   ├── bootstrap.js
│   ├── lib.js
│   └── locale/
├── locale/                 # Localization files
│   └── en-US/
│       └── zotero-citation-linker.ftl
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── esbuild.js             # Build configuration
└── README.md
```

## Development

This plugin follows modern Zotero 7 development practices using:

- **TypeScript** for type safety and better developer experience
- **esbuild** for fast compilation and bundling
- **ESLint** for code quality and consistency
- **WebExtension manifest** for Zotero 7 compatibility
- **Fluent localization** for internationalization support

## Contributing

This project is part of an ongoing development process. Each task builds upon the previous ones, creating a comprehensive citation management solution for Zotero users.

## License

MIT License - See LICENSE file for details.

## Roadmap

### Phase 1: Core Features (Current)
- [x] Project structure setup
- [ ] Context menu integration
- [ ] Citation generation
- [ ] Basic HTTP server

### Phase 2: Advanced Features
- [ ] Keyboard shortcuts
- [ ] Preferences UI
- [ ] URL-to-reference API
- [ ] Error handling and validation

### Phase 3: Polish and Release
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Package and release

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/username/zotero-citation-linker/issues) page.

---

*This plugin is designed to work with Zotero 7.0 and higher. For older versions of Zotero, please check the compatibility notes.* 