// Case studies for /work/. Each one tells a public project the same way: the
// problem, what I built, what changed, and the limit a reader should know
// before they're impressed. Figures (stars, release downloads, the latest
// release) are not written here. `case-study-figures.ts` reads them from the
// generated GitHub caches at build time, so a number on the page is never
// older than the data behind /data/ and /releases/.
//
// Every claim in `built` comes from the project's README as cached in
// `_readmes.json`. Customer and employer work never appears here; the
// "Work I can't show" section on the page says why.

export interface CaseStudy {
  slug: string;
  name: string;
  /** Eyebrow label: the kind of work, not a category code. */
  lane: string;
  /** The first repo is the one the card links to; the rest add to the figures. */
  repos: string[];
  stack: string;
  problem: string;
  built: string;
  result: string;
  /** The honest limit, stated before a reader finds it themselves. */
  caveat: string;
  /** What a hiring manager or a client can take from the work. */
  shows: string[];
  /** Optional second link when the study spans more than one repository. */
  family?: { label: string; href: string };
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'hush',
    name: 'The Hush patch bundles',
    lane: 'Android / privacy',
    repos: [
      'HushFacebook',
      'HushFeed',
      'HushGram',
      'HushMessenger',
      'HushTelegram',
      'HushThreads',
      'HushPinterest',
      'HushTumblr',
      'HushFacebookWeb',
    ],
    stack: 'Java, Kotlin, the Morphe patcher, Gradle, a userscript for the web app',
    family: { label: 'Every Hush release', href: '/releases/' },
    problem:
      'Facebook, Instagram, TikTok and their siblings fill the feed with ads and suggested posts, and none of the apps has a setting that turns them off. The usual answers are a custom ROM or a modified APK from a stranger, and neither is something most people should install.',
    built:
      "Patch bundles for the Morphe patcher. You bring the official APK, the patcher rewrites the app's own bytecode on your phone, and the result is the same app with a settings screen of its own: sponsored and suggested posts gone, analytics uploads stopped, tracking tags stripped from shared links. Each bundle pins one app version, ships with plain-language release notes, and is walked through on real phones and an emulator before it's tagged. Eight Android apps and the Facebook website so far.",
    result:
      'People found them without any marketing. The three biggest bundles are the most starred repositories I have, the release downloads run well into six figures, and the issue trackers are where users and I work out what the next release carries.',
    caveat:
      "Every bundle is tied to one app version, so each app update means another release, and a patch can stop working when the app changes underneath it. The trackers show that work in the open, including the reports I haven't got to yet.",
    shows: [
      'Java and Kotlin bytecode patching',
      'Release engineering across nine repositories',
      'Testing on phones and emulators',
      'Public issue triage and support writing',
    ],
  },
  {
    slug: 'nvme',
    name: 'win11-nvme-driver-patcher',
    lane: 'Windows / storage',
    repos: ['win11-nvme-driver-patcher'],
    stack: 'C#, .NET 10, WPF, a command line, an MSI for managed deployment',
    problem:
      "Windows Server 2025 ships a newer NVMe driver path than Windows 11, and it's present but switched off on the client build. Enabling it by hand means registry work, a reboot, and no clean way back if the machine doesn't like it.",
    built:
      'A desktop app and a matching command line that enable the Server 2025 NVMe driver on Windows 11. It elevates itself, logs every step, and ships with a tray helper and a watchdog build. An MSI installs the whole set per machine under Program Files for fleets that deploy through management tooling, and ARM64 builds exist as diagnostic builds until Microsoft ships the driver for that platform.',
    result:
      'It became the most starred Windows tool in my catalog, and most of the issue traffic is people reporting their benchmark results, which is how the README got its honest warning.',
    caveat:
      'The measured gains show up at high queue depths, the kind of load servers and heavy parallel I/O create. Ordinary desktop use may see little or no change, and the README says so before the download link.',
    shows: [
      'Windows driver and registry internals',
      'Making a risky change reversible and logged',
      'Installer packaging for managed fleets',
    ],
  },
  {
    slug: 'universalconverterx',
    name: 'UniversalConverterX',
    lane: 'Windows / desktop',
    repos: ['UniversalConverterX'],
    stack: 'C# and Python, a WinUI 3 shell, a loopback REST API, a PowerShell module',
    problem:
      "Converting a file usually means uploading it to someone's website or keeping a dozen single-purpose tools around, each with its own quirks and its own idea of a preset.",
    built:
      'A native Windows converter with thirteen built-in converter backends and a catalog of 212 adapters for outside engines, behind 465 reviewed presets. The desktop app, the command line, a loopback REST API and a PowerShell module all read the same engine catalog, so a format added once is available everywhere. Optional tools report their real readiness before a job starts, so a missing runtime shows up as a message instead of a vague failure.',
    result:
      "Media, documents, archives, subtitles, fonts, ebooks, OCR and image enhancement in one window, and nothing leaves the PC. It's the tool I reach for first on my own machines.",
    caveat:
      "It's Windows only, and the outside engines are separate installs the app detects rather than bundles, so a fresh machine needs a few of them before every preset works.",
    shows: [
      'Windows desktop development',
      'One catalog behind a GUI, a CLI and an API',
      'Honest readiness checks instead of silent failure',
    ],
  },
  {
    slug: 'network-security-auditor',
    name: 'Network Security Auditor',
    lane: 'Security / PowerShell',
    repos: ['Network_Security_Auditor'],
    stack: 'PowerShell 5.1, with a .NET 10 and WPF rewrite in progress',
    problem:
      "Small IT teams get asked for a security posture report and have nothing between a free port scanner and an enterprise platform. The audit has to run with the access they already have, on machines where they can't install an agent.",
    built:
      'A single-file PowerShell 5.1 tool with 74 automated checks mapped to 11 compliance frameworks and to MITRE ATT&CK and D3FEND. It runs headless from an RMM tool, writes multi-tier reports so a technician and an auditor read the same file, and exports SIEM content packs, CMMC self-assessments and OSCAL POA&M remediation plans. A C# rewrite with a WPF interface builds and is test-covered alongside it.',
    result:
      'A technician can hand an auditor a report from a machine they already manage, without a platform purchase. This is the kind of tool I built because the practices I supported kept asking for it.',
    caveat:
      "The PowerShell script is still the production path. The rewrite is real and builds, but it hasn't replaced the script for every workflow yet, and the README is clear about which one to run.",
    shows: [
      'PowerShell at scale',
      'Security frameworks and ATT&CK mapping',
      'Reports written for two audiences at once',
    ],
  },
  {
    slug: 'opencut',
    name: 'OpenCut for Premiere Pro',
    lane: 'Video / Python',
    repos: ['OpenCut'],
    stack: 'Python, a local HTTP service, a Premiere Pro panel',
    problem:
      "Caption generation, audio cleanup and effects for Premiere Pro mostly live in cloud services now. For many editors that's a subscription, a usage cap, and an upload of footage they'd rather keep on their own drive.",
    built:
      'A local service that Premiere talks to: transcription and captions, loudness and noise work, visual effects and multi-platform social export, with no subscription, no usage cap, and no API key needed for the core local features. The shipped route manifest counts 1,564 routes, each tagged as implemented, dependency-gated or a stub, and the suite runs over 14,500 tests.',
    result:
      'An editor gets the cloud-tool feature set on their own machine, and the route manifest means the README can say exactly what works instead of what is planned.',
    caveat:
      'Cloud providers, downloads, telemetry and social uploads exist as optional, explicit network features. The core runs offline, but the project is large, and large projects carry stubs. The manifest labels them so nobody has to guess.',
    shows: [
      'Python services and media processing',
      'Test discipline on a large codebase',
      'Shipping an honest feature inventory',
    ],
  },
  {
    slug: 'opentasker',
    name: 'OpenTasker',
    lane: 'Android / automation',
    repos: ['OpenTasker'],
    stack: 'Kotlin, Jetpack Compose, Room with SQLCipher, Android Keystore',
    problem:
      "Tasker is the standard for phone automation and it's closed source. People who automate their phone around their location, their health data and their messages want to read the code that runs it.",
    built:
      'An open-source automation engine for Android: profiles, contexts and tasks with 78 built-in actions, seven context families and engine-level flow control. The automation database is encrypted at rest with SQLCipher behind a Keystore-wrapped key, existing plaintext databases migrate once, and a wrong key fails closed. A task or profile can be previewed before it runs, with every branch decision, expanded input and blocker shown first.',
    result:
      'A Tasker alternative people can audit, and the most starred Kotlin project in my catalog. The preflight review is the feature I hear about most: people want to see what an automation will do before it does it.',
    caveat:
      "It's an alternative, not a clone. Plugins written for Tasker's condition protocol work, but someone moving a large Tasker setup still rebuilds it by hand.",
    shows: [
      'Kotlin and Jetpack Compose',
      'Encrypted storage design',
      'Automation engine architecture',
    ],
  },
];

export const caseStudyBySlug = Object.fromEntries(caseStudies.map((study) => [study.slug, study])) as Record<
  string,
  CaseStudy
>;
