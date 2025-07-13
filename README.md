# Zotero Citation Linker

A powerful Zotero plugin that seamlessly bridges reference management with Markdown-based writing workflows. Generate inline citations with API links instantly, and integrate external applications through a local HTTP server.

## 🌟 Features

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

### ✅ **HTTP Server Integration**

- **URL Translation**: `POST /citationlinker/processurl` - Translate web URLs to Zotero items
- **Webpage Saving**: `POST /citationlinker/savewebpage` - Save URLs as webpage items
- **Rich Responses**: JSON responses include citations, metadata, and API links
- **Error Handling**: Comprehensive error responses with detailed messages

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

The plugin runs a local HTTP server (default port 23119) for external integrations:

#### Translate URL to Citation

```bash
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**Response**:

```json
{
  "status": "success",
  "method": "translation",
  "translator": "Example Site Translator",
  "itemCount": 1,
  "items": [{
    "title": "Article Title",
    "creators": [{"firstName": "John", "lastName": "Smith"}],
    "_meta": {
      "citation": "(Smith, 2023)",
      "apiUrl": "https://api.zotero.org/users/12345/items/XYZ789"
    }
  }]
}
```

#### Save as Webpage (Fallback)

```bash
curl -X POST http://localhost:23119/citationlinker/savewebpage \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'
```

## ⚙️ Configuration

Access preferences through Zotero's standard preferences system:

### Server Settings

- **Port**: Default 23119, customizable
- **Enable/Disable**: Toggle server functionality
- **Timeout**: Request timeout in milliseconds

### Citation Generation

- **Citation Style**: Default style for citations
- **Output Format**: Markdown, HTML, or plain text
- **Include API URLs**: Toggle API URL generation
- **Fallback Citations**: Enable enhanced fallback when CSL fails

### User Interface

- **Context Menu**: Enable/disable menu items
- **Keyboard Shortcuts**: Customize key combinations
- **Notifications**: Control success/error messages

### Development

- **Debug Mode**: Enhanced logging
- **Log Level**: Control verbosity (debug, info, warn, error)

## 🔧 API Reference

### Server Endpoints

#### `POST /citationlinker/processurl`

Attempts to translate a URL using Zotero's translation system.

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
  "items": [/* Zotero items with citation metadata */]
}
```

**Error Response** (422):

```json
{
  "status": "error",
  "message": "Translation failed: No translators found"
}
```

#### `POST /citationlinker/savewebpage`

Saves a URL as a basic webpage item (fallback when translation fails).

**Request**: Same as above

**Success Response** (200):

```json
{
  "status": "success",
  "method": "webpage",
  "translator": "Built-in webpage creator",
  "itemCount": 1,
  "items": [/* Webpage item with basic metadata */]
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

### Debug Mode

Enable debug logging in preferences for detailed troubleshooting information. Logs appear in Zotero's debug output (Help → Debug Output Logging).

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

**Version**: 0.1.0 | **Status**: Production Ready | **Last Updated**: 2024
