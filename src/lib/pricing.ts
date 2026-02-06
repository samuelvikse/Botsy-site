/**
 * Centralized pricing configuration.
 * Update these values to change pricing across the app.
 *
 * NOTE: SEO metadata in layout.tsx, funksjoner/layout.tsx, and prov-gratis/layout.tsx
 * use hardcoded strings in Next.js metadata exports (which must be static).
 * If you change the price here, also search for "699" in those layout files.
 */
export const PRICING = {
  /** Monthly price in NOK (number for calculations) */
  monthly: 699,
  /** Formatted price string */
  monthlyFormatted: '699 kr',
  /** Price with period suffix */
  monthlyWithPeriod: '699 kr/mnd',
  /** Original/regular price for comparison */
  originalMonthly: 1499,
  /** Trial period in days */
  trialDays: 14,
  /** Currency */
  currency: 'NOK',
} as const
