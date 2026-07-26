import type { APIContext } from 'astro';
import { careerEducation, careerProfile, careerRoles, careerSkills } from '../data/career';
import { endpointHeaders } from '../data/endpoint-headers';
import { contactEmail } from '../data/identity';

// JSON Resume (jsonresume.org/schema) export for ATS/parser ingestion.
// Generated from the same shared career + skills data the /resume page renders.
export async function GET(_context: APIContext) {
  const resume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: careerProfile.name,
      label: careerProfile.headline,
      email: contactEmail,
      url: 'https://sysadmindoc.github.io',
      summary: careerProfile.summary,
      location: { city: 'Sarasota', region: 'FL', countryCode: 'US' },
      profiles: [
        { network: 'Website', username: 'Parker AI', url: 'https://getparkerai.com' },
        { network: 'GitHub', username: 'SysAdminDoc', url: 'https://github.com/SysAdminDoc' },
        { network: 'LinkedIn', username: 'matthewryanparker', url: 'https://www.linkedin.com/in/matthewryanparker' },
      ],
    },
    work: careerRoles.map((role) => ({
      name: role.company,
      position: role.role,
      location: role.location,
      startDate: role.startDate,
      ...(role.endDate ? { endDate: role.endDate } : {}),
      summary: role.summary,
      highlights: [...role.highlights],
      keywords: [...role.stack],
    })),
    skills: careerSkills.map((skill) => ({
      name: skill.name,
      keywords: skill.sub.split(/,\s*/).filter(Boolean),
    })),
    education: [{
      institution: careerEducation.school,
      area: careerEducation.program,
      studyType: careerEducation.detail,
      startDate: '2002',
      endDate: '2004',
      location: careerEducation.location,
    }],
  };

  return new Response(JSON.stringify(resume, null, 2), {
    headers: endpointHeaders('application/json; charset=UTF-8'),
  });
}
