import * as vscode from "vscode";
import { CLIManager } from "../cli/cliManager";
import { StatusManager } from "../ui/statusManager";

export class StatusCommands {
  constructor(
    private cliManager: CLIManager,
    private statusManager: StatusManager
  ) {}

  /**
   * List versions with detailed view
   */
  async listVersions(): Promise<void> {
    const versions = await this.cliManager.listVersions();
    if (versions.length === 0) {
      vscode.window.showInformationMessage("No versions available.");
    } else {
      await this.checkStatus(); // Show detailed status
    }
  }

  /**
   * Check status of versions and server
   */
  async checkStatus(): Promise<void> {
    const versions = await this.cliManager.listVersions();

    let statusMessage = "";

    if (versions.length === 0) {
      statusMessage = "No versions imported.";
    } else {
      statusMessage = `${versions.length} version(s) available:\n\n`;
      versions.forEach((v) => {
        statusMessage += `• ${v.version}\n`;
        statusMessage += `  Analyzed: ${v.has_analysis ? "✓" : "✗"}\n`;
        statusMessage += `  BM25S: ${v.has_bm25s ? "✓" : "✗"}\n`;
        statusMessage += `  FAISS: ${v.has_faiss ? "✓" : "✗"}\n`;
        statusMessage += `  Files: ${v.file_count || "unknown"}\n`;
        statusMessage += `  Created: ${v.created}\n\n`;
      });
    }

    const mcpServerProcess = this.statusManager.getMcpServerProcess();
    const mcpRunning = mcpServerProcess && !mcpServerProcess.killed;
    statusMessage += `MCP Server: ${mcpRunning ? "Running" : "Stopped"}`;

    const panel = vscode.window.createWebviewPanel(
      "ifsCloudMcpStatus",
      "IFS Cloud MCP Status",
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        enableCommandUris: false,
      }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>IFS Cloud MCP Status</title>
          <style>
              body { font-family: var(--vscode-font-family); padding: 20px; }
              pre { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; }
          </style>
      </head>
      <body>
          <h1>IFS Cloud MCP Status</h1>
          <pre>${statusMessage}</pre>
      </body>
      </html>
    `;
  }

  /**
   * Show instructions and help
   */
  async showInstructions(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "ifsCloudMcpInstructions",
      "IFS Cloud MCP Instructions",
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        enableCommandUris: false,
      }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>IFS Cloud MCP Instructions</title>
          <style>
              body { font-family: var(--vscode-font-family); padding: 20px; line-height: 1.6; }
              h1, h2 { color: var(--vscode-foreground); }
              code { background: var(--vscode-textBlockQuote-background); padding: 2px 4px; border-radius: 3px; }
              pre { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; overflow-x: auto; }
              .workflow { background: var(--vscode-editor-inactiveSelectionBackground); padding: 15px; border-radius: 5px; margin: 10px 0; }
              .step { margin: 10px 0; }
          </style>
      </head>
      <body>
          <h1>🚀 IFS Cloud MCP Server</h1>
          
          <h2>Quick Start</h2>
          <div class="workflow">
              <div class="step">1. <strong>Import ZIP</strong>: Import your IFS Cloud deployment ZIP file</div>
              <div class="step">2. <strong>Fast Setup</strong>: Try downloading pre-built indexes, fallback to local generation</div>
              <div class="step">3. <strong>Start MCP Server</strong>: Launch the server for GitHub Copilot Chat integration</div>
          </div>

          <h2>Available Commands</h2>
          <ul>
              <li><strong>Import ZIP</strong>: Import IFS Cloud deployment (auto-detects version)</li>
              <li><strong>List Versions</strong>: Show all imported versions and their status</li>
              <li><strong>Delete Version</strong>: Remove a version and all its data</li>
              <li><strong>Download Pre-built Indexes</strong>: Get ready-made search indexes from GitHub</li>
              <li><strong>Analyze Codebase</strong>: Perform comprehensive code analysis</li>
              <li><strong>Calculate PageRank</strong>: Rank code files by importance</li>
              <li><strong>Create Embeddings</strong>: Build semantic search with BGE-M3 (GPU recommended)</li>
              <li><strong>Reindex BM25S</strong>: Rebuild lexical search index</li>
              <li><strong>Fast Setup</strong>: Automated setup (download + fallback)</li>
              <li><strong>Complete Setup</strong>: Full local setup with all features</li>
              <li><strong>Start MCP Server</strong>: Launch server for AI integration</li>
              <li><strong>Stop MCP Server</strong>: Stop the running server</li>
              <li><strong>Check Status</strong>: View detailed status information</li>
          </ul>

          <h2>Supported File Types</h2>
          <ul>
              <li><code>.entity</code>: Data Entity Definitions</li>
              <li><code>.plsql</code>: PL/SQL Business Logic</li>
              <li><code>.views</code>: Database Views</li>
              <li><code>.storage</code>: Storage Definitions</li>
              <li><code>.fragment</code>: Full-Stack Components</li>
              <li><code>.projection</code>: Data Access Layer</li>
              <li><code>.client</code>: User Interface Components</li>
          </ul>

          <h2>Setup Workflows</h2>
          
          <h3>🚄 Fast Setup (Recommended)</h3>
          <div class="workflow">
              <p>Best for most users - tries to download pre-built indexes first:</p>
              <ol>
                  <li>Import your IFS Cloud ZIP file</li>
                  <li>Run "Fast Setup" - attempts download from GitHub releases</li>
                  <li>If download fails, automatically falls back to local generation</li>
                  <li>Ready for MCP server in 2-3 hours</li>
              </ol>
          </div>

          <h3>🔧 Complete Setup (Local Generation)</h3>
          <div class="workflow">
              <p>For custom builds or when pre-built indexes aren't available:</p>
              <ol>
                  <li>Import your IFS Cloud ZIP file</li>
                  <li>Choose "Essential" (BM25S only) or "Complete" (BM25S + FAISS)</li>
                  <li>Essential: ~5-10 minutes, Complete: ~2-3 hours</li>
                  <li>Complete setup provides both lexical and semantic search</li>
              </ol>
          </div>

          <h2>Search Capabilities</h2>
          <ul>
              <li><strong>Lexical Search (BM25S)</strong>: Fast exact-match and keyword search</li>
              <li><strong>Semantic Search (FAISS + BGE-M3)</strong>: AI-powered meaning-based search</li>
              <li><strong>Hybrid Search</strong>: Combines both approaches with FlashRank reranking</li>
          </ul>

          <h2>Data Storage</h2>
          <p>All data is stored locally in platform-appropriate directories:</p>
          <ul>
              <li><strong>Windows</strong>: <code>%APPDATA%\\ifs_cloud_mcp_server</code></li>
              <li><strong>macOS</strong>: <code>~/Library/Application Support/ifs_cloud_mcp_server</code></li>
              <li><strong>Linux</strong>: <code>~/.local/share/ifs_cloud_mcp_server</code></li>
          </ul>

          <h2>GitHub Copilot Integration</h2>
          <p>Once the MCP server is running, GitHub Copilot Chat can search and analyze your IFS Cloud codebase using natural language queries.</p>
      </body>
      </html>
    `;
  }
}
