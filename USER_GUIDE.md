# 🚀 IFS Cloud MCP VS Code Extension - User Guide

## 📦 ZIP Import Workflow

The IFS Cloud MCP Server requires imported ZIP files to function. Here's the complete user-friendly workflow:

### 🎯 Quick Start (3 Steps)

1. **Import ZIP File**
   ```
   Command Palette → "IFS Cloud: Import IFS Cloud ZIP File"
   ```

2. **Start Server** 
   ```
   Command Palette → "IFS Cloud: Start IFS Cloud MCP Server"
   ```

3. **Connect AI Tools**
   - GitHub Copilot automatically detects the running server
   - Start getting intelligent code suggestions!

### 📋 Available Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| **Install IFS Cloud MCP Server** | Clone and set up the server | First time setup |
| **Import IFS Cloud ZIP File** | Import and index ZIP files | Before using server |
| **Show ZIP Import Instructions** | Display detailed help | Need guidance |
| **Start IFS Cloud MCP Server** | Start the server | After importing files |
| **Start Web UI** | Launch web interface | Browse imported files |
| **List Available Versions** | Show imported versions | Check what's available |
| **Select IFS Cloud Version** | Choose version to use | Switch between versions |
| **Troubleshoot Installation** | Diagnose issues | When things don't work |

### 🔒 Built-in Protections

The extension prevents common mistakes:

- ✅ **Cannot start MCP Server without imported files**
  - Shows error: "No IFS Cloud versions found"
  - Offers to import ZIP file or view instructions

- ✅ **Cannot start Web UI without imported files** 
  - Shows error: "No IFS Cloud versions found"
  - Provides helpful next steps

- ✅ **Validates ZIP import process**
  - Checks Python environment
  - Validates version identifiers
  - Shows progress during import

### 📁 What Happens During Import

1. **File Selection**: Choose your IFS Cloud ZIP file
2. **Version Naming**: Enter identifier (e.g., "24.2.1", "latest")  
3. **Extraction**: Extracts supported file types (~15,000 files)
4. **Indexing**: Creates searchable index with Tantivy
5. **Validation**: Confirms successful import

### 🎨 File Types Supported

- `.entity` - Data models and business entities
- `.plsql` - Business logic and database procedures
- `.client` - User interface definitions
- `.projection` - Data access and business projections  
- `.fragment` - UI components and fragments
- `.views` - Database views and queries
- `.storage` - Storage and configuration files
- `.plsvc` - Platform services

### 🧠 AI Integration Benefits

After importing, your AI assistant can:

- 🔍 **Find patterns** across 15,000+ files instantly
- 📊 **Analyze dependencies** and relationships
- 🎯 **Suggest code** based on existing implementations
- 🚀 **Generate boilerplate** following IFS conventions
- 📝 **Explain business logic** from PLSQL files
- 🎨 **Create UI components** matching existing fragments

### 💡 Pro Tips

- **Version Naming**: Use semantic versioning (e.g., "24.2.1", "24.1.0")
- **Multiple Versions**: Import different releases for comparison
- **Development Workflow**: Use "latest" for current development
- **Custom Builds**: Use descriptive names like "feature_branch" or "hotfix_123"

### 🔧 Troubleshooting

**Problem**: "MCP Server path not configured"
**Solution**: Run "Install IFS Cloud MCP Server" first

**Problem**: "No IFS Cloud versions found"  
**Solution**: Run "Import IFS Cloud ZIP File" first

**Problem**: Import fails
**Solution**: Check Python installation and ZIP file validity

**Problem**: Server won't start
**Solution**: Use "Troubleshoot Installation" command

### 🎉 Success Indicators

✅ Import completed: See "Import completed successfully!" message  
✅ Server started: Status bar shows "MCP Server: Running"  
✅ AI connected: GitHub Copilot shows intelligent suggestions  
✅ Web UI running: Can browse files at http://localhost:3001

Ready to get started? Run **"IFS Cloud: Import IFS Cloud ZIP File"** to begin!
