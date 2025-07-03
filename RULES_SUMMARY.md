# Enhanced Cursor Rules for Zotero Citation Linker Development

## 🎯 Overview

The `.cursor/rules/` directory has been completely overhauled to provide comprehensive development guidance for creating the Zotero Citation Linker plugin. These rules integrate with your existing Taskmaster workflow and leverage the provided reference materials (Zotero source code and example plugins).

## 📁 Rules Structure

### Core Rules Files

1. **[zotero-development.mdc](.cursor/rules/zotero-development.mdc)** (5.8KB)
   - **Purpose**: Comprehensive Zotero API patterns and plugin architecture
   - **Covers**: Plugin structure, citation generation, context menus, HTTP servers, security
   - **Key Sections**: QuickCopy API, WebExtension manifest, TypeScript patterns, testing

2. **[taskmaster-integration.mdc](.cursor/rules/taskmaster-integration.mdc)** (7.2KB)
   - **Purpose**: Integration between Taskmaster workflow and Zotero development
   - **Covers**: Task-driven development, research workflows, progress logging
   - **Key Sections**: Implementation templates, dependency management, git workflow

3. **[typescript-build.mdc](.cursor/rules/typescript-build.mdc)** (11.8KB)
   - **Purpose**: Modern TypeScript setup and build system for Zotero plugins
   - **Covers**: TypeScript config, ESBuild setup, package.json, testing patterns
   - **Key Sections**: Type declarations, build optimization, development workflow

4. **[project-workflow.mdc](.cursor/rules/project-workflow.mdc)** (8.9KB)
   - **Purpose**: Project-specific organization and workflow standards
   - **Covers**: File structure, git practices, quality assurance, troubleshooting
   - **Key Sections**: Development phases, commit standards, debugging

### Supporting Rules

5. **[cursor_rules.mdc](.cursor/rules/cursor_rules.mdc)** (1.5KB)
   - **Purpose**: Meta-rules for maintaining and creating new rules
   - **Covers**: Rule structure requirements, formatting standards

6. **[self_improve.mdc](.cursor/rules/self_improve.mdc)** (4.8KB)
   - **Purpose**: Guidelines for evolving rules based on implementation experience
   - **Covers**: Pattern recognition, rule updates, continuous improvement

## 🚀 How to Use These Rules

### For Cursor Agents

The rules are designed to work automatically with Cursor's AI agents. They provide:

- **Context-aware guidance** for each type of development task
- **Specific examples** from Zotero source code and working plugins
- **Best practices** for TypeScript, build systems, and testing
- **Integration patterns** with Taskmaster for project management

### For Development Sessions

1. **Before Starting**: Review the relevant rule file for your current task
2. **During Development**: Follow the patterns and examples provided
3. **After Implementation**: Update rules if you discover better patterns

## 🎨 Key Improvements Made

### 🔬 Comprehensive Zotero Analysis

- **Source Code Integration**: Analyzed Zotero's actual implementation patterns
- **API Documentation**: Extracted real usage patterns from `quickCopy.js`, `zoteroPane.js`, etc.
- **Example Plugin Analysis**: Studied both simple and advanced plugin architectures

### 🛠️ Modern Development Patterns

- **TypeScript First**: Full TypeScript configuration with proper Zotero types
- **ESBuild Integration**: Modern, fast build system optimized for Zotero
- **Development Workflow**: Watch mode, linting, testing, packaging

### 📋 Taskmaster Integration

- **Task-Driven Development**: Rules that work with your existing task management
- **Research Integration**: Patterns for using `task-master research`
- **Progress Logging**: Templates for documenting implementation discoveries

### 🏗️ Architecture Guidance

- **Plugin Structure**: Modern WebExtension patterns for Zotero 7
- **API Integration**: Proper patterns for QuickCopy, context menus, HTTP servers
- **Error Handling**: Robust patterns for common failure modes

## 📚 Reference Materials Integration

### Zotero Source Code Usage

The rules reference specific files from `zotero-source/`:

- `chrome/content/zotero/xpcom/quickCopy.js` - Citation generation patterns
- `chrome/content/zotero/zoteroPane.js` - Context menu integration
- `chrome/content/zotero/xpcom/server/` - HTTP server implementation

### Example Plugin Analysis

Patterns extracted from provided examples:

- `zotero-make-it-red-main/` - Simple plugin patterns
- `zotero-date-from-last-modified-master/` - Advanced TypeScript setup

## 🔄 Development Workflow

### Phase 1: Setup (Tasks 1-3)

```bash
# Initialize TypeScript project following typescript-build.mdc
npm init
npm install typescript esbuild zotero-types --save-dev

# Create proper project structure following project-workflow.mdc
mkdir -p src locale client

# Follow taskmaster-integration.mdc for task management
task-master next
task-master set-status --id=1.1 --status=in-progress
```

### Phase 2: Core Features (Tasks 2-4)

```bash
# Implement context menu following zotero-development.mdc patterns
# Use QuickCopy API for citation generation
# Document progress with taskmaster-integration.mdc templates
```

### Phase 3: Server Features (Tasks 5-7)

```bash
# Implement HTTP server using Zotero.Server.Endpoints
# Follow security patterns from zotero-development.mdc
# Test API integration following testing guidelines
```

## 🧪 Quality Assurance

### Code Quality Checks

- **TypeScript**: Proper type safety with Zotero type definitions
- **ESLint**: Configured for Zotero plugin development
- **Testing**: Patterns for manual and automated testing

### Standards Compliance

- **Zotero 7 Compatibility**: Modern WebExtension patterns
- **Security**: Input validation and localhost-only binding
- **Performance**: Optimized for Zotero's performance expectations

## 🔍 Key Features of This Rules System

### 1. **Practical Examples**

Every rule includes actual code patterns that work with Zotero, not theoretical examples.

### 2. **Source Code References**

Direct links to relevant Zotero source files for deeper understanding.

### 3. **Taskmaster Integration**

Templates and workflows that integrate seamlessly with your task management system.

### 4. **Progressive Complexity**

Guidance for both simple implementations and advanced patterns.

### 5. **Self-Improving**

Rules designed to evolve based on implementation experience.

## 🎯 Next Steps

1. **Start Development**: Use `task-master next` to begin the first task
2. **Follow Patterns**: Use the TypeScript and build patterns from the rules
3. **Document Progress**: Use Taskmaster integration templates for logging
4. **Iterate and Improve**: Update rules based on what you learn

## 📞 Getting Help

When encountering issues:

1. **Check Rules**: Look for relevant patterns in the appropriate rule file
2. **Search Zotero Source**: Use the provided reference patterns to explore
3. **Use Research Tool**: `task-master research` for current best practices
4. **Document Solutions**: Add discoveries to task logs for future reference

The rules system is designed to be your comprehensive guide throughout the entire plugin development process, from initial setup to final testing and deployment.
