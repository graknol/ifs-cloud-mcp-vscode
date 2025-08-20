import * as vscode from "vscode";
import { CLIManager } from "../cli/cliManager";
import { StatusManager } from "../ui/statusManager";

export class SetupCommands {
  constructor(
    private cliManager: CLIManager,
    private statusManager: StatusManager
  ) {}

  /**
   * Fast setup workflow - try download first, fallback to local generation
   */
  async fastSetup(version?: string): Promise<void> {
    let selectedVersion = version;

    if (!selectedVersion) {
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
          v.has_bm25s ? "✓" : "✗"
        }, FAISS: ${v.has_faiss ? "✓" : "✗"}`,
      }));

      const selected = await vscode.window.showQuickPick(versionOptions, {
        placeHolder: "Select version for fast setup",
      });

      if (!selected) {
        return;
      }

      selectedVersion = selected.label;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "IFS MCP",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({
            message: "Trying to download pre-built indexes...",
          });

          const downloadResult = await this.cliManager.executeCLI(
            "download",
            ["--version", selectedVersion!, "--force"],
            false
          );

          if (downloadResult.exitCode === 0) {
            progress.report({ message: "Success! Ready for MCP server." });
            vscode.window.showInformationMessage(
              "✅ Fast setup complete - ready for MCP server"
            );
            const versions = await this.cliManager.listVersions();
            await this.statusManager.updateStatusBar(versions);
            return;
          }

          progress.report({
            message: "Download failed, generating indexes locally...",
          });

          // Fallback to local generation
          const analyzeResult = await this.cliManager.executeCLI(
            "analyze",
            ["--version", selectedVersion!],
            false
          );
          if (analyzeResult.exitCode !== 0) {
            throw new Error("Analysis failed: " + analyzeResult.stderr);
          }

          progress.report({ message: "Calculating PageRank..." });
          const pagerankResult = await this.cliManager.executeCLI(
            "calculate-pagerank",
            ["--version", selectedVersion!],
            false
          );
          if (pagerankResult.exitCode !== 0) {
            throw new Error(
              "PageRank calculation failed: " + pagerankResult.stderr
            );
          }

          progress.report({ message: "Building BM25S index..." });
          const bm25sResult = await this.cliManager.executeCLI(
            "reindex-bm25s",
            ["--version", selectedVersion!],
            false
          );
          if (bm25sResult.exitCode !== 0) {
            throw new Error("BM25S reindexing failed: " + bm25sResult.stderr);
          }

          vscode.window.showInformationMessage(
            "✅ Setup complete - ready for MCP server (lexical search available)"
          );
          const versions = await this.cliManager.listVersions();
          await this.statusManager.updateStatusBar(versions);
        } catch (error) {
          vscode.window.showErrorMessage(`Fast setup failed: ${error}`);
        }
      }
    );
  }

  /**
   * Complete setup workflow for new version (local generation)
   */
  async completeSetup(version?: string): Promise<void> {
    let selectedVersion = version;

    if (!selectedVersion) {
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
          v.has_bm25s ? "✓" : "✗"
        }, FAISS: ${v.has_faiss ? "✓" : "✗"}`,
      }));

      const selected = await vscode.window.showQuickPick(versionOptions, {
        placeHolder: "Select version for complete setup",
      });

      if (!selected) {
        return;
      }

      selectedVersion = selected.label;
    }

    const includeEmbeddings = await vscode.window.showQuickPick(
      [
        {
          label: "Essential only (BM25S lexical search)",
          description: "Fast setup, lexical search only (~5-10 minutes)",
          detail: "essential",
        },
        {
          label: "Complete with embeddings (BM25S + FAISS semantic search)",
          description:
            "Full setup with semantic search (~2-3 minutes, GPU recommended)",
          detail: "complete",
        },
      ],
      {
        placeHolder: "Choose setup type",
      }
    );

    if (!includeEmbeddings) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "IFS MCP",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Analyzing codebase..." });
          const analyzeResult = await this.cliManager.executeCLI(
            "analyze",
            ["--version", selectedVersion!],
            false
          );
          if (analyzeResult.exitCode !== 0) {
            throw new Error("Analysis failed: " + analyzeResult.stderr);
          }

          progress.report({ message: "Calculating PageRank..." });
          const pagerankResult = await this.cliManager.executeCLI(
            "calculate-pagerank",
            ["--version", selectedVersion!],
            false
          );
          if (pagerankResult.exitCode !== 0) {
            throw new Error(
              "PageRank calculation failed: " + pagerankResult.stderr
            );
          }

          progress.report({ message: "Building BM25S index..." });
          const bm25sResult = await this.cliManager.executeCLI(
            "reindex-bm25s",
            ["--version", selectedVersion!],
            false
          );
          if (bm25sResult.exitCode !== 0) {
            throw new Error("BM25S reindexing failed: " + bm25sResult.stderr);
          }

          if (includeEmbeddings.detail === "complete") {
            progress.report({
              message: "Creating embeddings (this may take 2-3 hours)...",
            });
            const embedResult = await this.cliManager.executeCLI(
              "embed",
              ["--version", selectedVersion!],
              false
            );
            if (embedResult.exitCode !== 0) {
              throw new Error(
                "Embedding creation failed: " + embedResult.stderr
              );
            }
            vscode.window.showInformationMessage(
              "✅ Complete setup finished - semantic and lexical search available!"
            );
          } else {
            vscode.window.showInformationMessage(
              "✅ Essential setup complete - lexical search available!"
            );
          }

          const versions = await this.cliManager.listVersions();
          await this.statusManager.updateStatusBar(versions);
        } catch (error) {
          vscode.window.showErrorMessage(`Complete setup failed: ${error}`);
        }
      }
    );
  }
}
