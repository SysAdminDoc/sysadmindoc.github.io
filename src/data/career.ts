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

export const careerRoles: readonly CareerRole[] = [
  {
    role: 'Senior Technical Support Manager',
    company: 'Maven Imaging',
    location: 'Sarasota, FL',
    period: 'Feb 2021 — Present',
    tag: 'Current',
    tone: 'current',
    summary: 'Tier II escalation lead for PACS, DR panels, and cloud migrations. Architected 10+ PACS migrations (including a 1M+ file Candelis legacy transfer when vendor tooling failed), drove a 54-account cross-vendor cloud restoration, and support clinics across the Caribbean, East Africa, and East Asia. Built the in-house tooling that makes it possible.',
    highlights: [
      'Led 10+ PACS migrations — single largest moved 1M+ files after writing a custom C-Store sender to bypass broken vendor tooling',
      'Restored 54 customer cloud accounts during a cross-vendor PatientImage / RADinfo transition',
      'Diagnosed and fixed a fleet-wide Windows 11 random-MAC licensing bug; set the shipping-PC standard to prevent recurrence',
      'Built production tooling adopted company-wide: DICOM PACS Migrator, WiFi Tool, acquisition-PC network scanner',
      'Produces the Maven Imaging YouTube tutorial library (VoyanceX, VXvue, Rayence, Genoray, AMRAD) and trains a major OEM’s field engineers',
    ],
    stack: ['DICOM C-Store', 'Candelis ImageGrid', 'Voyance / VoyanceX', 'Patient Image Cloud', 'VXvue', 'Rayence DR', 'Hyper-V', 'UniFi VPN', 'Freshdesk'],
  },
  {
    role: 'Systems Administrator',
    company: 'ThinkTV (PBS Affiliate)',
    location: 'Dayton, OH',
    period: 'Apr 2014 — Feb 2025',
    tag: '~11 years',
    tone: 'previous',
    note: 'Concurrent with the start of the Maven Imaging role.',
    summary: 'Administered the full network and server stack for a regional PBS station serving Dayton and Cincinnati — physical and virtual Windows Servers, Cisco networking, SCCM, and the broadcast-automation infrastructure that had to stay on-air 24/7.',
    highlights: [
      'Led Hyper-V virtualization initiative, consolidating physical hardware',
      'Implemented SCCM from scratch to manage 100+ Win7/10 workstations',
      'Deployed Cisco ISR 4300, ASA firewalls, and Catalyst 2960/3560/SG300 switches',
      'Maintained Grass Valley K2 video servers + Harmonic encoders on the broadcast side',
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
    summary: 'Managed day-to-day operations across multiple MSP client environments — Active Directory, Group Policy, DNS/DHCP, legacy server decommissioning, and 24/7/365 network monitoring with escalation to senior admins when needed.',
    highlights: [
      'Migrated file servers + legacy apps off Windows Server 2003 R2 to 2012 R2',
      'Built network/system documentation — topology diagrams and runbooks',
      'Onboarded new users and trained them on workflows, software, and phone systems',
    ],
    stack: ['Windows Server 2003–2012 R2', 'Active Directory', 'Group Policy', 'Avaya IP Office', 'Endpoint security'],
  },
];
