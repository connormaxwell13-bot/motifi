// verdict.jsx — Session 3
// Compare-page metric engine.
//
// Given a set of cars + the user's answers, returns a fully-resolved
// metric grid: each row has a label, a unit, and per-car cells. Each
// cell carries:
//   - displayValue (string — what the user sees, e.g. "£12,250", "48 mpg")
//   - rawValue     (number where rankable; null otherwise)
//   - verdict      ('best' | 'worst' | 'middle' | null) — drives the tag
//   - position     (0–1 — used for the per-cell progress bar; 1 = best)
//
// Plus getOverallVerdict() which picks the headline winner across all cars
// and produces the verdict-panel copy.

import {
  getYearOneCost,
  getRepresentativePrice,
  getRetainedAfter48Months,
  getResaleValue48m,
  getDepreciation48m,
  getTrue48MonthCost,
  getInsuranceMonthly,
} from './costs.jsx'

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmtGBP   = (n) => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB')
const fmtGBPmo = (n) => fmtGBP(n) + ' / mo'

// Parse "38-48" → upper bound 48. Used for MPG (combined upper).
function parseMpgUpper(rangeStr) {
  if (!rangeStr) return null
  const m = String(rangeStr).match(/(\d+)\s*[-–]\s*(\d+)/)
  if (m) return parseInt(m[2], 10)
  const single = parseInt(rangeStr, 10)
  return isNaN(single) ? null : single
}

// ─── Verdict assignment ──────────────────────────────────────────────────────
// Given an array of numeric values and a direction ('lower' | 'higher' wins),
// returns per-position { verdict, position } objects.
//
// - If all values are equal, every cell is `middle`, position = 0.5.
// - 'best' = the unique winner. 'worst' = the unique loser. 'middle' = anyone
//    in between (or tied at non-extreme).
// - position is normalised 0-1 ALWAYS so that 1 = best, regardless of whether
//   the metric is "lower wins" or "higher wins". Keeps the visual progress
//   bar consistent (longer = better) across all rows.

function assignVerdicts(values, direction) {
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter(x => x.v != null && !Number.isNaN(x.v))

  if (valid.length === 0) {
    return values.map(() => ({ verdict: null, position: 0 }))
  }
  const nums = valid.map(x => x.v)
  const min = Math.min(...nums)
  const max = Math.max(...nums)

  if (min === max) {
    return values.map(v => ({
      verdict: v == null ? null : 'middle',
      position: 0.5,
    }))
  }

  return values.map(v => {
    if (v == null || Number.isNaN(v)) return { verdict: null, position: 0 }
    const isWinner = direction === 'lower' ? v === min : v === max
    const isLoser  = direction === 'lower' ? v === max : v === min
    const norm = direction === 'lower'
      ? 1 - (v - min) / (max - min)
      : (v - min) / (max - min)
    return {
      verdict: isWinner ? 'best' : isLoser ? 'worst' : 'middle',
      position: norm,
    }
  })
}

// ─── Row builders ────────────────────────────────────────────────────────────

function buildNumericRow({ label, sub, values, direction, format, headline }) {
  const verdicts = assignVerdicts(values, direction)
  const cells = values.map((v, i) => ({
    rawValue: v,
    displayValue: v == null ? '—' : format(v),
    verdict: verdicts[i].verdict,
    position: verdicts[i].position,
  }))
  return { label, sub, cells, kind: 'numeric', headline: !!headline }
}

function buildPlainRow({ label, sub, values, format }) {
  const cells = values.map(v => ({
    rawValue: null,
    displayValue: (v == null || v === '') ? '—' : (format ? format(v) : String(v)),
    verdict: null,
    position: 0,
  }))
  return { label, sub, cells, kind: 'plain' }
}

// ─── Section builders ────────────────────────────────────────────────────────

