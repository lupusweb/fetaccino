# Development Workflow

## Installation
```bash
npm install
```

## Development
To start Vite with HMR for the popup (note: content scripts and background scripts might require full reload or specific CRXJS setup):
```bash
npm run dev
```

## Build
To build the extension for production or to load it into Chrome unpacked:
```bash
npm run build
```
This generates a `dist` folder.

## Loading into Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` directory.
