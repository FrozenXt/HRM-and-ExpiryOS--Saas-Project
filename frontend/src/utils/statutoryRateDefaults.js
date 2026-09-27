// Default statutory rate percentages (PF employee/employer share, gratuity
// accrual). CompanySettings' schema only has boolean applicability flags
// (pfApplicable, esiApplicable, ...) — it has no fields for the actual rate
// numbers, so there's nowhere on the backend to persist these yet.
//
// Storing them in localStorage, keyed per company, means:
//   - They survive reloads on this browser/device.
//   - They are NOT shared across your team's other devices/browsers.
// If you want these synced properly, add pfEmployeeRate / pfEmployerRate /
// gratuityRate (as numbers) to the CompanySettings model and PATCH /
// GET /company-settings, then swap this file to call that API instead —
// everything that reads getStatutoryRates() will keep working unchanged.

const STORAGE_PREFIX = "statutoryRates:";

export const FALLBACK_RATES = {
  pfEmployeeRate: 10, // % of basic
  pfEmployerRate: 20, // % of basic
  gratuityRate: 8.33, // % of basic (~1/12, one month accrued per year)
};

export function getStatutoryRates(companyId) {
  if (!companyId) return FALLBACK_RATES;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + companyId);
    if (!raw) return FALLBACK_RATES;
    return { ...FALLBACK_RATES, ...JSON.parse(raw) };
  } catch {
    return FALLBACK_RATES;
  }
}

export function setStatutoryRates(companyId, rates) {
  if (!companyId) return;
  localStorage.setItem(STORAGE_PREFIX + companyId, JSON.stringify(rates));
}
