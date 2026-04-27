// oneliners.jsx
// Rule-based one-liner generator for ranks 4–10.
// Picks the car's single strongest attribute relative to the user and
// returns a short editorial sentence. Zero cost, deterministic, instant.
//
// Variety pass: when generating for an array of cars, if the same rule
// is about to fire on two consecutive rows we fall through to that
// car's next-best rule. Keeps determinism, kills visual repetition.
//
// Highlight markup: rule texts may include [mint:...] and [amber:...]
// tokens around spans the renderer should colour. The renderer in
// Results.jsx strips the tokens and applies span classes; consumers
// that don't render rich text will see plain bracketed text instead.
//   - [mint:...]  → positive numeric edges, savings, advantageous gaps
//   - [amber:...] → known issues, gotchas, costs to watch
// Unmarked text renders normally.

// Each rule returns { id, priority, text } if it applies, else null.
// id is used for variety-pass bookkeeping so two different rules can
// share text without colliding, and same-id rules dedupe as expected.
// Higher priority wins.

function ruleMpgStandout(car, answers) {
  if (car.mpgBand !== 'Excellent') return null
  const highMileage = ['5,000-8,000', '8,000+'].includes(answers.annualMileage)
  return {
    id: 'mpg',
    priority: highMileage ? 9 : 6,
    text: highMileage
      ? '[mint:Outstanding fuel economy] — pays back fast at your mileage.'
      : '[mint:Outstanding fuel economy] keeps running costs low.',
  }
}

function ruleReliabilityHighMileage(car, answers) {
  if (car.reliabilityBand !== 'Excellent') return null
  if (!['5,000-8,000', '8,000+'].includes(answers.annualMileage)) return null
  return {
    id: 'reliability-highmileage',
    priority: 9,
    text: '[mint:Proven reliability] — built for high-mileage driving.',
  }
}

function ruleSafetyMotorway(car, answers) {
  if (parseInt(car.ncapStars) < 5) return null
  if (answers.drivingContext !== 'Mostly motorway') return null
  return {
    id: 'safety-motorway',
    priority: 9,
    text: '[mint:5-star NCAP safety] — strong pick for motorway miles.',
  }
}

function ruleDepreciationPriority(car, answers) {
  if (car.depreciationBand !== 'Low') return null
  if (answers.priority !== 'Depreciation') return null
  return {
    id: 'depreciation-priority',
    priority: 9,
    text: '[mint:Holds value well] — resale-friendly if selling within 3 years.',
  }
}

function ruleInsuranceLow(car, answers) {
  if (car.insuranceBand !== 'Low') return null
  return {
    id: 'insurance-low',
    priority: 7,
    text: '[mint:Low insurance group] keeps running costs down.',
  }
}

function ruleBudgetHeadroom(car, answers) {
  const priceLow = parseFloat(car.priceLow) || 0
  const budgetMax = parseFloat(answers.budgetMax) || 0
  if (priceLow === 0 || budgetMax === 0) return null
  const headroom = (budgetMax - priceLow) / budgetMax
  if (headroom < 0.25) return null
  return {
    id: 'budget-headroom',
    priority: 7,
    text: '[mint:Comfortably within budget] — leaves room for a better trim or lower miles.',
  }
}

function ruleBootSpace(car, answers) {
  if (!answers.bootSpace || answers.bootSpace === 'No preference') return null
  const want = answers.bootSpace
  const has = car.bootBand
  if ((want === 'Large' || want === 'Very Large') &&
      (has === 'Large' || has === 'Very Large')) {
    return {
      id: 'boot-space',
      priority: 8,
      text: `[mint:Genuine ${has.toLowerCase()} boot] — practical day to day.`,
    }
  }
  return null
}

function ruleOwnershipEase(car, answers) {
  if (car.ownershipStress !== 'Low') return null
  if (car.reliabilityBand !== 'Excellent' && car.reliabilityBand !== 'Good') return null
  return {
    id: 'ownership-ease',
    priority: 6,
    text: '[mint:Low-stress ownership] — reliable and cheap to live with.',
  }
}

function ruleSafetyFamily(car, answers) {
  if (parseInt(car.ncapStars) < 5) return null
  if (parseFloat(car.ncapAdultPct) < 85) return null
  return {
    id: 'safety-family',
    priority: 6,
    text: '[mint:5-star safety] with strong adult protection scores.',
  }
}

function ruleCityParking(car, answers) {
  if (car.parkingSize !== 'Compact') return null
  if (answers.drivingContext !== 'Mostly city') return null
  return {
    id: 'city-parking',
    priority: 8,
    text: '[mint:Compact footprint] — easy to park in tight city spaces.',
  }
}

function ruleRuralBody(car, answers) {
  if (answers.drivingContext !== 'Mostly rural') return null
  if (!['SUV', 'Crossover', 'Estate'].includes(car.bodyType)) return null
  return {
    id: 'rural-body',
    priority: 7,
    text: `[mint:${car.bodyType} body] suits rural driving and rougher roads.`,
  }
}

function ruleEVUlez(car, answers) {
  if (car.fuelType !== 'Electric') return null
  return {
    id: 'ev-ulez',
    priority: 6,
    text: '[mint:Zero road tax], ULEZ-free, cheap to charge at home.',
  }
}

// Known-issues rule — fires when the dataset has flagged caveats for this
// car. Priority sits above the fallback and below the standout positives,
// so it surfaces only when nothing more flattering applies. Highlights the
// first issue in amber so the eye lands on the gotcha.
function ruleKnownIssue(car, answers) {
  const issues = Array.isArray(car.knownIssues) ? car.knownIssues : null
  if (!issues || issues.length === 0) return null
  // Skip the "no significant issues" sentinel some entries use.
  const first = issues[0] || ''
  if (/none significant/i.test(first)) return null
  return {
    id: 'known-issue',
    priority: 5,
    text: `Watch for [amber:${first}] — worth checking on inspection.`,
  }
}

// Per-car fallback — every car hits this at priority 1 so we never return "".
function ruleFallback(car, answers) {
  const score = Math.round((car.scores?.finalScore || 0) * 10)
  return {
    id: 'fallback',
    priority: 1,
    text: `Solid all-round match at [mint:${score}/100] based on your priorities.`,
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
  ruleKnownIssue,
  ruleFallback,
]

// Returns this car's ranked list of matching rules, highest priority first.
function rankedRulesFor(car, answers) {
  return RULES
    .map(rule => rule(car, answers))
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority)
}

// Single-car use: pick the top rule, ignore neighbours.
// Kept for any caller that isn't operating on an array.
export function generateOneLiner(car, answers) {
  const ranked = rankedRulesFor(car, answers)
  return ranked[0]?.text || 'Matches your priorities.'
}

// Multi-car variety pass: within a result set, if the previously-picked
// rule id is the same as this car's top rule id, fall through to that
// car's next-best rule. Preserves determinism (same input → same output)
// while breaking up visual repetition row-over-row.
//
// Returns an array of strings aligned 1:1 with the input `cars` array.
export function generateOneLiners(cars, answers) {
  const out = []
  let prevId = null
  for (const car of cars) {
    const ranked = rankedRulesFor(car, answers)
    // Find the first rule whose id differs from the previous car's rule.
    // Guarantee at least one by falling back to the top-ranked rule if
    // this car has no alternatives.
    let chosen = ranked.find(r => r.id !== prevId) || ranked[0]
    out.push(chosen?.text || 'Matches your priorities.')
    prevId = chosen?.id || prevId
  }
  return out
}
