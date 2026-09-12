const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'KIVENTA',
    productName: 'KIVENTA',
    executableName: 'taskora',
    appBundleId: 'com.taskora.app',
    appCategoryType: 'public.app-category.productivity',
    appCopyright: 'Copyright © 2026 KIVENTA',
    icon: path.resolve(__dirname, 'assets/branding/taskora-icon'),
    prune: true,
    afterCopy: [
      (buildPath, electronVersion, platform, arch, callback) => {
        try {
          const pkgPath = path.join(buildPath, 'package.json');
          if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.main = 'electron/main.cjs';
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          }
          callback();
        } catch (err) {
          callback(err);
        }
      },
    ],
    ignore: (file) => {
      if (!file) return false;
      const normalized = file.replace(/\\/g, '/');
      if (
        normalized.startsWith('/dist') ||
        normalized.startsWith('/electron') ||
        normalized.startsWith('/assets') ||
        normalized === '/package.json' ||
        normalized.startsWith('/node_modules/electron-squirrel-startup')
      ) {
        return false;
      }
      return true;
    },
  },
  rebuildConfig: {},
  hooks: {
    packageAfterCopy: async (config, buildPath) => {
      const pkgPath = path.join(buildPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.main = 'electron/main.cjs';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      }
    },
    packageAfterPrune: async (config, buildPath) => {
      const pkgPath = path.join(buildPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.main = 'electron/main.cjs';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      }
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'KIVENTA',
        authors: 'KIVENTA',
        description: 'Apple-inspired Local-First Smart Task Management',
        setupExe: 'KIVENTA Setup.exe',
        setupIcon: path.resolve(__dirname, 'assets/branding/taskora-icon.ico'),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
