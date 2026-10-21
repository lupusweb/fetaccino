# Fetaccino ☕

> **Effortlessly capture business leads from Google Maps & Google Search and stream them directly into your Google Sheets.**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Live Website](https://img.shields.io/badge/Website-fetaccino.vercel.app-000000?style=flat&logo=vercel&logoColor=white)](https://fetaccino.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Fetaccino is a lightweight, privacy-first Chrome Extension designed for freelancers, sales teams, and marketers. It allows you to prospect leads on Google Maps and Google Search with a single click and automatically save structured contact information—including business name, category, phone number, address, rating, website, and Google Maps URL—directly to your personal Google Sheets.

---

## ⚡ Quick Start (No Coding Required)

If you just want to use Fetaccino in Google Chrome, follow these simple steps:

1. **Download the Latest Release:**  
   Head to the **[Releases](https://github.com/lupusweb/fetaccino/releases)** tab on GitHub and download **`fetaccino-v1.0.0.zip`**.
2. **Unzip the Folder:**  
   Extract the downloaded `.zip` file to a convenient folder on your computer (e.g., inside your Documents or Downloads folder).
3. **Open Chrome Extensions:**  
   Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
4. **Enable Developer Mode:**  
   In the top-right corner of the Extensions page, toggle **Developer mode** to **ON**.
5. **Load the Extension:**  
   Click the **Load unpacked** button in the top-left corner and select the extracted folder.
6. **Pin & Launch:**  
   Click the puzzle piece icon in your Chrome toolbar and pin **Fetaccino**. Click the Fetaccino icon to sign in with your Google account!

---

## ✨ Features

- **🎯 1-Click Lead Capturing:** Click `+ Add` on any business listing on Google Maps, Google Search Local Pack, or Google Places tabs to instantly queue leads.
- **🛡️ 100% Client-Side Privacy:** Fetaccino connects directly to your Google account using official Google OAuth 2.0. There is **zero middleman server or third-party database**—your leads stay exclusively in your private Google Drive.
- **⚡ Smart Duplicate Prevention:** Prevents clutter by automatically comparing queued leads against existing rows in your spreadsheet by name and phone number.
- **📊 1-Click Default Sheet Creation:** Fetaccino can automatically create and format a fresh `"Fetaccino Leads"` spreadsheet in your Google Drive with ready-to-use column headers.
- **🔗 Direct Sheet Access:** A dedicated `Open Sheet ↗` button in the popup opens your live spreadsheet instantly in a new tab.
- **🔄 Auto-Health Check:** If a previously selected sheet is ever deleted from Google Drive, Fetaccino detects it immediately and offers to generate a new sheet or select one from Drive with zero friction.

---

## 📋 Data Fields Extracted

Every lead saved by Fetaccino includes structured, standardized data columns:

| Column | Field | Description |
| :---: | :--- | :--- |
| **A** | **Business Name** | Official trade or business name |
| **B** | **Category** | Primary industry or niche (e.g., Italian Restaurant, Plumber) |
| **C** | **Rating** | Google star rating (e.g., 4.8) |
| **D** | **Review Count** | Total number of customer reviews (normalized) |
| **E** | **Address** | Street address, city, and postal code |
| **F** | **Phone** | Standardized international or local telephone number |
| **G** | **Website** | Direct business website URL |
| **H** | **Google Maps URL** | Permanent link to the Google Maps place listing |
| **I** | **Captured At** | ISO-8601 timestamp of lead capture |
| **J** | **Confidence** | Data quality confidence score (0–100%) |
| **K** | **Source** | Origin context (`MAPS` or `SEARCH`) |
| **L** | **Search Query** | Active search keyword (when available) |

---

## 🛠️ Developer Setup (Build from Source)

If you are a developer and want to modify or compile Fetaccino from source code:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or higher)
- `npm`

### Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/your-username/leadwidget.git
cd leadwidget

# 2. Install dependencies
npm install

# 3. Run automated tests
npm test

# 4. Build production bundle
npm run build
```

Then load the compiled `dist/` directory into Chrome via `chrome://extensions` using **Load unpacked**.

### Available NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite in watch mode for development |
| `npm run build` | Compiles TypeScript and creates optimized `dist/` bundle |
| `npm test` | Runs the full Vitest automated test suite |
| `npm run test:watch` | Runs tests in interactive watch mode |

---

## 🔒 Security & Privacy

Fetaccino complies with Google API Services User Data Policy, including Limited Use requirements:
- Access tokens are stored strictly in Chrome's sandboxed local storage.
- No lead data, personal identifiers, or spreadsheet contents are ever transmitted to external servers.
- For complete compliance disclosures, visit our official **[Privacy Policy](https://fetaccino.vercel.app/privacy/)** and **[Terms of Service](https://fetaccino.vercel.app/terms/)**.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
