# Taskora

<p align="center">
  <img src="assets/images/taskora-logo.png" alt="Taskora Logo" width="120" />
</p>

<p align="center">
  <strong>A modern, offline-first, Apple-inspired productivity suite designed for seamless performance across Windows, Android, and Web.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20Web%20%7C%20iOS-0A84FF?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Framework-React%20Native%200.86%20%2F%20Expo%2057-5E5CE6?style=flat-square" alt="Framework" />
  <img src="https://img.shields.io/badge/Desktop-Electron%2030-47A248?style=flat-square" alt="Desktop" />
  <img src="https://img.shields.io/badge/Architecture-Offline--First%20Zero--Cloud-30D158?style=flat-square" alt="Architecture" />
  <img src="https://img.shields.io/badge/Sync-Nearby%20BLE%20%2F%20GATT-FF9500?style=flat-square" alt="BLE Sync" />
  <img src="https://img.shields.io/badge/CI%2FCD-Codemagic-F38020?style=flat-square" alt="Codemagic" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square" alt="TypeScript" />
</p>

---

## Overview

**Taskora** is an ultra-fast, privacy-first personal productivity and task management application. Built with an Apple-inspired visual hierarchy, spatial glassmorphism, native Android system extensions, and haptic feedback, Taskora delivers a unified, high-performance experience across mobile, desktop, and web—completely independent of third-party cloud servers, telemetry, or recurring subscriptions.

---

## Key Features

### 1. Task & Project Management
- **Natural Language Parsing**: Intelligent NLP engine extracts titles, dates, times, and recurrence rules from everyday speech or text (e.g., *"Team standup every Monday at 9:30 AM"*).
- **Organization**: Hierarchical subtasks, custom-colored tags, project grouping, and 5-tier priority matrix (Urgent, High, Medium, Low, None).
- **Interactive Gestures**: Swipe to complete, pin, favorite, defer (Tomorrow, Next Week, Someday), and delete with fluid haptic spring responses.
- **Smart Views**: Today, Inbox, Upcoming Calendar, Focus Mode, Projects, Search & Filter, and Productivity Statistics.

### 2. Apple-Inspired Glassmorphic Design System
- **Spatial Glassmorphism**: Translucent layered cards, blurred sheets, frosted rims, and depth hierarchies with true black dark mode and crisp light mode.
- **Physics-Based Spring Transitions**: 60fps animations powered by `react-native-reanimated` v4 and `react-native-gesture-handler`.
- **Accessible Touch Targets**: Strict 44pt+ minimum touch targets, high-contrast typography (`TypographyScale`), and WCAG AAA compliance.
- **Haptic Feedback**: Custom haptic patterns across Android, Windows, and Web.

### 3. Focus Mode & Ambient Screensaver
- **Pomodoro & Custom Timers**: Customizable work/break intervals linked directly to active tasks with automatic cycle tracking.
- **Apple Minimalist Analog Clock**: 60-tick dial with bold quarter markers, proportional hands, and continuous 60fps second sweep with zero timer drift.
- **Digital Clock & Fullscreen Screensaver**: Minimalist typography with animated 12h/24h transitions and burn-in prevention.
- **Ambient Soundscapes**: Built-in white noise, rain, forest, and binaural audio generated locally.

### 4. Taskora Focus Shield & Digital Wellbeing *(New)*
- **Native Android App Blocker**: Leverages an Android Accessibility Service (`TaskoraFocusAccessibilityService`) to monitor foreground windows and intercept distracting apps (Instagram, YouTube, TikTok, Reddit, X/Twitter, Chrome, etc.) during active focus sessions.
- **System Do Not Disturb (DND) Integration**: Interacts with Android's Notification Policy Access to automatically enforce strict DND during sessions and restore original settings upon completion.
- **Emergency Unlock**: 5-minute temporary unlock grace period when access is urgently needed, backed by cooldown timers.
- **Distraction Management UI**: Dedicated settings panel (`app/settings/focus-shield.tsx`) to search, multiselect, select all, or deselect all installed apps.

