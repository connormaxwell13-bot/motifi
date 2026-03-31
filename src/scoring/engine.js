function clamp(val, min = 0, max = 10) {
  return Math.min(max, Math.max(min, val))
}

function scoreBudgetFit(car, answers) {
  const budget = parseFloat(answers.budgetMax) || 0
  const price = parseFloat(car.price) || 0
  const ratio = price / budget

  let priceScore = 0
  if (ratio <= 0.70) priceScore = 10
  else if (ratio <= 0.80) priceScore = 9
  else if (ratio <= 0.90) priceScore = 8
  else if (ratio <= 1.00) priceScore = 7
  else if (ratio <= 1.10) priceScore = 4
  else priceScore = 0

  const depScores = { Low: 10, Medium: 6, High: 2 }
  const depScore = depScores[car.depreciationBand] || 5
  return clamp((0.70 * priceScore) + (0.30 * depScore))
}

function scoreDrivingFit(car, answers) {
  const seg = car.segment || ''
  const mpgAdjust = { Excellent: 1, 'Very Good': 1, Good: 0, Average: -1, Poor: -2 }
  const mpgAdj = mpgAdjust[car.mpgBand] || 0
  let base = 5

  if (answers.driving === 'Mostly city') {
    const urbanBase = { High: 10, Medium: 6, Low: 2 }
    base = urbanBase[car.urbanSuitability] || 5
    const segAdj = { Supermini: 1, 'Family Hatchback': 1, 'Compact SUV': 0, 'Large SUV': -2, Executive: -2, Van: -3 }
    base += (segAdj[seg] || 0)
  } else if (answers.driving === 'Mostly motorway') {
    const segBase = { Estate: 9, 'Family Saloon': 9, Executive: 9, 'Large SUV': 8, 'Family Hatchback': 7, 'Compact SUV': 7, Supermini: 4, MPV: 6, Van: 5 }
    base = segBase[seg] || 6
  } else if (answers.driving === 'Mostly rural') {
    const segBase = { 'Large SUV': 9, 'Compact SUV': 8, Estate: 8, 'Family Hatchback': 7, 'Family Saloon': 7, Supermini: 6, Executive: 6, Van: 7, MPV: 7 }
    base = segBase[seg] || 6
  } else {
    const segBase = { 'Family Hatchback': 9, 'Compact SUV': 8, Estate: 8, 'Family Saloon': 8, Supermini: 7, 'Large SUV': 6, Executive: 6, MPV: 6, Van: 4 }
    base = segBase[seg] || 6
    const urbanAdj = { High: 1, Medium: 0, Low: -1 }
    base += (urbanAdj[car.urbanSuitability] || 0)
  }
  return clamp(base + mpgAdj)
}

function scoreSpaceFit(car, answers) {
  const spaceScores = {
    'Just me / couple': { Small: 10, Medium: 9, Large: 7, 'Very Large': 5 },
    'Small family': { Small: 3, Medium: 7, Large: 9, 'Very Large': 10 },
    'Family + luggage': { Small: 1, Medium: 4, Large: 8, 'Very Large': 10 },
    'As much as possible': { Small: 0, Medium: 3, Large: 8, 'Very Large': 10 },
  }
  let score = (spaceScores[answers.space] || spaceScores['Just me / couple'])[car.bootSize] || 5
  const seg = car.segment || ''
  if (['Family + luggage', 'As much as possible'].includes(answers.space)) {
    if (['Estate', 'MPV', 'Large SUV'].includes(seg)) score += 1
    if (['Sports / Performance'].includes(seg)) score -= 2
  }
  return clamp(score)
}

function scoreRunningCost(car, answers) {
  const mpgScores = { Excellent: 10, 'Very Good': 8, Good: 6, Average: 4, Poor: 2 }
  const mpgScore = mpgScores[car.mpgBand] || 5
  const insScores = { Low: 10, Medium: 6, High: 3, 'Very High': 1 }
  const insScore = insScores[car.insuranceBand] || 5

  let mpgW = 0.5, insW = 0.5
  if (['Under 3,000', '3,000-5,000'].includes(answers.mileage)) { mpgW = 0.40; insW = 0.60 }
  else if (answers.mileage === '5,000-8,000') { mpgW = 0.50; insW = 0.50 }
  else if (answers.mileage === '8,000-15,000') { mpgW = 0.60; insW = 0.40 }
  else if (answers.mileage === '15,000+') { mpgW = 0.70; insW = 0.30 }
  return clamp((mpgW * mpgScore) + (insW * insScore))
}

function scoreOwnershipEase(car, answers) {
  const relScores = { '8-10': 10, '6-8': 7, '4-6': 4, '1-4': 1 }
  const relScore = relScores[car.reliabilityScore] || 5
  const stressScores = { Low: 10, Medium: 6, High: 2 }
  const stressScore = stressScores[car.ownershipStress] || 5

  if (answers.ulez === 'Yes') {
    const ulezScores = { High: 10, Medium: 5, Low: 0 }
    const ulezScore = ulezScores[car.ulezCompliance] || 5
    return clamp((0.50 * relScore) + (0.30 * stressScore) + (0.20 * ulezScore))
  }
  if (answers.reliability === 'Maximum reliability') return clamp((0.70 * relScore) + (0.30 * stressScore))
  if (answers.reliability === 'Balanced') return clamp((0.60 * relScore) + (0.40 * stressScore))
  return clamp((0.50 * relScore) + (0.50 * stressScore))
}

function scoreSafety(car) {
  const safetyScores = { '8-10': 10, '6-8': 7, '4-6': 4, '1-4': 1 }
  return clamp(safetyScores[car.safetyScore] || 5)
}

export function scoreAllCars(cars, answers) {
  let rcW = 0.15, drivW = 0.20
  if (answers.runningCosts === 'Not a concern') { rcW = 0.10; drivW = 0.25 }
  else if (answers.runningCosts === 'Somewhat important') { rcW = 0.20; drivW = 0.15 }
  else if (answers.runningCosts === 'Extremely important') { rcW = 0.25; drivW = 0.10 }

  return cars.map(car => {
    const budgetFit = scoreBudgetFit(car, answers)
    const drivingFit = scoreDrivingFit(car, answers)
    const spaceFit = scoreSpaceFit(car, answers)
    const runningFit = scoreRunningCost(car, answers)
    const ownershipFit = scoreOwnershipEase(car, answers)
    const safetyFit = scoreSafety(car)

    const finalScore = clamp(
      (0.25 * budgetFit) +
      (drivW * drivingFit) +
      (0.20 * spaceFit) +
      (rcW * runningFit) +
      (0.10 * ownershipFit) +
      (0.10 * safetyFit)
    )

    const bodySpaceConflict =
      answers.bodyType !== 'No preference' &&
      ['Hatchback', 'Saloon', 'Coupe'].includes(answers.bodyType) &&
      ['Family + luggage', 'As much as possible'].includes(answers.space)

    return {
      ...car,
      scores: { budgetFit, drivingFit, spaceFit, runningFit, ownershipFit, safetyFit, finalScore },
      bodySpaceConflict,
    }
  })
}
