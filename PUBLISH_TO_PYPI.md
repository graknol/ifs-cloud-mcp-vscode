# GitHub Installation - Current Approach

## How It Works

The VS Code extension installs the IFS Cloud MCP Server directly from the GitHub repository using UV:

```bash
uv tool install git+https://github.com/graknol/ifs-cloud-core-mcp-server.git
```

## Benefits of GitHub Installation

✅ **Always Latest**: Users get the most up-to-date version  
✅ **No Publishing Steps**: No need to maintain PyPI releases  
✅ **Direct from Source**: Installation directly from the authoritative repository  
✅ **Automatic Updates**: `uv tool upgrade` can update from GitHub

## Future: Optional PyPI Publication

If you want to publish to PyPI later for broader distribution:

### Steps to Publish

1. **Build the package**:

   ```bash
   cd ifs-cloud-core-mcp-server
   python -m build
   ```

2. **Install twine** (if not already installed):

   ```bash
   pip install twine
   ```

3. **Upload to PyPI**:

   ```bash
   twine upload dist/*
   ```

4. **Update VS Code extension** to use PyPI:
   ```typescript
   const installResult = await executeCommand(
     "uv tool install ifs-cloud-mcp-server"
   );
   ```

## Current Recommendation

**Stick with GitHub installation** for now - it provides the best developer experience with minimal maintenance overhead.
