// Hand-curated lists that don't fit the auto-extracted projects.ts model.
// Edit these directly to reshape the story the portfolio tells.
import type { GreatestHit, ManifestoRule } from './types';
import { fallbackRepoCount } from './derived';

/**
 * Greatest Hits — ~8 repos I'd staple to my résumé.
 * Each `why` is ONE sentence on impact or story, not features.
 * Goal: a visitor reading all 8 understands the through-line of my work.
 */
export const greatestHits: GreatestHit[] = [
  {
    repo: 'win11-nvme-driver-patcher',
    name: 'win11-nvme-driver-patcher',
    why: '~80% IOPS uplift on modern NVMe SSDs by swapping in the Server 2025 driver — two clicks, auto-elevates, logs every step.',
    tag: 'Windows',
  },
  {
    repo: 'UniversalConverterX',
    name: 'UniversalConverterX',
    why: '1000+ format desktop converter — WinUI 3 shell with sidecar engines covering media, docs, archives, PDFs, subtitles, fonts, ebooks, OCR. The Wondershare alternative that doesn\u2019t phone home.',
    tag: 'Desktop',
  },
  {
    repo: 'HostShield',
    name: 'HostShield',
    why: 'AMOLED-dark hosts-based ad blocker for Android — dual-mode (root + VPN) so it works on stock Pixel without a custom ROM.',
    tag: 'Android',
  },
  {
    repo: 'NovaCut',
    name: 'NovaCut',
    why: '38K-line Android video editor with 40+ effects and 37 transitions. Open alternative to PowerDirector, zero telemetry, zero subscription.',
    tag: 'Android',
  },
  {
    repo: 'OpenCut',
    name: 'OpenCut',
    why: 'Local-first AI video automation for Premiere Pro: captions, audio cleanup, visual effects, all on-device. No cloud, no keys.',
    tag: 'Desktop',
  },
  {
    repo: 'Network_Security_Auditor',
    name: 'Network_Security_Auditor',
    why: '67 automated security checks across 8 domains with MITRE ATT&CK mapping. Produces tiered compliance reports you can hand to auditors.',
    tag: 'Security',
  },
  {
    repo: 'Astra-Deck',
    name: 'Astra-Deck',
    why: '150+ YouTube enhancements across Chrome & Firefox — split-context ad blocking, shortcuts, polish. Formerly YouTube-Kit.',
    tag: 'Extension',
  },
  {
    repo: 'project-nomad-desktop',
    name: 'project-nomad-desktop',
    why: 'Offline survival command center — maps, AI chat, situation room, 600+ routes, 95+ tables. Runs without internet.',
    tag: 'Offline',
  },
];

/**
 * Manifesto — the 7 rules every project on this site follows.
 * Order matters: read top to bottom, they compound.
 */
export const manifesto: ManifestoRule[] = [
  { word: 'Turnkey', rule: 'Auto-installs deps and prerequisites. Zero manual setup.' },
  { word: 'Single-file', rule: 'One download when possible. A builder when not.' },
  { word: 'Dark by default', rule: 'Deep palettes, glassmorphism, polished UI — always.' },
  { word: 'No confirms', rule: 'Immediate action plus feedback. Fewer dialogs, not more.' },
  { word: 'Async', rule: 'GUI never blocks. Threading, embedded consoles, live logs.' },
  { word: 'Versioned', rule: 'Semver on everything. No "-fixed" suffixes.' },
  { word: 'Open', rule: 'MIT by default. No telemetry, no paywalls, no trials.' },
];

/**
 * Healthcare IT track — the moat.
 * Repos that solve real problems for healthcare facilities running medical imaging.
 */
export const healthcareIT = {
  intro:
    "I'm the Senior Technical Support Manager at Maven Imaging — medical imaging equipment, PACS, DR panels, and cloud-based diagnostic archiving. My day job is PACS migrations (10+ to date, including a million-file Candelis transfer that vendor tooling couldn't handle), DR panel deployments, 54-account cloud transitions, and keeping imaging systems up for clinics across the Caribbean, East Africa, and East Asia. Every tool here started as a real production problem.",
  // Public showcases for this track currently live as private internal tooling.
  // Kept as a track narrative; project cards intentionally omitted.
  repos: [] as string[],
};

/**
 * /now — current focus. Edit as life changes.
 * Date stamped so visitors know how fresh it is.
 */
export const now = {
  updated: '2026-06-01',
  location: 'Sarasota, FL',
  building: [
    'Portfolio site v0.17 — deep research audit, accessibility overhaul, View Transitions, self-hosted fonts',
    'Delivering DR panel + handheld X-ray training to a major OEM\u2019s field engineers',
    'Conduit — unified operations console for Maven Imaging (Tauri 2 + React 19 + FastAPI)',
    'XRayRoomPlanner — X-ray room compliance and drafting tool (React + Electron)',
    `Catalog now at ${fallbackRepoCount}+ repos across 10 categories — 9 new projects added this sprint`,
    'NexRay — multi-tenant cloud PACS platform with 4 AI engines',
  ],
  thinking: [
    'Building an Obsidian knowledge graph as an AI-programmable brain for development agents',
    'When self-hosted tooling beats vendor contracts for small medical imaging shops',
    'The right balance between "ship many things" and "maintain what shipped"',
  ],
  listening: 'Whatever keeps the focus session going.',
  notWorkingOn:
    "Anything that requires a cloud login, a monthly subscription, or a \"trial period\". If a tool can't just run, I'm not shipping it.",
};