### 5. Adaptive Notification Engine & Dynamic Island Experience *(New)*
- **Smart Adaptive Presentation**: `NotificationExperienceManager` evaluates device capabilities and dispatches notifications to the optimal Android surface:
  - **`ONGOING_ISLAND_PILL`**: Persistent, sticky status bar / notification shade pill displaying real-time focus countdown, task context, and quick pause/resume controls.
  - **`HEADS_UP_BANNER`**: High-priority alert banner with sound and vibration for time-sensitive task deadlines.
  - **`LOCKSCREEN_CARD` & `STANDARD_SHADE`**: Clean, non-intrusive reminder alerts.
- **Exact Alarms & Reboot Persistence**: Built on Android's native `AlarmManager` (`setExactAndAllowWhileIdle`) and `TaskoraBootReceiver`, ensuring reminders fire accurately even through Doze mode and across device reboots.
- **Dedicated Notification Channels**: High-priority channels (`taskora_alarms`, `taskora_reminders`, `taskora-focus`).

### 6. Apple-Grade Custom Time Picker & Quick Date Selectors *(New)*
- **Bespoke `CustomTimePicker`**: Intuitive numeric input component supporting instant toggle between 12-Hour (`AM`/`PM`) and 24-Hour formats, automatic boundary validation, zero-padded formatting, and tactile segment buttons.
- **Streamlined Date Scheduling**: Fast segmented selectors (`Today`, `Tomorrow`, `Pick Date`, `No Due Date`) in both Task Details and Quick Add modals.
- **Reminder Intervals Grid**: One-tap reminder presets (`5m before`, `15m before`, `30m before`, `1h before`, `1d before`, `Custom Time...`).

### 7. Interactive Android Home Screen Widgets *(New)*
- **Multiple Widget Sizes**: Native Android AppWidget implementations for Small, Medium, and Large layouts, as well as specialized Agenda, Focus Timer, Progress Ring, and Quick Capture widgets.
- **In-App Live Preview & Customization**: Preview and configure home screen widgets directly within Taskora Settings (`app/settings/widgets.tsx`).
- **Background Synchronization**: Synchronizes active task lists, completion metrics, and focus states with native Android `AppWidgetManager`.

### 8. Voice Tasks & Speech Recognition (100% On-Device)
- **Windows**: Native SAPI / Speech Recognition `.NET` worker integrated via Electron IPC.
- **Android**: On-device speech recognition powered by native Android speech engines.
- **Web**: Local Web Speech API integration.
- **Privacy Guaranteed**: Zero cloud audio transmission, no external API keys required, and full offline capability.

### 9. Peer-to-Peer Nearby BLE Sync & Device Pairing
- **Zero-Cloud Bluetooth LE Sync**: Custom native Android BLE module (`TaskoraBleModule`) enabling direct, air-gapped device-to-device communication via GATT servers and clients.
- **Bidirectional Chunk Transport**: Automatic fragmentation, transmission, reassembly, and acknowledgement of CRDT mutation payloads over GATT characteristics.
- **Cryptographic Pairing**: 5-minute dynamic 6-digit verification code with SHA-256 payload integrity checksums.
- **Deterministic Conflict Resolution (LWW)**: Lamport logical clocks with union-based subtask and tag preservation.
- **Tombstone Protection & Revocation**: Persistent deletion markers prevent resurrection of removed tasks; device revocation permanently blocks unauthenticated sync.
- **Air-Gapped Transfer**: Manual JSON mutation packet and QR code transfer for completely offline environments.

### 10. Backup, Privacy & Security
- **Atomic JSON Backup & Restore**: Full database snapshot export with schema-versioned migrations.
- **Clean CSV Export**: Structured export suitable for spreadsheets, reporting, and external analysis.
- **100% Privacy by Design**: All data stays on the local device inside secure hardware-backed storage (`@react-native-async-storage/async-storage`).

---

## Supported Platforms

