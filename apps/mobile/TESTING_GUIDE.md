# QueueLess India — Mobile Testing & Sideloading Guide

This guide details how to install, test, and verify the QueueLess India Flutter Android debug build on physical devices and emulators.

---

## 1. Artifact Details

- **Artifact Name:** `app-debug.apk`
- **Relative Path:** `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`
- **Absolute Path:** `C:\Users\DELL\AppData\Local\hermes\profiles\queueless-dev\apps\mobile\build\app\outputs\flutter-apk\app-debug.apk`
- **File Size:** `206,136,429 bytes` (~196.6 MB)
- **Target Android Versions:** Android 8.0+ (API Level 26+) through Android 15 (API Level 35/36)
- **Supported ABIs:** `arm64-v8a`, `armeabi-v7a`, `x86_64` (Universal multi-architecture debug binary)

---

## 2. Installation on Android Device

### Method A: Direct Sideloading (Phone / Tablet)
1. **Transfer the APK to your device:**
   - Connect phone via USB cable and copy `app-debug.apk` to the `Download` folder, or
   - Send the file via Google Drive, WhatsApp document, or local HTTP server.
2. **Enable "Install Unknown Apps":**
   - **Android 8.0 to Android 14+:**
     1. Open **Settings** → **Apps** (or **Apps & notifications**).
     2. Tap **Special app access** → **Install unknown apps**.
     3. Select the app used to open the APK (e.g., *Files by Google*, *Chrome*, or *Drive*).
     4. Toggle on **Allow from this source**.
3. **Install the APK:**
   - Open your file manager (*Files by Google*), navigate to `Downloads`, and tap `app-debug.apk`.
   - Tap **Install**. If Play Protect shows a prompt ("Unrecognized app"), tap **More details** → **Install anyway**.

### Method B: ADB Sideloading (USB Debugging)
1. Enable **Developer Options** and **USB Debugging** on your phone:
   - Go to **Settings** → **About phone** → Tap **Build number** 7 times.
   - Go to **Settings** → **System** → **Developer options** → Toggle **USB debugging** ON.
2. Connect your device via USB and run from your terminal:
   ```bash
   adb install -r apps/mobile/build/app/outputs/flutter-apk/app-debug.apk
   ```

### Method C: Real-Time Development & Hot Reload (`flutter run`)
For active development with instant code updates, interactive debugging, and real-time logs:
```bash
cd apps/mobile
export PATH="/d/flutter/bin:$PATH"  # If Flutter is installed at D:\flutter
flutter run
```
**Interactive Hot-Reload Controls:**
- Press `r` in the terminal to **Hot Reload** (sub-second UI updates).
- Press `R` to **Hot Restart** (re-initializes Riverpod state and Hive boxes).
- Press `p` to toggle debug paint overlay.
- Press `q` to detach and exit.

---

## 3. Test Credentials & Environment

| Role | Mobile / Identifier | Password | OTP | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `9000000001` | `demo1234` | `123456` | Queue ticket booking, live position telemetry, calling alert |
| **Merchant Admin** | `9820000001` | `merchant1234` | `123456` | Branch counter management, queue calling, audio TTS |
| **Counter Staff** | `staff-c1` | `staff1234` | N/A | Dedicated counter calling console |

> **Note on DPDP Compliance:** All mobile numbers are strictly masked across client-side logs and server telemetry (e.g., `9000000001` appears as `90XXXX0001`).

---

## 4. End-to-End Test Scenarios

### Scenario A: Customer Flow (Join Queue → Live Telemetry → Full-Screen Calling Alert)
1. **Launch & Login:**
   - Open the **QueueLess** app.
   - Select preferred language: **English**, **हिंदी (Hindi)**, or **मराठी (Marathi)**.
   - Tap **Customer Login** and enter mobile `9000000001` and password `demo1234` (or test OTP `123456`).
2. **Select Branch & Service:**
   - On the Home screen, select a live branch (e.g., *Apollo Clinic & Diagnostics*, Koramangala or *State Bank of India*, CP).
   - Select service category (e.g., *General OPD Consultation*).
   - Tap **Join Live Queue**.
3. **Verify Live Token Ticket:**
   - Inspect the generated digital ticket with perforated tear-line styling:
     - **Token Number:** (e.g., `A-104`).
     - **Live Counter:** Current Serving Token (e.g., `A-101`).
     - **Wait Time:** Dynamic estimation (e.g., `~12 mins (3 ahead)`).
     - **Status Pipeline:** Progress tracker highlighting `WAITING`.
