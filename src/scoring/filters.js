export function applyHardFilters(cars, answers) {
  const budget = parseFloat(answers.budgetMax) || 0

  return cars.filter(car => {
    const price = parseFloat(car.price) || 0

    if (price > budget * 1.10) return false

    if (answers.transmission !== 'No preference') {
      const t = (car.transmission || '').toLowerCase()
      if (answers.transmission === 'Automatic' && !t.includes('automatic')) return false
      if (answers.transmission === 'Manual' && !t.includes('manual')) return false
    }

    if (answers.fuel !== 'No preference') {
      const f = (car.fuelType || '').toLowerCase()
      if (!f.includes(answers.fuel.toLowerCase())) return false
    }

    if (answers.ulez === 'Yes' && car.ulezCompliance === 'Low') return false

    if (answers.space === 'As much as possible' && car.bootSize === 'Small') return false

    if (answers.bodyType !== 'No preference') {
      const bt = (car.bodyType || '').toLowerCase()
      const want = answers.bodyType.toLowerCase()
      if (!bt.includes(want) && !want.includes(bt)) return false
    }

    return true
  })
}
