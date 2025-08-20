export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CLIError {
  exitCode: number;
  message: string;
  command: string;
  suggestions?: string[];
}

export class ServerNotInstalledError extends Error {
  constructor(
    message: string = "IFS Cloud MCP Server is not installed. Please run 'Install MCP Server' command first."
  ) {
    super(message);
    this.name = "ServerNotInstalledError";
  }
}

export interface Version {
  version: string;
  extract_path: string;
  index_path: string;
  analysis_path: string;
  bm25s_path: string;
  faiss_path: string;
  pagerank_path: string;
  has_analysis: boolean;
  has_bm25s: boolean;
  has_faiss: boolean;
  has_pagerank: boolean;
  has_hybrid_search: boolean;
  has_full_analysis: boolean;
  is_ready: boolean;
  file_count: number;
  created: string;
}
