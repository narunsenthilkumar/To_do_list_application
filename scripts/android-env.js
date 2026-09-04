const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = (function() {
  const resolved = path.resolve(__dirname, '..');
  // Use Junction C:\taskora if available and project has spaces/quotes
  if (process.platform === 'win32' && (resolved.includes(' ') || resolved.includes("'"))) {
    if (fs.existsSync('C:\\taskora\\package.json')) {
      return 'C:\\taskora';
    }
  }
  return resolved;
})();
const ANDROID_ROOT = path.join(PROJECT_ROOT, 'android');

/**
 * Finds the best compatible JDK on the system, prioritizing JDK 21 (or JDK 17)
 */
function findJavaHome() {
  const candidates = [];

  // 1. Existing JAVA_HOME environment variable
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    candidates.push(process.env.JAVA_HOME);
  }

  // 2. Standard Windows installation paths
  if (process.platform === 'win32') {
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localApp = process.env['LOCALAPPDATA'] || '';
    const userProfile = process.env['USERPROFILE'] || '';

    const scanDirs = [
      path.join(progFiles, 'Microsoft'),
      path.join(progFiles, 'Eclipse Adoptium'),
      path.join(progFiles, 'Java'),
      path.join(progFiles, 'Amazon Corretto'),
      path.join(progFiles, 'Zulu'),
      path.join(progFiles, 'BellSoft'),
      path.join(progFilesX86, 'Java'),
      path.join(userProfile, '.jdks'),
      path.join(localApp, 'Programs'),
    ];

    for (const scanDir of scanDirs) {
      if (fs.existsSync(scanDir)) {
        try {
          const entries = fs.readdirSync(scanDir);
          for (const entry of entries) {
            const fullPath = path.join(scanDir, entry);
            if (fs.statSync(fullPath).isDirectory()) {
              if (fs.existsSync(path.join(fullPath, 'bin', 'javac.exe')) || fs.existsSync(path.join(fullPath, 'bin', 'java.exe'))) {
                candidates.push(fullPath);
              }
            }
          }
        } catch {}
      }
    }

    // Android Studio bundled JBR
    const studioJbr = path.join(progFiles, 'Android', 'Android Studio', 'jbr');
    if (fs.existsSync(studioJbr)) {
      candidates.push(studioJbr);
    }
  } else {
    // macOS / Linux locations
    const unixPaths = [
      '/usr/lib/jvm/java-21-openjdk',
      '/usr/lib/jvm/java-17-openjdk',
      '/Library/Java/JavaVirtualMachines',
    ];
    for (const p of unixPaths) {
      if (fs.existsSync(p)) {
        candidates.push(p);
      }
    }
  }

  // Evaluate candidate JDKs by running java -version and score them
  let bestJdk = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const javaBin = process.platform === 'win32'
      ? path.join(candidate, 'bin', 'java.exe')
      : path.join(candidate, 'bin', 'java');

    if (!fs.existsSync(javaBin)) continue;

    try {
      const output = execSync(`"${javaBin}" -version 2>&1`, { encoding: 'utf-8' });
      let score = 10;
      if (output.includes('21.') || candidate.includes('21')) {
        score = 100; // Perfect match for React Native 0.86 / AGP
      } else if (output.includes('17.') || candidate.includes('17')) {
        score = 80;
      } else if (output.includes('22.') || output.includes('23.')) {
        score = 50;
      } else if (output.includes('25.') || output.includes('jbr')) {
        score = 40;
      }

      if (score > bestScore) {
        bestScore = score;
        bestJdk = {
          path: candidate,
          javaBin,
          versionText: output.split('\n')[0].trim(),
          score,
        };
      }
    } catch {}
  }

  return bestJdk;
}

/**
 * Finds the Android SDK directory
 */
