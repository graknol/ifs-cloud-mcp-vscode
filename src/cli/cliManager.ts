import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import {
  CommandResult,
  CLIError,
  Version,
  ServerNotInstalledError,
} from "./types";
import { getServerInstallDirectory } from "../utils/pathUtils";

const execAsync = promisify(exec);

export class CLIManager {
  /**
   * Execute CLI command using UV to ensure proper virtual environment activation
   */
  async executeCLI(
    command: string,
    args: string[] = [],
    showProgress = true
  ): Promise<CommandResult> {
    const serverDir = getServerInstallDirectory();

    // Check if server is installed
    if (!fs.existsSync(serverDir)) {
      throw new ServerNotInstalledError();
    }

    // Check if UV is available globally first
    let uvCommand = "uv";
    try {
      await execAsync("uv --version");
    } catch (error) {
      // Fall back to portable UV if global UV not available
      const portableUvPath = path.join(serverDir, "uv");
      const uvExecutable =
        process.platform === "win32"
          ? path.join(portableUvPath, "uv.exe")
          : path.join(portableUvPath, "uv");

      if (fs.existsSync(uvExecutable)) {
        uvCommand = `"${uvExecutable}"`;
      } else {
        throw new Error(
          "UV not found. Please reinstall the MCP server or install UV globally."
        );
      }
    }

    // Use UV run to execute the command in the virtual environment
    const fullCommand = [
      uvCommand,
      "run",
      "python",
      "-m",
      "src.ifs_cloud_mcp_server.main",
      command,
      ...args,
    ];

    const commandStr = fullCommand.join(" ");
    console.log(`Executing CLI command with UV: ${commandStr}`);

    const executeCommand = async (): Promise<CommandResult> => {
      try {
        const result = await execAsync(commandStr, {
          cwd: serverDir,
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        return {
          exitCode: 0,
          stdout: result.stdout || "",
          stderr: result.stderr || "",
        };
      } catch (error: any) {
        return {
          exitCode: error.code || 1,
          stdout: error.stdout || "",
          stderr: error.stderr || error.message || "",
        };
      }
    };

    if (showProgress) {
      return vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `IFS Cloud MCP: ${command}`,
          cancellable: false,
        },
        async () => executeCommand()
      );
    } else {
      return executeCommand();
    }
  }

  /**
   * Handle CLI errors according to specification
   */
  handleCLIError(command: string, result: CommandResult): CLIError {
    const suggestions: string[] = [];

    if (result.stderr.includes("Version not found")) {
      suggestions.push("Run 'IFS Cloud MCP: Import ZIP' first");
      suggestions.push(
        "Check available versions with 'IFS Cloud MCP: List Versions'"
      );
    } else if (result.stderr.includes("not analyzed")) {
      suggestions.push("Run 'IFS Cloud MCP: Analyze Codebase' first");
    } else if (result.stderr.includes("No ZIP file")) {
      suggestions.push("Select a valid IFS Cloud deployment ZIP file");
    } else if (result.stderr.includes("Python")) {
      suggestions.push("Ensure Python is installed and accessible");
      suggestions.push("Check that the virtual environment is activated");
    }

    return {
      exitCode: result.exitCode,
      message: result.stderr || result.stdout || "Command failed",
      command,
      suggestions,
    };
  }

  /**
   * Show CLI error with user-friendly message and suggestions
   */
  showCLIError(error: CLIError): void {
    let message = `Command '${error.command}' failed: ${error.message}`;

    if (error.suggestions && error.suggestions.length > 0) {
      message += "\n\nSuggestions:";
      error.suggestions.forEach((suggestion) => {
        message += `\n• ${suggestion}`;
      });
    }

    vscode.window.showErrorMessage(message);
  }

  /**
   * Get list of versions (implements LIST command)
   */
  async listVersions(silent: boolean = false): Promise<Version[]> {
    try {
      const result = await this.executeCLI("list", ["--json"], false);

      if (result.exitCode !== 0) {
        const error = this.handleCLIError("list", result);
        this.showCLIError(error);
        return [];
      }

      const data = JSON.parse(result.stdout);
      // CLI returns array directly, not an object with versions property
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error instanceof ServerNotInstalledError) {
        throw error;
      }
      console.error("Failed to list versions:", error);
      if (!silent) {
        vscode.window.showErrorMessage("Failed to list versions");
      }
      return [];
    }
  }

  /**
   * Spawn a long-running process using UV to ensure proper virtual environment activation
   */
  async spawnProcess(
    command: string,
    args: string[] = [],
    options: { cwd?: string } = {}
  ): Promise<ChildProcess> {
    const serverDir = getServerInstallDirectory();

    // Check if server is installed
    if (!fs.existsSync(serverDir)) {
      throw new ServerNotInstalledError();
    }

    // Check if UV is available globally first
    let uvCommand = "uv";
    try {
      await execAsync("uv --version");
    } catch (error) {
      // Fall back to portable UV if global UV not available
      const portableUvPath = path.join(serverDir, "uv");
      const uvExecutable =
        process.platform === "win32"
          ? path.join(portableUvPath, "uv.exe")
          : path.join(portableUvPath, "uv");

      if (fs.existsSync(uvExecutable)) {
        uvCommand = uvExecutable;
      } else {
        throw new Error(
          "UV not found. Please reinstall the MCP server or install UV globally."
        );
      }
    }

    // Use UV run to spawn the process in the virtual environment
    const processArgs = [
      "run",
      "python",
      "-m",
      "src.ifs_cloud_mcp_server.main",
      command,
      ...args,
    ];

    console.log(
      `Spawning process with UV: ${uvCommand} ${processArgs.join(" ")}`
    );

    const childProcess = spawn(uvCommand, processArgs, {
      cwd: options.cwd || serverDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    return childProcess;
  }
}
