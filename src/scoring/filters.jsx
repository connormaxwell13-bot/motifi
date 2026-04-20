// filters.jsx
// Hard filters — binary pass/fail before scoring.
// Cars that fail any filter are excluded entirely.
// Called by App.jsx getTop3() and by ChatInterface before scoring.

export function applyHardFilters(cars, answers) {
  const budgetMax = parseFloat(answers.budgetMax) || 0
  const budgetMin = parseFloat(answers.budgetMin) || 0

  return cars.filter(car => {
    const priceLow  = parseFloat(car.priceLow)  || 0
    const priceHigh = parseFloat(car.priceHigh) || priceLow

    // 1. Budget maximum — cheapest examples must be within budget
    if (priceLow > budgetMax) return false

    // 2. Budget minimum — exclude cars entirely below what user wants to spend
    if (budgetMin > 0 && priceHigh < budgetMin) return false

    // 3. Transmission
    if (answers.transmission && answers.transmission !== 'No preference') {
      const carTrans = (car.transmission || '').trim()
      if (carTrans !== 'Both' && carTrans !== answers.transmission) return false
    }

    // 4. Fuel type — generation must offer the preferred fuel
    if (answers.fuelType && answers.fuelType !== 'No preference') {
      const carFuels = (car.fuelType || '')
        .split(',')
        .map(f => f.trim().toLowerCase())
      const wanted = answers.fuelType.toLowerCase()
      if (!carFuels.some(f => f.includes(wanted))) return false
    }

    // 5. Body type — exact match if preference given
    if (answers.bodyType && answers.bodyType !== 'No preference') {
      if ((car.bodyType || '').trim() !== answers.bodyType.trim()) return false
    }

    // 6. Boot space — user wants AT LEAST this size
    if (answers.bootSpace && answers.bootSpace !== 'No preference') {
      const bootOrder = ['Small', 'Medium', 'Large', 'Very Large']
      const carIdx    = bootOrder.indexOf(car.bootBand)
      const wantedIdx = bootOrder.indexOf(answers.bootSpace)
      if (carIdx === -1 || carIdx < wantedIdx) return false
    }

    // 7. ULEZ — hard requirement if user needs compliance
    if (answers.ulezRequired === 'Yes' && car.ulezCompliant !== 'Yes') return false

    return true
  })
}
