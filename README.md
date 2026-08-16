# Taskora

<p align="center">
  <img src="assets/images/taskora-logo.png" alt="Taskora Logo" width="120" />
</p>

<p align="center">
  <strong>A modern, offline-first, Apple-inspired productivity suite designed for seamless performance across Windows, Android, and Web.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20Web%20%7C%20iOS-0A84FF?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Framework-React%20Native%20%2F%20Expo-5E5CE6?style=flat-square" alt="Framework" />
  <img src="https://img.shields.io/badge/Desktop-Electron-47A248?style=flat-square" alt="Desktop" />
  <img src="https://img.shields.io/badge/Architecture-Offline--First%20Zero--Cloud-30D158?style=flat-square" alt="Architecture" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square" alt="TypeScript" />
</p>

---

## Overview

**Taskora** is an ultra-fast, privacy-first personal productivity and task management application. Built with an Apple-inspired visual hierarchy, spatial glassmorphism, and haptic feedback, Taskora delivers an intuitive experience across mobile and desktop without relying on third-party cloud servers or tracking.

---

## Key Features

### 1. Task & Project Management
- **Smart Task Creation**: Natural language parsing for dates and times (e.g. *"Meeting tomorrow at 3 PM"*).
- **Organization**: Nested subtasks, custom colored tags, projects, priorities (Urgent, High, Medium, Low, None).
- **Task Actions**: Pin, Favorite, Defer (Tomorrow, Next Week, Someday), Complete, Delete with swipe gestures and haptics.
- **Views**: Today, Inbox, Upcoming Calendar, Focus Mode, Projects, Search & Filter, Statistics.

### 2. Apple-Inspired Glassmorphic Design System
- **Spatial Glassmorphism**: Translucent layered cards, blurred sheets, frosted rims, and depth hierarchies.
- **Spring Animations**: 60fps physics-driven transitions using `react-native-reanimated`.
- **Dynamic Theming**: True Black Dark Mode, Crisp Light Mode, and System auto-adaptation.
- **Haptic Feedback**: Custom haptic patterns across Android, Windows, and Web.

### 3. Voice Tasks & Speech Recognition (100% On-Device)
- **Windows**: Native SAPI / Speech Recognition `.NET` worker integrated via Electron IPC.
- **Android**: On-device speech recognition via native engine.
- **Web**: Local Web Speech API integration.
- **Privacy Guaranteed**: Zero cloud audio upload, no API keys, and offline capability.

### 4. Focus Mode & Ambient Screensaver
- **Pomodoro & Stopwatch**: Customizable focus sessions with task linking.
- **Apple Minimalist Analog Clock**: 60 ticks with bold quarter accents, proportional hands, and continuous 60fps second sweep with zero timer drift.
- **Digital Clock**: Minimalist typography with animated 12h/24h transitions.
- **Ambient Soundscapes**: Built-in white noise, rain, forest, and binaural audio.

### 5. Global Time Format & Spacious Background Editor
- **Global Time Preferences**: Universal toggle between 12-Hour (`5:42 PM`) and 24-Hour (`17:42`) formats.
- **Background Customization**: 6 visual ambience presets (*Aurora, Liquid, Mesh, Ambient, Minimal, Dynamic*) with continuous sliders for intensity, blur, speed, and real-time live preview.

### 6. Offline-First Synchronization & Device Management
- **Cryptographic Device Pairing**: 5-minute time-based 6-digit verification code with SHA-256 integrity checksums.
- **Deterministic Conflict Resolution (LWW)**: Lamport logical clocks with subtask and tag union preservation.
- **Tombstone Protection**: Deletion markers prevent resurrection of deleted tasks from older snapshots.
- **Persistent Device Revocation**: Disconnecting a device revokes its authorization permanently until re-paired.
- **Manual Mutation Transfer**: Air-gapped JSON mutation packet export and import.

### 7. Backup & Privacy
- **JSON Backup & Restore**: Complete atomic snapshot export and schema-migrated restore.
- **CSV Export**: Clean spreadsheet export for reporting and analysis.
- **100% Privacy**: All tasks and credentials remain on your device in secure local storage.

