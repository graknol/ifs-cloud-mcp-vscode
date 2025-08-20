import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { StatusManager } from "../ui/statusManager";
import { getServerInstallDirectory } from "../utils/pathUtils";

const execAsync = promisify(exec);

export class InstallCommand {
  constructor(private statusManager: StatusManager) {}

  /**
   * Handle existing installation - check for updates
   */
  private async handleExistingInstallation(
    serverInstallDir: string
  ): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "IFS MCP",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Checking current version..." });
          const currentVersion = await this.getCurrentVersion(serverInstallDir);

          progress.report({ message: "Checking latest version..." });
          const latestVersion = await this.getLatestVersion();

          if (
            currentVersion &&
            latestVersion &&
            currentVersion !== latestVersion
          ) {
            const action = await vscode.window.showInformationMessage(
              `Update available! Current: ${currentVersion}, Latest: ${latestVersion}`,
              "Update",
              "Reinstall",
              "Cancel"
            );

            if (action === "Update" || action === "Reinstall") {
              await this.performInstallation(serverInstallDir);
            }
          } else if (
            currentVersion &&
            latestVersion &&
            currentVersion === latestVersion
          ) {
            const action = await vscode.window.showInformationMessage(
              `IFS Cloud MCP Server is up to date (${currentVersion})`,
              "Reinstall anyway",
              "Cancel"
            );

            if (action === "Reinstall anyway") {
              await this.performInstallation(serverInstallDir);
            }
          } else {
            // Could not determine versions, offer reinstall
            const action = await vscode.window.showWarningMessage(
              "IFS Cloud MCP Server is already installed but version could not be determined.",
              "Reinstall",
              "Cancel"
            );

            if (action === "Reinstall") {
              await this.performInstallation(serverInstallDir);
            }
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Update check failed: ${error}`);
        }
      }
    );
  }

  /**
   * Get current installed version
   */
  private async getCurrentVersion(
    serverInstallDir: string
  ): Promise<string | null> {
    try {
      // Try to get version from git if it's a git repository
      const gitDir = path.join(serverInstallDir, ".git");
      if (fs.existsSync(gitDir)) {
        const { stdout } = await execAsync("git rev-parse --short HEAD", {
          cwd: serverInstallDir,
        });
        return stdout.trim();
      }

      // Try to get version from pyproject.toml
      const pyprojectPath = path.join(serverInstallDir, "pyproject.toml");
      if (fs.existsSync(pyprojectPath)) {
        const content = fs.readFileSync(pyprojectPath, "utf-8");
        const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }

      return "unknown";
    } catch (error) {
      return null;
    }
  }

  /**
   * Get latest version from GitHub
   */
  private async getLatestVersion(): Promise<string | null> {
    try {
      // Get the latest commit hash from GitHub API
      const { stdout } = await execAsync(
        "git ls-remote https://github.com/graknol/ifs-cloud-core-mcp-server.git HEAD"
      );

      const match = stdout.match(/^([a-f0-9]{40})/);
      if (match) {
        return match[1].substring(0, 7); // Short hash
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Perform the actual installation
   */
  private async performInstallation(serverInstallDir: string): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "IFS MCP",
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Detecting installation method..." });

          // Check if git is available
          let useGit = false;
          try {
            await execAsync("git --version");
            useGit = true;
            progress.report({
              message: "Git detected, using Git method...",
            });
          } catch (error) {
            progress.report({
              message: "Git not available, using HTTPS download...",
            });
          }

          if (useGit) {
            await this.installViaGit(serverInstallDir, progress);
          } else {
            await this.installViaZip(serverInstallDir, progress);
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Installation failed: ${error}`);
        }
      }
    );
  }

  /**
   * Install MCP Server from GitHub - automatically detects Git and falls back to HTTPS
   */
  async installMcpServer(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage(
        "No workspace folder is open. Please open a folder first."
      );
      return;
    }

    // Install to system application data directory
    const serverInstallDir = getServerInstallDirectory();

    // Check if already installed
    if (fs.existsSync(serverInstallDir)) {
      await this.handleExistingInstallation(serverInstallDir);
      return;
    }

    // New installation
    await this.performInstallation(serverInstallDir);
  }

  /**
   * Install via Git clone or update existing repository
   */
  private async installViaGit(
    serverInstallDir: string,
    progress: any
  ): Promise<void> {
    try {
      const gitDir = path.join(serverInstallDir, ".git");
      const isExistingRepo = fs.existsSync(gitDir);

      if (isExistingRepo) {
        // Update existing repository
        progress.report({ message: "Updating existing repository..." });

        try {
          // Fetch latest changes
          await execAsync("git fetch origin", { cwd: serverInstallDir });
          progress.report({ message: "Pulling latest changes..." });

          // Pull latest changes
          await execAsync("git pull origin main", { cwd: serverInstallDir });

          progress.report({ message: "Repository updated successfully" });
        } catch (updateError) {
          progress.report({
            message: "Update failed, performing fresh clone...",
          });
          // If update fails, remove and clone fresh
          await this.removeDirectory(serverInstallDir);
          await this.performFreshClone(serverInstallDir, progress);
        }
      } else {
        // Fresh installation
        await this.performFreshClone(serverInstallDir, progress);
      }

      await this.setupPythonEnvironment(serverInstallDir, progress);
    } catch (error) {
      throw new Error(`Git installation failed: ${error}`);
    }
  }

  /**
   * Perform fresh git clone
   */
  private async performFreshClone(
    serverInstallDir: string,
    progress: any
  ): Promise<void> {
    progress.report({ message: "Cloning repository from GitHub..." });

    // Ensure install directory exists
    if (!fs.existsSync(serverInstallDir)) {
      fs.mkdirSync(serverInstallDir, { recursive: true });
    }

    // Clone the repository
    const cloneCommand = `git clone https://github.com/graknol/ifs-cloud-core-mcp-server.git temp-mcp-server`;
    await execAsync(cloneCommand, { cwd: serverInstallDir });

    await this.copyServerFiles(serverInstallDir, "temp-mcp-server", progress);
  }

  /**
   * Install via ZIP download (fallback method)
   */
  private async installViaZip(
    serverInstallDir: string,
    progress: any
  ): Promise<void> {
    try {
      progress.report({ message: "Downloading latest release..." });

      // Ensure install directory exists
      if (!fs.existsSync(serverInstallDir)) {
        fs.mkdirSync(serverInstallDir, { recursive: true });
      }

      // Download the latest release ZIP
      const zipPath = path.join(serverInstallDir, "temp-mcp-server.zip");
      await this.downloadFile(
        "https://github.com/graknol/ifs-cloud-core-mcp-server/archive/refs/heads/main.zip",
        zipPath
      );

      progress.report({ message: "Extracting files..." });

      // Extract the ZIP file
      const extractCommand =
        process.platform === "win32"
          ? `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${serverInstallDir}' -Force"`
          : `unzip -o "${zipPath}" -d "${serverInstallDir}"`;

      await execAsync(extractCommand);

      // The extracted directory will be named differently for ZIP downloads
      const extractedDir = "ifs-cloud-core-mcp-server-main";
      await this.copyServerFiles(serverInstallDir, extractedDir, progress);

      // Clean up ZIP file
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    } catch (error) {
      throw new Error(`ZIP download failed: ${error}`);
    }
  }

  /**
   * Common function to copy server files and complete installation
   */
  private async copyServerFiles(
    serverInstallDir: string,
    tempDirName: string,
    progress: any
  ): Promise<void> {
    progress.report({ message: "Copying server files..." });

    const tempDir = path.join(serverInstallDir, tempDirName);

    // Copy the entire repository to the server install directory
    if (fs.existsSync(tempDir)) {
      // Copy all files from temp directory to server install directory
      const items = fs.readdirSync(tempDir, { withFileTypes: true });

      for (const item of items) {
        const sourcePath = path.join(tempDir, item.name);
        const targetPath = path.join(serverInstallDir, item.name);

        if (item.isDirectory()) {
          await this.copyDirectory(sourcePath, targetPath);
        } else {
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    } else {
      throw new Error("Downloaded repository directory not found");
    }

    progress.report({ message: "Cleaning up..." });

    // Remove temporary directory
    await this.removeDirectory(tempDir);

    await this.setupPythonEnvironment(serverInstallDir, progress);
  }

  /**
   * Setup Python environment and dependencies using UV
   */
  private async setupPythonEnvironment(
    serverInstallDir: string,
    progress: any
  ): Promise<void> {
    progress.report({ message: "Setting up UV Python environment..." });

    const venvPath = path.join(serverInstallDir, "venv");

    // Check for global UV first
    let uvCommand = await this.findGlobalUV();

    if (!uvCommand) {
      // Download portable UV
      progress.report({
        message: "UV not found globally, downloading portable version...",
      });
      const uvPath = path.join(serverInstallDir, "uv");
      await this.downloadPortableUV(uvPath, progress);
      uvCommand =
        process.platform === "win32"
          ? path.join(uvPath, "uv.exe")
          : path.join(uvPath, "uv");
    } else {
      progress.report({
        message: "Global UV found, using system installation...",
      });
    }

    // Remove existing venv if it exists
    if (fs.existsSync(venvPath)) {
      await this.removeDirectory(venvPath);
    }

    // Create venv with UV (UV will download Python if needed)
    progress.report({ message: "Creating Python environment with UV..." });
    try {
      await execAsync(`"${uvCommand}" venv "${venvPath}" --python 3.11`, {
        cwd: serverInstallDir,
      });

      // Install dependencies using UV with user choice for CPU/GPU
      const pyprojectPath = path.join(serverInstallDir, "pyproject.toml");
      if (fs.existsSync(pyprojectPath)) {
        await this.installDependenciesWithUV(
          uvCommand,
          serverInstallDir,
          serverInstallDir,
          venvPath,
          progress
        );
      } else {
        vscode.window.showInformationMessage(
          "✅ IFS Cloud MCP Server installed with UV-managed Python environment!"
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`UV setup failed: ${error}`);
      throw error;
    }

    // Update status
    await this.statusManager.updateStatusBar([]);
  }

  /**
   * Find global UV installation
   */
  private async findGlobalUV(): Promise<string | null> {
    try {
      await execAsync("uv --version");
      return "uv";
    } catch (error) {
      return null;
    }
  }

  /**
   * Install dependencies with UV and user choice for CPU/GPU extras
   */
  private async installDependenciesWithUV(
    uvCommand: string,
    serverInstallDir: string,
    _serverDir: string, // Not needed anymore since they're the same
    venvPath: string,
    progress: any
  ): Promise<void> {
    const installChoice = await vscode.window.showInformationMessage(
      "Choose Python dependencies configuration (required for server to work):",
      { modal: true },
      "Install with CPU support",
      "Install with GPU support"
    );

    // Default to CPU if user cancels or closes dialog
    const isGPUSelected = installChoice === "Install with GPU support";

    let extraFlag: string;
    let supportType: string;

    if (isGPUSelected) {
      // Ask for CUDA version selection
      const cudaChoice = await vscode.window.showInformationMessage(
        "Select CUDA version for PyTorch GPU support:",
        { modal: true },
        "CUDA 12.9 (Latest)",
        "CUDA 12.8",
        "CUDA 12.6"
      );

      if (!cudaChoice) {
        // User cancelled, cancel the installation
        vscode.window.showInformationMessage("Installation cancelled by user.");
        return;
      } else {
        // Map CUDA choice to appropriate flag
        switch (cudaChoice) {
          case "CUDA 12.9 (Latest)":
            extraFlag = "--extra gpu129";
            supportType = "GPU (CUDA 12.9)";
            break;
          case "CUDA 12.8":
            extraFlag = "--extra gpu128";
            supportType = "GPU (CUDA 12.8)";
            break;
          case "CUDA 12.6":
            extraFlag = "--extra gpu126";
            supportType = "GPU (CUDA 12.6)";
            break;
          default:
            extraFlag = "--extra gpu129"; // Default to latest
            supportType = "GPU (CUDA 12.9)";
        }
      }
    } else {
      extraFlag = "--extra cpu";
      supportType = "CPU";
    }

    // Validate CUDA setup if GPU is selected
    if (isGPUSelected) {
      progress.report({ message: "Validating CUDA installation..." });
      const cudaAvailable = await this.validateCUDA();

      if (!cudaAvailable) {
        const fallbackChoice = await vscode.window.showWarningMessage(
          "CUDA/nvidia-smi not detected. GPU acceleration may not work properly.\n\nWould you like to continue with GPU support or switch to CPU?",
          { modal: true },
          "Continue with GPU anyway",
          "Switch to CPU support"
        );

        if (fallbackChoice === "Switch to CPU support") {
          // Update flags to CPU
          extraFlag = "--extra cpu";
          supportType = "CPU";

          progress.report({
            message: "Installing with CPU support...",
          });

          try {
            await execAsync(`"${uvCommand}" sync ${extraFlag}`, {
              cwd: serverInstallDir,
              env: { ...process.env, VIRTUAL_ENV: venvPath },
            });

            vscode.window.showInformationMessage(
              "✅ IFS Cloud MCP Server installed with CPU support!"
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Dependency installation failed: ${error}. The server will not work without dependencies.`
            );
            throw error;
          }
          return;
        }
        // If user chooses to continue with GPU anyway, proceed with GPU installation
      }
    }

    progress.report({
      message: `Installing with ${supportType} support...`,
    });

    try {
      await execAsync(`"${uvCommand}" sync ${extraFlag}`, {
        cwd: serverInstallDir,
        env: { ...process.env, VIRTUAL_ENV: venvPath },
      });

      vscode.window.showInformationMessage(
        `✅ IFS Cloud MCP Server installed with ${supportType} support!`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Dependency installation failed: ${error}. The server will not work without dependencies.`
      );
      throw error;
    }
  }

  /**
   * Validate CUDA installation by checking nvidia-smi
   */
  private async validateCUDA(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        "nvidia-smi --query-gpu=name --format=csv,noheader,nounits"
      );
      return stdout.trim().length > 0;
    } catch (error) {
      // nvidia-smi not found or failed
      return false;
    }
  }

  /**
   * Download portable UV
   */
  private async downloadPortableUV(
    uvPath: string,
    progress: any
  ): Promise<void> {
    // Create UV directory
    if (!fs.existsSync(uvPath)) {
      fs.mkdirSync(uvPath, { recursive: true });
    }

    // Determine download URL based on platform
    let downloadUrl: string;
    let fileName: string;

    if (process.platform === "win32") {
      downloadUrl =
        "https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip";
      fileName = "uv-windows.zip";
    } else if (process.platform === "darwin") {
      downloadUrl =
        "https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-apple-darwin.tar.gz";
      fileName = "uv-macos.tar.gz";
    } else {
      downloadUrl =
        "https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz";
      fileName = "uv-linux.tar.gz";
    }

    const downloadPath = path.join(uvPath, fileName);

    try {
      progress.report({ message: "Downloading UV..." });
      await this.downloadFile(downloadUrl, downloadPath);

      progress.report({ message: "Extracting UV..." });

      if (process.platform === "win32") {
        // Extract ZIP file
        await execAsync(
          `powershell -command "Expand-Archive -Path '${downloadPath}' -DestinationPath '${uvPath}' -Force"`
        );

        // Move UV executable to the correct location
        const extractedDir = path.join(uvPath, "uv-x86_64-pc-windows-msvc");
        if (fs.existsSync(path.join(extractedDir, "uv.exe"))) {
          fs.copyFileSync(
            path.join(extractedDir, "uv.exe"),
            path.join(uvPath, "uv.exe")
          );
          await this.removeDirectory(extractedDir);
        }
      } else {
        // Extract tar.gz file
        await execAsync(
          `tar -xzf "${downloadPath}" -C "${uvPath}" --strip-components=1`
        );
      }

      // Clean up download file
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }

      // Make UV executable on Unix systems
      if (process.platform !== "win32") {
        await execAsync(`chmod +x "${path.join(uvPath, "uv")}"`);
      }
    } catch (error) {
      throw new Error(`Failed to download UV: ${error}`);
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);

      https
        .get(url, (response) => {
          // Handle redirects
          if (response.statusCode === 302 || response.statusCode === 301) {
            if (response.headers.location) {
              return this.downloadFile(response.headers.location, outputPath)
                .then(resolve)
                .catch(reject);
            }
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (error) => {
          fs.unlink(outputPath, () => {}); // Delete the file on error
          reject(error);
        });
    });
  }

  /**
   * Recursively copy directory
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const items = fs.readdirSync(source, { withFileTypes: true });

    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const targetPath = path.join(target, item.name);

      if (item.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * Recursively remove directory
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}
