# IFS Cloud MCP Server VS Code Extension

## Installation & Usage Guide

### 1. Install the Extension

**Option A: Install from VSIX file**

```bash
code --install-extension ifs-cloud-mcp-vscode-0.0.1.vsix
```

**Option B: Manual installation**

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Extensions: Install from VSIX..."
4. Select the `ifs-cloud-mcp-vscode-0.0.1.vsix` file

### 2. Setup IFS Cloud MCP Server

1. **Install UV** (if not already installed):

   ```bash
   # Windows
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

   # macOS/Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Install the MCP Server** via VS Code:
   - Press `Ctrl+Shift+P`
   - Type "IFS Cloud: Install IFS Cloud MCP Server"
   - Click "Install" to download from GitHub repository

### Installation Details

The extension automatically installs the latest version of the MCP server from:
`https://github.com/graknol/ifs-cloud-core-mcp-server`

**Installation command used:**

```bash
uv tool install git+https://github.com/graknol/ifs-cloud-core-mcp-server.git
```

### Manual Installation (Advanced)

If you prefer to install manually:

```bash
# Install the MCP server directly
uv tool install git+https://github.com/graknol/ifs-cloud-core-mcp-server.git

# Verify installation
ifs-cloud-mcp-server --help
```

### 3. Configure the Extension

1. **Set your index path**:

   - Press `Ctrl+Shift+P`
   - Type "IFS Cloud: Configure IFS Cloud MCP Server"
   - Select "Set Index Path"
   - Enter the path to your IFS Cloud code directory

2. **Optional: Enable auto-start**:
   - In the configuration menu, select "Toggle Auto-Start"
   - The server will automatically start when VS Code opens

### 4. Start Using the MCP Server

1. **Start the server**:

   - Press `Ctrl+Shift+P`
   - Type "IFS Cloud: Start IFS Cloud MCP Server"
   - Or click the status bar indicator

2. **Monitor status**:
   - Check the status bar (bottom right) for server status
   - Green checkmark = Running
   - Red circle = Stopped

### Available Commands

| Command                                        | Description                     |
| ---------------------------------------------- | ------------------------------- |
| `IFS Cloud: Install IFS Cloud MCP Server`      | Install the MCP server using UV |
| `IFS Cloud: Start IFS Cloud MCP Server`        | Start the MCP server            |
| `IFS Cloud: Stop IFS Cloud MCP Server`         | Stop the MCP server             |
| `IFS Cloud: Check IFS Cloud MCP Server Status` | Check current server status     |
| `IFS Cloud: Configure IFS Cloud MCP Server`    | Open configuration menu         |

### Configuration Settings

Open VS Code settings (`Ctrl+,`) and search for "IFS Cloud MCP":

- **Server Path**: Path to the MCP server executable (default: `ifs-cloud-mcp-server`)
- **Index Path**: Path to your IFS Cloud code index directory
- **Auto Start**: Automatically start the server when VS Code opens

### Troubleshooting

1. **"UV is not installed" error**:

   - Install UV following the instructions above
   - Restart VS Code after installation

2. **"MCP Server path not configured" error**:

   - Run the "Install IFS Cloud MCP Server" command first
   - Or manually set the server path in settings

3. **Server won't start**:

   - Check that the index path is set correctly
   - Ensure the path exists and contains IFS Cloud code files
   - Try stopping and starting the server again

4. **Permission issues**:
   - Ensure UV and the MCP server have proper permissions
   - On Windows, try running VS Code as administrator

### Development

To modify or debug the extension:

1. Clone the repository
2. Run `npm install` in the extension directory
3. Press `F5` to launch a new VS Code window with the extension loaded
4. Make changes and test

### Support

For issues and feature requests, please visit our GitHub repository.
