# Zotero Citation Linker Plugin - English Localization

## Plugin Information
zotero-citation-linker-name = Zotero Citation Linker
zotero-citation-linker-description = Bridge between Zotero and Markdown-based note-taking applications

## Context Menu
context-menu-copy-markdown = Copy Markdown Link
context-menu-copy-markdown-tooltip = Copy a formatted Markdown citation with API link
context-menu-copy-api-url = Copy API URL
context-menu-copy-api-url-tooltip = Copy the Zotero API URL for this item

## Notifications
notification-markdown-copied = Markdown link copied to clipboard
notification-api-url-copied = API URL copied to clipboard
notification-markdown-error = Failed to generate Markdown link
notification-api-url-error = Failed to generate API URL
notification-server-started = API server started on port { $port }
notification-server-stopped = API server stopped
notification-server-error = Failed to start API server: { $error }

## Preferences
prefs-title = Citation Linker
prefs-general = General
prefs-server = API Server
prefs-shortcuts = Keyboard Shortcuts

prefs-port-label = Server Port:
prefs-port-description = Port for the local HTTP API server
prefs-api-enabled = Enable API Server
prefs-api-enabled-description = Allow external applications to add items via HTTP API

prefs-shortcut-enabled = Enable Keyboard Shortcut
prefs-shortcut-enabled-description = Use keyboard shortcut to copy Markdown links
prefs-shortcut-label = Shortcut:
prefs-shortcut-description = Keyboard combination to trigger Markdown link copy

prefs-debug-enabled = Debug Mode
prefs-debug-enabled-description = Enable debug logging for troubleshooting

## API Messages
api-success = Success
api-error = Error
api-invalid-url = Invalid URL provided
api-no-translator = No compatible translator found for the URL
api-no-metadata = No metadata could be found at the provided URL
api-translation-error = Translation error: { $error }
api-internal-error = Internal server error: { $error }

## Error Messages
error-no-items-selected = No items selected
error-invalid-item-type = Invalid item type for citation generation
error-clipboard-failed = Failed to copy to clipboard
error-server-port-conflict = Port { $port } is already in use
error-shortcut-conflict = Keyboard shortcut conflicts with existing binding 