| Platform | Runtime / Distribution | Status | Native Features |
| :--- | :--- | :---: | :--- |
| **Android** | Native APK / Google Play AAB | **Production Ready** | Focus Shield (Accessibility), DND Policy, Home Widgets, BLE Sync, Exact Alarms |
| **Windows** | Electron Standalone (`.exe` / Installer) | **Production Ready** | SAPI Speech Recognition, Native Tray, Hardware Acceleration |
| **Web** | Progressive Web App / Static Bundle (`dist/`) | **Production Ready** | Responsive Glassmorphism, Web Speech API, LocalStorage |
| **iOS** | React Native / Expo Prebuild (IPA) | **Supported** | iOS Haptics, BlurView, Background Scheduling |

---

## Tech Stack

- **Framework**: React 19, React Native 0.86.2, Expo SDK 57 (New Architecture / Fabric & TurboModules enabled)
- **Routing**: Expo Router v57 (File-based navigation)
- **Animations**: React Native Reanimated v4.5, React Native Gesture Handler
- **Desktop Runtime**: Electron 30, Electron Forge, electron-builder
- **Native Android (Kotlin)**:
  - `TaskoraFocusAccessibilityService` (App Blocker & Window Monitoring)
  - `TaskoraBleModule` (Bluetooth Low Energy GATT Transport)
  - `TaskoraAlarmModule` & `TaskoraAlarmReceiver` (Exact Alarms & Boot Restoration)
  - `TaskoraWidgetProvider` (Native Android Home Screen Widgets)
- **Styling & Icons**: Lucide Icons, React Native SVG, Custom Apple Design Tokens (`TypographyScale`, `Spacing`, `Radii`, `Shadows`)
- **Storage**: `@react-native-async-storage/async-storage`
- **CI/CD**: Codemagic CI/CD pipelines (`codemagic.yaml`)

---

## Project Structure

```
To_do_list_ application/
├── .vscode/                     # Editor configurations
├── android/                     # Android native project (New Architecture / Kotlin)
│   └── app/src/main/java/com/taskora/app/
│       ├── focus/               # TaskoraFocusAccessibilityService & FocusShieldManager
│       ├── TaskoraBleModule.kt  # Native BLE GATT server & client
│       ├── TaskoraAlarmModule.kt# Exact AlarmManager bridge
│       └── *WidgetProvider.kt  # Small, Medium, Large & Agenda AppWidgets
├── app/                         # Expo Router file-based pages
│   ├── (tabs)/                  # Bottom tab screens (Today, Inbox, Calendar, Focus, Projects)
│   ├── auth/                    # Local passcode & biometric setup
│   ├── modal/                   # Quick Add, Time Picker, & Focus Shield overlays
│   ├── settings/                # Settings, Focus Shield, Widgets, Backup, & Sync
│   │   ├── focus-shield.tsx     # Focus Shield app management & DND permissions
│   │   └── widgets.tsx          # Home screen widget configuration & preview
│   ├── sync/                    # Nearby BLE Pairing & Cross-Device Management
│   └── task/[id].tsx            # Redesigned task detail, segmented date & reminder grid
├── components/                  # Reusable UI components
│   ├── clock/                   # Apple AnalogClock, DigitalClock, Screensaver
│   ├── common/                  # CustomTimePicker, AnimatedPressable, GlassSurface, ElevatedCard
│   ├── navigation/              # FloatingTabBar, SyncStatusPill
│   ├── settings/                # BackgroundEditor, TimeFormatSelector, AnimatedToggle
│   └── tasks/                   # TaskRow, SwipeableTaskRow, TaskActionSheet
├── electron/                    # Windows desktop main & preload scripts
├── models/                      # TypeScript domain models (Task, Focus, Sync, Widgets)
├── scripts/                     # Local Android build, diagnostic & environment scripts
│   ├── android-doctor.js        # Environment diagnostic checker
│   ├── android-build.js         # Automated Gradle build executor
│   └── android-env.js           # Dynamic SDK, JDK, & local.properties locator
├── services/                    # Platform & hardware services
│   ├── focus/                   # FocusShieldService & FocusTimerEngine
│   ├── notifications/           # NotificationExperienceManager, ReminderScheduler, Channels
│   ├── permissions/             # Unified PermissionManager (Bluetooth, Alarms, Notifications)
│   ├── storage/                 # Atomic repository & persistence layer
│   ├── voice/                   # Speech-to-text pipeline (Windows, Android, Web)
│   └── widgets/                 # WidgetDataService (Native AppWidget sync)
├── sync/                        # Offline-first synchronization engine
│   ├── nearby/                  # BluetoothTransport, NearbyDiscovery, NearbySession
│   ├── ConflictResolver.ts      # Deterministic Last-Write-Wins logic
│   ├── DevicePairing.ts         # 6-digit verification code & SHA-256 validation
│   └── SyncEngine.ts            # Mutation queue & dispatcher
├── theme/                       # Apple design tokens, materials & typography scales
├── codemagic.yaml               # Multi-platform CI/CD configuration
├── ANDROID_BUILD.md             # In-depth Android production build guide
└── package.json                 # Project dependencies & scripts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or v24.x LTS recommended)
- [OpenJDK 21](https://learn.microsoft.com/en-us/java/openjdk/download) (Required for Android local builds)
- [Android SDK Platform 35 / 36](https://developer.android.com/studio) with NDK `27.1.12297006` and CMake
- [npm](https://www.npmjs.com/) (v10+)

### Installation

```bash
# Clone the repository
git clone https://github.com/narunsenthilkumar/To_do_list_application.git
cd To_do_list_application

