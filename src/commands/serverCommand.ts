import * as vscode from "vscode";
import { CLIManager } from "../cli/cliManager";
import { StatusManager } from "../ui/statusManager";

export class ServerCommand {
  constructor(
    private cliManager: CLIManager,
    private statusManager: StatusManager
  ) {}

  /**
   * Start MCP server (implements SERVER command)
   */
  async startMcpServer(): Promise<void> {
    const currentProcess = this.statusManager.getMcpServerProcess();
    if (currentProcess && !currentProcess.killed) {
      vscode.window.showInformationMessage("MCP server is already running.");
      return;
    }

    const versions = await this.cliManager.listVersions();
    const readyVersions = versions.filter(
      (v) => v.is_ready || (v.has_pagerank && v.has_bm25s && v.has_faiss)
    );

    if (readyVersions.length === 0) {
      const action = await vscode.window.showInformationMessage(
        "No versions are ready for the MCP server. You need at least one version with search indexes (PageRank, BM25S, and FAISS).",
        "Fast Setup",
        "Complete Setup",
        "Cancel"
      );

      if (action === "Fast Setup") {
        const { SetupCommands } = await import("./setupCommands");
        const setupCommands = new SetupCommands(
          this.cliManager,
          this.statusManager
        );
        await setupCommands.fastSetup();
      } else if (action === "Complete Setup") {
        const { SetupCommands } = await import("./setupCommands");
        const setupCommands = new SetupCommands(
          this.cliManager,
          this.statusManager
        );
        await setupCommands.completeSetup();
      }
      return;
    }

    const versionOptions = readyVersions.map((v) => ({
      label: v.version,
      description: `BM25S: ${v.has_bm25s ? "✓" : "✗"}, FAISS: ${
        v.has_faiss ? "✓" : "✗"
      }`,
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to serve",
    });

    if (!selected) {
      return;
    }

    try {
      // Test if CLI manager is working properly
      const testResult = await this.cliManager.executeCLI("--help", [], false);
      if (testResult.exitCode !== 0) {
        vscode.window.showErrorMessage(
          "MCP server CLI not accessible. Please ensure the server is properly installed."
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const outputChannel = this.statusManager.getOutputChannel();

      outputChannel.clear();
      outputChannel.appendLine(
        `Starting MCP Server for version: ${selected.label}`
      );
      outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
      outputChannel.appendLine("---");

      // Use cliManager to spawn the server process with proper UV environment
      const mcpServerProcess = await this.cliManager.spawnProcess(
        "server",
        [
          "--version",
          selected.label,
          "--name",
          "ifs-cloud-mcp-server",
          "--transport",
          "stdio",
          "--log-level",
          "INFO",
        ],
        { cwd: workspaceRoot }
      );

      if (mcpServerProcess.stdout) {
        mcpServerProcess.stdout.on("data", (data) => {
          outputChannel.appendLine(data.toString());
        });
      }

      if (mcpServerProcess.stderr) {
        mcpServerProcess.stderr.on("data", (data) => {
          outputChannel.appendLine(`STDERR: ${data.toString()}`);
        });
      }

      mcpServerProcess.on("close", (code) => {
        outputChannel.appendLine(`MCP server exited with code ${code}`);
        this.statusManager.setMcpServerProcess(null);
        this.updateStatus();
      });

      mcpServerProcess.on("error", (error) => {
        outputChannel.appendLine(`MCP server error: ${error.message}`);
        vscode.window.showErrorMessage(`MCP server error: ${error.message}`);
        this.statusManager.setMcpServerProcess(null);
        this.updateStatus();
      });

      this.statusManager.setMcpServerProcess(mcpServerProcess);
      vscode.window.showInformationMessage(
        `MCP server started for version "${selected.label}".`
      );
      this.updateStatus();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start MCP server: ${error}`);
      this.statusManager.setMcpServerProcess(null);
      this.updateStatus();
    }
  }

  /**
   * Stop MCP server
   */
  async stopMcpServer(): Promise<void> {
    const mcpServerProcess = this.statusManager.getMcpServerProcess();
    if (!mcpServerProcess || mcpServerProcess.killed) {
      vscode.window.showInformationMessage("MCP server is not running.");
      return;
    }

    try {
      mcpServerProcess.kill("SIGTERM");

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (mcpServerProcess && !mcpServerProcess.killed) {
        mcpServerProcess.kill("SIGKILL");
      }

      this.statusManager.setMcpServerProcess(null);
      this.updateStatus();

      vscode.window.showInformationMessage("MCP server stopped.");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to stop MCP server: ${error}`);
    }
  }

  private async updateStatus(): Promise<void> {
    const versions = await this.cliManager.listVersions();
    await this.statusManager.updateStatusBar(versions);
  }
}
