export type UsesCategory = {
  title: string;
  items: { name: string; note?: string }[];
};

export const uses: UsesCategory[] = [
  {
    title: 'Editor',
    items: [
      { name: 'VSCodium', note: 'Primary editor for everything except Android' },
      { name: 'VS Code language tooling', note: 'Type-aware templates and route checks' },
    ],
  },
  {
    title: 'Terminal',
    items: [
      { name: 'Windows Terminal', note: 'Tabbed host for all shells' },
      { name: 'PowerShell 7', note: 'Default automation shell' },
      { name: 'Git Bash', note: 'POSIX tooling on Windows' },
    ],
  },
  {
    title: 'Quality',
    items: [
      { name: 'Playwright', note: 'Interaction, accessibility, and browser-state checks' },
      { name: 'axe-core', note: 'Automated accessibility rules' },
      { name: 'Lighthouse CI', note: 'Performance and browser health audits' },
    ],
  },
  {
    title: 'Languages',
    items: [
      { name: 'PowerShell', note: 'Automation, WPF desktop tools' },
      { name: 'Python', note: 'Desktop apps, AI tooling, scripting' },
      { name: 'JavaScript / TypeScript', note: 'Extensions, web, userscripts' },
      { name: 'Kotlin', note: 'Android apps with Jetpack Compose' },
      { name: 'C#', note: 'WPF / .NET desktop applications' },
      { name: 'C++', note: 'Native desktop and system tools' },
    ],
  },
  {
    title: 'Frameworks',
    items: [
      { name: 'Astro', note: 'This portfolio site' },
      { name: 'React', note: 'Interactive UI components' },
      { name: 'PyQt6', note: 'Python desktop GUIs' },
      { name: 'Jetpack Compose', note: 'Modern Android UI' },
      { name: 'WPF / .NET', note: 'Windows desktop with MVVM' },
      { name: 'Tauri', note: 'Lightweight cross-platform desktop' },
    ],
  },
  {
    title: 'DevOps',
    items: [
      { name: 'Local release scripts', note: 'Build, audit, and publish gates' },
      { name: 'Contabo VPS', note: 'Self-hosted services' },
      { name: 'Caddy', note: 'Reverse proxy with automatic TLS' },
    ],
  },
  {
    title: 'Hardware',
    items: [
      { name: 'Windows 11 IoT Enterprise LTSC 2024', note: 'Primary workstation OS' },
    ],
  },
  {
    title: 'Design',
    items: [
      { name: 'Theme by context', note: 'Warm editorial light here. Dark-first in most apps.' },
      { name: 'Catppuccin Mocha', note: 'Preferred color palette' },
      { name: 'Glassmorphism', note: 'Frosted glass, shimmer, and depth' },
    ],
  },
];
