// Single source of truth for career history, shared by the homepage Career
// section, the /resume page, and the /resume.json (JSON Resume) export.

export interface CareerRole {
  role: string;
  company: string;
  location: string;
  period: string;
  tag: string;
  tone: 'current' | 'previous';
  summary: string;
  highlights: readonly string[];
  stack: readonly string[];
  /** Optional clarifier shown under the period (e.g. to explain overlapping dates). */
  note?: string;
}

export const careerSkills = [
  { name: 'Healthcare Imaging Support', sub: 'PACS, DICOM, DR acquisition' },
  { name: 'Systems Administration', sub: 'Windows Server, AD, GPO, Hyper-V' },
  { name: 'Networking', sub: 'Cisco, VPN, DNS/DHCP, monitoring' },
  { name: 'Customer Escalation', sub: 'troubleshooting, recovery, vendor coordination' },
  { name: 'Migration Coordination', sub: 'archive transfers, cutovers, validation' },
  { name: 'Documentation', sub: 'runbooks, knowledge base, training material' },
] as const;

export const careerRoles: readonly CareerRole[] = [
  {
    role: 'Senior Technical Support Manager',
    company: 'Maven Imaging',
    location: 'Sarasota, FL',
    period: 'Feb 2021 — Present',
    tag: 'Current',
    tone: 'current',
    summary: 'Tier II escalation and support management for PACS, DR panel, acquisition workstation, and cloud-hosted imaging workflows. Work centers on clinical imaging troubleshooting, migration coordination, vendor handoffs, documentation, and keeping customer environments stable through support incidents and planned transitions.',
    highlights: [
      'Coordinate PACS and imaging-system migrations, including legacy archive transfers, customer cutovers, and validation follow-up',
      'Support DR panel acquisition environments, Windows workstations, network connectivity, and vendor application issues',
      'Troubleshoot licensing, workstation, networking, VPN, and cloud-account access issues across customer environments',
      'Document repeatable support procedures and maintain knowledge-base material for customers, field teams, and internal support',
      'Escalate service-impacting issues across customers, vendors, and internal teams with clear status updates and recovery steps',
    ],
    stack: ['DICOM', 'PACS', 'DR panels', 'Acquisition workstations', 'Windows imaging PCs', 'Cloud imaging workflows', 'Hyper-V', 'VPN', 'Freshdesk'],
  },
  {
    role: 'Systems Administrator',
    company: 'ThinkTV (PBS Affiliate)',
    location: 'Dayton, OH',
    period: 'Apr 2014 — Feb 2025',
    tag: '~11 years',
    tone: 'previous',
    note: 'Concurrent with the start of the Maven Imaging role.',
    summary: 'Supported network, server, workstation, and broadcast-adjacent infrastructure for a regional PBS affiliate environment. Work included Windows Server, Active Directory, virtualization, endpoint management, Cisco networking, monitoring, and user support in an always-on media operations setting.',
    highlights: [
      'Supported Hyper-V virtualization and server consolidation for Windows Server workloads',
      'Administered endpoint management for Windows workstation fleets using SCCM-era tooling',
      'Maintained Cisco routing, firewall, and switching infrastructure with monitoring and troubleshooting',
      'Supported broadcast-related server and encoder infrastructure with escalation and maintenance as needed',
    ],
    stack: ['Windows Server 2008–2016', 'Active Directory & GPO', 'Hyper-V', 'SCCM', 'PRTG', 'Cisco', 'Avaya VOIP'],
  },
  {
    role: 'IT Support Technician',
    company: 'Dayton Technology Group (MSP)',
    location: 'Dayton, OH',
    period: 'Jun 2010 — Apr 2014',
    tag: '~4 years',
    tone: 'previous',
    summary: 'Supported multiple MSP client environments across Active Directory, Group Policy, DNS/DHCP, server refreshes, user onboarding, documentation, and 24/7 monitoring with escalation to senior administrators when needed.',
    highlights: [
      'Assisted with server refreshes and legacy Windows Server decommissioning',
      'Documented client networks, topology notes, runbooks, and recurring support procedures',
      'Onboarded users and provided practical training on business software, phone systems, and account access',
    ],
    stack: ['Windows Server 2003–2012 R2', 'Active Directory', 'Group Policy', 'Avaya IP Office', 'Endpoint security'],
  },
];
