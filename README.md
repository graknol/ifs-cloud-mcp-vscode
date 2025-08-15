# IFS Cloud MCP VS Code Extension

This VS Code extension provides easy installation and management of the IFS Cloud MCP Server.

## Features

- **One-click installation** of IFS Cloud MCP Server using UV
- **Server management** with start/stop commands
- **Version-based startup** with automatic version selection
- **Status monitoring** with status bar indicator
- **Configuration management** for server and index paths
- **Web UI support** with automatic URL detection
- **Marble language support** with syntax highlighting and snippets
- **Auto-start** option for seamless development experience

## Commands

- `IFS Cloud: Install IFS Cloud MCP Server` - Install the MCP server using UV
- `IFS Cloud: Start IFS Cloud MCP Server` - Start the MCP server
- `IFS Cloud: Stop IFS Cloud MCP Server` - Stop the MCP server
- `IFS Cloud: Check IFS Cloud MCP Server Status` - Check server status
- `IFS Cloud: Configure IFS Cloud MCP Server` - Configure server settings
- `IFS Cloud: Select IFS Cloud Version` - Choose from available indexed versions
- `IFS Cloud: List Available Versions` - Display all indexed versions
- `IFS Cloud: Start Web UI` - Launch the web interface
- `IFS Cloud: Stop Web UI` - Stop the web interface

## Marble Language Support

This extension includes comprehensive support for Marble files:

- **Syntax Highlighting**: Full syntax highlighting for Marble language constructs
- **Code Snippets**: Pre-built snippets for entities, views, services, and more
- **Custom Theme**: Dark theme optimized for Marble syntax
- **Language Features**: Auto-closing pairs, bracket matching, smart indentation

See [MARBLE_LANGUAGE.md](MARBLE_LANGUAGE.md) for detailed information about Marble language support.

## Configuration

- `ifsCloudMcp.serverPath` - Path to the MCP server executable
- `ifsCloudMcp.installationPath` - Directory where MCP server is installed
- `ifsCloudMcp.indexPath` - Path to your IFS Cloud code index (legacy)
- `ifsCloudMcp.selectedVersion` - Selected IFS Cloud version for version-based startup
- `ifsCloudMcp.autoStart` - Automatically start server when VS Code opens

## Requirements

- [UV](https://docs.astral.sh/uv/) package manager
- Python 3.8 or higher

## Installation

1. Install this extension from the VS Code marketplace
2. Run the "Install IFS Cloud MCP Server" command
3. Configure your index path in settings
4. Start using IFS Cloud development tools!

## Usage

1. Open VS Code in an IFS Cloud project
2. Use Ctrl+Shift+P to open command palette
3. Type "IFS Cloud" to see available commands
4. Install and start the MCP server
5. The status bar will show server status

## Support

For issues and feature requests, please visit our [GitHub repository](https://github.com/graknol/ifs-cloud-core-mcp-server).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
