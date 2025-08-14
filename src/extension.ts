import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec, spawn, ChildProcess } from "child_process";

let mcpServerProcess: ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;

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

  // Register commands
  const installCommand = vscode.commands.registerCommand(
    "ifs-cloud-mcp.install",
    async () => {
      await installMcpServer();
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

  context.subscriptions.push(
    installCommand,
    startCommand,
    stopCommand,
    statusCommand,
    configureCommand
  );

  // Auto-start if configured
  const config = vscode.workspace.getConfiguration("ifsCloudMcp");
  if (config.get("autoStart")) {
    startMcpServer();
  }
}

async function installMcpServer() {
  try {
    const result = await vscode.window.showInformationMessage(
      "Install IFS Cloud MCP Server from GitHub repository?",
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
            increment: 20,
            message: "Checking UV installation...",
          });

          // Check if UV is installed
          const uvCheck = await executeCommand("uv --version");
          if (!uvCheck.success) {
            vscode.window.showErrorMessage(
              "UV is not installed. Please install UV first: https://docs.astral.sh/uv/"
            );
            return;
          }

          progress.report({
            increment: 40,
            message: "Installing MCP server from GitHub...",
          });

          // Install the MCP server from GitHub
          const installResult = await executeCommand(
            "uv tool install git+https://github.com/graknol/ifs-cloud-core-mcp-server.git"
          );

          if (installResult.success) {
            progress.report({
              increment: 100,
              message: "Installation complete!",
            });
            vscode.window.showInformationMessage(
              "IFS Cloud MCP Server installed successfully!"
            );

            // Update configuration with installation path
            const config = vscode.workspace.getConfiguration("ifsCloudMcp");
            await config.update(
              "serverPath",
              "ifs-cloud-mcp-server",
              vscode.ConfigurationTarget.Global
            );
          } else {
            vscode.window.showErrorMessage(
              `Installation failed: ${installResult.error}`
            );
          }
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
    const serverPath = config.get<string>("serverPath");
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

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting IFS Cloud MCP Server",
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 50, message: "Launching server..." });

        const args = [];
        if (indexPath) {
          args.push("--index-path", indexPath);
        }

        mcpServerProcess = spawn(serverPath, args, {
          stdio: ["pipe", "pipe", "pipe"],
        });

        mcpServerProcess.on("error", (error) => {
          vscode.window.showErrorMessage(
            `Failed to start MCP Server: ${error.message}`
          );
          mcpServerProcess = null;
          updateStatusBar(false);
        });

        mcpServerProcess.on("exit", (code) => {
          if (code !== 0) {
            vscode.window.showWarningMessage(
              `MCP Server exited with code ${code}`
            );
          }
          mcpServerProcess = null;
          updateStatusBar(false);
        });

        // Give the server a moment to start
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (mcpServerProcess && !mcpServerProcess.killed) {
          progress.report({ increment: 100, message: "Server started!" });
          vscode.window.showInformationMessage(
            "IFS Cloud MCP Server started successfully!"
          );
          updateStatusBar(true);
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start MCP Server: ${error}`);
    updateStatusBar(false);
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
    updateStatusBar(false);
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
  updateStatusBar(isRunning);
}

async function configureMcpServer() {
  const config = vscode.workspace.getConfiguration("ifsCloudMcp");

  const options = [
    "Set Server Path",
    "Set Index Path",
    "Toggle Auto-Start",
    "Open Settings",
  ];

  const selection = await vscode.window.showQuickPick(options, {
    placeHolder: "Choose configuration option",
  });

  switch (selection) {
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

    case "Set Index Path":
      const indexPath = await vscode.window.showInputBox({
        prompt: "Enter the path to your IFS Cloud code index",
        value: config.get<string>("indexPath") || "",
      });
      if (indexPath !== undefined) {
        await config.update(
          "indexPath",
          indexPath,
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage("Index path updated");
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

function updateStatusBar(isRunning: boolean) {
  if (isRunning) {
    statusBarItem.text = "$(check) MCP Server: Running";
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = "$(circle-slash) MCP Server: Stopped";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }
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

export function deactivate() {
  if (mcpServerProcess) {
    mcpServerProcess.kill("SIGTERM");
    mcpServerProcess = null;
  }
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
