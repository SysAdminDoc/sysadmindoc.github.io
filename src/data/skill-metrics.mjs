export const RING_CIRCUMFERENCE = 204;
export const RING_MIN_OFFSET = 16;

const skillCategories = {
  PowerShell: ['ps'],
  Python: ['py'],
  JavaScript: ['ext'],
  Kotlin: ['kt'],
  'C#': ['cs'],
  'C++': ['cs'],
  'HTML / CSS': ['web'],
  pfSense: ['sec'],
};

function projectWord(count) {
  return count === 1 ? 'project' : 'projects';
}

export function ringTargetForCount(count, maxCount) {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const safeMax = Number.isFinite(maxCount) ? Math.max(0, maxCount) : 0;
  if (safeCount === 0 || safeMax === 0) return RING_CIRCUMFERENCE;
  const fill = safeCount / safeMax;
  const target = RING_CIRCUMFERENCE - fill * (RING_CIRCUMFERENCE - RING_MIN_OFFSET);
  return Math.round(Math.max(RING_MIN_OFFSET, Math.min(RING_CIRCUMFERENCE, target)));
}

export function countCatalogCategories(catalog) {
  const counts = {};
  for (const project of Array.isArray(catalog) ? catalog : []) {
    const category = typeof project?.category === 'string' ? project.category : '';
    if (!category) continue;
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

export function buildSkillsWithMetrics(skills, catalog) {
  const counts = countCatalogCategories(catalog);
  const skillCounts = new Map();
  for (const skill of Array.isArray(skills) ? skills : []) {
    const categories = skillCategories[skill?.name] || [];
    const count = categories.reduce((total, category) => total + (counts[category] || 0), 0);
    skillCounts.set(skill?.name, count);
  }
  const maxCount = Math.max(0, ...skillCounts.values());
  const total = Array.isArray(catalog) ? catalog.length : 0;
  return (Array.isArray(skills) ? skills : []).map((skill) => {
    const count = skillCounts.get(skill.name) || 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      ...skill,
      ringTarget: ringTargetForCount(count, maxCount),
      metric: {
        count,
        total,
        percent,
        label: `${count} ${projectWord(count)} in this lane`,
      },
    };
  });
}
