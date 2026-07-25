// Single source of truth for public tenure/experience facts.
//
// The years-of-experience figure appears in page copy, the hero, the AI track,
// the resume JSON export, the llms.txt profile, and page metadata. Deriving all
// of them from one constant keeps the number from drifting across surfaces (a
// consistency test enforces that no surface hardcodes a divergent literal).
export const experienceYears = 15;
export const experienceLabel = `${experienceYears}+ years`;
export const experienceShort = `${experienceYears}+ yrs`;

// The public contact address. It appears in the shared footer, the AI track
// CTAs, the homepage connect section, the resume page, and the resume JSON
// export; deriving them all from here keeps a future address change from
// leaving a dead mailto behind on some surface.
export const contactEmail = 'matt_parker@outlook.com';

/** `mailto:` href for the public address, with an optional prefilled subject. */
export function contactMailto(subject?: string) {
  return subject
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
    : `mailto:${contactEmail}`;
}
