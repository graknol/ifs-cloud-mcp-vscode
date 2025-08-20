import * as os from "os";
import * as path from "path";

/**
 * Gets the system-appropriate directory for MCP server installation.
 */
export function getServerInstallDirectory(): string {
  let baseDir: string;

  if (process.platform === "win32") {
    baseDir =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (process.platform === "darwin") {
    baseDir = path.join(os.homedir(), "Library", "Application Support");
  } else {
    // Linux and other Unix-like systems
    baseDir =
      process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  }

  return path.join(baseDir, "ifs_cloud_mcp_server", "server");
}
