// Single source of truth for public tenure/experience facts.
//
// The years-of-experience figure appears in page copy, the hero, the AI track,
// the resume JSON export, the llms.txt profile, and page metadata. Deriving all
// of them from one constant keeps the number from drifting across surfaces (a
// consistency test enforces that no surface hardcodes a divergent literal).
export const experienceYears = 15;
export const experienceLabel = `${experienceYears}+ years`;
export const experienceShort = `${experienceYears}+ yrs`;
