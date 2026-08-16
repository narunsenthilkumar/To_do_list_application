# Taskora Sync Architecture Baseline Audit (SYNC_TEST_BASELINE.md)

**Date**: 2026-08-16  
**Environment**: Windows 11 x64, Node.js v22.18.0, npm 11.15.0, Expo v51.0.0, Electron 30.0.0  
**Target Clients**: Windows Electron Standalone (`taskora.exe`), Android (APK), Web (PWA/SPA)

---

## 1. Current Sync Architecture Classification

- **Architecture Class**: **Hybrid (Offline-First + Authenticated Manual/P2P Snapshot & Mutation Exchange)**
- **Transport Mechanism**:
  1. **Device Pairing / Identity Bootstrap**: Versioned `PairingPayload` with SHA-256 integrity checksum, 6-digit cryptographic verification code (5-minute TTL), transferring `UserAccount` identity and initial entity snapshot (`tasks`, `projects`, `tags`).
  2. **Mutation Exchange**: Checksummed `SyncPayload` packets (`Export Changes` $\leftrightarrow$ `Import Changes`) containing structured `SyncOperation[]` with Lamport logical clock versions and UUID operation IDs.
  3. **Local Storage**: `@react-native-async-storage/async-storage` for local entities, tombstones, sync queues, and device registries.
- **Cloud Dependency**: **ZERO / 100% Offline-First**. No third-party servers, no AWS/Firebase/Supabase database backends, no cloud tracking.

---

## 2. Baseline Test Execution Results

| Component | Status | Details |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | **PASS** | `npx tsc --noEmit` exited with code 0 (0 errors). |
| **Web Production Export** | **PASS** | `npm run build:web` built 27 static routes cleanly into `dist/`. |
| **Windows Electron Packaging** | **PASS** | `npm run electron:package` packaged executable at `out/Taskora-win32-x64/taskora.exe`. |
| **Device ID Persistence** | **PASS** | `DeviceIdService` uses persistent `@taskora_device_id_v4`. |
| **Device Deduplication** | **PASS** | `DevicePairing.authorizeDevice()` indexes by `deviceId` and updates existing records instead of appending duplicates. |
| **Revocation Enforcement** | **PASS** | `DevicePairing.revokeDevice()` persists revoked IDs in `@taskora_revoked_devices_v4`. `SyncEngine` strictly rejects revoked packets with `DEVICE_REVOKED`. |
| **Conflict Strategy** | **PASS** | Deterministic Last-Write-Wins (Lamport version $\rightarrow$ `updatedAt` $\rightarrow$ `deviceId` tie-breaker) with subtask & tag union preservation. |
| **Tombstone Protection** | **PASS** | `TombstoneService` blocks resurrection of deleted tasks from older remote snapshots. |

---

## 3. Known Architecture Boundary & Honesty Disclosure

- **Automatic Internet Cloud Sync**: **NOT SUPPORTED BY DESIGN**. Taskora is intentionally designed as an offline-first, privacy-focused application with no central cloud database.
- **Cross-Device Transfer**: Accomplished via verified cryptographic pairing payloads and mutation packet exchange.
