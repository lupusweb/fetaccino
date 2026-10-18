# LeadWidget

LeadWidget (prototype codename *Fetaccino*) is a local-first, zero-infrastructure Chrome Extension for bulk business lead acquisition, research, and Google Sheets export.

It automatically detects visible business cards on Google Maps search results in bulk, injects accessible selection checkboxes into each card, provides a real-time review queue in the extension popup, and batch-exports deduplicated leads directly into your Google Sheets via OAuth 2.0.

> **Full Documentation Suite:**
> - [Product Vision & Core Loop](file:///d:/Coding/leadwidget/docs/PRODUCT_VISION.md)
> - [Version Roadmap (V1.0 - V3.0)](file:///d:/Coding/leadwidget/docs/ROADMAP.md)
> - [System Architecture Specification](file:///d:/Coding/leadwidget/docs/architecture/SYSTEM_ARCHITECTURE.md)
> - [Data Model & Provenance](file:///d:/Coding/leadwidget/docs/architecture/DATA_MODEL.md)
> - [Security & Privacy Guardrails](file:///d:/Coding/leadwidget/docs/architecture/SECURITY_AND_PRIVACY.md)
> - [Manual Test Plan & Verification Checklist](file:///d:/Coding/leadwidget/docs/implementation/TEST_PLAN.md)

---

## ⚡ Quick Start: Load Directly into Chrome (No Build Required)

The repository includes a ready-to-run, pre-compiled production bundle in the `dist/` folder. If your machine is new or you don't have Node.js installed yet, you can immediately load the extension:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/leadwidget.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click **Load unpacked**.
5. Select the `dist/` directory inside this repository.
6. The **LeadWidget** extension icon will appear in your Chrome toolbar. Pin it for quick access!

---

## 💻 Developer CLI Reference

If you want to modify code, run tests, or recompile the extension from source, use the following CLI commands:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or higher)
- `npm` (bundled with Node.js)

### Available CLI Commands

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm install` | Install Dependencies | Installs all required packages, including React 18, Vite, Vitest, and TypeScript. |
| `npm test` | Run Test Suite | Runs automated unit tests for DOM parsers, normalizers, and logging services. |
| `npm run test:watch` | Watch Tests | Starts Vitest in interactive watch mode for test-driven development. |
| `npm run build` | Build Production Bundle | Compiles TypeScript and packages the extension into the `dist/` folder. |
| `npm run dev` | Watch / Development Mode | Runs Vite in development mode for live code compilation. |

> **Windows PowerShell Execution Policy Note:**  
> If you encounter `npm : File ... cannot be loaded because running scripts is disabled on this system` in Windows PowerShell, you can either:
> - Prefix commands with `cmd /c` (e.g., `cmd /c "npm run build"`), or
> - Run PowerShell as Administrator and run: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## 🔑 Google Cloud OAuth Setup Guide

LeadWidget requires **zero backend infrastructure** and connects directly to your personal Google Drive and Google Sheets via Google's official REST APIs.

To authorize the extension, configure a free OAuth 2.0 Client ID in your Google Cloud Console:

### Step 1: Enable Google Sheets and Google Drive APIs
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `"LeadWidget Lead Exporter"`).
3. In the navigation menu, go to **APIs & Services > Library**.
4. Search for **Google Sheets API** and click **Enable**.
5. Search for **Google Drive API** and click **Enable**.

### Step 2: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** (or **Internal** if using a Google Workspace domain) and click **Create**.
3. Fill in the required fields:
   - **App Name:** `LeadWidget`
   - **User Support Email:** Your email address
   - **Developer Contact Information:** Your email address
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/spreadsheets` *(to read/write sheet rows)*
   - `https://www.googleapis.com/auth/drive.readonly` *(to search and list your spreadsheet names)*
6. On the **Test Users** page, click **Add Users** and enter your personal Google email address.
7. Click **Save and Continue**.

### Step 3: Generate Chrome App Client ID
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Under Application Type, select **Chrome app**.
4. Enter an Application Name (e.g., `LeadWidget Extension`).
5. In the **Application ID** field, paste your Chrome Extension ID:
   - *Where to find it:* Go to `chrome://extensions/` with Developer mode turned on. Look at the LeadWidget card; copy the 32-character ID string (e.g., `abcdefghijklmnopqrstuvwxyz123456`).
6. Click **Create** and copy your generated **Client ID** (ends with `.apps.googleusercontent.com`).

### Step 4: Add Client ID to `manifest.json`
1. Open `manifest.json` in the root of this project.
2. Locate the `oauth2` block:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/drive.readonly"
     ]
   }
   ```
3. Replace the placeholder with your copied Client ID and save the file.
4. Run `npm run build` (or reload the extension in `chrome://extensions/` by clicking the circular arrow icon).

---

## 📖 End-to-End User Walkthrough

### 1. Select Your Target Google Spreadsheet
1. Pin the LeadWidget icon to your Chrome toolbar.
2. Click the extension icon, or right-click it and choose **Options** (or click the ⚙️ gear icon in the popup).
3. Click **Sign in with Google** to complete the one-time OAuth authorization.
4. Use the search box to find your desired Google Sheet. Select the sheet and the specific worksheet tab (e.g., `Sheet1`).
5. Click **Save Destination**.

### 2. Collect Leads in Bulk on Google Maps
1. Go to [Google Maps](https://www.google.com/maps) and search for any business niche and location (e.g., `"Plumbers in Austin TX"`).
2. LeadWidget will automatically inject selection checkboxes into each business card in the left-hand search results panel.
3. Click checkboxes individually on the businesses you want, or scroll through the list to collect leads. Selection states are automatically saved even while scrolling!

### 3. Review Queue and Export
1. Click the **LeadWidget** icon in your toolbar to open the review popup.
2. Review your selected candidates, check for missing fields, or remove any candidate using the delete button.
3. Click **Export Leads to Sheets**.
4. The extension will automatically:
   - Pre-check your Google Sheet to detect and skip any duplicates (matching by phone or business name).
   - Append truly unique leads as formatted rows into your spreadsheet.
   - Display a real-time summary (e.g., *"5 leads saved, 1 skipped as duplicate"*).

---

## 🛠️ Project Structure

```text
leadwidget/
├── dist/                      # Pre-compiled extension bundle (ready for Chrome)
├── docs/                      # Architectural & product documentation
│   ├── PRODUCT_VISION.md      # Strategic product vision & lifecycle stages
│   ├── ROADMAP.md             # Full version roadmap (V1.0 - V3.0)
│   ├── architecture/          # Architecture specs, data model, security
│   └── implementation/        # Test plan, decisions ledger, progress tracker
├── public/                    # Static assets & extension icons
├── src/
│   ├── background/            # Service worker & OAuth identity orchestration
│   ├── content/               # DOM observers, Maps parsers, selection UI overlay
│   ├── domain/                # Shared TypeScript models & message contracts
│   ├── options/               # Extension settings & destination configuration UI
│   ├── popup/                 # Review queue workspace React application
│   └── services/              # Google Sheets API client, storage & logger
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── package.json               # NPM scripts and dependencies
├── tsconfig.json              # TypeScript compilation configuration
└── vite.config.ts             # Vite build configuration with CRXJS plugin
```

---

## ❓ Troubleshooting

- **Extension changes not reflecting in Chrome?**  
  After editing source files and running `npm run build`, open `chrome://extensions/` and click the **Reload (circular arrow)** button on the LeadWidget card.
- **`OAuth2 request failed: Bad client id` error?**  
  Verify that the `client_id` in `manifest.json` matches the OAuth Client ID generated in your Google Cloud Console, and ensure the Application ID in Google Cloud matches the Extension ID shown in `chrome://extensions/`.
- **Duplicates not saving?**  
  LeadWidget intentionally protects your Google Sheets from clutter by comparing candidate names and phone numbers against existing rows in your sheet. If an entry already exists, it is safely skipped.
