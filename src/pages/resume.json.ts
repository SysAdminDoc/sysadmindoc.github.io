import type { APIContext } from 'astro';
import { careerRoles } from '../data/career';
import { endpointHeaders } from '../data/endpoint-headers';
import { skills } from '../data/projects';

// JSON Resume (jsonresume.org/schema) export for ATS/parser ingestion.
// Generated from the same shared career + skills data the /resume page renders.
export async function GET(_context: APIContext) {
  const resume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: 'Matt Parker',
      label: 'Senior Technical Support Manager',
      email: 'matt_parker@outlook.com',
      url: 'https://sysadmindoc.github.io',
      summary: '15+ years in enterprise IT, the last six in medical imaging (DICOM/PACS, DR panels, cloud migrations), plus open-source tooling across PowerShell, Python, JavaScript, Kotlin, C#, and C++.',
      location: { city: 'Sarasota', region: 'FL', countryCode: 'US' },
      profiles: [
        { network: 'GitHub', username: 'SysAdminDoc', url: 'https://github.com/SysAdminDoc' },
        { network: 'LinkedIn', username: 'matthewryanparker', url: 'https://www.linkedin.com/in/matthewryanparker' },
      ],
    },
    work: careerRoles.map((role) => ({
      name: role.company,
      position: role.role,
      location: role.location,
      summary: `${role.period} — ${role.summary}`,
      highlights: [...role.highlights],
      keywords: [...role.stack],
    })),
    skills: skills.map((skill) => ({
      name: skill.name,
      keywords: skill.sub.split(/,\s*/).filter(Boolean),
    })),
  };

  return new Response(JSON.stringify(resume, null, 2), {
    headers: endpointHeaders('application/json; charset=UTF-8'),
  });
}
