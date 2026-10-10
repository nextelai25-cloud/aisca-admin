// RANGEELA '26 ticket prices, shared by the admin pages and API.
// The live online and gate prices are set by the chairman (table
// rangeela_settings). These numbers are only the fallback.
// Keep in step with aisca-web-fresh/src/lib/rangeela.ts
export const RG_PRICING = {
  earlyBird: 1000,
  standard: 1200,
  gate: 1500,
  // Early bird runs until the end of 9 October (Sri Lanka time).
  earlyBirdEndsISO: '2026-10-10T00:00:00+05:30',
} as const

export type RgPrices = { standard: number; gate: number }
export const RG_DEFAULT_PRICES: RgPrices = { standard: RG_PRICING.standard, gate: RG_PRICING.gate }

/** Online price right now: early bird until the end of 9 October, then the live standard price. */
export const rgOnlinePrice = (now = Date.now(), p: RgPrices = RG_DEFAULT_PRICES): number =>
  now < Date.parse(RG_PRICING.earlyBirdEndsISO) ? RG_PRICING.earlyBird : p.standard
