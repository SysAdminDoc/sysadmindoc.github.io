export type Lang = 'ps' | 'py' | 'web' | 'ext' | 'kt' | 'sec' | 'media' | 'cs' | 'guide' | 'fork' | 'other' | 'cpp';

export interface Featured {
  repo: string;
  name: string;
  lang: string; // bg class
  langLabel: string; // badge text e.g. "PS"
  desc: string;
  tags: string[];
  bento?: 'hero' | 'normal';
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
