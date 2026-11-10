# Implementation Plan - Google Sheets & Drive Storage Integration

Replace Firebase data persistence with direct Google Drive and Google Sheets synchronization using Google Workspace OAuth and client-side API calls.

## User Requirements & Clarifications
- Automatically create a new finance sheet ("Smart Wealth Finance Ledger") in the user's Google Drive.
- Use client-side Google Sign-In with OAuth token.

## Proposed Changes

### 1. OAuth Configuration & Scopes
- Configure Google Workspace OAuth with scopes:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.file`
- Use `set_up_oauth` tool to provision OAuth client.

### 2. Google Sheets & Drive Service (`src/lib/googleSheetsService.ts`)
- Implement utility functions using Fetch API with Bearer token:
  - `findOrCreateFinanceSpreadsheet(accessToken)`: Searches user's Google Drive for "Smart Wealth Finance Ledger". If missing, creates a new Spreadsheet with sheets for Accounts, Transactions, Investments, and Budgets.
  - `readSpreadsheetData(spreadsheetId, accessToken)`: Reads sheet ranges and parses JSON / table rows into application data models.
  - `writeSpreadsheetData(spreadsheetId, accessToken, state)`: Writes application state (accounts, transactions, investments, budgets) back to the Google Spreadsheet.

### 3. Authentication & UI Integration (`src/components/GoogleAuthBanner.tsx` or Navbar)
- Add "Connect Google Drive / Sheets" button with official Google Sign-In styling.
- Manage OAuth token state in memory and trigger automatic sync on app load and mutation.

### 4. FinanceContext Refactoring (`src/context/FinanceContext.tsx`)
- Transition data loading, saving, and mutations from local/Firebase to Google Sheets API sync.
- Provide fallback to local storage when offline or not signed in.

## Verification Plan
- Compile applet with `compile_applet`.
- Verify OAuth setup and Google Sheets synchronization flow.
