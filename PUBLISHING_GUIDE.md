# VS Code Marketplace Publishing Guide

## 🎯 **Current Status: Almost Ready for Publishing**

### ✅ **Completed Items:**
- ✅ Publisher field added (`ifs-cloud-team`)
- ✅ Keywords for discoverability
- ✅ Repository URL corrected
- ✅ Gallery banner configuration
- ✅ Complete documentation
- ✅ MIT license
- ✅ Professional package structure

### ❌ **Remaining Tasks:**

#### 1. **Create Icon** (Required)
- Convert `icon.svg` to `icon.png` (128x128)
- Or create a new PNG icon
- See `ICON_INSTRUCTIONS.md` for details

#### 2. **Set Up Publisher Account**
1. Go to [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with Microsoft/GitHub account
3. Create publisher with ID `ifs-cloud-team` (or change in package.json)

#### 3. **Get Personal Access Token**
1. Go to [Azure DevOps](https://dev.azure.com)
2. User Settings → Personal Access Tokens
3. Create token with **Marketplace (manage)** scope
4. Save the token securely

## 📋 **Publishing Steps:**

### Step 1: Install VSCE (if not already installed)
```bash
npm install -g @vscode/vsce
```

### Step 2: Login to Publisher Account
```bash
vsce login ifs-cloud-team
# Enter your Personal Access Token when prompted
```

### Step 3: Package Extension (Test)
```bash
vsce package
```

### Step 4: Publish to Marketplace
```bash
vsce publish
```

### Step 5: Verify Publication
- Visit [VS Code Marketplace](https://marketplace.visualstudio.com/)
- Search for "IFS Cloud MCP"
- Verify extension appears correctly

## 🚀 **Alternative: Pre-release Testing**

Before full publication, consider:

```bash
# Publish as pre-release
vsce publish --pre-release

# Or publish to specific audience
vsce publish --target win32-x64 linux-x64 darwin-x64
```

## 📊 **Post-Publication Checklist:**

- [ ] Extension appears in marketplace
- [ ] Install and test from marketplace
- [ ] Verify all commands work
- [ ] Check extension ratings/reviews
- [ ] Update README with marketplace badge

## 🔧 **Troubleshooting:**

### Common Issues:
1. **Publisher not found**: Create publisher account first
2. **Icon missing**: Add icon.png file
3. **Package validation fails**: Run `vsce package` to test
4. **Token expired**: Generate new Personal Access Token

### Package Validation:
```bash
# Test package before publishing
vsce package --allow-missing-repository
```

## 📈 **Marketing:**

Once published, consider:
- Adding marketplace badge to README
- Announcing on relevant communities
- Creating demo videos
- Writing blog posts about the extension

## 🎊 **Success Metrics:**

After publishing, you'll have:
- ✅ Professional VS Code extension on marketplace
- ✅ Easy user installation via `ext install ifs-cloud-team.ifs-cloud-mcp-vscode`
- ✅ Automatic updates for users
- ✅ Community feedback and contributions
- ✅ Professional presence in VS Code ecosystem

Your extension is now **90% ready for marketplace publishing**! Just add the icon and set up the publisher account.
