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
