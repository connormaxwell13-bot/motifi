// engine.jsx
// Scoring engine v2.0
// Scores cars across six weighted dimensions. Does NOT filter — call
// applyHardFilters() from filters.jsx first, then pass the result here.
// App.jsx already does this in getTop3(). ChatInterface does it too.

function clamp(val, min = 0, max = 10) {
  return Math.min(max, Math.max(min, val))
}

// ─── 1. BUDGET FIT (base weight 25%) ─────────────────────────────────────────
// Scores what proportion of the car's price range the user can access.
// priceLow = AutoTrader 10th percentile. priceHigh = 90th percentile.

function scoreBudget(car, answers) {
  const priceLow  = parseFloat(car.priceLow)  || 0
  const priceHigh = parseFloat(car.priceHigh) || priceLow
  const budgetMax = parseFloat(answers.budgetMax) || 0
  const range     = Math.max(priceHigh - priceLow, 1)
  const coverage  = (budgetMax - priceLow) / range

  if (coverage >= 1.00) return 10  // Can afford the full range
  if (coverage >= 0.75) return 9
  if (coverage >= 0.50) return 7
  if (coverage >= 0.25) return 5
  return 3                          // Barely above entry point
}

// ─── 2. DRIVING CONTEXT FIT (base weight 15%) ────────────────────────────────
// Uses parkingSize, mpgBand, bodyType and safety depending on driving context.

function scoreDrivingContext(car, answers) {
  const ctx = answers.drivingContext

  if (ctx === 'Mostly city') {
    const parkScores = { Compact: 10, Standard: 6, Large: 2 }
    return clamp(parkScores[car.parkingSize] || 5)
  }

  if (ctx === 'Mostly motorway') {
    const mpgScores = { Excellent: 10, 'Very Good': 8, Good: 6, Average: 4, Poor: 2 }
    const mpgScore  = mpgScores[car.mpgBand] || 5
    const safety    = scoreNcap(car)
    return clamp((0.70 * mpgScore) + (0.30 * safety))
  }

  if (ctx === 'Mostly rural') {
    const bodyScores = {
      SUV: 10, Crossover: 9, Estate: 8,
      Saloon: 6, Hatchback: 6, MPV: 5,
      Van: 4, Coupe: 3,
    }
    return clamp(bodyScores[car.bodyType] || 5)
  }

  // Mixed — balanced parkingSize + mpgBand
  const parkScores = { Compact: 10, Standard: 8, Large: 5 }
  const mpgScores  = { Excellent: 10, 'Very Good': 8, Good: 6, Average: 4, Poor: 2 }
  return clamp((0.50 * (parkScores[car.parkingSize] || 6)) + (0.50 * (mpgScores[car.mpgBand] || 5)))
}

// ─── 3. RUNNING COST FIT (base weight 20%) ───────────────────────────────────
// MPG and insurance band weighted by annual mileage.
// High mileage = MPG matters more. Low mileage = insurance dominates.

function scoreRunningCost(car, answers) {
  const mpgScores = { Excellent: 10, 'Very Good': 8, Good: 6, Average: 4, Poor: 2 }
  const insScores = { Low: 10, Medium: 7, High: 4, 'Very High': 1 }
  const mpgScore  = mpgScores[car.mpgBand]      || 5
  const insScore  = insScores[car.insuranceBand] || 5

  const weights = {
    'Under 3,000': { mpg: 0.20, ins: 0.80 },
    '3,000-5,000': { mpg: 0.35, ins: 0.65 },
    '5,000-8,000': { mpg: 0.55, ins: 0.45 },
    '8,000+':      { mpg: 0.75, ins: 0.25 },
  }
  const w = weights[answers.annualMileage] || { mpg: 0.50, ins: 0.50 }
  return clamp((w.mpg * mpgScore) + (w.ins * insScore))
}

// ─── 4. OWNERSHIP EASE (base weight 15%) ─────────────────────────────────────
// Reliability band + ownership stress. Reliability weight increases at high mileage.

function scoreOwnershipEase(car, answers) {
  const relScores    = { Excellent: 10, Good: 7, Fair: 4, Poor: 1 }
  const stressScores = { Low: 10, Medium: 7, High: 4, 'Very High': 1 }
  const relScore     = relScores[car.reliabilityBand]    || 5
  const stressScore  = stressScores[car.ownershipStress] || 5

  let relW = 0.60, stressW = 0.40
  if (answers.annualMileage === '8,000+')           { relW = 0.75; stressW = 0.25 }
  else if (answers.annualMileage === '5,000-8,000') { relW = 0.65; stressW = 0.35 }

  return clamp((relW * relScore) + (stressW * stressScore))
}