# Install dependencies
npm install
```

### Running in Development

```bash
# Start Expo development server
npm start

# Run Web in browser
npm run web

# Run Android emulator / physical device (via Expo)
npm run android

# Run Windows Desktop (Electron Dev mode)
npm run electron:dev
```

---

## Android Local Build & Diagnostics

Taskora includes automated scripts for environment validation and single-command native builds without needing to launch Android Studio:

### 1. Environment Doctor (`android:doctor`)
Run the diagnostic script to verify your JDK 21, Android SDK, NDK, CMake, and ADB paths:
```bash
npm run android:doctor
```

### 2. Build Standalone Production Release APK
```bash
npm run android:apk
# or
npm run android:release
```
The script automatically configures `local.properties`, resolves paths, runs Gradle `assembleRelease` with Hermes and New Architecture enabled, and outputs the final APK to:
```text
android/app/build/outputs/apk/release/app-release.apk
```

### 3. Build Debug APK
```bash
npm run android:debug
```

### 4. Clean Android Build Cache
```bash
npm run android:clean
```

> For complete physical device deployment steps via USB debugging or direct transfer, consult [ANDROID_BUILD.md](ANDROID_BUILD.md).

---

## Building for Other Platforms

### 1. Web Production Build
```bash
npm run build:web
```
Generates an optimized static bundle in `dist/`.

### 2. Windows Standalone Application (Electron)
```bash
# Package portable executable (.exe)
npm run electron:start

# Or create standalone distribution bundle
npm run electron:dist
```

---

## CI/CD Automation (Codemagic)

Taskora is pre-configured with continuous integration and continuous deployment via [`codemagic.yaml`](codemagic.yaml):

1. **`android-release`**: Triggered on pushes/tags to `main`. Automatically runs `expo prebuild`, configures Android SDK, and compiles signed production APK & Google Play AAB artifacts on `mac_mini_m2` runners.
2. **`android-debug`**: Runs on pull requests for rapid testing APK generation.
3. **`ios-release`**: Generates native iOS project via `expo prebuild`, installs CocoaPods, and archives the iOS IPA.
4. **`web-export`**: Exports the production Single Page Web Application bundle.

---

## Quality Assurance & Verification

Taskora includes comprehensive automated test suites and compiler checks:

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run Android Environment Doctor
npm run android:doctor

# Export and validate web bundle
npm run build:web
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