function findAndroidSdk() {
  const candidates = [];

  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    candidates.push(process.env.ANDROID_HOME);
  }
  if (process.env.ANDROID_SDK_ROOT && fs.existsSync(process.env.ANDROID_SDK_ROOT)) {
    candidates.push(process.env.ANDROID_SDK_ROOT);
  }

  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || '';
    if (localApp) {
      candidates.push(path.join(localApp, 'Android', 'Sdk'));
    }
    candidates.push('C:\\Android\\Sdk');
    candidates.push('C:\\Android\\sdk');
  } else if (process.platform === 'darwin') {
    const home = process.env.HOME || '';
    candidates.push(path.join(home, 'Library', 'Android', 'sdk'));
  } else {
    const home = process.env.HOME || '';
    candidates.push(path.join(home, 'Android', 'Sdk'));
    candidates.push(path.join(home, 'Android', 'sdk'));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'platform-tools'))) {
      return candidate;
    }
  }

  return candidates[0] || null;
}

/**
 * Ensures local.properties exists in android/ with forward-slash sdk.dir
 */
function ensureLocalProperties(sdkPath) {
  if (!sdkPath) return false;
  const localPropPath = path.join(ANDROID_ROOT, 'local.properties');
  const normalizedSdk = sdkPath.replace(/\\/g, '/');
  const content = `sdk.dir=${normalizedSdk}\n`;

  try {
    fs.writeFileSync(localPropPath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write local.properties:', e.message);
    return false;
  }
}

/**
 * Inspects Android SDK components (platforms, build-tools, ndk, cmake, adb)
 */
function inspectSdkComponents(sdkPath) {
  if (!sdkPath || !fs.existsSync(sdkPath)) {
    return {
      platforms: [],
      buildTools: [],
      ndk: [],
      cmake: [],
      hasAdb: false,
    };
  }

  const getSubdirs = (sub) => {
    const target = path.join(sdkPath, sub);
    if (!fs.existsSync(target)) return [];
    try {
      return fs.readdirSync(target).filter((f) => fs.statSync(path.join(target, f)).isDirectory());
    } catch {
      return [];
    }
  };

  const adbBin = process.platform === 'win32'
    ? path.join(sdkPath, 'platform-tools', 'adb.exe')
    : path.join(sdkPath, 'platform-tools', 'adb');

  return {
    platforms: getSubdirs('platforms'),
    buildTools: getSubdirs('build-tools'),
    ndk: getSubdirs('ndk'),
    cmake: getSubdirs('cmake'),
    hasAdb: fs.existsSync(adbBin),
    adbPath: fs.existsSync(adbBin) ? adbBin : null,
  };
}

/**
 * Returns full environment inspection
 */
function getAndroidEnvironment() {
  const javaInfo = findJavaHome();
  const sdkPath = findAndroidSdk();
  const sdkComponents = inspectSdkComponents(sdkPath);

  if (sdkPath) {
    ensureLocalProperties(sdkPath);
  }

  return {
    projectRoot: PROJECT_ROOT,
    androidRoot: ANDROID_ROOT,
    java: javaInfo,
    sdkPath,
    sdkComponents,
  };
}

/**
 * Prepares environment variables object for spawning Gradle commands
 */
function getGradleEnv() {
  const envInfo = getAndroidEnvironment();
  const customEnv = { ...process.env };

  // Resolve conflict between ANDROID_PREFS_ROOT and ANDROID_USER_HOME
  delete customEnv.ANDROID_PREFS_ROOT;

  if (envInfo.java?.path) {
    customEnv.JAVA_HOME = envInfo.java.path;
    const javaBin = path.join(envInfo.java.path, 'bin');
    customEnv.PATH = `${javaBin}${path.delimiter}${customEnv.PATH || ''}`;
  }

  if (envInfo.sdkPath) {
    customEnv.ANDROID_HOME = envInfo.sdkPath;
    customEnv.ANDROID_SDK_ROOT = envInfo.sdkPath;
    const platformTools = path.join(envInfo.sdkPath, 'platform-tools');
    customEnv.PATH = `${platformTools}${path.delimiter}${customEnv.PATH || ''}`;
  }

  return { env: customEnv, envInfo };
}

module.exports = {
  getAndroidEnvironment,
  getGradleEnv,
  ensureLocalProperties,
  findJavaHome,
  findAndroidSdk,
};
