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
    repo: 'ClearCut',
    name: 'ClearCut',
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
 * Repos and work context from healthcare support environments.
 */
export const healthcareIT = {
  intro:
    "I'm the Senior Technical Support Manager at Maven Imaging, supporting healthcare technology environments. The work is customer-facing and operational: troubleshoot system issues, coordinate migrations and archive transfers, support cutovers, document repeatable procedures, and work with vendors and internal teams when customer workflows are interrupted.",
  // Public showcases for this track currently live as private internal tooling.
  // Kept as a track narrative; project cards intentionally omitted.
  repos: [] as string[],
};

/**
 * /now — current focus. Edit as life changes.
 * Date stamped so visitors know how fresh it is.
 */
export const now = {
  updated: '2026-07-23',
  location: 'Sarasota, FL',
  building: [
    `Portfolio site v0.23 - ${fallbackRepoCount}+ repos, resume PDF generation, Pagefind search, and Playwright visual baselines`,
    'AI services track: fractional AI implementation, automation, and training engagements for businesses on a monthly retainer',
    'Healthcare support workflows: migration coordination, customer cutover validation, and documentation cleanup',
    'Customer support operations: hosted account transitions, workstation support, and vendor handoffs',
    'Customer-facing documentation and tutorial updates for support workflows',
    'Portfolio copy cleanup so career claims stay conservative, field-accurate, and easy to verify',
  ],
  thinking: [
    'Preparing for npm v12 install-script changes hitting native deps in July 2026',
    'How small healthcare environments balance vendor support, local IT constraints, and reliable recovery plans',
    'The right balance between "ship many things" and "maintain what shipped"',
  ],
  listening: 'Whatever keeps the focus session going.',
  notWorkingOn:
    "Anything that requires a cloud login, a monthly subscription, or a \"trial period\". If a tool can't just run, I'm not shipping it.",
};