---

## Supported Platforms

| Platform | Runtime / Distribution | Status |
| :--- | :--- | :---: |
| **Windows** | Electron Standalone (`.exe` / Installer) | Production Ready |
| **Android** | Expo EAS APK / AAB | Production Ready |
| **Web** | Progressive Web App / Static Bundle (`dist/`) | Production Ready |
| **iOS** | React Native / Expo Go | Supported |

---

## Tech Stack

- **Core**: React 19, React Native 0.86, TypeScript
- **Navigation & Routing**: Expo Router v57 (File-based routing)
- **Animations**: React Native Reanimated v4, React Native Gesture Handler
- **Desktop Runtime**: Electron 30, Electron Forge
- **Graphics & Icons**: React Native SVG, Lucide Icons
- **Storage**: `@react-native-async-storage/async-storage`
- **Speech Engine**: Windows SAPI / Android Native / Web Speech API

---

## Project Structure

```
To_do_list_ application/
├── app/                        # Expo Router file-based pages
│   ├── (tabs)/                 # Bottom tab screens (Today, Inbox, Calendar, Focus, Projects)
│   ├── auth/                   # Local authentication & session setup
│   ├── modal/                  # Quick Add & creation sheets
│   ├── settings/               # Settings, Backups, Privacy & Diagnostics
│   ├── sync/                   # Cross-Device Sync & Device Management
│   └── task/[id].tsx           # Task detail & editing view
├── components/                 # Reusable UI components
│   ├── clock/                  # Apple AnalogClock, DigitalClock, Screensaver
│   ├── common/                 # AnimatedPressable, GlassSurface, ElevatedCard
│   ├── navigation/             # FloatingTabBar, SyncStatusPill
│   ├── settings/               # TimeFormatSelector, BackgroundEditor
│   └── tasks/                  # TaskRow, SwipeableTaskRow, TaskActionSheet
├── services/                   # Native platform & hardware services
│   ├── clipboard/              # Multi-platform clipboard bridge
│   ├── haptics/                # iOS, Android, and Web haptics
│   ├── storage/                # Repository & persistence layer
│   └── voice/                  # Speech-to-text pipeline (Windows, Android, Web)
├── sync/                       # Offline-first synchronization engine
│   ├── ConflictResolver.ts     # Deterministic Last-Write-Wins logic
│   ├── DeviceIdService.ts      # Persistent installation device identity
│   ├── DevicePairing.ts        # 6-digit code, SHA-256 checksum & revocation
│   ├── LamportClock.ts         # Distributed logical timestamps
│   ├── SyncEngine.ts           # Mutation processor & queue dispatcher
│   └── TombstoneService.ts     # Deletion markers preventing resurrection
├── electron/                   # Windows desktop main & preload scripts
├── theme/                      # Apple design tokens, materials & typography
└── utils/                      # Time formatting, date parsing, sanitizers
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/) (`npm install -g eas-cli`)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/taskora.git
cd taskora

# Install dependencies
npm install
```

### Running in Development

```bash
# Start Expo development server (Mobile / Web)
npm start

# Run Web in browser
npm run web

# Run Android emulator / device
npm run android

# Run Windows Desktop (Electron Dev mode)
npm run electron:dev
```

---

## Building for Production

### 1. Web Production Build
```bash
npm run build:web
```
Output static bundle will be generated in `dist/`.

### 2. Windows Standalone Application (Electron)
```bash
# Package portable executable (.exe)
npm run electron:package

# Or generate Windows Squirrel installer
npm run electron:make
```
Executable will be placed in `out/Taskora-win32-x64/taskora.exe`.

### 3. Android APK / AAB (EAS Build)
```bash
# Build Android APK / Production Bundle
eas build --platform android --profile production
```

---

## Quality Assurance & Verification

Taskora includes automated test suites covering device deduplication, pairing validation, checksum verification, deterministic LWW conflict resolution, tombstone protection, and device revocation:

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Export web production bundle
npm run build:web

# Package desktop build
npm run electron:package
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
