# Changelog

All notable changes to the "ifs-cloud-mcp-vscode" extension will be documented in this file.

## [0.2.0] - 2025-08-15

### 🚀 Major: Automatic GitHub Copilot Chat Integration

- **Automatic MCP Server Registration**: Server now registers automatically with GitHub Copilot Chat using VS Code's MCP API
- **Seamless Integration**: No manual configuration required - server is auto-discovered when Copilot Chat needs it
- **Intelligent Safeguards**: Server only registers when properly installed with indexed IFS Cloud data
- **Dynamic Updates**: Server registration refreshes automatically after installation and ZIP imports

### ✨ Enhanced User Experience

- **Streamlined Workflow**: Removed manual start/stop commands (now handled automatically by VS Code)
- **Improved Status Reporting**: New "Check MCP Server Registration Status" command with comprehensive diagnostics
- **Updated Status Bar**: Shows registration status instead of running/stopped state
- **Better Guidance**: Clear messaging about automatic server lifecycle management

### 🔧 Technical Improvements

- **Proposed API Support**: Enabled `languageModelSystem` API for MCP server registration
- **Robust Validation**: Multiple safeguard layers prevent server registration without proper setup
- **Error Handling**: Graceful fallbacks when MCP registration fails
- **Logging**: Enhanced debugging information for troubleshooting

### 🧹 Cleanup & Refactoring

- **Removed Redundant Commands**: Eliminated manual server start/stop functionality
- **Simplified Architecture**: Focus on setup (Install → Import → Use in Copilot) workflow
- **Code Cleanup**: Removed auto-start logic and manual server process tracking
- **Menu Cleanup**: Fixed command palette references

### 📦 Server Configuration

- **Stdio Transport**: Server starts with proper `--transport stdio` for VS Code compatibility
- **Version-Based Startup**: Supports both version selection and index path fallback
- **Environment Validation**: Comprehensive checks for Python environment and dependencies

## [0.1.0] - 2025-01-15

### Added

- ZIP file import workflow for IFS Cloud source code analysis
- Enhanced language support with syntax highlighting for IFS files (.entity, .projection, .client, .views, .fragment, .storage)
- Intelligent code indexing for 15,000+ source files
- AI-powered code suggestions based on existing patterns
- Web UI for exploration and browsing of indexed files
- Advanced troubleshooting and diagnostics
- Version selection for multiple IFS Cloud releases
- Modern purple-themed icon with GitHub Copilot personality

### Improved

- Updated package description and metadata
- Enhanced user experience with better command organization
- Improved server status monitoring and feedback

### Changed

- Updated extension categories to include "Machine Learning" and "Programming Languages"
- Refined extension branding and visual identity

## [0.0.1] - 2024-12-19

### Added

- Initial release
- Install IFS Cloud MCP Server command
- Start/Stop server commands
- Server status monitoring
- Configuration management
- Auto-start functionality
- Status bar indicator
