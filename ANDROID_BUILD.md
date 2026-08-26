
# Taskora Android Build & Deployment Guide

This guide details the complete production build workflow, environment requirements, and physical device deployment steps for Taskora.

---

## 1. System Requirements & Prerequisites

| Component | Target Version | Description |
|---|---|---|
| **Node.js** | 20.x or 24.x LTS | JavaScript runtime |
| **Java JDK** | OpenJDK 21 LTS | Required for Android Gradle Plugin & CMake |
| **Android SDK** | API 36 / 35 | Android SDK Platform |
| **Build Tools** | 36.0.0 or 35.0.0 | Android SDK Build-Tools |
| **NDK** | 27.1.12297006 | C/C++ Native Development Kit |
| **CMake** | 3.22.1+ | C/C++ build system for Native Modules |
| **Expo SDK** | 57.x | React Native 0.86.2 with New Architecture |

---

## 2. Environment Verification (`android:doctor`)

Run the automated diagnostic doctor to verify all SDKs, JDKs, paths, and build tools:

```bash
npm run android:doctor
```

Expected Output:
```text
Taskora Android Environment Doctor
───────────────────────────────────────────────────────
Node.js            ✓  v24.11.1
npm                ✓  v11.15.0
Java               ✓  openjdk version "21.0.12.1"
JAVA_HOME          ✓  C:\Program Files\Microsoft\jdk-21...
Android SDK        ✓  C:\Users\<user>\AppData\Local\Android\Sdk
ANDROID_HOME       ✓  C:\Users\<user>\AppData\Local\Android\Sdk
SDK Platform       ✓  android-36
Build Tools        ✓  35.0.0 / 36.0.0
NDK                ✓  27.1.12297006
ADB                ✓  platform-tools/adb.exe
Gradle Wrapper     ✓  gradlew present
Expo               ✓  ~57.0.14
React Native       ✓  0.86.2
BLE / Nearby       ✓  Configured
Notifications      ✓  Installed & Configured
Sensors            ✓  Installed & Configured
───────────────────────────────────────────────────────
Environment READY for Taskora Android APK build.
```

---

## 3. Building the Production Release APK

Build the standalone Android Release APK with a single command:

```bash
npm run android:apk
```
*(or `npm run android:release`)*

The script automatically:
1. Detects `JAVA_HOME` and OpenJDK 21.
2. Resolves `ANDROID_HOME` and generates `android/local.properties` dynamically.
3. Invokes Gradle `assembleRelease` with Hermes and New Architecture enabled.
4. Generates the final output APK at:
   ```text
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 4. Building a Debug APK

To generate a debug APK for development testing:

```bash
npm run android:debug
```

Output location:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Cleaning the Android Build

To clean build caches and intermediate artifacts:

```bash
npm run android:clean
```

---

## 6. Physical Device Testing & Installation

### Step A: Enable Developer Options & USB Debugging
1. Open **Settings** on your Android device.
2. Navigate to **About Phone** > Tap **Build Number** 7 times until Developer Mode is unlocked.
3. Go to **Settings** > **System** > **Developer Options**.
4. Enable **USB Debugging**.

### Step B: Connect and Verify Device
Connect the device to your computer via USB:
```bash
adb devices
```
Ensure your device appears with status `device`.

### Step C: Install the Release APK
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Step D: Alternative (Direct File Transfer)
You can also copy `app-release.apk` directly to your phone via Google Drive, WhatsApp, or USB File Transfer, and tap the APK to install.

---

## 7. Feature Verification Checklist on Physical Device

- [x] **Launch & Onboarding**: Smooth startup and splash transition.
- [x] **Permissions Flow**: Contextual explanations for Notifications, Bluetooth, Alarms, and Microphone.
- [x] **Tasks & Inbox**: Independent project selection, multi-project tagging, and inbox isolation.
- [x] **Smart Filters**: Today, Upcoming, Overdue, High Priority, Favorites, and Pinned working independently.
- [x] **Calendar View**: Month navigation, date selection, and tasks scheduled by date.
- [x] **Focus Timer**: Timestamp-based countdown that survives home button, screen lock, and app backgrounding.
- [x] **Notifications & Alarms**: Scheduled task reminders and alarms triggered deterministically on Android channels.
- [x] **Nearby BLE Sync**: Device discovery, cryptographic 6-digit verification handshake, and CRDT SyncEngine merge.
- [x] **Offline-First & QR/JSON Sync**: Fully functional offline database, QR pairing, and JSON export/import backup.
