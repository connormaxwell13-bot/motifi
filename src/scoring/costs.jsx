// costs.jsx
// Cost of ownership calculations — road tax, insurance, finance.
// Uses car.priceLow (AutoTrader 10th percentile) as the reference price.
// Uses new answers schema: answers.paymentMethod, answers.depositAmount, answers.partExValue
export function getRoadTax(car) {
  const fuel = (car.fuelType || '').toLowerCase()
  if (fuel.includes('electric')) return 0
  if (fuel.includes('hybrid'))   return 95
  return 190
}
export function getInsuranceCostRange(car) {
  const bands = {
    Low:         { min: 600,  max: 900  },
    Medium:      { min: 900,  max: 1400 },
    High:        { min: 1400, max: 2200 },
    'Very High': { min: 2200, max: 3500 },
  }
  return bands[car.insuranceBand] || { min: 900, max: 1400 }
}
export function calculateFinance(carPrice, deposit, termMonths, apr) {
  const loanAmount = carPrice - deposit
  if (loanAmount <= 0) return { monthly: 0, total: 0 }
  const monthlyRate = apr / 100 / 12
  const monthly = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                  (Math.pow(1 + monthlyRate, termMonths) - 1)
  return {
    monthly: Math.round(monthly),
    total:   Math.round(monthly * termMonths + deposit),
  }
}
// Returns year-one cost breakdown based on payment method.
// car.priceLow is the realistic entry price for this generation.
// partExValue reduces the effective purchase price before any finance calculation.
export function getYearOneCost(car, answers) {
  const carPrice      = parseFloat(car.priceLow) || 0
  const roadTax       = getRoadTax(car)
  const insurance     = getInsuranceCostRange(car)
  const paymentMethod = answers.paymentMethod || 'Cash'
  const partExValue   = parseFloat(answers.partExValue) || 0
  const effectivePrice = Math.max(0, carPrice - partExValue)
  // Cash or Bank Loan — outright purchase
  if (paymentMethod === 'Cash' || paymentMethod === 'Bank Loan') {
    return {
      method:       paymentMethod,
      carPrice,
      partExValue,
      effectivePrice,
      roadTax,
      insuranceMin: insurance.min,
      insuranceMax: insurance.max,
      yearOneMin:   Math.round(effectivePrice + roadTax + insurance.min),
      yearOneMax:   Math.round(effectivePrice + roadTax + insurance.max),
      monthly:      null,
    }
  }
  // Part Exchange — reduces day 1 outlay, no finance
  if (paymentMethod === 'Part Exchange') {
    return {
      method:       paymentMethod,
      carPrice,
      partExValue,
      effectivePrice,
      roadTax,
      insuranceMin: insurance.min,
      insuranceMax: insurance.max,
      yearOneMin:   Math.round(effectivePrice + roadTax + insurance.min),
      yearOneMax:   Math.round(effectivePrice + roadTax + insurance.max),
      monthly:      null,
    }
  }
  // Hire Purchase — deposit + monthly payments over 48 months
  const deposit      = parseFloat(answers.depositAmount) || Math.round(effectivePrice * 0.10)
  const term         = 48
  const finance      = calculateFinance(effectivePrice, deposit, term, 9.9)
  const monthlyIns   = Math.round((insurance.min + insurance.max) / 2 / 12)
  const monthlyTax   = Math.round(roadTax / 12)
  const totalMonthly = finance.monthly + monthlyIns + monthlyTax
  return {
    method:          paymentMethod,
    carPrice,
    partExValue,
    effectivePrice,
    deposit,
    financeMonthly:   finance.monthly,
    roadTax,
    roadTaxMonthly:   monthlyTax,
    insuranceMin:     insurance.min,
    insuranceMax:     insurance.max,
    insuranceMonthly: monthlyIns,
    totalMonthlyMin:  totalMonthly - 30,
    totalMonthlyMax:  totalMonthly + 30,
    yearOneMin:       Math.round(deposit + (finance.monthly * 12) + roadTax + insurance.min),
    yearOneMax:       Math.round(deposit + (finance.monthly * 12) + roadTax + insurance.max),
    monthly:          totalMonthly,
  }
}

// ─── Compare additions (Session 3) ────────────────────────────────────────────
// Helpers shared between Compare and Results so the same canonical numbers
// are used everywhere. Below this line is new — the existing logic above is
// unchanged.