function buildCostToBuy(cars, answers) {
  const isFinance = ['Hire Purchase', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)']
    .includes(answers?.paymentMethod || answers?.purchaseMethod)

  const usedPrices = cars.map(getRepresentativePrice)
  const deposits   = cars.map(c => Math.round(getRepresentativePrice(c) * 0.10))
  const hpMonthly  = cars.map(c => {
    if (!isFinance) return null
    const cy = getYearOneCost(c, answers)
    return cy?.financeMonthly ?? null
  })
  const insMonthly = cars.map(getInsuranceMonthly)

  return {
    id: 'cost-to-buy',
    number: '01',
    title: 'Cost to buy',
    rows: [
      buildNumericRow({
        label: 'Used price',
        sub: '(price midpoint)',
        values: usedPrices,
        direction: 'lower',
        format: fmtGBP,
      }),
      buildNumericRow({
        label: 'Deposit (HP, 10%)',
        sub: null,
        values: deposits,
        direction: 'lower',
        format: fmtGBP,
      }),
      buildNumericRow({
        label: 'HP monthly',
        sub: '(48 months)',
        values: hpMonthly,
        direction: 'lower',
        format: (v) => v == null ? 'N/A' : fmtGBPmo(v),
      }),
      buildNumericRow({
        label: 'Insurance',
        sub: '(monthly est.)',
        values: insMonthly,
        direction: 'lower',
        format: (v) => fmtGBPmo(v),
      }),
    ],
  }
}

function buildCostToOwn(cars, answers) {
  const insTotals = cars.map(c => getInsuranceMonthly(c) * 48)
  const roadTaxes = cars.map(c => {
    const cy = getYearOneCost(c, answers)
    return Math.round((cy?.roadTax ?? 0) * 4)
  })
  const depreciations = cars.map(getDepreciation48m)
  const resales       = cars.map(getResaleValue48m)
  const trueCosts     = cars.map(c => getTrue48MonthCost(c, answers))

  return {
    id: 'cost-to-own',
    number: '02',
    title: 'Cost to own (48 months)',
    rows: [
      buildNumericRow({
        label: 'Insurance total',
        sub: '(48 months)',
        values: insTotals,
        direction: 'lower',
        format: fmtGBP,
      }),
      buildNumericRow({
        label: 'Road tax',
        sub: '(4 years)',
        values: roadTaxes,
        direction: 'lower',
        format: (v) => v === 0 ? 'Free (EV)' : fmtGBP(v),
      }),
      buildNumericRow({
        label: 'Depreciation',
        sub: '(4 years)',
        values: depreciations,
        direction: 'lower',
        format: (v) => '−' + fmtGBP(v),
      }),
      buildNumericRow({
        label: 'Resale value',
        sub: '(at 48 months)',
        values: resales,
        direction: 'higher',
        format: fmtGBP,
      }),
      buildNumericRow({
        label: 'True four-year cost',
        sub: 'All-in',
        values: trueCosts,
        direction: 'lower',
        format: fmtGBP,
        headline: true,
      }),
    ],
  }
}

