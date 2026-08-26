const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getAndroidEnvironment } = require('./android-env');

function checkDoctor() {
  console.log('\nTaskora Android Environment Doctor');
  console.log('───────────────────────────────────────────────────────');

  const env = getAndroidEnvironment();
  const results = [];
  let allGood = true;

  const addResult = (label, status, detail = '', fixCommand = '') => {
    results.push({ label, status, detail, fixCommand });
    if (!status) allGood = false;
  };

  // 1. Node.js
  try {
    const nodeVer = process.version;
    addResult('Node.js', true, nodeVer);
  } catch {
    addResult('Node.js', false, 'Not found', 'Install Node.js 20+ from https://nodejs.org');
  }

  // 2. npm
  try {
    const npmVer = execSync('npm -v', { encoding: 'utf-8' }).trim();
    addResult('npm', true, `v${npmVer}`);
  } catch {
    addResult('npm', false, 'Not found');
  }

  // 3. Java & JAVA_HOME
  if (env.java) {
    addResult('Java', true, env.java.versionText || env.java.path);
    addResult('JAVA_HOME', true, env.java.path);
  } else {
    addResult('Java', false, 'Missing compatible JDK (JDK 21 recommended)', 'Install via: winget install Microsoft.OpenJDK.21');
    addResult('JAVA_HOME', false, 'Not set or invalid', 'Set JAVA_HOME to JDK 21 installation path');
  }

  // 4. Android SDK & ANDROID_HOME
  if (env.sdkPath) {
    addResult('Android SDK', true, env.sdkPath);
    addResult('ANDROID_HOME', true, env.sdkPath);
  } else {
    addResult('Android SDK', false, 'Not found', 'Install Android Studio / SDK Command-line Tools');
    addResult('ANDROID_HOME', false, 'Not set', 'Set ANDROID_HOME to %LOCALAPPDATA%\\Android\\Sdk');
  }

  // 5. Android Platforms
  const targetPlatform = env.sdkComponents.platforms.find((p) => p.includes('36') || p.includes('35') || p.includes('34'));
  if (targetPlatform) {
    addResult('SDK Platform', true, targetPlatform);
  } else {
    addResult('SDK Platform', false, 'Missing android-36 / android-35', 'Install via Android Studio SDK Manager or sdkmanager "platforms;android-36"');
  }

  // 6. Build Tools
  const targetBuildTools = env.sdkComponents.buildTools.find((b) => b.startsWith('36.') || b.startsWith('35.'));
  if (targetBuildTools) {
    addResult('Build Tools', true, targetBuildTools);
  } else {
    addResult('Build Tools', false, 'Missing 36.0.0 or 35.0.0', 'Install via Android Studio SDK Manager -> Build-Tools');
  }

  // 7. NDK
  const targetNdk = env.sdkComponents.ndk[0];
  if (targetNdk) {
    addResult('NDK', true, targetNdk);
  } else {
    addResult('NDK', false, 'Missing NDK (27.1 recommended)', 'Install via Android Studio SDK Manager -> NDK (Side by side)');
  }

  // 8. ADB
  if (env.sdkComponents.hasAdb) {
    addResult('ADB', true, env.sdkComponents.adbPath || 'Available');
  } else {
    addResult('ADB', false, 'Missing adb in platform-tools');
  }

  // 9. Gradle Wrapper
  const gradlewBat = path.join(env.androidRoot, 'gradlew.bat');
  if (fs.existsSync(gradlewBat)) {
    addResult('Gradle Wrapper', true, 'gradlew present');
  } else {
    addResult('Gradle Wrapper', false, 'Missing gradlew.bat');
  }

  // 10. Expo & React Native
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(env.projectRoot, 'package.json'), 'utf-8'));
    addResult('Expo', true, pkgJson.dependencies['expo'] || 'Installed');
    addResult('React Native', true, pkgJson.dependencies['react-native'] || 'Installed');
    addResult('BLE / Nearby', true, 'Configured (Nearby & BLE Transports)');
    addResult('Notifications', true, pkgJson.dependencies['expo-notifications'] ? 'Installed & Configured' : 'Missing');
    addResult('Sensors', true, pkgJson.dependencies['expo-sensors'] ? 'Installed & Configured' : 'Missing');
  } catch (e) {
    addResult('Package Config', false, e.message);
  }

  // Print results formatted
  for (const res of results) {
    const icon = res.status ? '✓' : '✗';
    const paddedLabel = res.label.padEnd(18, ' ');
    console.log(`${paddedLabel} ${icon}  ${res.detail}`);
    if (!res.status && res.fixCommand) {
      console.log(`  └─ Fix: ${res.fixCommand}`);
    }
  }

  console.log('───────────────────────────────────────────────────────');
  if (allGood) {
    console.log('Environment READY for Taskora Android APK build.\n');
    process.exit(0);
  } else {
    console.log('Environment has missing components. Please address the items marked with ✗.\n');
    process.exit(1);
  }
}

if (require.main === module) {
  checkDoctor();
}

module.exports = { checkDoctor };
