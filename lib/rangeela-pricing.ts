// RANGEELA '26 ticket prices, shared by the admin pages and API.
// Keep in step with aisca-web-fresh/src/lib/rangeela.ts
export const RG_PRICING = {
  earlyBird: 1000,
  standard: 1200,
  gate: 1500,
  // Early bird runs until the end of 10 October (Sri Lanka time).
  earlyBirdEndsISO: '2026-10-11T00:00:00+05:30',
} as const

/** Online price right now: early bird until the end of 10 October, then standard. */
export const rgOnlinePrice = (now = Date.now()): number =>
  now < Date.parse(RG_PRICING.earlyBirdEndsISO) ? RG_PRICING.earlyBird : RG_PRICING.standard
