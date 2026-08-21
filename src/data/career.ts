// Single source of truth for career claims shared by the homepage, track pages,
// /resume, and /resume.json. Keep profile language here so those surfaces can
// adapt the same facts without drifting into separate biographies.

import { experienceLabel } from './identity';

export interface CareerRole {
  role: string;
  company: string;
  location: string;
  period: string;
  /** ISO 8601 (YYYY-MM-DD) start date for JSON Resume / machine consumers. */
  startDate: string;
  /** ISO 8601 (YYYY-MM-DD) end date; omitted for the current role. */
  endDate?: string;
  tag: string;
  tone: 'current' | 'previous';
  summary: string;
  highlights: readonly string[];
  stack: readonly string[];
  /** Optional clarifier shown under the period (e.g. to explain overlapping dates). */
  note?: string;
}

export const careerProfile = {
  name: 'Matt Parker',
  headline: 'AI Implementation Consultant · Healthcare IT · Systems & Automation',
  currentTitle: 'Technical Support Manager',
  currentCompany: 'Maven Imaging',
  location: 'Sarasota, FL',
  summary: `AI implementation consultant and technical operations leader with ${experienceLabel} across enterprise IT, healthcare systems, Windows infrastructure, migrations, and customer support. I help businesses select and safely roll out AI tools, automate repetitive workflows, train teams, and maintain deployed solutions.`,
  operatingNote: 'I build the systems, document the work, and train the teams that run them.',
} as const;

// The experience proof point is a stable, non-count claim.
export const careerProofExperience = {
  label: 'Experience',
  value: experienceLabel,
  detail: 'Enterprise IT and healthcare systems',
} as const;

// The project/live-app proof points are derived from the live catalog so the
// résumé cannot drift from the homepage hero. Never hardcode these counts.
export function buildCareerProof(projectCount: number, liveCount: number) {
  return [
    careerProofExperience,
    { label: 'Public execution', value: `${projectCount}+ shipped`, detail: 'Software projects delivered' },
    { label: 'Live proof', value: `${liveCount} live apps`, detail: 'Publicly available online' },
  ] as const;
}

export const careerLanes = [
  {
    id: 'ai',
    name: 'AI implementation',
    short: 'AI tools · automation · enablement',
    focus: 'Evaluate and roll out AI tools, build automation for system gaps, and train teams to adopt the work safely.',
    expertise: ['AI implementation', 'LLM tooling', 'Workflow automation', 'Prompt engineering', 'AI training', 'Process automation'],
    href: '/ai/',
  },
  {
    id: 'healthcare',
    name: 'Healthcare systems',
    short: 'PACS/DICOM · healthcare IT · support',
    focus: 'Support healthcare technology environments, PACS/DICOM workflows, hosted-service migrations, and customer escalation.',
    expertise: ['PACS', 'DICOM', 'Healthcare IT', 'Hosted services', 'Migrations', 'Customer support'],
    href: '/healthcare-it/',
  },
  {
    id: 'systems',
    name: 'Infrastructure & automation',
    short: 'Windows · networks · software delivery',
    focus: 'Operate Windows infrastructure and build practical software that closes recurring gaps between people and systems.',
    expertise: ['Windows Server', 'Active Directory', 'Group Policy', 'SCCM', 'Hyper-V', 'Cisco networking'],
    href: '/#skills',
  },
] as const;

export const consultingHighlights = [
  'Evaluate and roll out AI tools for a business, including Claude, ChatGPT, Copilot, and local models when data should remain in-house.',
  'Build automation for the gaps between existing systems, then document, deploy, maintain, and hand over the work.',
  'Deliver hands-on team training around real daily workflows so tools are adopted, not merely licensed.',
  'Personally research, build, test, document, and release public software projects with live, inspectable output.',
] as const;

