import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";

let mcpServerProcess: ChildProcess | null = null;
let webUIProcess: ChildProcess | null = null;
let webUIUrl: string | null = null;
let statusBarItem: vscode.StatusBarItem;
let mcpOutputChannel: vscode.OutputChannel;
let webUIOutputChannel: vscode.OutputChannel;

const execAsync = promisify(exec);

// Create a better subprocess function for real-time output capture
function createSubprocess(
  command: string,
  args: string[],
  options: any,
  outputChannel: vscode.OutputChannel
): ChildProcess {
  outputChannel.appendLine(`Executing: ${command} ${args.join(" ")}`);
  outputChannel.appendLine(`Working directory: ${options.cwd || "current"}`);
  outputChannel.appendLine(
    `Environment variables: ${Object.keys(options.env || {})
      .filter((k) => k.startsWith("PYTHON"))
      .join(", ")}`
  );
  outputChannel.appendLine("---");

  const process = spawn(command, args, {
    ...options,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  });

  // Immediately set up event listeners to capture all output
  if (process.stdout) {
    process.stdout.setEncoding("utf8");
    process.stdout.on("data", (data: string) => {
      outputChannel.appendLine(`[STDOUT] ${data.toString().trim()}`);
    });
  }

  if (process.stderr) {
    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (data: string) => {
      outputChannel.appendLine(`[STDERR] ${data.toString().trim()}`);
    });
  }

  process.on("error", (error) => {
    outputChannel.appendLine(`[PROCESS ERROR] ${error.message}`);
  });

  process.on("exit", (code, signal) => {
    outputChannel.appendLine(`[PROCESS EXIT] Code: ${code}, Signal: ${signal}`);
  });

  return process;
}

async function troubleshootInstallation() {
  let diagnosticInfo =
    "=== IFS Cloud MCP Server Installation Diagnostics ===\n\n";

  // Check Python installation
  const pythonExecutable = await findPythonExecutable();
  diagnosticInfo += `Python Available: ${
    pythonExecutable ? "✅ Found" : "❌ Not found"
  }\n`;
  if (pythonExecutable) {
    diagnosticInfo += `Python Command: ${pythonExecutable}\n`;
    const pythonVersionCheck = await executeCommand(
      `${pythonExecutable} --version`
    );
    if (pythonVersionCheck.success) {
      diagnosticInfo += `Python Version: ${pythonVersionCheck.output?.trim()}\n`;
    }
  }
  diagnosticInfo += "\n";

  // Check Git installation
  const gitCheck = await executeCommand("git --version");
  diagnosticInfo += `Git Installation: ${
    gitCheck.success ? "✅ Installed" : "❌ Not found"
  }\n`;
  if (gitCheck.success) {
    diagnosticInfo += `Git Version: ${gitCheck.output?.trim()}\n`;
  }
  diagnosticInfo += "\n";

  // Check current configuration
  const config = vscode.workspace.getConfiguration("ifsCloudMcp");
  const installationPath = config.get<string>("installationPath");
  const serverPath = config.get<string>("serverPath");

  diagnosticInfo += "=== Current Configuration ===\n";
  diagnosticInfo += `Installation Path: ${installationPath || "Not set"}\n`;
  diagnosticInfo += `Server Path: ${serverPath || "Not set"}\n`;
  diagnosticInfo += `Index Path: ${config.get("indexPath") || "Not set"}\n`;
  diagnosticInfo += `Auto Start: ${
    config.get("autoStart") ? "Enabled" : "Disabled"
  }\n`;
  diagnosticInfo += "\n";

  // Check installation status
  diagnosticInfo += "=== Installation Status ===\n";
  if (installationPath && fs.existsSync(installationPath)) {
    diagnosticInfo += `Installation Directory: ✅ Found at ${installationPath}\n`;

    const venvPath = path.join(installationPath, ".venv");
    const venvExists = fs.existsSync(venvPath);
    diagnosticInfo += `Virtual Environment: ${
      venvExists ? "✅ Created" : "❌ Missing"
    }\n`;

    const mainPyPath = path.join(
      installationPath,
      "src",
      "ifs_cloud_mcp_server",
      "main.py"
    );
    const mainPyExists = fs.existsSync(mainPyPath);
    diagnosticInfo += `Server Script: ${
      mainPyExists ? "✅ Found" : "❌ Missing"
    }\n`;

    if (venvExists && mainPyExists && pythonExecutable) {
      // Test server startup
      const venvPython =
        process.platform === "win32"
          ? path.join(venvPath, "Scripts", "python.exe")
          : path.join(venvPath, "bin", "python");

      if (fs.existsSync(venvPython)) {
        diagnosticInfo += `Virtual Environment Python: ✅ Found\n`;
        diagnosticInfo += "\n=== Server Test ===\n";
        diagnosticInfo += "Testing server startup...\n";

        const serverTest = await executeCommand(
          `cd "${installationPath}" && "${venvPython}" -m ifs_cloud_mcp_server.main --help`
        );
        diagnosticInfo += `Server Help Command: ${
          serverTest.success ? "✅ Success" : "❌ Failed"
        }\n`;
        if (!serverTest.success) {
          diagnosticInfo += `Error: ${serverTest.error}\n`;
        }
      } else {
        diagnosticInfo += `Virtual Environment Python: ❌ Not found at ${venvPython}\n`;
      }
    }
  } else {
    diagnosticInfo += `Installation Directory: ❌ Not found\n`;
  }
  diagnosticInfo += "\n";

  // Legacy UV check (for backward compatibility)
  const uvCheck = await executeCommand("uv --version");
  if (uvCheck.success) {
    diagnosticInfo += "=== UV Installation (Legacy) ===\n";
    diagnosticInfo += `UV Version: ${uvCheck.output?.trim()}\n`;

    const toolList = await executeCommand("uv tool list");
    if (toolList.success && toolList.output?.includes("ifs-cloud-mcp-server")) {
      diagnosticInfo += `UV Tool: ✅ IFS Cloud MCP Server found\n`;
    }
    diagnosticInfo += "\n";
  }

  // Recommendations
  diagnosticInfo += "=== Recommendations ===\n";
  if (!pythonExecutable) {
    diagnosticInfo += "1. Install Python: https://www.python.org/downloads/\n";
  }
  if (!gitCheck.success) {
    diagnosticInfo += "2. Install Git: https://git-scm.com/downloads\n";
  }
  if (!installationPath || !fs.existsSync(installationPath)) {
    diagnosticInfo += "3. Run 'IFS Cloud MCP: Install Server' command\n";
  }

  // Show results
  const document = await vscode.workspace.openTextDocument({
    content: diagnosticInfo,
    language: "plaintext",
  });
  await vscode.window.showTextDocument(document);
}

