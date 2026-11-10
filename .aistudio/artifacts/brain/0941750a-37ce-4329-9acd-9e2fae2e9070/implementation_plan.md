# Multi-User Google Sheets Isolation & Auto-Sync Plan

## Summary
Ensure that when logged into `davinwijaya16@gmail.com`, financial data is fetched and synced to a dedicated Google Sheet unique to `davinwijaya16@gmail.com`, separate from any sheet created under `davinwijaya1996@gmail.com`.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Account Separation**: Each user account (`davinwijaya16@gmail.com` and `davinwijaya1996@gmail.com`) will maintain its own distinct Google Spreadsheet ID stored securely in user settings / local configuration (`wealthtrack_sheets_id_${userEmail}`).
> - **Data Isolation**: Logging into `davinwijaya16@gmail.com` will load data associated with that specific user email from Firebase/local storage and sync only to that user's dedicated Google Sheet.

## 1. Overview & Core Concept

- **What It Does**: Associates Google Sheets integration state directly with the currently authenticated user's email address (`davinwijaya16@gmail.com`).
- **Target Audience**: Users managing personal finance across multiple Google accounts who expect independent data stores and spreadsheets per account.
- **Key Value**: Prevents cross-contamination of financial records between `davinwijaya16@gmail.com` and `davinwijaya1996@gmail.com`.

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. User signs in as `davinwijaya16@gmail.com`.
  2. App checks for an existing Google Sheet mapping for `davinwijaya16@gmail.com`. If none exists, a prompt or auto-creation creates "WealthTrack Pro - davinwijaya16@gmail.com".
  3. Every transaction or account update automatically syncs to that specific spreadsheet.
  4. If switching to `davinwijaya1996@gmail.com`, the app seamlessly switches to the sheet mapped to `davinwijaya1996@gmail.com`.

## 3. Technical Architecture & Data Strategy

- **Sheet ID Storage**: `localStorage.getItem(`wealthtrack_sheets_id_${user.email}`)` or user profile document in Firebase.
- **Sync Routine**: Whenever data mutations occur in `FinanceContext`, the sync service uses the active user's email to resolve the correct spreadsheet ID before pushing updates via Google Sheets API.