export const careerSkills = [
  { name: 'AI & Automation', sub: 'implementation, LLM tooling, workflow automation' },
  { name: 'Healthcare Systems', sub: 'PACS, DICOM, migrations, customer support' },
  { name: 'Enterprise Infrastructure', sub: 'Windows Server, AD, GPO, SCCM, Hyper-V' },
  { name: 'Development & Delivery', sub: 'Python, PowerShell, TypeScript, C#/.NET' },
  { name: 'Customer Operations', sub: 'escalation, recovery, vendor coordination' },
  { name: 'Documentation & Training', sub: 'runbooks, knowledge bases, team enablement' },
] as const;

export const careerRoles: readonly CareerRole[] = [
  {
    role: 'Technical Support Manager',
    company: 'Maven Imaging',
    location: 'Sarasota, FL',
    period: 'Feb 2021 to Present',
    startDate: '2021-02-01',
    tag: 'Current',
    tone: 'current',
    note: 'Part-time from February 2021 to January 2025. Full-time since February 2025.',
    summary: 'Support healthcare technology environments across PACS deployments, DR panel configuration, DICOM routing, hosted-service migrations, workstation and network troubleshooting, and customer escalation.',
    highlights: [
      'Own issues from diagnosis through resolution, coordinating vendors, cutovers, documentation, and follow-up',
      'Turn recurring operational gaps into procedures, training content, and purpose-built software or automation',
      'Maintain practical security and data-handling discipline across customer support and migration work',
    ],
    stack: ['PACS', 'DICOM', 'Healthcare IT', 'Windows workstations', 'Hosted services', 'Migration coordination', 'Networking'],
  },
  {
    role: 'Systems Administrator',
    company: 'ThinkTV (PBS Affiliate)',
    location: 'Dayton, OH',
    period: 'Apr 2014 to Feb 2025',
    startDate: '2014-04-01',
    endDate: '2025-02-01',
    tag: '~11 years',
    tone: 'previous',
    note: 'Full-time; concurrent with Maven Imaging’s part-time phase before the February 2025 transition.',
    summary: 'Supported network, server, workstation, and broadcast-adjacent infrastructure for a regional PBS affiliate environment. Work included Windows Server, Active Directory, virtualization, endpoint management, Cisco networking, monitoring, and user support in an always-on media operations setting.',
    highlights: [
      'Supported and administered network, server, workstation, and broadcast infrastructure',
      'Implemented and maintained SCCM for 100+ Windows workstations, including imaging, application deployment, updates, and lifecycle work',
      'Documented systems and procedures, coordinated vendors and escalations, and supported broadcast servers and automation platforms',
    ],
    stack: ['Windows Server 2008 to 2016', 'Active Directory & GPO', 'Hyper-V', 'SCCM', 'PRTG', 'Cisco', 'Avaya VOIP'],
  },
  {
    role: 'IT Support Technician',
    company: 'Dayton Technology Group (MSP)',
    location: 'Dayton, OH',
    period: 'Jun 2010 to Apr 2014',
    startDate: '2010-06-01',
    endDate: '2014-04-01',
    tag: '~4 years',
    tone: 'previous',
    summary: 'Supported multiple MSP client environments across Active Directory, Group Policy, DNS/DHCP, server refreshes, user onboarding, documentation, and 24/7 monitoring with escalation to senior administrators when needed.',
    highlights: [
      'Managed IT operations across multiple MSP client environments with Active Directory, Group Policy, DNS, DHCP, endpoint security, and user support',
      'Performed 24/7/365 monitoring and coordinated escalation for outages and business-critical application failures',
      'Migrated legacy servers, onboarded and trained users, and created topology diagrams, network documentation, and knowledge-base guides',
    ],
    stack: ['Windows Server 2003 to 2012 R2', 'Active Directory', 'Group Policy', 'Avaya IP Office', 'Endpoint security'],
  },
];

export const careerEducation = {
  program: 'Computer Networking Technologies',
  detail: 'Coursework',
  school: 'Sinclair Community College',
  location: 'Dayton, OH',
  period: '2002 to 2004',
} as const;
