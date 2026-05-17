export type Lang = 'ps' | 'py' | 'web' | 'ext' | 'kt' | 'sec' | 'media' | 'cs' | 'guide' | 'fork' | 'other' | 'cpp';

export interface Featured {
  repo: string;
  name: string;
  lang: Lang; // bg class
  langLabel: string; // badge text e.g. "PS"
  desc: string;
  tags: string[];
  bento?: 'hero' | 'normal';
}

export interface GreatestHit {
  repo: string;
  name: string;
  why: string; // one-sentence *why it matters*, not what it is
  tag: string; // short tag like "Windows" | "Android" | "Healthcare IT"
}

export interface ManifestoRule {
  word: string; // one word e.g. "Turnkey"
  rule: string; // short sentence
}

export interface LiveApp {
  slug: string;
  name: string;
  url: string;
  desc: string;
}

export interface CatalogEntry {
  repo: string;
  name: string;
  url: string;
  category: Lang;
  desc: string;
  live?: boolean;
}

export interface Skill {
  code: string; // short label on ring e.g. "PS"
  name: string;
  sub: string;
  ringTarget: number; // stroke-dashoffset — lower = more filled
  color: string; // css var name e.g. "--blue"
}

export interface ProjectProofSource {
  label: string;
  url: string;
  note?: string;
}

export interface ProjectProof {
  problem: string;
  buildEvidence: string[];
  platforms: string[];
  installPath: string;
  knownLimitations: string;
  sources: ProjectProofSource[];
}

export type ArchiveStatus = 'moved' | 'held' | 'removed' | 'superseded' | 'archived';

export interface ArchiveLink {
  label: string;
  href: string;
  note?: string;
}

export interface ArchiveEntry {
  id: string;
  name: string;
  status: ArchiveStatus;
  statusLabel: string;
  summary: string;
  reason: string;
  source: string;
  links: ArchiveLink[];
  sensitive?: boolean;
}

export interface Video {
  ytId: string;
  title: string;
  desc: string;
}

export interface Album {
  id: string;
  name: string;
  year: number;
  art: string;
}
