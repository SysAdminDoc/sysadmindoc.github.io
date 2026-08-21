// Hand-curated lists that don't fit the auto-extracted projects.ts model.
// Edit these directly to reshape the story the portfolio tells.
import type { GreatestHit } from './types';
import { fallbackRepoCount } from './derived';
import { careerProfile } from './career';
import pkg from '../../package.json';

// Derive the shipped version rather than hand-writing it into /now/ copy, which
// had drifted three minor releases behind the manifest.
const siteVersion = `v${pkg.version.split('.').slice(0, 2).join('.')}`;

/**
 * Greatest Hits — ~8 repos I'd staple to my résumé.
 * Each `why` is ONE sentence on impact or story, not features.
 * Goal: a visitor reading all 8 understands the through-line of my work.
 */
export const greatestHits: GreatestHit[] = [
  {
    repo: 'win11-nvme-driver-patcher',
    name: 'win11-nvme-driver-patcher',
    why: '~80% IOPS uplift on modern NVMe SSDs by swapping in the Server 2025 driver. It takes two clicks, auto-elevates, and logs every step.',
    tag: 'Windows',
  },
  {
    repo: 'UniversalConverterX',
    name: 'UniversalConverterX',
    why: '1000+ format desktop converter. Its WinUI 3 shell uses sidecar engines for media, docs, archives, PDFs, subtitles, fonts, ebooks, and OCR. The Wondershare alternative that doesn\u2019t phone home.',
    tag: 'Desktop',
  },
  {
    repo: 'HostShield',
    name: 'HostShield',
    why: 'AMOLED-dark hosts-based ad blocker for Android. Root and VPN modes let it work on a stock Pixel without a custom ROM.',
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
    why: '150+ YouTube enhancements across Chrome and Firefox, including split-context ad blocking, shortcuts, and interface polish. Formerly YouTube-Kit.',
    tag: 'Extension',
  },
  {
    repo: 'project-nomad-desktop',
    name: 'project-nomad-desktop',
    why: 'Offline survival command center with maps, AI chat, a situation room, 600+ routes, and 95+ tables. Runs without internet.',
    tag: 'Offline',
  },
];

/**
 * Healthcare IT track — the moat.
 * Repos and work context from healthcare support environments.
 */
export const healthcareIT = {
  intro:
    `I'm the ${careerProfile.currentTitle} at ${careerProfile.currentCompany}, supporting healthcare technology environments. The work is customer-facing and operational: PACS/DICOM workflows, hosted-service migrations, workstation and network troubleshooting, customer escalation, documentation, and vendor coordination.`,
  // Public showcases for this track currently live as private internal tooling,
  // so this lane is a narrative track with no project cards.
};

/**
 * /now — current focus. Edit as life changes.
 * Date stamped so visitors know how fresh it is.
 */
export const now = {
  updated: '2026-07-23',
  location: 'Sarasota, FL',
  building: [
    `Portfolio site ${siteVersion}. Includes ${fallbackRepoCount} repos, resume PDF generation, Pagefind search, and browser visual baselines`,
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