export function activate(context: vscode.ExtensionContext) {
  console.log("IFS Cloud MCP Server extension activated");

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(circle-slash) MCP Server: Stopped";
  statusBarItem.command = "ifs-cloud-mcp.status";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Create output channels
  mcpOutputChannel = vscode.window.createOutputChannel("IFS Cloud MCP Server");
  webUIOutputChannel = vscode.window.createOutputChannel(
    "IFS Cloud MCP Web UI"
  );
  context.subscriptions.push(mcpOutputChannel, webUIOutputChannel);

  // Register commands
  const installCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.install",
    async () => {
      await installMcpServer();
    }
  );

  const importZipCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.importZip",
    async () => {
      await importZipFile();
    }
  );

  const showInstructionsCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.showInstructions",
    async () => {
      await showZipInstructions();
    }
  );

  const startCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.start",
    async () => {
      await startMcpServer();
    }
  );

  const stopCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.stop",
    async () => {
      await stopMcpServer();
    }
  );

  const statusCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.status",
    async () => {
      await checkServerStatus();
    }
  );

  const configureCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.configure",
    async () => {
      await configureMcpServer();
    }
  );

  const troubleshootCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.troubleshoot",
    async () => {
      await troubleshootInstallation();
    }
  );

  const selectVersionCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.selectVersion",
    async () => {
      const selectedVersion = await selectVersionFromList();
      if (selectedVersion) {
        const config = vscode.workspace.getConfiguration("ifsCloudMcp");
        await config.update(
          "selectedVersion",
          selectedVersion,
          vscode.ConfigurationTarget.Global
        );
        // Clear index path since we're using version-based startup
        await config.update(
          "indexPath",
          undefined,
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(
          `Selected version: ${selectedVersion}. Server will use version-based startup.`
        );
      }
    }
  );

  const listVersionsCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.listVersions",
    async () => {
      const versions = await listAvailableVersions();
      if (versions.length === 0) {
        vscode.window.showInformationMessage(
          "No indexed versions found. Please index some IFS Cloud code first."
        );
      } else {
        const versionList = versions.join("\n• ");
        vscode.window.showInformationMessage(
          `Available versions:\n• ${versionList}`,
          { modal: true }
        );
      }
    }
  );

  const startWebUICommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.startWebUI",
    async () => {
      await startWebUI();
    }
  );

  const stopWebUICommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.stopWebUI",
    async () => {
      await stopWebUI();
    }
  );

  const showMcpOutputCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.showMcpOutput",
    async () => {
      mcpOutputChannel.show();
    }
  );

  const showWebUIOutputCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.showWebUIOutput",
    async () => {
      webUIOutputChannel.show();
    }
  );

  const openWebUICommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.openWebUI",
    async () => {
      await openWebUIInBrowser();
    }
  );

  context.subscriptions.push(
    installCommand,
    importZipCommand,
    showInstructionsCommand,
    startCommand,
    stopCommand,
    statusCommand,
    configureCommand,
    troubleshootCommand,
    selectVersionCommand,
    listVersionsCommand,
    startWebUICommand,
    stopWebUICommand,
    showMcpOutputCommand,
    showWebUIOutputCommand,
    openWebUICommand
  );

  // Auto-start if configured
  const config = vscode.workspace.getConfiguration("ifsCloudMcp");
  if (config.get("autoStart")) {
    startMcpServer();
  }
}

