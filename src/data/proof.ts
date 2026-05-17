import type { ProjectProof } from './types';

export const projectProof: Record<string, ProjectProof> = {
  'win11-nvme-driver-patcher': {
    problem:
      'Windows 11 users with modern NVMe storage need a safer way to test the Windows Server 2025 NVMe driver path without hand-editing driver state or losing the ability to roll back.',
    buildEvidence: [
      'Driver workflow is packaged as a GUI project with the repository README as the canonical operator guide.',
      'The portfolio highlights the measured NVMe performance claim and links visitors back to the source repository for the implementation details.',
      'The project remains source-first, so users can inspect the patching logic before running it.',
    ],
    platforms: ['Windows 11', 'PowerShell', 'WPF'],
    installPath: 'Use the GitHub source and README for current run instructions before applying driver changes.',
    knownLimitations:
      'Driver changes are machine-specific and should be treated as an advanced Windows maintenance operation with a recovery path.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/win11-nvme-driver-patcher' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/win11-nvme-driver-patcher#readme' },
    ],
  },
  Network_Security_Auditor: {
    problem:
      'Small teams need repeatable Windows and network security evidence without turning every audit into a manual checklist exercise.',
    buildEvidence: [
      'Catalog data describes 67 checks across 8 security domains with MITRE ATT&CK mapping.',
      'The project is positioned as a report generator for compliance handoff, not just a local scan script.',
      'Repository source and README are linked for anyone who needs to inspect the checks before relying on the report output.',
    ],
    platforms: ['Windows', 'PowerShell', 'Security reporting'],
    installPath: 'Start from the GitHub README and run the audited scripts in a controlled environment.',
    knownLimitations:
      'Audit output is only as current as the check definitions and the permissions available to the local process.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/Network_Security_Auditor' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/Network_Security_Auditor#readme' },
    ],
  },
  'project-nomad-desktop': {
    problem:
      'Preparedness and incident-response workflows need local maps, references, and decision support that still function when internet access is unreliable.',
    buildEvidence: [
      'Catalog data describes an offline command center with maps, AI chat, situation room workflows, 600+ routes, and 95+ tables.',
      'The project detail page can combine README excerpts, release metadata, and related offline tooling in one source-backed view.',
      'The repository remains public source, so the offline-first architecture can be inspected directly.',
    ],
    platforms: ['Python', 'Flask', 'Offline desktop workflow'],
    installPath: 'Follow the repository README for the current desktop setup and local data requirements.',
    knownLimitations:
      'Offline value depends on the freshness and completeness of preloaded data before a real outage or field use.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/project-nomad-desktop' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/project-nomad-desktop#readme' },
    ],
  },
  'Astra-Deck': {
    problem:
      'Power YouTube users need one maintained extension surface for shortcuts, playback tools, cleanup, and browser polish instead of a stack of fragile one-off scripts.',
    buildEvidence: [
      'Catalog data describes 150+ YouTube enhancements across Chrome and Firefox.',
      'The project has release and README surfaces that visitors can inspect before installing browser code.',
      'The portfolio groups it with extension work so adjacent browser tooling is visible.',
    ],
    platforms: ['Chrome', 'Firefox', 'JavaScript extension'],
    installPath: 'Use the repository README and releases for the current browser build and install path.',
    knownLimitations:
      'Browser-extension behavior can change when YouTube or browser extension APIs change.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/Astra-Deck' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/Astra-Deck#readme' },
      { label: 'Releases', url: 'https://github.com/SysAdminDoc/Astra-Deck/releases' },
    ],
  },
  NovaCut: {
    problem:
      'Android video editing should have a local, open alternative to subscription-heavy mobile editors.',
    buildEvidence: [
      'Catalog data describes a full-featured Android video editor with 40+ effects, 37 transitions, and 29 engines.',
      'The project appears in the Android lane and Greatest Hits narrative, so visitors can compare it against related mobile work.',
      'Repository source and releases are available for implementation and packaging review.',
    ],
    platforms: ['Android', 'Kotlin', 'Media editing'],
    installPath: 'Use the repository README and releases for the current Android build/install flow.',
    knownLimitations:
      'Media-editor capability depends on device performance, Android media APIs, and codec support.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/NovaCut' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/NovaCut#readme' },
      { label: 'Releases', url: 'https://github.com/SysAdminDoc/NovaCut/releases' },
    ],
  },
  'sysadmindoc.github.io': {
    problem:
      'The portfolio needs to stay accurate as public repository state, private boundaries, screenshots, dependencies, and generated GitHub metadata change.',
    buildEvidence: [
      'Project data validation checks required fields, policy exceptions, live screenshots, routes, and command palette coverage.',
      'Catalog audit compares public GitHub state against portfolio data and documented exceptions.',
      'Quality workflows report production dependency audit and catalog drift without requiring a local manual session.',
    ],
    platforms: ['Astro 6', 'GitHub Pages', 'GitHub Actions'],
    installPath: 'Use npm scripts in the repository root: data validation, asset audit, production audit, Astro check, and static build.',
    knownLimitations:
      'Generated GitHub caches are build-time artifacts; the site does not use runtime analytics or hosted search infrastructure.',
    sources: [
      { label: 'Project data validator', url: 'https://github.com/SysAdminDoc/sysadmindoc.github.io/blob/main/scripts/validate-project-data.mjs' },
      { label: 'Catalog audit', url: 'https://github.com/SysAdminDoc/sysadmindoc.github.io/blob/main/scripts/audit-catalog.mjs' },
      { label: 'Quality gates workflow', url: 'https://github.com/SysAdminDoc/sysadmindoc.github.io/blob/main/.github/workflows/quality-gates.yml' },
    ],
  },
};
