import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";
import { CLIManager } from "../cli/cliManager";
import { ServerNotInstalledError } from "../cli/types";

export class StatusManager {
  private statusBarItem!: vscode.StatusBarItem;
  private mcpOutputChannel!: vscode.OutputChannel;
  private mcpServerProcess: ChildProcess | null = null;

  constructor(private cliManager: CLIManager) {}

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    // Create output channel
    this.mcpOutputChannel = vscode.window.createOutputChannel(
      "IFS Cloud MCP Server"
    );
    context.subscriptions.push(this.mcpOutputChannel);

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.tooltip = "Click to start/stop MCP server";
    this.statusBarItem.command = "ifsCloudMcp.smartServerToggle";
    context.subscriptions.push(this.statusBarItem);

    // Initial update with actual version data
    await this.refreshStatus();
  }

  /**
   * Refresh status by fetching current versions
   */
  async refreshStatus(): Promise<void> {
    try {
      const versions = await this.cliManager.listVersions(true);
      await this.updateStatusBar(versions);
    } catch (error) {
      if (error instanceof ServerNotInstalledError) {
        // Server not installed - show install prompt
        this.statusBarItem.text = "$(download) IFS MCP: Install";
        this.statusBarItem.tooltip = "Click to install IFS Cloud MCP Server";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.prominentBackground"
        );
        this.statusBarItem.show();
      } else {
        console.log(
          "Failed to fetch versions on startup, showing default status:",
          error
        );
        // Show initial status without versions
        this.statusBarItem.text = "$(circle-outline) IFS MCP: Not ready";
        this.statusBarItem.tooltip = "Click to open IFS Cloud MCP commands";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground"
        );
        this.statusBarItem.show();
      }
    }
  }

  async updateStatusBar(versions: any[]): Promise<void> {
    try {
      const mcpRunning = this.mcpServerProcess && !this.mcpServerProcess.killed;

      let status = "";
      let color = "";
      let tooltip = "";

      if (mcpRunning) {
        status = "$(server-process) IFS MCP: Running";
        color = "";
        tooltip = "Click to stop MCP server";
      } else if (versions.length > 0) {
        const readyVersions = versions.filter(
          (v) => v.is_ready || (v.has_pagerank && v.has_bm25s && v.has_faiss)
        );
        if (readyVersions.length > 0) {
          status = `$(database) IFS MCP: ${readyVersions.length} ready`;
          color = "";
          tooltip = "Click to start MCP server";
        } else {
          status = `$(warning) IFS MCP: ${versions.length} needs setup`;
          color = "statusBarItem.warningBackground";
          tooltip = "Click to open IFS Cloud MCP commands";
        }
      } else {
        status = "$(circle-outline) IFS MCP: No data";
        color = "statusBarItem.errorBackground";
        tooltip = "Click to open IFS Cloud MCP commands";
      }

      this.statusBarItem.text = status;
      this.statusBarItem.tooltip = tooltip;
      this.statusBarItem.backgroundColor = color
        ? new vscode.ThemeColor(color)
        : undefined;
      this.statusBarItem.show();
    } catch (error) {
      console.error("Failed to update status bar:", error);
      this.statusBarItem.text = "$(error) IFS MCP: Error";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground"
      );
      this.statusBarItem.show();
    }
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.mcpOutputChannel;
  }

  setMcpServerProcess(process: ChildProcess | null): void {
    this.mcpServerProcess = process;
  }

  getMcpServerProcess(): ChildProcess | null {
    return this.mcpServerProcess;
  }

  dispose(): void {
    if (this.mcpServerProcess) {
      this.mcpServerProcess.kill();
      this.mcpServerProcess = null;
    }
  }

  async openCommandPalette(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.action.quickOpen",
      ">IFS Cloud MCP: "
    );
  }
}