// Midpoint of a car's price band, rounded to the nearest £100.
// Used as the canonical "representative price" for Results headline + Compare.
//
// Why: priceLow alone is misleading when bands overlap. A car listed at
// £10,995–£13,500 priced as "£10,995" sits below a car at £11,500–£12,800
// even though the second is genuinely cheaper in the middle of the band.
// Midpoint is the honest single number for a single-cell display.
export function getRepresentativePrice(car) {
  const lo = Number(car?.priceLow)  || 0
  const hi = Number(car?.priceHigh) || lo
  if (!lo) return 0
  return Math.round(((lo + hi) / 2) / 100) * 100
}

// Parse a "3-5%" / "6-9%" / "10-15%" depreciationRate string and return
// the band midpoint as a decimal annual rate (e.g. 0.04, 0.075, 0.125).
// Falls back to depreciationBand mapping if the rate string is missing
// or unparseable. Verified against the dataset: every car has either a
// rate string in this format, or a band that matches one of the three buckets.
function parseAnnualDepreciationRate(car) {
  const raw = car?.depreciationRate
  if (typeof raw === 'string') {
    const m = raw.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%/)
    if (m) {
      const lo = parseFloat(m[1])
      const hi = parseFloat(m[2])
      return ((lo + hi) / 2) / 100
    }
  }
  // Fallback — keyed off depreciationBand using midpoints of the same ranges.
  const band = car?.depreciationBand
  if (band === 'Low')    return 0.04
  if (band === 'High')   return 0.125
  return 0.075 // Medium / unknown default
}

// Compound the annual rate over 48 months → fraction of value retained.
// retained = (1 − annualRate)^4
export function getRetainedAfter48Months(car) {
  const annual = parseAnnualDepreciationRate(car)
  return Math.pow(1 - annual, 4)
}

// 48-month resale value in £ (rounded). Computed on the representative price.
export function getResaleValue48m(car) {
  return Math.round(getRepresentativePrice(car) * getRetainedAfter48Months(car))
}

// Absolute £ depreciation over 48 months (positive number — the loss).
export function getDepreciation48m(car) {
  return getRepresentativePrice(car) - getResaleValue48m(car)
}

// True 48-month cost of ownership.
// Handles all four payment paths in getYearOneCost above:
//   - HP:            deposit + (financeMonthly × 48) + (insuranceMonthly × 48) + (roadTax × 4) − resale
//   - Cash / Loan:   effectivePrice + (avgInsuranceAnnual × 4) + (roadTax × 4) − resale
//   - Part Exchange: effectivePrice + (avgInsuranceAnnual × 4) + (roadTax × 4) − resale
// Notes:
//   - Resale uses the full representative price (the asset itself), not the
//     effective price. The part-ex'd car was a separate transaction.
//   - Maintenance is intentionally excluded — no concrete data in the dataset
//     yet. Add when that data lands.
export function getTrue48MonthCost(car, answers) {
  const cy = getYearOneCost(car, answers)
  const isFinance = (
    cy?.method === 'Hire Purchase' ||
    cy?.method === 'Hire Purchase (HP)' ||
    cy?.method === 'Personal Contract Purchase (PCP)'
  )

  // Insurance over 48 months — HP path returns insuranceMonthly directly.
  // Cash / Loan / Part-Ex paths only return insuranceMin/Max (£/yr range);
  // average them and × 4 years for an apples-to-apples 48-month figure.
  const insurance48 = cy?.insuranceMonthly != null
    ? cy.insuranceMonthly * 48
    : Math.round(((cy.insuranceMin + cy.insuranceMax) / 2) * 4)

  const roadTax4yr = (cy?.roadTax || 0) * 4
  const resale     = getResaleValue48m(car)

  if (isFinance) {
    const deposit = cy.deposit || 0
    const hp48    = (cy.financeMonthly || 0) * 48
    return Math.round(deposit + hp48 + insurance48 + roadTax4yr - resale)
  }

  // Cash, Bank Loan, Part Exchange — outright purchase of the same asset.
  // effectivePrice already accounts for any part-ex offset.
  const upfront = cy?.effectivePrice ?? getRepresentativePrice(car)
  return Math.round(upfront + insurance48 + roadTax4yr - resale)
}

// Insurance figure for Compare cells — single canonical £/mo number per car
// regardless of payment method. Uses the band midpoint so cars rank cleanly
// even when the user is paying cash (where getYearOneCost returns a range).
export function getInsuranceMonthly(car) {
  const r = getInsuranceCostRange(car)
  return Math.round(((r.min + r.max) / 2) / 12)
}
