// What a build's /status.json says about the data it was built from. A
// visual-gate run killed mid-swap leaves the committed test fixtures in
// src/data, and a build on top of them marks its generatedData.mode "fixture".
// Such a build must never ship, and neither must one that can't say.

/**
 * @param {string} statusJson  the text of dist/status.json
 * @returns {string | null}  why the build can't ship, or null
 */
export function builtDataProblem(statusJson) {
  let mode;
  try {
    mode = JSON.parse(statusJson)?.generatedData?.mode;
  } catch {
    return 'dist/status.json is missing or unreadable, so the build can\'t say what data it holds';
  }
  if (typeof mode !== 'string' || !mode) return 'dist/status.json has no generatedData.mode, so the build can\'t say what data it holds';
  if (mode === 'fixture') {
    return 'dist/ was built from the committed test fixtures (status.json mode "fixture"). A killed visual-gate run leaves them in src/data: run node scripts/visual-gate.mjs --restore, refresh the data, and build again';
  }
  return null;
}