function buildPracticality(cars, answers) {
  const mpgs       = cars.map(c => parseMpgUpper(c.mpgRange))
  const boots      = cars.map(c => Number(c.bootVolume) || null)
  const drivingCtx = answers?.drivingContext

  // Parking — verdict is contextual on driving context.
  // City: Compact wins. Rural: Large wins. Otherwise: no verdict.
  let parkingDirection = null
  let parkingOrder     = null
  if (drivingCtx === 'Mostly city') {
    parkingOrder     = ['Compact', 'Standard', 'Large']
    parkingDirection = 'city'
  } else if (drivingCtx === 'Mostly rural') {
    parkingOrder     = ['Large', 'Standard', 'Compact']
    parkingDirection = 'rural'
  }

  const parkingValues = cars.map(c => c.parkingSize)
  let parkingCells
  if (parkingDirection) {
    const ranks = parkingValues.map(v => {
      const i = parkingOrder.indexOf(v)
      return i === -1 ? parkingOrder.length : i
    })
    parkingCells = assignVerdicts(ranks, 'lower')
  } else {
    parkingCells = parkingValues.map(() => ({ verdict: null, position: 0 }))
  }

  return {
    id: 'practicality',
    number: '03',
    title: 'Practicality',
    rows: [
      buildNumericRow({
        label: 'MPG',
        sub: '(combined, upper)',
        values: mpgs,
        direction: 'higher',
        format: (v) => `${v} mpg`,
      }),
      buildPlainRow({ label: 'Body type',    sub: null, values: cars.map(c => c.bodyType) }),
      buildPlainRow({ label: 'Fuel type',    sub: null, values: cars.map(c => c.fuelType) }),
      buildPlainRow({ label: 'Transmission', sub: null, values: cars.map(c => c.transmission) }),
      buildNumericRow({
        label: 'Boot size',
        sub: '(litres)',
        values: boots,
        direction: 'higher',
        format: (v) => `${v} L`,
      }),
      {
        label: 'Parking',
        sub: parkingDirection
          ? (parkingDirection === 'city' ? 'compact wins for city' : 'large wins for rural')
          : null,
        kind: 'plain',
        cells: parkingValues.map((v, i) => ({
          rawValue: null,
          displayValue: v ?? '—',
          verdict: parkingCells[i]?.verdict ?? null,
          position: parkingCells[i]?.position ?? 0,
        })),
      },
    ],
  }
}

