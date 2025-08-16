# Changelog

All notable changes to the "ifs-cloud-mcp-vscode" extension will be documented in this file.

## [0.2.5] - 2025-08-16

### 🌍 Cross-Platform Data Directory Support

- **Platform-Specific Paths**: Updated data directory logic to match Python server exactly
  - Windows: `%APPDATA%\ifs_cloud_mcp_server` (unchanged)
  - macOS: `~/Library/Application Support/ifs_cloud_mcp_server`
  - Linux: `~/.local/share/ifs_cloud_mcp_server` (respects `XDG_DATA_HOME`)
- **Standards Compliant**: Follows platform conventions for user data storage
- **Enhanced Logging**: Shows which platform-specific path is being used for debugging

## [0.2.4] - 2025-08-16

### 🎯 Direct Data Detection (Primary Method)

- **Prioritized Appdata Check**: Direct filesystem check is now the primary method for finding indexed versions
- **Reliable Version Detection**: No longer dependent on server installation status for finding existing data
- **Fallback Logic**: Server command used only when direct check finds no versions
- **Data Persistence**: Indexed data survives server reinstallation and extension updates

### 🔧 Enhanced Reliability

- **Reduced Dependencies**: Less reliance on Python environment and server installation for version detection
- **Better Error Recovery**: Multiple fallback mechanisms ensure data is found when it exists
- **Improved Logging**: Clear indication of which detection method is being used

## [0.2.3] - 2025-08-16

### 🐛 Debug & Diagnostics Improvements

- **Enhanced MCP Provider Logging**: Detailed console output shows exact version checking process
- **Fallback Debugging**: Additional logging when primary server command fails
- **Debug Command Enhancement**: Shows both direct check and `checkVersionsAvailable()` results
- **Provider Refresh Trigger**: Debug command now refreshes MCP provider to test registration

## [0.2.2] - 2025-08-16

### 🔍 Advanced Debugging Features

- **New Debug Command**: "Debug: Check Appdata Paths" command for troubleshooting
- **Direct Filesystem Validation**: Added `checkAppdataVersions()` function for direct data verification
- **Appdata Fallback Logic**: Enhanced version detection with direct filesystem checks as fallback
- **Detailed Console Logging**: Extensive logging for debugging data detection issues

## [0.2.1] - 2025-08-16

### 🛠️ Data Persistence Fixes

- **Appdata Integration**: Added direct filesystem check for indexed data in user's appdata directory
- **Installation Independence**: Extension can find existing indexed data even during server reinstallation
- **Multiple Detection Methods**: Combined server command and direct filesystem approaches
- **Error Resilience**: Graceful handling of server installation issues

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
