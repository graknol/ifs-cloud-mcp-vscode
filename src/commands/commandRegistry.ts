import * as vscode from "vscode";
import { CLIManager } from "../cli/cliManager";
import { StatusManager } from "../ui/statusManager";
import { ServerNotInstalledError } from "../cli/types";
import { InstallCommand } from "./installCommand";
import { ImportCommand } from "./importCommand";
import { ServerCommand } from "./serverCommand";
import { SetupCommands } from "./setupCommands";
import { IndexingCommands } from "./indexingCommands";
import { StatusCommands } from "./statusCommands";

export class CommandRegistry {
  private installCommand: InstallCommand;
  private importCommand: ImportCommand;
  private serverCommand: ServerCommand;
  private setupCommands: SetupCommands;
  private indexingCommands: IndexingCommands;
  private statusCommands: StatusCommands;

  constructor(
    private cliManager: CLIManager,
    private statusManager: StatusManager
  ) {
    this.installCommand = new InstallCommand(statusManager);
    this.importCommand = new ImportCommand(cliManager, statusManager);
    this.serverCommand = new ServerCommand(cliManager, statusManager);
    this.setupCommands = new SetupCommands(cliManager, statusManager);
    this.indexingCommands = new IndexingCommands(cliManager, statusManager);
    this.statusCommands = new StatusCommands(cliManager, statusManager);
  }

  /**
   * Smart server toggle - starts server if ready versions exist and server is stopped,
   * or asks to stop server if it's running
   */
  async smartServerToggle(): Promise<void> {
    const currentProcess = this.statusManager.getMcpServerProcess();
    const isRunning = currentProcess && !currentProcess.killed;

    if (isRunning) {
      // Server is running, ask if user wants to stop it
      const action = await vscode.window.showInformationMessage(
        "MCP server is currently running. Would you like to stop it?",
        "Stop Server",
        "Cancel"
      );

      if (action === "Stop Server") {
        await this.serverCommand.stopMcpServer();
      }
    } else {
      // Server is not running, check if we have ready versions
      try {
        const versions = await this.cliManager.listVersions();
        const readyVersions = versions.filter(
          (v) => v.is_ready || (v.has_pagerank && v.has_bm25s && v.has_faiss)
        );

        if (readyVersions.length > 0) {
          // We have ready versions, start the server
          await this.serverCommand.startMcpServer();
        } else {
          // No ready versions, open command palette to guide user
          await this.statusManager.openCommandPalette();
        }
      } catch (error) {
        if (error instanceof ServerNotInstalledError) {
          // Server not installed, prompt to install
          const action = await vscode.window.showInformationMessage(
            "IFS Cloud MCP Server is not installed. Would you like to install it now?",
            "Install Server",
            "Cancel"
          );

          if (action === "Install Server") {
            await this.installCommand.installMcpServer();
          }
        } else {
          // Other error, open command palette
          await this.statusManager.openCommandPalette();
        }
      }
    }
  }

  registerCommands(context: vscode.ExtensionContext): void {
    // Installation command
    context.subscriptions.push(
      vscode.commands.registerCommand("ifsCloudMcp.install", () =>
        this.installCommand.installMcpServer()
      )
    );

    // Import and data management commands
    context.subscriptions.push(
      vscode.commands.registerCommand("ifsCloudMcp.openLifecycleWebsite", () =>
        vscode.env.openExternal(vscode.Uri.parse("https://lifecycle.ifs.com/"))
      ),
      vscode.commands.registerCommand("ifsCloudMcp.importZip", () =>
        this.importCommand.importZipFile()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.deleteVersion", () =>
        this.importCommand.deleteVersion()
      ),
      vscode.commands.registerCommand(
        "ifsCloudMcp.downloadPrebuiltIndexes",
        () => this.importCommand.downloadPrebuiltIndexes()
      )
    );

    // Setup workflow commands
    context.subscriptions.push(
      vscode.commands.registerCommand("ifsCloudMcp.fastSetup", () =>
        this.setupCommands.fastSetup()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.completeSetup", () =>
        this.setupCommands.completeSetup()
      )
    );

    // Indexing and analysis commands
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "ifsCloudMcp.analyzeCoupledCodebase",
        () => this.indexingCommands.analyzeCoupledCodebase()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.calculatePagerank", () =>
        this.indexingCommands.calculatePageRank()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.createEmbeddings", () =>
        this.indexingCommands.createEmbeddings()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.reindexBm25s", () =>
        this.indexingCommands.reindexBM25S()
      )
    );

    // Server management commands
    context.subscriptions.push(
      vscode.commands.registerCommand("ifsCloudMcp.startServer", () =>
        this.serverCommand.startMcpServer()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.stopServer", () =>
        this.serverCommand.stopMcpServer()
      )
    );

    // Status and information commands
    context.subscriptions.push(
      vscode.commands.registerCommand("ifsCloudMcp.listVersions", () =>
        this.statusCommands.listVersions()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.checkStatus", () =>
        this.statusCommands.checkStatus()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.showInstructions", () =>
        this.statusCommands.showInstructions()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.openCommandPalette", () =>
        this.statusManager.openCommandPalette()
      ),
      vscode.commands.registerCommand("ifsCloudMcp.smartServerToggle", () =>
        this.smartServerToggle()
      )
    );
  }
}
