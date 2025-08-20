import * as vscode from "vscode";
import { CLIManager } from "../cli/cliManager";
import { StatusManager } from "../ui/statusManager";

export class ImportCommand {
  constructor(
    private cliManager: CLIManager,
    private statusManager: StatusManager
  ) {}

  /**
   * Import IFS Cloud deployment ZIP (implements IMPORT command)
   */
  async importZipFile(): Promise<void> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Import",
      filters: {
        "ZIP files": ["zip"],
      },
    });

    if (!fileUri || fileUri.length === 0) {
      return;
    }

    const zipPath = fileUri[0].fsPath;

    try {
      const result = await this.cliManager.executeCLI("import", [zipPath]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          "ZIP file imported successfully! Version auto-detected from deployment."
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError("import", result);
        this.cliManager.showCLIError(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Import failed: ${error}`);
    }
  }

  /**
   * Delete a version (implements DELETE command)
   */
  async deleteVersion(): Promise<void> {
    const versions = await this.cliManager.listVersions();

    if (versions.length === 0) {
      vscode.window.showInformationMessage("No versions available to delete.");
      return;
    }

    const versionOptions = versions.map((v) => ({
      label: v.version,
      description: `${v.file_count || 0} files, ${
        v.has_analysis ? "analyzed" : "not analyzed"
      }`,
      detail: v.extract_path,
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to delete",
    });

    if (!selected) {
      return;
    }

    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete version "${selected.label}"? This action cannot be undone.`,
      { modal: true },
      "Delete"
    );

    if (confirmation !== "Delete") {
      return;
    }

    try {
      const result = await this.cliManager.executeCLI("delete", [
        "--version",
        selected.label,
        "--force",
      ]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `Version "${selected.label}" deleted successfully.`
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError("delete", result);
        this.cliManager.showCLIError(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Delete failed: ${error}`);
    }
  }

  /**
   * Download pre-built indexes (implements DOWNLOAD command)
   */
  async downloadPrebuiltIndexes(): Promise<void> {
    const versions = await this.cliManager.listVersions();

    if (versions.length === 0) {
      vscode.window.showInformationMessage(
        "No versions available. Please import a ZIP file first."
      );
      return;
    }

    const versionOptions = versions.map((v) => ({
      label: v.version,
      description: `${v.has_analysis ? "analyzed" : "not analyzed"}, BM25S: ${
        v.has_bm25s ? "available" : "missing"
      }, FAISS: ${v.has_faiss ? "available" : "missing"}`,
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to download pre-built indexes for",
    });

    if (!selected) {
      return;
    }

    try {
      const result = await this.cliManager.executeCLI("download", [
        "--version",
        selected.label,
        "--force",
      ]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `Pre-built indexes downloaded successfully for version "${selected.label}". Ready for MCP server!`
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError("download", result);

        // Check for specific error types
        if (
          result.stderr.includes("404") ||
          result.stderr.includes("not found") ||
          result.stderr.includes("No release found") ||
          result.stderr.includes("No combined asset found")
        ) {
          const fallback = await vscode.window.showWarningMessage(
            `Pre-built indexes not available for version "${selected.label}" on GitHub. Would you like to generate them locally instead?`,
            "Generate Locally",
            "Cancel"
          );

          if (fallback === "Generate Locally") {
            // Import SetupCommands to avoid circular dependency
            const { SetupCommands } = await import("./setupCommands");
            const setupCommands = new SetupCommands(
              this.cliManager,
              this.statusManager
            );
            await setupCommands.completeSetup(selected.label);
          }
        } else if (
          result.stderr.includes("Version directory not found") ||
          result.stderr.includes("Please import the version first")
        ) {
          vscode.window.showErrorMessage(
            `Version "${selected.label}" must be imported first. Please import a ZIP file for this version before downloading indexes.`
          );
        } else if (
          result.stderr.includes("network") ||
          result.stderr.includes("connection") ||
          result.stderr.includes("timeout") ||
          result.stderr.includes("DNS") ||
          result.stderr.includes("unable to connect")
        ) {
          const retry = await vscode.window.showWarningMessage(
            `Network error downloading indexes for version "${selected.label}". Check your internet connection.`,
            "Retry",
            "Generate Locally",
            "Cancel"
          );

          if (retry === "Retry") {
            await this.downloadPrebuiltIndexes();
          } else if (retry === "Generate Locally") {
            const { SetupCommands } = await import("./setupCommands");
            const setupCommands = new SetupCommands(
              this.cliManager,
              this.statusManager
            );
            await setupCommands.completeSetup(selected.label);
          }
        } else {
          this.cliManager.showCLIError(error);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Download failed: ${error}`);
    }
  }
}
