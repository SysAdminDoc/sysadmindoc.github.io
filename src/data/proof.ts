import type { HomepageProofHighlight, ProjectProof } from './types';

export const homepageProofHighlights: HomepageProofHighlight[] = [
  {
    repo: 'win11-nvme-driver-patcher',
    label: 'NVMe driver path',
    value: '80% IOPS',
    copy: 'Restore-point rollback for Windows 11 storage testing.',
    source: { kind: 'caseStudyContext' },
  },
  {
    repo: 'Network_Security_Auditor',
    label: 'Security audits',
    value: '67 checks',
    copy: 'Offline Windows and network evidence across eight domains.',
    source: { kind: 'buildEvidence', index: 0 },
  },
  {
    repo: 'NovaCut',
    label: 'Android editor',
    value: '40+ effects',
    copy: 'Compose and Media3 editing surface with release-backed delivery.',
    source: { kind: 'buildEvidence', index: 0 },
  },
];

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
    caseStudy: {
      context: 'Microsoft shipped a significantly improved NVMe storage driver in Windows Server 2025, delivering up to 80% IOPS improvement on modern SSDs. However, this driver was not available to Windows 11 desktop users. The only path was manually editing driver store entries — risky, undocumented, and with no rollback. I needed this for imaging workstations handling large DICOM datasets and built a GUI to make it safe for anyone.',
      decisions: [
        'Built a WPF GUI with auto-elevation instead of a raw PowerShell script, so non-technical users can run it safely.',
        'Added automatic system restore point creation before any driver change, giving users a one-click rollback path.',
        'Logged every step to a transcript file so users can audit exactly what changed, which matters for enterprise and healthcare environments.',
        'Kept it as a C# single-binary release — no installer, no dependencies, no admin portal.',
      ],
      outcomes: [
        'Most-starred project in the portfolio (41 stars) — clear demand for a safe driver swap path.',
        'Used internally on Maven Imaging workstations handling PACS data, where the IOPS improvement measurably reduced study load times.',
        'Zero data-loss reports from users — the restore-point-first approach proved reliable.',
      ],
    },
  },
  UniversalConverterX: {
    problem:
      'Power users need broad local file conversion without uploading private files to SaaS tools or chaining fragile one-off converters together.',
    buildEvidence: [
      'Greatest Hits positions the project as a 1000+ format desktop converter with media, document, archive, PDF, subtitle, font, ebook, and OCR coverage.',
      'The catalog keeps it in the Desktop lane so visitors can compare it with other local-first Windows tooling.',
      'Repository source and README are linked for anyone who needs to inspect the converter shell before using it on local files.',
    ],
    platforms: ['Windows', 'WinUI 3', 'Sidecar conversion engines'],
    installPath: 'Use the repository README and releases for the current Windows build and supported converter backends.',
    knownLimitations:
      'Actual format coverage depends on bundled or configured sidecar engines, so unsupported codecs and malformed files still need specialist tools.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/UniversalConverterX' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/UniversalConverterX#readme' },
    ],
    caseStudy: {
      context: 'Most file-conversion workflows become a trail of ad-heavy websites, trialware, and format-specific utilities. UniversalConverterX turns that category into a local desktop command center: one interface, sidecar engines where they make sense, and no need to hand private files to a remote service.',
      decisions: [
        'Used a desktop shell around proven sidecar engines instead of trying to reimplement every codec and parser from scratch.',
        'Grouped conversion families by user intent - media, documents, archives, subtitles, fonts, ebooks, OCR - so breadth does not become a flat, unsearchable list.',
        'Kept conversion local by default, preserving the portfolio rule that utility tools should not require an account, cloud upload, or subscription.',
      ],
      outcomes: [
        'Gives the portfolio a flagship desktop utility that demonstrates orchestration across many external toolchains.',
        'Turns the "1000+ formats" claim into a project-level story instead of leaving it as a single Greatest Hits sentence.',
        'The sidecar-engine pattern is reusable for other local media, document, and repair workflows.',
      ],
    },
  },
  HostShield: {
    problem:
      'Android users need ad and tracker blocking that can work on both rooted and stock devices without forcing a custom ROM or cloud DNS account.',
    buildEvidence: [
      'Greatest Hits describes a dual-mode hosts-based blocker with root and VPN paths for Android.',
      'The catalog places it in the Android lane, where it anchors the privacy and device-control side of the portfolio.',
      'The source repository is linked so users can inspect blocking behavior before installing network-adjacent code.',
    ],
    platforms: ['Android', 'Kotlin', 'Root hosts mode', 'VPN mode'],
    installPath: 'Use the repository README and releases for the current APK build and device-mode guidance.',
    knownLimitations:
      'Blocking quality depends on list freshness, Android VPN restrictions, and whether the device grants root or VPN permissions.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/HostShield' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/HostShield#readme' },
    ],
    caseStudy: {
      context: 'Mobile ad blocking usually splits into two camps: rooted users who can edit hosts files, and everyone else who must rely on VPN-style filtering. HostShield is built around that real device split, so the same app can serve both power users and stock Android users without pretending one path fits all.',
      decisions: [
        'Designed root and VPN modes as first-class paths instead of treating stock-device support as a degraded fallback.',
        'Kept the interface AMOLED-dark and direct, matching the way Android utility users expect to leave the app running for long sessions.',
        'Focused on local blocking behavior and transparent source review rather than routing users through a hosted filtering account.',
      ],
      outcomes: [
        'Adds a clear privacy-and-control case study to the Android side of Greatest Hits.',
        'Shows how the portfolio handles privileged-device workflows without assuming every user has root.',
        'Creates a reusable pattern for Android tools that need both advanced and stock-device execution paths.',
      ],
    },
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
    caseStudy: {
      context: 'As a sysadmin managing networks for medical imaging clinics, I needed to produce security audit evidence for HIPAA compliance reviews. Commercial tools were expensive and opaque. I built a PowerShell auditor that runs the same 67 checks I was doing manually — firewall rules, open ports, service configurations, user account policies, certificate states — and produces a structured report I could hand directly to compliance reviewers.',
      decisions: [
        'Mapped every check to the MITRE ATT&CK framework so findings have context beyond pass/fail — auditors can trace each finding to a known threat vector.',
        'Built tiered output (summary, detailed, raw) so different audiences get the right level of detail without filtering.',
        'Kept it entirely offline and PowerShell-native — no agent install, no cloud upload, no telemetry. Critical for healthcare environments where outbound data is scrutinized.',
        'Designed checks to be non-destructive (read-only queries, no remediation) so it is safe to run on production imaging workstations.',
      ],
      outcomes: [
        'Used across multiple Maven Imaging client sites for pre-deployment and annual compliance checks.',
        '6 stars and consistent organic discovery — fills a gap between expensive commercial scanners and manual checklists.',
        'The MITRE mapping turned out to be the highest-value feature — it translates technical findings into language compliance teams already know.',
      ],
    },
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
    caseStudy: {
      context: 'Preparedness tooling is least useful when it assumes the internet is still available. Project Nomad takes the opposite stance: maps, route references, local data tables, and command-center workflows should be preloaded before a field use case or outage, then remain usable without a live service.',
      decisions: [
        'Built around offline-first data surfaces so the app can still answer basic planning questions when connectivity is gone.',
        'Grouped maps, routes, tables, AI chat, and situation-room workflows into one desktop command center instead of scattering them across browser tabs.',
        'Kept the repository public so the offline architecture and data assumptions can be inspected rather than treated as a black box.',
      ],
      outcomes: [
        'Turns the offline survival command-center claim into a reviewable case study for the portfolio.',
        'Demonstrates the same local-first bias as the utility apps, but at a larger planning-workflow scale.',
        'Gives visitors a concrete example of organizing hundreds of routes and dozens of tables into a usable field interface.',
      ],
    },
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
    caseStudy: {
      context: 'Browser power users often accumulate a fragile pile of userscripts for shortcuts, playback control, cleanup, and layout polish. Astra-Deck consolidates that into one maintained extension surface for YouTube, with Chrome and Firefox paths instead of a single-browser assumption.',
      decisions: [
        'Treated cross-browser packaging as a core requirement so the project can serve both Chrome and Firefox users.',
        'Grouped many small quality-of-life enhancements into one coherent control surface instead of asking users to install a stack of scripts.',
        'Published release artifacts and README guidance so browser code can be reviewed and installed from the project page path.',
      ],
      outcomes: [
        'Makes the extension lane more than a collection of one-off scripts by giving it a flagship case study.',
        'Supports the Greatest Hits claim of 150+ enhancements with a deeper explanation of maintenance and packaging choices.',
        'Creates a pattern for future browser tools that need shortcuts, content-script behavior, and release-backed installs.',
      ],
    },
  },
  OpenCut: {
    problem:
      'Video creators need AI-assisted editing automation without sending footage, captions, or cleanup passes through a cloud service.',
    buildEvidence: [
      'Greatest Hits describes local-first Premiere Pro automation for captions, audio cleanup, and visual effects with no cloud keys.',
      'The catalog presents it as a desktop workflow, while NovaCut covers the Android editor side of the media tooling story.',
      'Repository source and README links let visitors inspect the automation approach before trusting it with creative assets.',
    ],
    platforms: ['Desktop video workflow', 'Premiere Pro automation', 'Local AI tooling'],
    installPath: 'Use the repository README for the current local setup and host-application integration path.',
    knownLimitations:
      'Host-application automation depends on local Premiere Pro behavior, available models/tools, and media-project complexity.',
    sources: [
      { label: 'Repository', url: 'https://github.com/SysAdminDoc/OpenCut' },
      { label: 'README', url: 'https://github.com/SysAdminDoc/OpenCut#readme' },
    ],
    caseStudy: {
      context: 'AI video tooling often assumes uploaded footage, paid API keys, and a black-box processing queue. OpenCut keeps the workflow local: automate repetitive Premiere Pro editing tasks, clean audio, generate captions, and apply visual effects without turning creative source files into cloud payloads.',
      decisions: [
        'Framed the project as workflow automation instead of a replacement editor, so it can improve an existing Premiere Pro process.',
        'Kept the strongest features local-first: captions, cleanup, and effects should run without requiring cloud credentials.',
        'Positioned OpenCut beside NovaCut so the portfolio shows both desktop video automation and a standalone Android editor.',
      ],
      outcomes: [
        'Adds a desktop media-production case study to Greatest Hits instead of relying only on the Android NovaCut story.',
        'Makes the no-cloud/no-keys claim explicit and reviewable on the project page.',
        'Shows how AI-assisted tooling can be useful while still respecting local files and user control.',
      ],
    },
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
    caseStudy: {
      context: 'Every capable Android video editor is either subscription-locked (PowerDirector, KineMaster) or ad-heavy (InShot). I wanted a full editing experience — timeline, effects, transitions, export — that was open source, ran entirely on-device, and respected the user. NovaCut started as a learning project for Jetpack Compose + Media3 and grew into a 38K-line production editor.',
      decisions: [
        'Built on Jetpack Compose + Media3 1.9.x instead of the legacy MediaCodec/SurfaceTexture stack — cleaner API, hardware-accelerated by default, and future-proof against Android API changes.',
        'Implemented 40+ effects and 37 transitions as composable pipeline stages rather than monolithic render passes — each effect is a standalone unit testable in isolation.',
        'Used R8/ProGuard aggressively to keep the APK under 15MB despite the feature set — comparable to much simpler editors.',
        'Signed release builds with a dedicated keystore and published via GitHub Releases, not Play Store — avoiding the 30% cut and review delays.',
      ],
      outcomes: [
        '10 stars and growing — the largest Kotlin project in the portfolio by line count.',
        'Proved that a single developer with AI tooling can ship a video editor that competes on features with funded teams.',
        'The Media3 integration patterns from NovaCut were reused in Vertigo (vertical video studio) and OpenCut (Premiere Pro extension).',
      ],
    },
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
