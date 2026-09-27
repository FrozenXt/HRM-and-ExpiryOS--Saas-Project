export const NEPAL_TAX_SLABS_2083_84 = [
  { upTo: 1_000_000, rate: 0.01 }, // Up to Rs 10,00,000/yr
  { upTo: 1_500_000, rate: 0.1 }, // Rs 10,00,001–15,00,000
  { upTo: 2_500_000, rate: 0.2 }, // Rs 15,00,001–25,00,000
  { upTo: 4_000_000, rate: 0.27 }, // Rs 25,00,001–40,00,000
  { upTo: Infinity, rate: 0.29 }, // Above Rs 40,00,000
];

export function calculateNepalAnnualTax(
  annualTaxableIncome,
  slabs = NEPAL_TAX_SLABS_2083_84,
) {
  let remaining = Math.max(0, Number(annualTaxableIncome) || 0);
  let tax = 0;
  let lowerBound = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const bandSize = slab.upTo - lowerBound;
    const taxedInBand = Math.min(remaining, bandSize);
    tax += taxedInBand * slab.rate;
    remaining -= taxedInBand;
    lowerBound = slab.upTo;
  }

  return Math.round(tax);
}

export function calculateMonthlyTax(
  monthlyGrossSalary,
  slabs = NEPAL_TAX_SLABS_2083_84,
) {
  const annualGross = (Number(monthlyGrossSalary) || 0) * 12;
  const annualTax = calculateNepalAnnualTax(annualGross, slabs);
  return Math.round(annualTax / 12);
}
