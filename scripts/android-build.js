const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getGradleEnv } = require('./android-env');

const targetArg = process.argv[2] || 'release';

function runBuild() {
  const { env, envInfo } = getGradleEnv();

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
  console.log('----------------------------------------\n');

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : './gradlew';
  const args = isWindows ? ['/c', 'gradlew.bat', gradleTask] : [gradleTask];

  const child = spawn(command, args, {
    cwd: envInfo.androidRoot,
    env,
    stdio: 'inherit',
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