// New version-related functions for enhanced server management
async function listAvailableVersions(): Promise<string[]> {
  try {
    const config = vscode.workspace.getConfiguration("ifsCloudMcp");
    const installationPath = config.get<string>("installationPath");

    if (!installationPath || !fs.existsSync(installationPath)) {
      vscode.window.showErrorMessage(
        "MCP Server not installed. Please install the server first."
      );
      return [];
    }

    // Use the virtual environment Python
    const venvPath = path.join(installationPath, ".venv");
    const venvPython =
      process.platform === "win32"
        ? path.join(venvPath, "Scripts", "python.exe")
        : path.join(venvPath, "bin", "python");

    if (!fs.existsSync(venvPython)) {
      vscode.window.showErrorMessage(
        "Virtual environment not found. Please reinstall the server."
      );
      return [];
    }

    // Execute the list command with JSON output
    const result = await execAsync(
      `cd "${installationPath}" && "${venvPython}" -m ifs_cloud_mcp_server.main list --json`
    );

    if (result.stdout) {
      try {
        const versionData = JSON.parse(result.stdout.trim());
        return versionData.versions || [];
      } catch (parseError) {
        console.error("Failed to parse version list JSON:", parseError);
        vscode.window.showErrorMessage(
          "Failed to parse version list from server."
        );
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Failed to list versions:", error);
    vscode.window.showErrorMessage(
      `Failed to list versions: ${error}`
    );
    return [];
  }
}

async function selectVersionFromList(): Promise<string | undefined> {
  const versions = await listAvailableVersions();
  
  if (versions.length === 0) {
    vscode.window.showInformationMessage(
      "No indexed versions found. Please index some IFS Cloud code first."
    );
    return undefined;
  }

  const selectedVersion = await vscode.window.showQuickPick(versions, {
    placeHolder: "Select an IFS Cloud version to use",
    canPickMany: false,
  });

  return selectedVersion;
}

// Helper function to check if any versions are available
async function checkVersionsAvailable(): Promise<boolean> {
  try {
    const config = vscode.workspace.getConfiguration("ifsCloudMcp");
    const installationPath = config.get<string>("installationPath");
    
    if (!installationPath || !fs.existsSync(installationPath)) {
      return false;
    }

    const pythonExecutable = await findPythonExecutable();
    if (!pythonExecutable) {
      return false;
    }

    const venvPath = path.join(installationPath, ".venv");
    const venvPython = process.platform === "win32"
      ? path.join(venvPath, "Scripts", "python.exe")
      : path.join(venvPath, "bin", "python");

    if (!fs.existsSync(venvPython)) {
      return false;
    }

    const listResult = await executeCommand(
      `cd "${installationPath}" && "${venvPython}" -m ifs_cloud_mcp_server.main list --json`
    );

    if (listResult.success && listResult.output) {
      try {
        const versions = JSON.parse(listResult.output);
        return versions && versions.length > 0;
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function showZipInstructions() {
  const instructionsContent = `# 📦 IFS Cloud ZIP Import Instructions

## Quick Start Guide

To use the IFS Cloud MCP Server with AI assistance, you need to:

### Step 1: Import IFS Cloud ZIP File
1. Use command: **IFS Cloud: Import IFS Cloud ZIP File**
2. Select your IFS Cloud release ZIP file (e.g., IFS_Cloud_24.2.1.zip)
3. Enter a version identifier (e.g., "24.2.1", "latest", "custom_build")
4. Wait for extraction and indexing to complete

### Step 2: Start the Server
1. Use command: **IFS Cloud: Start IFS Cloud MCP Server**
2. The server will automatically use your imported files
3. Connect GitHub Copilot or other AI tools to the server

### Step 3: Enjoy Intelligent Code Analysis
- The AI can now analyze your entire IFS Cloud codebase
- Get suggestions based on existing patterns
- Find implementations across 15,000+ files instantly

## What Gets Imported?

The system extracts and indexes these IFS Cloud file types:
- **.entity** - Entity definitions and data models
- **.plsql** - Business logic and API implementations
- **.client** - UI definitions and user workflows
- **.projection** - Data access patterns and queries
- **.fragment** - UI components and fragments
- **.views** - Database views and queries
- **.storage** - Storage configurations
- **.plsvc** - Platform services

## File System Structure

Your imported files are organized as:
\`\`\`
%APPDATA%\\ifs_cloud_mcp_server\\
├── extracts\\
│   ├── 24.2.1\\          # Your imported files
│   └── latest\\
└── indexes\\
    ├── 24.2.1\\          # Search indexes
    └── latest\\
\`\`\`

## Version Management

You can import multiple versions:
- **24.2.1** - Official release
- **latest** - Latest development build
- **custom_build** - Your custom modifications

## Need Help?

- **Import ZIP**: Use "IFS Cloud: Import IFS Cloud ZIP File"
- **List Versions**: Use "IFS Cloud: List Available Versions"
- **Start Server**: Use "IFS Cloud: Start IFS Cloud MCP Server"
- **Troubleshoot**: Use "IFS Cloud: Troubleshoot Installation"

Ready to import your first ZIP file? Use the **Import IFS Cloud ZIP File** command!`;

  const document = await vscode.workspace.openTextDocument({
    content: instructionsContent,
    language: "markdown",
  });
  await vscode.window.showTextDocument(document);
}

async function importZipFile() {
  try {
    const config = vscode.workspace.getConfiguration("ifsCloudMcp");
    const installationPath = config.get<string>("installationPath");
    
    if (!installationPath || !fs.existsSync(installationPath)) {
      vscode.window.showErrorMessage(
        "IFS Cloud MCP Server is not installed. Please install it first using 'IFS Cloud: Install IFS Cloud MCP Server'."
      );
      return;
    }

    // Check if Python environment is set up
    const pythonExecutable = await findPythonExecutable();
    if (!pythonExecutable) {
      vscode.window.showErrorMessage(
        "Python not found. Please install Python and try again."
      );
      return;
    }

    const venvPath = path.join(installationPath, ".venv");
    const venvPython = process.platform === "win32"
      ? path.join(venvPath, "Scripts", "python.exe")
      : path.join(venvPath, "bin", "python");

    if (!fs.existsSync(venvPython)) {
      vscode.window.showErrorMessage(
        "Virtual environment not found. Please reinstall the MCP server."
      );
      return;
    }

    // Show file picker for ZIP file
    const zipFileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Select IFS Cloud ZIP File",
      filters: {
        "ZIP Files": ["zip"],
        "All Files": ["*"]
      }
    });

    if (!zipFileUri || zipFileUri.length === 0) {
      return;
    }

    const zipFilePath = zipFileUri[0].fsPath;

    // Ask for version identifier
    const version = await vscode.window.showInputBox({
      prompt: "Enter a version identifier for this import (e.g., '24.2.1', 'latest', 'custom_build')",
      placeHolder: "24.2.1",
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return "Version identifier is required";
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
          return "Version identifier can only contain letters, numbers, dots, hyphens, and underscores";
        }
        return undefined;
      }
    });

    if (!version) {
      return;
    }

    // Show progress and execute import
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Importing IFS Cloud ZIP File",
        cancellable: false,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: "Starting import..." });
        mcpOutputChannel.show();
        mcpOutputChannel.appendLine(`🚀 Starting IFS Cloud ZIP import...`);
        mcpOutputChannel.appendLine(`📦 ZIP file: ${zipFilePath}`);
        mcpOutputChannel.appendLine(`🏷️  Version: ${version}`);

        const importCommand = `cd "${installationPath}" && "${venvPython}" -m ifs_cloud_mcp_server.main import "${zipFilePath}" --version "${version}" --log-level INFO`;
        
        progress.report({ increment: 10, message: "Extracting files..." });
        
        const importResult = await executeCommand(importCommand);
        
        if (importResult.success) {
          progress.report({ increment: 90, message: "Import completed successfully!" });
          
          mcpOutputChannel.appendLine("✅ Import completed successfully!");
          mcpOutputChannel.appendLine(`📁 Version: ${version}`);
          if (importResult.output) {
            mcpOutputChannel.appendLine(importResult.output);
          }
          
          vscode.window.showInformationMessage(
            `IFS Cloud ZIP file imported successfully as version '${version}'. You can now start the MCP server with this version.`,
            "Start Server"
          ).then((selection) => {
            if (selection === "Start Server") {
              startMcpServer();
            }
          });
          
        } else {
          progress.report({ increment: 100, message: "Import failed" });
          
          mcpOutputChannel.appendLine("❌ Import failed!");
          if (importResult.error) {
            mcpOutputChannel.appendLine(`Error: ${importResult.error}`);
          }
          
          vscode.window.showErrorMessage(
            `Failed to import ZIP file: ${importResult.error || "Unknown error"}`
          );
        }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    mcpOutputChannel.appendLine(`Error importing ZIP file: ${errorMessage}`);
    vscode.window.showErrorMessage(`Failed to import ZIP file: ${errorMessage}`);
  }
}