4. **Test Backgrounding & OEM Battery Defense:**
   - Send the app to the background (press Home button).
   - Verify that an Android **Foreground Service Notification** appears:
     - *"QueueLess — Token A-104 active. 3 ahead in queue."*
     - This persistent isolate maintains WebSocket telemetry even on OEM aggressive battery regimes (MIUI/ColorOS).
5. **Verify Calling Alert:**
   - When the counter calls `A-104`, observe:
     - High-priority wake-screen incoming call dialog (vibrates with custom pattern `[0, 500, 250, 500]`).
     - High-contrast visual alert with pulsing counter assignment.
     - Single-tap action: **"I am on my way"** or **"Request 2 min Delay"**.

---

### Scenario B: Merchant Flow (Counter Console → Call Next → Bilingual TTS)
1. **Login as Merchant:**
   - Navigate to Merchant portal / Login tab.
   - Login with merchant credentials (`9820000001` / `merchant1234`).
2. **Merchant Dashboard & Counter Selection:**
   - Select active counter (e.g., **Counter 1 — Consultation**).
   - Observe live queue list displaying waiting customers, priority flags (Senior Citizen / Emergency), and wait durations.
3. **Call Next Token:**
   - Tap **"Call Next"** button.
   - Verify real-time token state transition from `WAITING` to `CALLED`.
4. **Verify Bilingual Text-to-Speech (TTS):**
   - The device speaker / Bluetooth audio triggers bilingual announcement:
     - **Hindi (Primary):** *"टोकन ए-१०४, कृपया काउंटर १ पर जाएं"*
     - **English (Secondary):** *"Token A-104, please proceed to Counter 1"*
     - *(If branch locale is Maharashtra, verifies Marathi: "टोकन ए-१०४, कृपया काउंटर १ वर या")*
5. **Complete Service:**
   - Tap **"Mark Serving"** → Token transitions to `IN_SERVICE`.
   - Tap **"Complete"** → Token is archived and next ticket in queue is queued.

---

### Scenario C: TV Calling Board Mode (Ultra-High Contrast Digital Signage)
1. **Launch TV Mode:**
   - On tablet, Android TV, or merchant tablet, launch the TV Board route (`/merchant/tv-board`).
2. **Verify Display Elements:**
   - **Full-Screen Dark Canvas:** `#0A0F1D` background with high-contrast `#F97316` (Emergency Amber) and `#10B981` (Success Green).
   - **Hero Active Token:** Giant 96sp typographic token number readable from 10+ meters away.
   - **Counter Badge:** Bold "COUNTER 1" header badge.
   - **Audio Announcement:** Automated chime and bilingual TTS speech playback on state transitions.
   - **Recent History Column:** Displays last 4 called tokens with timestamps to reassure patrons.
3. **Screen-Wake Defense:**
   - Verify `wakelock_plus` keeps the display awake continuously without dimming or sleeping.

---

## 5. Debug Build Characteristics & Known Limitations

| Parameter | Debug Build (`app-debug.apk`) | Production Release (`app-release.aab`) |
| :--- | :--- | :--- |
| **Binary Size** | ~196 MB (Multi-ABI + JIT + debug symbols) | ~18 MB (Per-ABI split + ProGuard R8 + AOT) |
| **Dart Runtime** | Dart VM JIT (Hot Reload enabled) | AOT compiled machine code |
| **Network Security** | Permits plain HTTP for local LAN (`10.0.2.2`) | Strict HTTPS TLS 1.3 + Certificate Pinning |
| **Android Permissions** | All runtime permissions promptable | Manifest + ProGuard stripped |

### Important Local Testing Notes:
1. **Android Emulator Localhost:**
   - If running the backend locally on your computer (`localhost:3000`), the Android Emulator cannot reach it via `http://localhost:3000`.
   - Use `http://10.0.2.2:3000` (the emulator's bridge to host loopback).
2. **Physical Device on Wi-Fi:**
   - Ensure phone and dev PC are on the same Wi-Fi network.
   - Point `API_BASE_URL` to your machine's LAN IP (e.g., `http://192.168.1.15:3000`).
3. **OEM Battery Optimization:**
   - On Xiaomi (MIUI), OnePlus (OxygenOS), and Samsung (OneUI), grant **"Autostart"** and set Battery Saver to **"No restrictions"** for uninterrupted background socket operation.
