const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getGradleEnv } = require('./android-env');

const targetArg = process.argv[2] || 'release';

function runBuild() {
  const { env, envInfo } = getGradleEnv();

  // Check for special characters in path that break NDK build
  if (envInfo.androidRoot.includes("'") || envInfo.androidRoot.includes(" ")) {
    if (!envInfo.androidRoot.startsWith('D:\\taskora') && process.platform === 'win32') {
       console.warn('\n[Warning] Current path contains spaces or single quotes which may break NDK build.');
       console.warn('It is recommended to run build from the Junction path: D:\\taskora');
       console.warn('To do this, run: cd D:\\taskora; npm run android:' + targetArg);
    }
  }

  if (!envInfo.java) {
    console.error('\n[Error] No compatible Java/JDK found. Run "npm run android:doctor" for instructions.');
    process.exit(1);
  }

  if (!envInfo.sdkPath) {
    console.error('\n[Error] Android SDK path not found. Run "npm run android:doctor" for instructions.');
    process.exit(1);
  }

  let gradleTask = 'assembleRelease';
  if (targetArg === 'clean') {
    gradleTask = 'clean';
  } else if (targetArg === 'debug') {
    gradleTask = 'assembleDebug';
  } else if (targetArg === 'release' || targetArg === 'apk') {
    gradleTask = 'assembleRelease';
  } else {
    gradleTask = targetArg;
  }

  console.log('\n========================================');
  console.log(`Taskora Android Build: ${gradleTask}`);
  console.log('========================================');
  console.log(`JDK:         ${envInfo.java.path}`);
  console.log(`Android SDK: ${envInfo.sdkPath}`);
  console.log(`Working Dir: ${envInfo.androidRoot}`);

  // Ensure node is in PATH for autolinking
  if (process.platform === 'win32') {
    const nodeDir = path.dirname(process.execPath);
    if (!env.PATH.includes(nodeDir)) {
      env.PATH = `${nodeDir}${path.delimiter}${env.PATH}`;
    }
    // Prevent node from resolving symlinks to bad paths
    env.NODE_PRESERVE_SYMLINKS = "1";
  }

  console.log('----------------------------------------\n');

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'gradlew.bat' : './gradlew';
  const args = [gradleTask];

  const child = spawn(command, args, {
    cwd: envInfo.androidRoot,
    env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n[Build Failed] Gradle exited with status code ${code}`);
      process.exit(code || 1);
    }

    console.log('\n========================================');
    console.log(`Taskora Android Build: SUCCESS`);
    console.log('========================================');

    if (gradleTask === 'assembleRelease') {
      const apkPath = path.join(envInfo.androidRoot, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
      if (fs.existsSync(apkPath)) {
        const stats = fs.statSync(apkPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Release APK generated successfully:`);
        console.log(`Path: ${apkPath}`);
        console.log(`Size: ${sizeMb} MB`);
        console.log('\nTo install on a connected Android device:');
        console.log(`  adb install -r "${apkPath}"\n`);
      } else {
        console.warn(`Warning: Gradle reported success, but APK not found at expected path: ${apkPath}`);
      }
    } else if (gradleTask === 'assembleDebug') {
      const apkPath = path.join(envInfo.androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      if (fs.existsSync(apkPath)) {
        const stats = fs.statSync(apkPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Debug APK generated successfully:`);
        console.log(`Path: ${apkPath}`);
        console.log(`Size: ${sizeMb} MB`);
      }
    }
  });
}

if (require.main === module) {
  runBuild();
}

module.exports = { runBuild };
