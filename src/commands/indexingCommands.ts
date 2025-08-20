import * as vscode from "vscode";
import { CLIManager } from "../cli/cliManager";
import { StatusManager } from "../ui/statusManager";

export class IndexingCommands {
  constructor(
    private cliManager: CLIManager,
    private statusManager: StatusManager
  ) {}

  /**
   * Analyze codebase (implements ANALYZE command)
   */
  async analyzeCoupledCodebase(): Promise<void> {
    const versions = await this.cliManager.listVersions();

    if (versions.length === 0) {
      vscode.window.showInformationMessage(
        "No versions available. Please import a ZIP file first."
      );
      return;
    }

    const versionOptions = versions.map((v) => ({
      label: v.version,
      description: v.has_analysis ? "Already analyzed" : "Not analyzed",
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to analyze",
    });

    if (!selected) {
      return;
    }

    try {
      const result = await this.cliManager.executeCLI("analyze", [
        "--version",
        selected.label,
      ]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `Codebase analysis completed for version "${selected.label}".`
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError("analyze", result);
        this.cliManager.showCLIError(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Analysis failed: ${error}`);
    }
  }

  /**
   * Calculate PageRank (implements CALCULATE-PAGERANK command)
   */
  async calculatePageRank(): Promise<void> {
    const versions = await this.cliManager.listVersions();
    const analyzedVersions = versions.filter((v) => v.has_analysis);

    if (analyzedVersions.length === 0) {
      vscode.window.showInformationMessage(
        "No analyzed versions available. Please analyze a codebase first."
      );
      return;
    }

    const versionOptions = analyzedVersions.map((v) => ({
      label: v.version,
      description: "Analyzed",
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to calculate PageRank for",
    });

    if (!selected) {
      return;
    }

    try {
      const result = await this.cliManager.executeCLI("calculate-pagerank", [
        "--version",
        selected.label,
      ]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `PageRank calculation completed for version "${selected.label}".`
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError(
          "calculate-pagerank",
          result
        );
        this.cliManager.showCLIError(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`PageRank calculation failed: ${error}`);
    }
  }

  /**
   * Create embeddings (implements EMBED command)
   */
  async createEmbeddings(): Promise<void> {
    const versions = await this.cliManager.listVersions();
    const analyzedVersions = versions.filter((v) => v.has_analysis);

    if (analyzedVersions.length === 0) {
      vscode.window.showInformationMessage(
        "No analyzed versions available. Please analyze a codebase first."
      );
      return;
    }

    const versionOptions = analyzedVersions.map((v) => ({
      label: v.version,
      description: `FAISS: ${v.has_faiss ? "available" : "missing"}`,
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to create embeddings for",
    });

    if (!selected) {
      return;
    }

    const warning = await vscode.window.showWarningMessage(
      "Creating embeddings is resource-intensive and may take 2-3 hours. This will also require significant GPU/CPU resources. Continue?",
      { modal: true },
      "Continue",
      "Cancel"
    );

    if (warning !== "Continue") {
      return;
    }

    try {
      const result = await this.cliManager.executeCLI("embed", [
        "--version",
        selected.label,
      ]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `Embeddings created successfully for version "${selected.label}". Semantic search is now available!`
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError("embed", result);
        this.cliManager.showCLIError(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Embedding creation failed: ${error}`);
    }
  }

  /**
   * Reindex BM25S (implements REINDEX-BM25S command)
   */
  async reindexBM25S(): Promise<void> {
    const versions = await this.cliManager.listVersions();
    const analyzedVersions = versions.filter((v) => v.has_analysis);

    if (analyzedVersions.length === 0) {
      vscode.window.showInformationMessage(
        "No analyzed versions available. Please analyze a codebase first."
      );
      return;
    }

    const versionOptions = analyzedVersions.map((v) => ({
      label: v.version,
      description: `BM25S: ${v.has_bm25s ? "available" : "missing"}`,
    }));

    const selected = await vscode.window.showQuickPick(versionOptions, {
      placeHolder: "Select version to reindex BM25S for",
    });

    if (!selected) {
      return;
    }

    try {
      const result = await this.cliManager.executeCLI("reindex-bm25s", [
        "--version",
        selected.label,
      ]);

      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `BM25S index rebuilt successfully for version "${selected.label}". Lexical search is ready!`
        );
        const versions = await this.cliManager.listVersions();
        await this.statusManager.updateStatusBar(versions);
      } else {
        const error = this.cliManager.handleCLIError("reindex-bm25s", result);
        this.cliManager.showCLIError(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`BM25S reindexing failed: ${error}`);
    }
  }
}