async function installMcpServer() {
  try {
    const result = await vscode.window.showInformationMessage(
      "Install IFS Cloud MCP Server by cloning from GitHub?",
      "Install",
      "Cancel"
    );

    if (result === "Install") {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Installing IFS Cloud MCP Server",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 10,
            message: "Checking prerequisites...",
          });

          // Check if git is installed
          const gitCheck = await executeCommand("git --version");
          if (!gitCheck.success) {
            vscode.window.showErrorMessage(
              "Git is not installed. Please install Git first."
            );
            return;
          }

          // Check if python is installed
          const pythonExecutable = await findPythonExecutable();
          if (!pythonExecutable) {
            vscode.window.showErrorMessage(
              "Python is not installed or not found in PATH. Please install Python, UV, Conda, or Mamba first."
            );
            return;
          }

          progress.report({
            increment: 20,
            message: `Using Python: ${pythonExecutable}`,
          });

          progress.report({
            increment: 20,
            message: "Creating installation directory...",
          });

          // Create installation directory in user's home
          const os = require("os");
          const path = require("path");
          const homeDir = os.homedir();
          const installDir = path.join(homeDir, ".ifs-cloud-mcp-server");

          // Check if installation already exists
          if (fs.existsSync(installDir)) {
            progress.report({
              increment: 0,
              message: "Existing installation detected...",
            });

            // Show dialog asking if user wants to overwrite
            const overwriteResult = await vscode.window.showWarningMessage(
              `An existing IFS Cloud MCP Server installation was found at:\n${installDir}\n\nDo you want to overwrite it?`,
              { modal: true },
              "Overwrite",
              "Cancel"
            );

            if (overwriteResult !== "Overwrite") {
              vscode.window.showInformationMessage(
                "Installation cancelled. Existing installation preserved."
              );
              return;
            }

            progress.report({
              increment: 10,
              message: "Removing existing installation...",
            });
          }

          // Remove existing installation if it exists (after user confirmation)
          const removeResult = await executeCommand(
            `rmdir /s /q "${installDir}" 2>nul || rm -rf "${installDir}" 2>/dev/null || true`
          );

          progress.report({ increment: 40, message: "Cloning repository..." });

          // Clone the repository
          const cloneResult = await executeCommand(
            `git clone https://github.com/graknol/ifs-cloud-core-mcp-server.git "${installDir}"`
          );

          if (!cloneResult.success) {
            vscode.window.showErrorMessage(
              `Failed to clone repository: ${cloneResult.error}`
            );
            return;
          }

          progress.report({
            increment: 50,
            message: "Creating virtual environment...",
          });

          // Create virtual environment (using .venv as standard convention)
          const venvPath = path.join(installDir, ".venv");
          const createVenvResult = await executeCommand(
            `cd "${installDir}" && ${pythonExecutable} -m venv .venv`
          );

          if (!createVenvResult.success) {
            vscode.window.showErrorMessage(
              `Failed to create virtual environment: ${createVenvResult.error}`
            );
            return;
          }

          progress.report({
            increment: 60,
            message: "Installing Python dependencies...",
          });

          // Determine the virtual environment Python executable
          const venvPython =
            process.platform === "win32"
              ? path.join(venvPath, "Scripts", "python.exe")
              : path.join(venvPath, "bin", "python");

          // Install dependencies in virtual environment
          const installDepsResult = await executeCommand(
            `cd "${installDir}" && "${venvPython}" -m pip install -e .`
          );

          if (!installDepsResult.success) {
            vscode.window.showErrorMessage(
              `Failed to install dependencies: ${installDepsResult.error}`
            );
            return;
          }

          progress.report({
            increment: 80,
            message: "Configuring server path...",
          });

          // Set the server path to the Python script in virtual environment
          const serverScriptPath = path.join(
            installDir,
            "src",
            "ifs_cloud_mcp_server",
            "main.py"
          );
          const serverCommand = `"${venvPython}" "${serverScriptPath}"`;

          progress.report({
            increment: 90,
            message: "Updating configuration...",
          });

          // Update configuration with the Python script path
          const config = vscode.workspace.getConfiguration("ifsCloudMcp");
          await config.update(
            "serverPath",
            serverCommand,
            vscode.ConfigurationTarget.Global
          );

          // Also store the installation directory for future reference
          await config.update(
            "installationPath",
            installDir,
            vscode.ConfigurationTarget.Global
          );

          progress.report({
            increment: 100,
            message: "Installation complete!",
          });

          vscode.window.showInformationMessage(
            `IFS Cloud MCP Server installed successfully at: ${installDir}`
          );
        }
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Installation error: ${error}`);
  }
}

async function startMcpServer() {
  if (mcpServerProcess) {
    vscode.window.showWarningMessage("MCP Server is already running");
    return;
  }

  try {
    const config = vscode.workspace.getConfiguration("ifsCloudMcp");
    const serverPath =
      config.get<string>("serverPath") ||
      config.get<string>("installationPath");
    const indexPath = config.get<string>("indexPath");

    if (!serverPath) {
      const result = await vscode.window.showErrorMessage(
        "MCP Server path not configured. Install the server first?",
        "Install",
        "Configure"
      );
      if (result === "Install") {
        await installMcpServer();
      } else if (result === "Configure") {
        await configureMcpServer();
      }
      return;
    }

    // Check if any versions are available before starting
    const versionsAvailable = await checkVersionsAvailable();
    if (!versionsAvailable) {
      const result = await vscode.window.showErrorMessage(
        "No IFS Cloud versions found. You need to import at least one ZIP file before starting the server.",
        "Import ZIP File",
        "View Instructions"
      );
      if (result === "Import ZIP File") {
        await importZipFile();
      } else if (result === "View Instructions") {
        vscode.window.showInformationMessage(
          "To use the IFS Cloud MCP Server, you need to:\n" +
          "1. Import an IFS Cloud ZIP file using 'IFS Cloud: Import IFS Cloud ZIP File'\n" +
          "2. Start the server with 'IFS Cloud: Start IFS Cloud MCP Server'\n" +
          "3. The server will use the imported files for intelligent code analysis"
        );
      }
      return;
    }

    // Determine the correct Python executable and server path
    let pythonExecutable: string;
    let serverMainFile: string;

    const installationPath = config.get<string>("installationPath");

    if (installationPath && fs.existsSync(installationPath)) {
      // We have an installation path, use virtual environment Python
      const venvPath = path.join(installationPath, ".venv");
      const venvPython =
        process.platform === "win32"
          ? path.join(venvPath, "Scripts", "python.exe")
          : path.join(venvPath, "bin", "python");

      if (fs.existsSync(venvPython)) {
        pythonExecutable = venvPython;
        serverMainFile = path.join(
          installationPath,
          "src",
          "ifs_cloud_mcp_server",
          "main.py"
        );
      } else {
        vscode.window.showErrorMessage(
          `Virtual environment Python not found at '${venvPython}'. Please reinstall the server.`
        );
        return;
      }
    } else if (serverPath) {
      // Legacy serverPath configuration or custom installation
      const detectedPython = await findPythonExecutable();
      if (!detectedPython) {
        vscode.window.showErrorMessage(
          "Python not found. Please ensure Python, UV, Conda, or Mamba is installed and in your PATH."
        );
        return;
      }
      pythonExecutable = detectedPython;
      serverMainFile = path.join(
        serverPath,
        "src",
        "ifs_cloud_mcp_server",
        "main.py"
      );
    } else {
      vscode.window.showErrorMessage(
        "MCP Server not configured. Please install the server first."
      );
      return;
    }

    if (!fs.existsSync(serverMainFile)) {
      const result = await vscode.window.showErrorMessage(
        `MCP Server not found at '${serverMainFile}'. Would you like to install it?`,
        "Install Server",
        "Configure Path"
      );

      if (result === "Install Server") {
        await installMcpServer();
        return;
      } else if (result === "Configure Path") {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "@ext:ifs-cloud.ifs-cloud-mcp"
        );
        return;
      }
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting IFS Cloud MCP Server",
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 50, message: "Launching server..." });

        // Use detected Python to run the server as a module (not directly)
        const args = ["-m", "ifs_cloud_mcp_server.main", "server"];
        
        // Check if a version is selected (new version-based startup)
        const selectedVersion = config.get<string>("selectedVersion");
        const indexPath = config.get<string>("indexPath");
        
        if (selectedVersion) {
          // Use version-based startup (preferred)
          args.push("--version", selectedVersion);
          mcpOutputChannel.appendLine(`Using version: ${selectedVersion}`);
        } else if (indexPath) {
          // Fall back to index path if no version selected
          args.push("--index-path", indexPath);
          mcpOutputChannel.appendLine(`Using index path: ${indexPath}`);
        } else {
          mcpOutputChannel.appendLine("No version or index path configured - using server defaults");
        }

        // Handle complex Python commands (like "uv run python" or "conda run -n base python")
        let spawnCommand: string;
        let spawnArgs: string[];

        if (pythonExecutable.includes(" ")) {
          // Complex command - split it
          const parts = pythonExecutable.split(" ");
          spawnCommand = parts[0];
          spawnArgs = [...parts.slice(1), ...args];
        } else {
          // Simple command
          spawnCommand = pythonExecutable;
          spawnArgs = args;
        }

        // Use the new subprocess function for better output capture
        mcpServerProcess = createSubprocess(
          spawnCommand,
          spawnArgs,
          {
            cwd: installationPath || serverPath || path.dirname(serverMainFile),
          },
          mcpOutputChannel
        );

        // Capture stderr output for error diagnosis and output channel
        let errorOutput = "";
        if (mcpServerProcess.stderr) {
          mcpServerProcess.stderr.on("data", (data) => {
            const text = data.toString();
            errorOutput += text;
          });
        }

        // Capture stdout for debugging and output channel
        let stdoutOutput = "";
        if (mcpServerProcess.stdout) {
          mcpServerProcess.stdout.on("data", (data) => {
            const text = data.toString();
            stdoutOutput += text;
          });
        }

        mcpServerProcess.on("error", (error: any) => {
          let errorMessage = `Failed to start MCP Server: ${error.message}`;

          if (error.code === "ENOENT") {
            errorMessage =
              `Python command '${spawnCommand}' not found. Please ensure:\n` +
              `1. Python, UV, Conda, or Mamba is installed and in your PATH\n` +
              `2. The server is installed correctly\n` +
              `3. Try restarting VS Code after installation`;
          }

          vscode.window.showErrorMessage(errorMessage);
          mcpServerProcess = null;
          updateStatusBar();
        });

        mcpServerProcess.on("exit", (code) => {
          if (code !== 0) {
            let errorMessage = `MCP Server exited with code ${code}`;

            if (errorOutput.trim()) {
              errorMessage += `\n\nError output:\n${errorOutput.trim()}`;
            }

            if (stdoutOutput.trim()) {
              errorMessage += `\n\nOutput:\n${stdoutOutput.trim()}`;
            }

            vscode.window.showErrorMessage(errorMessage);
          }
          mcpServerProcess = null;
          updateStatusBar();
        });

        // Give the server a moment to start
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (mcpServerProcess && !mcpServerProcess.killed) {
          progress.report({ increment: 100, message: "Server started!" });
          vscode.window.showInformationMessage(
            "IFS Cloud MCP Server started successfully!"
          );
          updateStatusBar();
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start MCP Server: ${error}`);
    updateStatusBar();
  }
}