function buildAdditional(cars, answers) {
  // Safety — composite key: stars dominate, ties broken by adultPct.
  const safetyKeys = cars.map(c => {
    const stars = Number(c.ncapStars) || 0
    const adult = Number(c.ncapAdultPct) || 0
    return stars * 100 + adult / 10
  })
  const safetyVerdicts = assignVerdicts(safetyKeys, 'higher')

  // Reliability — direct percentage, higher wins.
  const reliabilities = cars.map(c => Number(c.reliabilityPct) || null)
  const reliabilityVerdicts = assignVerdicts(reliabilities, 'higher')

  // ULEZ — Yes wins. Currently every car is Yes, so all-equal → all 'middle'.
  // Future-proof for when non-compliant cars enter the dataset.
  const ulezScores = cars.map(c =>
    c.ulezCompliant === 'Yes' ? 1 : c.ulezCompliant === 'No' ? 0 : null
  )
  const ulezVerdicts = assignVerdicts(ulezScores, 'higher')

  // Ownership stress — Low / Medium / High / Very High. Lower index = better.
  const stressOrder = ['Low', 'Medium', 'High', 'Very High']
  const stressRanks = cars.map(c => {
    const i = stressOrder.indexOf(c.ownershipStress)
    return i === -1 ? stressOrder.length : i
  })
  const stressVerdicts = assignVerdicts(stressRanks, 'lower')

  return {
    id: 'additional',
    number: '04',
    title: 'Additional',
    rows: [
      {
        label: 'Safety',
        sub: 'NCAP',
        kind: 'numeric',
        cells: cars.map((c, i) => ({
          rawValue: safetyKeys[i],
          displayValue: `${c.ncapStars}★`,
          subValue: c.ncapAdultPct ? `${c.ncapAdultPct}% adult` : null,
          verdict: safetyVerdicts[i].verdict,
          position: safetyVerdicts[i].position,
        })),
      },
      {
        label: 'ULEZ',
        sub: null,
        kind: 'plain',
        cells: cars.map((c, i) => ({
          rawValue: null,
          displayValue: c.ulezCompliant ?? '—',
          verdict: ulezVerdicts[i].verdict,
          position: ulezVerdicts[i].position,
        })),
      },
      {
        label: 'Reliability',
        sub: '(/10)',
        kind: 'numeric',
        cells: cars.map((c, i) => {
          const pct = Number(c.reliabilityPct)
          return {
            rawValue: pct || null,
            displayValue: pct ? (pct / 10).toFixed(1) : '—',
            verdict: reliabilityVerdicts[i].verdict,
            position: reliabilityVerdicts[i].position,
          }
        }),
      },
      {
        label: 'Ownership stress',
        sub: null,
        kind: 'plain',
        cells: cars.map((c, i) => ({
          rawValue: null,
          displayValue: c.ownershipStress ?? '—',
          verdict: stressVerdicts[i].verdict,
          position: stressVerdicts[i].position,
        })),
      },
    ],
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Build the full metric grid for a 1–3-car comparison.
export function buildComparison(cars, answers) {
  if (!cars || cars.length === 0) return { sections: [], totalMetrics: 0 }

  const sections = [
    buildCostToBuy(cars, answers),
    buildCostToOwn(cars, answers),
    buildPracticality(cars, answers),
    buildAdditional(cars, answers),
  ]
  const totalMetrics = sections.reduce((sum, s) => sum + s.rows.length, 0)
  return { sections, totalMetrics }
}

// Pick the overall winner. Returns:
//   { winnerIndex, winnerCar, headlineMetric, copy, recommendedReasons }
// Headline metric = lowest True 4-year cost. Ties broken by reliabilityPct.
export function getOverallVerdict(cars, answers) {
  if (!cars || cars.length === 0) return null

  const trueCosts = cars.map(c => getTrue48MonthCost(c, answers))
  const min = Math.min(...trueCosts)
  const candidates = cars
    .map((c, i) => ({ c, i, cost: trueCosts[i], rel: Number(c.reliabilityPct) || 0 }))
    .filter(x => x.cost === min)
    .sort((a, b) => b.rel - a.rel)
  const winner = candidates[0]
  if (!winner) return null

  const others = cars
    .map((c, i) => ({ c, i, cost: trueCosts[i] }))
    .filter(x => x.i !== winner.i)
    .sort((a, b) => a.cost - b.cost)
  const runnerUp = others[0]

  const usedPrices = cars.map(getRepresentativePrice)
  const cheapestUsedI = usedPrices.indexOf(Math.min(...usedPrices))
  const cheaperOnPaper = cheapestUsedI !== winner.i ? cars[cheapestUsedI] : null

  // Editorial copy. Two templates depending on whether the winner was also
  // cheapest on paper or not — the "cheaper on paper but loses on true cost"
  // case is the stronger story (matches Image 7 from the prototype).
  let copy = ''
  if (cheaperOnPaper) {
    const gap = Math.round((usedPrices[winner.i] - usedPrices[cheapestUsedI]) / 100) * 100
    copy = `The ${cheaperOnPaper.make} ${cheaperOnPaper.model} is **${fmtGBP(gap)}** cheaper to buy today — but depreciation, insurance group and servicing flip the outcome once you run it for four years. If you're selling within 18 months, the maths change. Otherwise, the **${winner.c.make} ${winner.c.model}** is the cheapest seat in the comparison.`
  } else if (runnerUp) {
    const gap = runnerUp.cost - winner.cost
    copy = `The **${winner.c.make} ${winner.c.model}** wins by **${fmtGBP(gap)}** over four years. It carries the lowest depreciation in the set and a reliability score that holds up under scrutiny.`
  } else {
    copy = `The **${winner.c.make} ${winner.c.model}** is the cheapest seat over four years.`
  }

  const recommendedReasons = [
    {
      label: 'Lowest four-year true cost at',
      value: fmtGBP(winner.cost),
    },
    {
      label: 'Reliability',
      value: winner.rel
        ? `${(winner.rel / 10).toFixed(1)}/10 — ${winner.rel >= 90 ? 'highest in this set' : winner.rel >= 85 ? 'strong' : 'fair'}`
        : 'No reliability data',
    },
    {
      label: 'Holds',
      value: `${Math.round(getRetainedAfter48Months(winner.c) * 100)}% of its value at 48 months`,
    },
  ]

  return {
    winnerIndex: winner.i,
    winnerCar: winner.c,
    headlineMetric: 'true four-year cost',
    copy,
    recommendedReasons,
  }
}
