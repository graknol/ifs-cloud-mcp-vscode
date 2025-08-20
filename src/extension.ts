import * as vscode from "vscode";
import { CLIManager } from "./cli/cliManager";
import { StatusManager } from "./ui/statusManager";
import { CommandRegistry } from "./commands/commandRegistry";

let cliManager: CLIManager;
let statusManager: StatusManager;
let commandRegistry: CommandRegistry;

export async function activate(context: vscode.ExtensionContext) {
  console.log("IFS Cloud MCP Server extension is now active!");

  // Initialize managers
  cliManager = new CLIManager();
  statusManager = new StatusManager(cliManager);
  commandRegistry = new CommandRegistry(cliManager, statusManager);

  // Register commands
  commandRegistry.registerCommands(context);

  // Initialize status bar (async to fetch versions)
  await statusManager.initialize(context);

  console.log("IFS Cloud MCP Server extension activated successfully!");
}

export function deactivate() {
  if (statusManager) {
    statusManager.dispose();
  }

  console.log("IFS Cloud MCP Server extension deactivated.");
}
