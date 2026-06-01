export type UsesCategory = {
  title: string;
  items: { name: string; note?: string }[];
};

export const uses: UsesCategory[] = [
  {
    title: 'Editor',
    items: [
      { name: 'VSCodium', note: 'Primary editor for everything except Android' },
      { name: 'GitHub Copilot', note: 'Inline completions and chat' },
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
    title: 'AI Tools',
    items: [
      { name: 'Claude Code (CLI)', note: 'Primary development agent' },
      { name: 'Claude Max', note: 'Research, planning, and long-form work' },
      { name: 'Codex', note: 'Background autonomous tasks' },
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
      { name: 'GitHub Actions', note: 'CI/CD for every repo' },
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
      { name: 'Dark-first', note: 'Every UI ships dark by default' },
      { name: 'Catppuccin Mocha', note: 'Preferred color palette' },
      { name: 'Glassmorphism', note: 'Frosted glass, shimmer, and depth' },
    ],
  },
];
