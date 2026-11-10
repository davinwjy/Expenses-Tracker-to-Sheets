# Implementation Plan: Firebase Auth-Only + Google Sheets Primary Storage & Cross-Device Sync

## Summary
Transitioned the system architecture so that **Firebase is used exclusively for User Authentication (Login / Register / Password Reset / Session management)**, while **all financial records (Accounts, Transactions, Investments, Budgets)** are stored and synchronized directly through **Google Sheets** (via Google Apps Script Web App Bridge) and local device cache. Cross-device synchronization is powered by two-way sync with your Google Sheet.

---

## Architecture Status

- [x] **Firebase Auth Only**: Firebase handles user login, registration, password reset, and sessions. No financial records are written to or read from Firestore database collections.
- [x] **Google Sheets as Primary Database**: Every financial input (adding expenses, incomes, transfers, credit card payments, creating accounts, updating investments, modifying budgets) writes to local storage and syncs to your personal Google Sheet in real-time.
- [x] **Two-Way Cross-Device Sync**: When opening the app on another device (e.g. phone or laptop), the app connects to your Google Sheet URL, pulls the latest data across all 5 tabs (**Summary**, **Accounts**, **Transactions**, **Investments**, and **Budgets**), and synchronizes your dashboard automatically.
- [x] **Offline & Local Cache Resiliency**: All data is stored locally in the browser/app per user email so the app remains fast and fully functional even when offline, syncing with Google Sheet as soon as a connection is available.

---

## Completed Changes

### 1. Enhanced Two-Way Google Apps Script Bridge (`src/lib/googleSheetsSync.ts`)
- [x] Updated `GOOGLE_APPS_SCRIPT_TEMPLATE` to support:
  - **Read (`doGet` / `action: 'fetch_all'`)**: Reads all 5 tabs from the Google Sheet and returns structured JSON (accounts, transactions, investments, budgets, summary).
  - **Write (`doPost` / `action: 'sync_all'`)**: Writes and formats all 5 tabs with header styling and calculations.
- [x] Implemented `fetchFinancialDataFromWebhook(webhookUrl, userId)` to parse sheet rows back into `Account[]`, `Transaction[]`, `Investment[]`, and `CategoryBudget[]`.

### 2. Refactored `FinanceContext.tsx` to Use Google Sheets + Local Storage (No Firestore for Data)
- [x] Removed all Firestore collection listeners and write operations on accounts, transactions, investments, and budgets.
- [x] Implemented initial data loading:
  1. Loads instantly from user-scoped local snapshot cache (`offlineSyncManager.getSnapshot(user?.email)`).
  2. If Google Sheet Webhook URL is configured, automatically pulls latest data in the background (`pullFromGoogleSheet({ silent: true })`).
- [x] Added `pullFromGoogleSheet` to `FinanceContextType` and exported in `useFinance()`.
- [x] Ensured all create/update/delete mutations update local storage and trigger automatic real-time sync to the Google Sheet.

### 3. UI Indicators & Sync Controls (`GoogleSheetsModal.tsx`)
- [x] Added **"📥 Tarik Data dari Sheet"** (Pull to Device) button alongside **"⚡ Kirim ke Google Sheet"** (Push to Cloud) for 1-click cross-device sync.
- [x] Displayed clear status badges: `Database: Google Sheets (Cloud Ledger) | Login: Firebase Auth`.

---

## Verification Results
- [x] `compile_applet`: Build succeeded with 0 errors.
- [x] `lint_applet`: Passed with 0 TypeScript/lint errors (`tsc --noEmit`).
- [x] `scripts/sync-build.js`: Synchronized `/dist` and `/docs` for GitHub Pages and Android builds.
