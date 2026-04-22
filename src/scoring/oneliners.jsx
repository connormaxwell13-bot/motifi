// oneliners.jsx
// Rule-based one-liner generator for ranks 4–10.
// Picks the car's single strongest attribute relative to the user and
// returns a short editorial sentence. Zero cost, deterministic, instant.

// Each rule returns { priority, text } if it applies, else null.
// Higher priority wins. Priority roughly = "how relevant this is given answers".

function ruleMpgStandout(car, answers) {
  if (car.mpgBand !== 'Excellent') return null
  const highMileage = ['5,000-8,000', '8,000+'].includes(answers.annualMileage)
  return {
    priority: highMileage ? 9 : 6,
    text: highMileage
      ? 'Outstanding fuel economy — pays back fast at your mileage.'
      : 'Outstanding fuel economy keeps running costs low.',
  }
}

function ruleReliabilityHighMileage(car, answers) {
  if (car.reliabilityBand !== 'Excellent') return null
  if (!['5,000-8,000', '8,000+'].includes(answers.annualMileage)) return null
  return {
    priority: 9,
    text: 'Proven reliability track record — built for high-mileage driving.',
  }
}

function ruleSafetyMotorway(car, answers) {
  if (parseInt(car.ncapStars) < 5) return null
  if (answers.drivingContext !== 'Mostly motorway') return null
  return {
    priority: 9,
    text: '5-star NCAP safety — strong pick for motorway miles.',
  }
}

function ruleDepreciationPriority(car, answers) {
  if (car.depreciationBand !== 'Low') return null
  if (answers.priority !== 'Depreciation') return null
  return {
    priority: 9,
    text: 'Holds value well — resale-friendly if selling within 3 years.',
  }
}

function ruleInsuranceLow(car, answers) {
  if (car.insuranceBand !== 'Low') return null
  return { priority: 7, text: 'Low insurance group keeps running costs down.' }
}

function ruleBudgetHeadroom(car, answers) {
  const priceLow = parseFloat(car.priceLow) || 0
  const budgetMax = parseFloat(answers.budgetMax) || 0
  if (priceLow === 0 || budgetMax === 0) return null
  const headroom = (budgetMax - priceLow) / budgetMax
  if (headroom < 0.25) return null
  return {
    priority: 7,
    text: 'Comfortably within budget — leaves room for a better trim or lower miles.',
  }
}

function ruleBootSpace(car, answers) {
  if (!answers.bootSpace || answers.bootSpace === 'No preference') return null
  const want = answers.bootSpace
  const has = car.bootBand
  if ((want === 'Large' || want === 'Very Large') &&
      (has === 'Large' || has === 'Very Large')) {
    return { priority: 8, text: `Genuine ${has.toLowerCase()} boot — practical day to day.` }
  }
  return null
}

function ruleOwnershipEase(car, answers) {
  if (car.ownershipStress !== 'Low') return null
  if (car.reliabilityBand !== 'Excellent' && car.reliabilityBand !== 'Good') return null
  return { priority: 6, text: 'Low-stress ownership — reliable and cheap to live with.' }
}

function ruleSafetyFamily(car, answers) {
  if (parseInt(car.ncapStars) < 5) return null
  if (parseFloat(car.ncapAdultPct) < 85) return null
  return { priority: 6, text: '5-star safety with strong adult protection scores.' }
}

function ruleCityParking(car, answers) {
  if (car.parkingSize !== 'Compact') return null
  if (answers.drivingContext !== 'Mostly city') return null
  return { priority: 8, text: 'Compact footprint — easy to park in tight city spaces.' }
}

function ruleRuralBody(car, answers) {
  if (answers.drivingContext !== 'Mostly rural') return null
  if (!['SUV', 'Crossover', 'Estate'].includes(car.bodyType)) return null
  return { priority: 7, text: `${car.bodyType} body suits rural driving and rougher roads.` }
}

function ruleEVUlez(car, answers) {
  if (car.fuelType !== 'Electric') return null
  return { priority: 6, text: 'Zero road tax, ULEZ-free, cheap to charge at home.' }
}

// Fallback — every car has a score, so at minimum we say something honest.
function ruleFallback(car, answers) {
  const score = Math.round((car.scores?.finalScore || 0) * 10)
  return {
    priority: 1,
    text: `Solid all-round match at ${score}/100 based on your priorities.`,
  }
}

const RULES = [
  ruleMpgStandout,
  ruleReliabilityHighMileage,
  ruleSafetyMotorway,
  ruleDepreciationPriority,
  ruleInsuranceLow,
  ruleBudgetHeadroom,
  ruleBootSpace,
  ruleOwnershipEase,
  ruleSafetyFamily,
  ruleCityParking,
  ruleRuralBody,
  ruleEVUlez,
  ruleFallback,
]

export function generateOneLiner(car, answers) {
  const hits = RULES
    .map(rule => rule(car, answers))
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority)
  return hits[0]?.text || 'Matches your priorities.'
}
