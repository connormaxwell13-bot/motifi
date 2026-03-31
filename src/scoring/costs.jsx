export function getRoadTax(car) {
  const fuel = (car.fuelType || '').toLowerCase()
  if (fuel.includes('electric')) return 0
  if (fuel.includes('hybrid')) return 95
  return 190
}

export function getInsuranceCostRange(car) {
  const bands = {
    Low: { min: 600, max: 900 },
    Medium: { min: 900, max: 1400 },
    High: { min: 1400, max: 2200 },
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
    total: Math.round(monthly * termMonths + deposit),
  }
}

export function getYearOneCost(car, answers) {
  const price = parseFloat(car.price) || 0
  const roadTax = getRoadTax(car)
  const insurance = getInsuranceCostRange(car)
  const purchaseMethod = answers.purchaseMethod || 'Cash'

  if (purchaseMethod === 'Cash' || purchaseMethod === 'Part exchange') {
    return {
      method: purchaseMethod,
      carPrice: price,
      roadTax,
      insuranceMin: insurance.min,
      insuranceMax: insurance.max,
      yearOneMin: Math.round(price + roadTax + insurance.min),
      yearOneMax: Math.round(price + roadTax + insurance.max),
      monthly: null,
    }
  }

  const deposit = parseFloat(answers.deposit) || Math.round(price * 0.10)
  const term = 48
  const finance = calculateFinance(price, deposit, term, 9.9)
  const monthlyInsurance = Math.round((insurance.min + insurance.max) / 2 / 12)
  const monthlyRoadTax = Math.round(roadTax / 12)
  const totalMonthly = finance.monthly + monthlyInsurance + monthlyRoadTax

  return {
    method: purchaseMethod,
    carPrice: price,
    deposit,
    financeMonthly: finance.monthly,
    roadTax,
    roadTaxMonthly: monthlyRoadTax,
    insuranceMin: insurance.min,
    insuranceMax: insurance.max,
    insuranceMonthly: monthlyInsurance,
    totalMonthlyMin: totalMonthly - 30,
    totalMonthlyMax: totalMonthly + 30,
    yearOneMin: Math.round(deposit + (finance.monthly * 12) + roadTax + insurance.min),
    yearOneMax: Math.round(deposit + (finance.monthly * 12) + roadTax + insurance.max),
    monthly: totalMonthly,
  }
}
