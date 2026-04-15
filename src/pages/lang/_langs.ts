// Per-language landing page data — slug → category + intro
// Underscore-prefixed filename so Astro doesn't route it.

export const LANGS: Record<string, { label: string; category: string; intro: string; accent: string }> = {
  powershell: {
    label: 'PowerShell',
    category: 'ps',
    accent: '--blue',
    intro:
      "Where the real sysadmin work lives. WPF GUIs that auto-elevate, async background workers so the UI never freezes, and silent automation that never ships a progress dialog in an unattended session. Every script self-elevates, self-bootstraps, and fails loudly when it has to.",
  },
  python: {
    label: 'Python',
    category: 'py',
    accent: '--grn',
    intro:
      "PyQt6 desktop tools that auto-install their own dependencies on first launch, Flask-backed local utilities, and pipelines that move real production data. Turnkey means turnkey: no pip install dance, no README-driven setup.",
  },
  javascript: {
    label: 'JavaScript',
    category: 'ext',
    accent: '--yel',
    intro:
      "Userscripts and Chrome MV3 extensions — document-start injection, anti-FOUC styling, Trusted Types, split-context patterns for ad blocking. No jQuery, no frameworks where they aren't needed. Scope every CSS class to avoid leaking into the host page.",
  },
  web: {
    label: 'Web Apps',
    category: 'web',
    accent: '--blue',
    intro:
      "Single-file HTML apps that deploy to GitHub Pages and just work. No backend, no signup, no telemetry. Leaflet for maps, Cesium for 3D, IndexedDB for offline state, CORS-friendly proxy fallbacks where needed.",
  },
  kotlin: {
    label: 'Kotlin / Android',
    category: 'kt',
    accent: '--teal',
    intro:
      "Jetpack Compose with Material 3, AMOLED-black by default, R8 + resource shrinking in release builds. Ships signed APKs via GitHub Releases, AABs when a Play Store presence is warranted.",
  },
  cs: {
    label: 'C# / Desktop',
    category: 'cs',
    accent: '--pur',
    intro:
      "C# WPF on .NET 9 for medical imaging — fo-dicom for DICOM, SQLite for local persistence, published as self-contained single-exe. C++ desktop apps with WebView2 for embedded web UI.",
  },
  security: {
    label: 'Security',
    category: 'sec',
    accent: '--red',
    intro:
      "Defensive security tooling — pfSense automations, NextDNS panels, network auditing. Not exploit development. Threat modeling, telemetry suppression, hosts-file management.",
  },
};