// ─── 5. SAFETY (base weight 15%, 20% for motorway drivers) ───────────────────
// Euro NCAP stars (60%) + adult occupant percentage (40%).

function scoreNcap(car) {
  const starScores = { 5: 10, 4: 8, 3: 5, 2: 3, 1: 1 }
  const starScore  = starScores[parseInt(car.ncapStars)] ?? 5

  const adultPct = parseFloat(car.ncapAdultPct) || 0
  let adultScore = 5
  if (adultPct >= 90)      adultScore = 10
  else if (adultPct >= 80) adultScore = 8
  else if (adultPct >= 70) adultScore = 6
  else if (adultPct >= 60) adultScore = 4
  else                     adultScore = 2

  return clamp((0.60 * starScore) + (0.40 * adultScore))
}

// ─── 6. DEPRECIATION (base weight 10%) ───────────────────────────────────────
// How well the car holds value. Low base weight — most buyers overlook this.
// The priority question boosts it for users who care.

function scoreDepreciation(car) {
  const depScores = { Low: 10, Medium: 6, High: 2 }
  return clamp(depScores[car.depreciationBand] || 5)
}

// ─── DYNAMIC WEIGHTS ─────────────────────────────────────────────────────────
// Base weights sum to 1.00. All adjustments are zero-sum.

function getWeights(answers) {
  const w = {
    budget:       0.25,
    driving:      0.15,
    running:      0.20,  // raised from v1: fuel + insurance are most visible costs
    ownership:    0.15,
    safety:       0.15,
    depreciation: 0.10,  // lowered from v1: least front-of-mind at purchase
  }

  // Priority: +10% to chosen dimension, -5% each from two others
  if (answers.priority === 'MPG') {
    w.running      += 0.10
    w.depreciation -= 0.05
    w.ownership    -= 0.05
  } else if (answers.priority === 'Reliability') {
    w.ownership    += 0.10
    w.running      -= 0.05
    w.depreciation -= 0.05
  } else if (answers.priority === 'Depreciation') {
    w.depreciation += 0.10
    w.running      -= 0.05
    w.ownership    -= 0.05
  }

  // Motorway driving: safety matters more at speed
  if (answers.drivingContext === 'Mostly motorway') {
    w.safety  += 0.05
    w.driving -= 0.05
  }

  return w
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
// Accepts a pre-filtered array of cars (run applyHardFilters first).
// Returns scored array sorted highest first.

export function scoreAllCars(cars, answers) {
  const weights = getWeights(answers)

  return cars
    .map(car => {
      const budgetScore       = scoreBudget(car, answers)
      const drivingScore      = scoreDrivingContext(car, answers)
      const runningScore      = scoreRunningCost(car, answers)
      const ownershipScore    = scoreOwnershipEase(car, answers)
      const safetyScore       = scoreNcap(car)
      const depreciationScore = scoreDepreciation(car)

      const finalScore = clamp(
        (weights.budget       * budgetScore)       +
        (weights.driving      * drivingScore)      +
        (weights.running      * runningScore)      +
        (weights.ownership    * ownershipScore)    +
        (weights.safety       * safetyScore)       +
        (weights.depreciation * depreciationScore)
      )

      return {
        ...car,
        scores: {
          budgetScore,
          drivingScore,
          runningScore,
          ownershipScore,
          safetyScore,
          depreciationScore,
          finalScore,
          weights,
        },
      }
    })
    .sort((a, b) => b.scores.finalScore - a.scores.finalScore)
}
// Append to end of engine.jsx

// ─── TOP MATCHES ─────────────────────────────────────────────────────────────
// Returns up to maxResults cars scoring at least minScore/10.
// minScore is on the 0–10 internal scale. UI shows /100, so 6.0 = 60/100.
// If fewer cars pass the threshold, returns what we have (including 0).

export function getTopMatches(cars, answers, { maxResults = 10, minScore = 6.0 } = {}) {
  const scored = scoreAllCars(cars, answers)
  return scored
    .filter(car => car.scores.finalScore >= minScore)
    .slice(0, maxResults)
}
