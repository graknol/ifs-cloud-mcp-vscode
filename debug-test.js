const fs = require("fs");
const path = require("path");
const os = require("os");

function getAppdataPath() {
  if (process.platform === "win32") {
    const appdata = process.env.APPDATA || os.homedir();
    const fullPath = path.join(appdata, "ifs_cloud_mcp_server");
    console.log(
      `Windows appdata path: ${fullPath} (APPDATA=${process.env.APPDATA})`
    );
    return fullPath;
  } else {
    // For non-Windows systems, use a similar location
    return path.join(os.homedir(), ".ifs_cloud_mcp_server");
  }
}

function checkAppdataVersions() {
  try {
    const appdataPath = getAppdataPath();
    console.log(`Checking appdata path: ${appdataPath}`);
    const indexesPath = path.join(appdataPath, "indexes");
    console.log(`Checking indexes path: ${indexesPath}`);

    if (!fs.existsSync(indexesPath)) {
      console.log(`Indexes path does not exist: ${indexesPath}`);
      return [];
    }

    const versions = [];
    const entries = fs.readdirSync(indexesPath, { withFileTypes: true });
    console.log(
      `Found entries in indexes: ${entries.map((e) => e.name).join(", ")}`
    );

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "latest") {
        // Check if this version directory has actual index files
        const versionPath = path.join(indexesPath, entry.name);
        const files = fs.readdirSync(versionPath);
        console.log(
          `Version ${entry.name} has ${files.length} files: ${files
            .slice(0, 5)
            .join(", ")}${files.length > 5 ? "..." : ""}`
        );
        if (files.length > 0) {
          versions.push(entry.name);
        }
      }
    }

    console.log(`Found versions: ${versions.join(", ")}`);
    return versions.sort();
  } catch (error) {
    console.log("Error checking appdata versions:", error);
    return [];
  }
}

console.log("Testing appdata path detection...");
const versions = checkAppdataVersions();
console.log(`Final result: ${versions}`);
