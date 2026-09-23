// Is the live site's generated data still inside its freshness contract?
//
// /status.json is written once per build and then served for days, so its own
// `status` and `stale` fields describe the data as it was at build time. On
// 2026-09-23 the live file said "fresh" about data 37.8 hours old. The smoke
// judges `generatedData.staleAfter` against the current time instead.

/**
 * @param {any} status the parsed /status.json
 * @param {number} [nowMs]
 * @returns {{ staleAfter: string, hoursLeft: number }}
 */
export function checkStatusFreshness(status, nowMs = Date.now()) {
  const staleAfterValue = status?.generatedData?.staleAfter;
  const staleAfter = Date.parse(staleAfterValue ?? '');
  if (!Number.isFinite(staleAfter)) {
    throw new Error("/status.json has no generatedData.staleAfter, so the live data's age can't be judged.");
  }
  if (nowMs > staleAfter) {
    const hoursAgo = ((nowMs - staleAfter) / 3_600_000).toFixed(1);
    const contract = status.generatedData.maxAgeHours ?? '?';
    throw new Error(
      `live data went past its ${contract}h freshness contract at ${new Date(staleAfter).toISOString()} (${hoursAgo}h ago); ` +
        'the nightly refresh has not deployed since. Run npm run refresh:deploy.',
    );
  }
  return { staleAfter: new Date(staleAfter).toISOString(), hoursLeft: Number(((staleAfter - nowMs) / 3_600_000).toFixed(1)) };
}