async function stopMcpServer() {
  if (!mcpServerProcess) {
    vscode.window.showWarningMessage("MCP Server is not running");
    return;
  }

  try {
    mcpServerProcess.kill("SIGTERM");
    mcpServerProcess = null;
    updateStatusBar();
    vscode.window.showInformationMessage("IFS Cloud MCP Server stopped");
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop MCP Server: ${error}`);
  }
}

async function checkServerStatus() {
  const isRunning = mcpServerProcess !== null && !mcpServerProcess.killed;
  const status = isRunning ? "Running" : "Stopped";
  const icon = isRunning ? "$(check)" : "$(circle-slash)";

  vscode.window.showInformationMessage(
    `IFS Cloud MCP Server Status: ${status}`
  );
  updateStatusBar();
}

async function configureMcpServer() {
  const config = vscode.workspace.getConfiguration("ifsCloudMcp");

  const options = [
    "Select Version",
    "List Available Versions", 
    "Set Server Path",
    "Browse for Server Installation",
    "Set Index Path",
    "Toggle Auto-Start",
    "Open Settings",
  ];

  const selection = await vscode.window.showQuickPick(options, {
    placeHolder: "Choose configuration option",
  });

  switch (selection) {
    case "Select Version":
      const selectedVersion = await selectVersionFromList();
      if (selectedVersion) {
        await config.update(
          "selectedVersion",
          selectedVersion,
          vscode.ConfigurationTarget.Global
        );
        // Clear index path since we're using version-based startup
        await config.update(
          "indexPath",
          undefined,
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(
          `Selected version: ${selectedVersion}. Server will use version-based startup.`
        );
      }
      break;

    case "List Available Versions":
      const versions = await listAvailableVersions();
      if (versions.length === 0) {
        vscode.window.showInformationMessage(
          "No indexed versions found. Please index some IFS Cloud code first."
        );
      } else {
        const versionList = versions.join("\n• ");
        vscode.window.showInformationMessage(
          `Available versions:\n• ${versionList}`,
          { modal: true }
        );
      }
      break;

    case "Set Server Path":
      const serverPath = await vscode.window.showInputBox({
        prompt: "Enter the path to the IFS Cloud MCP Server executable",
        value: config.get<string>("serverPath") || "ifs-cloud-mcp-server",
      });
      if (serverPath) {
        await config.update(
          "serverPath",
          serverPath,
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage("Server path updated");
      }
      break;

    case "Browse for Server Installation":
      // Show folder picker for server installation directory
      const serverFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Server Installation Folder",
        title: "Choose the IFS Cloud MCP Server installation directory",
        defaultUri: config.get<string>("installationPath")
          ? vscode.Uri.file(config.get<string>("installationPath")!)
          : undefined,
      });

      if (serverFolders && serverFolders.length > 0) {
        const selectedPath = serverFolders[0].fsPath;
        await config.update(
          "installationPath",
          selectedPath,
          vscode.ConfigurationTarget.Global
        );

        // Also update the server path to use the virtual environment Python
        const venvPython =
          process.platform === "win32"
            ? path.join(selectedPath, ".venv", "Scripts", "python.exe")
            : path.join(selectedPath, ".venv", "bin", "python");

        if (fs.existsSync(venvPython)) {
          const serverMainFile = path.join(
            selectedPath,
            "src",
            "ifs_cloud_mcp_server",
            "main.py"
          );
          const serverCommand = `"${venvPython}" "${serverMainFile}"`;
          await config.update(
            "serverPath",
            serverCommand,
            vscode.ConfigurationTarget.Global
          );
          vscode.window.showInformationMessage(
            `Server installation updated to: ${selectedPath}`
          );
        } else {
          vscode.window.showWarningMessage(
            `Selected folder but virtual environment not found at: ${venvPython}`
          );
        }
      }
      break;

    case "Set Index Path":
      // Show folder picker dialog for easier navigation
      const selectedFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select IFS Cloud Code Index Folder",
        title: "Choose the directory containing your IFS Cloud code files",
        defaultUri: config.get<string>("indexPath")
          ? vscode.Uri.file(config.get<string>("indexPath")!)
          : undefined,
      });

      if (selectedFolders && selectedFolders.length > 0) {
        const selectedPath = selectedFolders[0].fsPath;
        await config.update(
          "indexPath",
          selectedPath,
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(
          `Index path updated to: ${selectedPath}`
        );
      }
      break;

    case "Toggle Auto-Start":
      const autoStart = !config.get<boolean>("autoStart");
      await config.update(
        "autoStart",
        autoStart,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        `Auto-start ${autoStart ? "enabled" : "disabled"}`
      );
      break;

    case "Open Settings":
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "ifsCloudMcp"
      );
      break;
  }
}

function updateStatusBar() {
  const mcpRunning = mcpServerProcess !== null && !mcpServerProcess.killed;
  const webUIRunning = webUIProcess !== null && !webUIProcess.killed;
  
  // Get the selected version to display in status
  const config = vscode.workspace.getConfiguration("ifsCloudMcp");
  const selectedVersion = config.get<string>("selectedVersion");
  const versionText = selectedVersion ? ` (v:${selectedVersion})` : "";

  let text = "";
  let backgroundColor = undefined;

  if (mcpRunning && webUIRunning) {
    text = `$(check) MCP: Running${versionText} | Web UI: Running`;
  } else if (mcpRunning) {
    text = `$(check) MCP: Running${versionText} | $(circle-slash) Web UI: Stopped`;
  } else if (webUIRunning) {
    text = `$(circle-slash) MCP: Stopped | $(check) Web UI: Running${versionText}`;
  } else {
    text = `$(circle-slash) MCP: Stopped | Web UI: Stopped${versionText}`;
    backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  }

  statusBarItem.text = text;
  statusBarItem.backgroundColor = backgroundColor;
}

function executeCommand(
  command: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
}

async function findPythonExecutable(): Promise<string | null> {
  // List of Python executables to try, in order of preference
  const pythonCandidates = [
    "python", // Standard Python
    "python3", // Python 3 specific
    "py", // Python Launcher for Windows
    "uv run python", // UV Python
    "conda run -n base python", // Conda base environment
    "mamba run -n base python", // Mamba base environment
  ];

  for (const candidate of pythonCandidates) {
    try {
      const result = await executeCommand(`${candidate} --version`);
      if (result.success) {
        return candidate;
      }
    } catch (error) {
      // Continue to next candidate
    }
  }

  return null;
}

async function startWebUI() {
  if (webUIProcess) {
    vscode.window.showWarningMessage("Web UI is already running");
    return;
  }

  try {
    const config = vscode.workspace.getConfiguration("ifsCloudMcp");
    const installationPath = config.get<string>("installationPath");

    if (!installationPath || !fs.existsSync(installationPath)) {
      vscode.window.showErrorMessage(
        "MCP Server not installed. Please install the server first."
      );
      return;
    }

    // Check if any versions are available before starting Web UI
    const versionsAvailable = await checkVersionsAvailable();
    if (!versionsAvailable) {
      const result = await vscode.window.showErrorMessage(
        "No IFS Cloud versions found. You need to import at least one ZIP file before starting the Web UI.",
        "Import ZIP File",
        "View Instructions"
      );
      if (result === "Import ZIP File") {
        await importZipFile();
      } else if (result === "View Instructions") {
        vscode.window.showInformationMessage(
          "To use the IFS Cloud Web UI, you need to:\n" +
          "1. Import an IFS Cloud ZIP file using 'IFS Cloud: Import IFS Cloud ZIP File'\n" +
          "2. Start the Web UI with 'IFS Cloud: Start Web UI'\n" +
          "3. The Web UI will provide a visual interface to browse your imported files"
        );
      }
      return;
    }

    // Check if virtual environment exists
    const venvPath = path.join(installationPath, ".venv");
    const venvPython =
      process.platform === "win32"
        ? path.join(venvPath, "Scripts", "python.exe")
        : path.join(venvPath, "bin", "python");

    if (!fs.existsSync(venvPython)) {
      vscode.window.showErrorMessage(
        "Virtual environment not found. Please reinstall the server."
      );
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting IFS Cloud MCP Web UI",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 50, message: "Launching Web UI..." });

        // Clear output channel and log startup
        webUIOutputChannel.clear();

        // Get configuration from workspace
        const config = vscode.workspace.getConfiguration("ifsCloudMcp");
        const selectedVersion = config.get<string>("selectedVersion");
        const indexPath = config.get<string>("indexPath");

        // Build the command arguments for module-based execution
        const args = ["-m", "src.ifs_cloud_mcp_server.web_ui"];

        // Add version or index path based on configuration (version takes precedence)
        if (selectedVersion) {
          args.push("--version", selectedVersion);
          webUIOutputChannel.appendLine(`Using version: ${selectedVersion}`);
        } else if (indexPath) {
          args.push("--index-path", indexPath);
          webUIOutputChannel.appendLine(`Using index path: ${indexPath}`);
        } else {
          webUIOutputChannel.appendLine("No version or index path configured - using defaults");
        }

        // The web_ui module automatically finds an available port in the 5700-5799 range
        // and uses default settings unless overridden by environment variables

        const commandStr = `${venvPython} ${args.join(" ")}`;
        webUIOutputChannel.appendLine(`Starting Web UI: ${commandStr}`);
        webUIOutputChannel.appendLine(`Working directory: ${installationPath}`);
        webUIOutputChannel.appendLine("---");

        // Start the IFS Cloud MCP Server web UI with UTF-8 encoding support
        const env = { ...process.env };

        // Set environment variables to handle UTF-8 encoding on Windows
        if (process.platform === "win32") {
          env.PYTHONIOENCODING = "utf-8";
          env.PYTHONUTF8 = "1";
        }

        // Use the new subprocess function for better output capture
        webUIProcess = createSubprocess(
          venvPython,
          args,
          {
            cwd: installationPath,
            env: env,
          },
          webUIOutputChannel
        );

        // Set up stderr parsing for URL detection (Uvicorn logs to stderr)
        if (webUIProcess.stderr) {
          webUIProcess.stderr.on("data", (data) => {
            const text = data.toString();

            // Debug: Log each line we're checking for URL detection
            const lines = text.split("\n");
            for (const line of lines) {
              if (
                line.trim() &&
                (line.includes("http") ||
                  line.includes("localhost") ||
                  line.includes("0.0.0.0") ||
                  line.includes("5700"))
              ) {
                webUIOutputChannel.appendLine(
                  `[URL DEBUG] Checking stderr line: "${line.trim()}"`
                );
              }
            }

            // Look for URL patterns in the stderr output - web_ui uses 5700-5799 port range
            let urlMatch = null;

            // Try to match full URLs first (Uvicorn format: "Uvicorn running on http://0.0.0.0:5700")
            urlMatch = text.match(
              /(?:Interface will be available at|Uvicorn running on|Running on|Server running at|Available at|Serving at)[\s:]*(http:\/\/[^\s]+)/i
            );

            if (!urlMatch) {
              // Try to match just the port number patterns
              urlMatch = text.match(
                /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4})/i
              );
              if (urlMatch && urlMatch[1]) {
                // Port number captured, construct the full URL
                webUIUrl = `http://localhost:${urlMatch[1]}`;
                webUIOutputChannel.appendLine(
                  `\n[URL DETECTED] From stderr port: ${webUIUrl}`
                );
              }
            } else if (urlMatch[1]) {
              // Full URL captured, use it directly but convert 0.0.0.0 to localhost for browser
              webUIUrl = urlMatch[1].replace("0.0.0.0", "localhost");
              webUIOutputChannel.appendLine(
                `\n[URL DETECTED] From stderr URL: ${webUIUrl}`
              );
            }
          });
        }

        // Keep stdout handler for any other output but remove URL detection
        if (webUIProcess.stdout) {
          webUIProcess.stdout.on("data", (data) => {
            const text = data.toString();
            // Just log stdout data without URL detection since Uvicorn uses stderr
            webUIOutputChannel.appendLine(`[STDOUT DATA] ${text.trim()}`);
          });
        }

        webUIProcess.on("error", (error: any) => {
          vscode.window.showErrorMessage(
            `Failed to start Web UI: ${error.message}`
          );
          webUIProcess = null;
          webUIUrl = null; // Clear the stored URL
          updateStatusBar();
        });

        webUIProcess.on("exit", (code) => {
          if (code !== 0) {
            vscode.window.showWarningMessage(`Web UI exited with code ${code}`);
          }
          webUIProcess = null;
          webUIUrl = null; // Clear the stored URL
          updateStatusBar();
        });

        // Give the web UI a moment to start
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (webUIProcess && !webUIProcess.killed) {
          progress.report({ increment: 100, message: "Web UI started!" });
          vscode.window.showInformationMessage(
            "IFS Cloud MCP Web UI started! Check the output panel for the URL."
          );
          // Show the web UI output channel
          webUIOutputChannel.show();
          updateStatusBar();
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start Web UI: ${error}`);
  }
}

async function stopWebUI() {
  if (!webUIProcess) {
    vscode.window.showWarningMessage("Web UI is not running");
    return;
  }

  try {
    webUIProcess.kill("SIGTERM");
    webUIProcess = null;
    webUIUrl = null; // Clear the stored URL
    webUIOutputChannel.appendLine("Web UI stopped by user");
    vscode.window.showInformationMessage("IFS Cloud MCP Web UI stopped");
    updateStatusBar();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop Web UI: ${error}`);
  }
}

async function openWebUIInBrowser() {
  if (!webUIProcess) {
    vscode.window.showWarningMessage(
      "Web UI is not running. Please start it first."
    );
    return;
  }

  if (webUIUrl) {
    // If we already have the URL, open it directly
    vscode.env.openExternal(vscode.Uri.parse(webUIUrl));
    return;
  }

  // Try the default URL range if detection hasn't worked yet
  const defaultUrl = "http://localhost:5700"; // Start of the 5700-5799 range
  const result = await vscode.window.showWarningMessage(
    "Web UI URL not detected yet. Try opening the default URL?",
    "Open Default URL",
    "Wait"
  );

  if (result === "Open Default URL") {
    vscode.env.openExternal(vscode.Uri.parse(defaultUrl));
  }
}

export function deactivate() {
  if (mcpServerProcess) {
    mcpServerProcess.kill("SIGTERM");
    mcpServerProcess = null;
  }
  if (webUIProcess) {
    webUIProcess.kill("SIGTERM");
    webUIProcess = null;
  }
  webUIUrl = null; // Clear the stored URL
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
