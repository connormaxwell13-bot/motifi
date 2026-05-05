// retailers.jsx — Session 4
// Deep-link builders + deterministic listing estimates for the
// "Search available stock" module on CarPage.
//
// Counts are intentionally rough ("around 40+", "30+ near you") rather
// than precise — labelled as estimates in the UI. Replace with real API
// data when partner agreements land; only the helpers in this file
// need to change.

// ─── Deterministic count generation ──────────────────────────────────────────
// Hash the car's make + model so estimates are stable per car (don't change
// between page loads) and roughly plausible (popular makes appear more often).

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// Popularity multiplier — common makes have more listings.
// Calibrated against rough UK used market share. Unknown makes default to 1.0.
const POPULARITY = {
  Ford: 1.4, Volkswagen: 1.3, Vauxhall: 1.25, BMW: 1.2, Audi: 1.15,
  Toyota: 1.1, Mercedes: 1.1, Nissan: 1.05, Honda: 1.0, Hyundai: 0.95,
  Kia: 0.95, Renault: 0.9, Peugeot: 0.9, Citroen: 0.85, Skoda: 0.95,
  SEAT: 0.85, Mazda: 0.8, Volvo: 0.85, MINI: 0.9, Tesla: 0.85,
}

// Radius multiplier — estimates scale up with search radius.
function radiusMultiplier(radius) {
  const r = Number(radius)
  if (r >= 1500 || r === 1500) return 6.0  // nationwide
  if (r >= 100) return 4.0
  if (r >= 50)  return 2.5
  if (r >= 25)  return 1.5
  return 1.0  // 10mi
}

// Per-retailer base ranges. AutoTrader has the largest inventory in the UK
// used market by some margin; CarWow is dealer-quote led with smaller raw
// counts; Motors sits between.
const BASE_RANGES = {
  autotrader: { min: 15, max: 90 },
  carwow:     { min: 8,  max: 55 },
  motors:     { min: 10, max: 60 },
}

// Compute an estimated listing count for a (car, retailer, radius) combo.
// Stable per car — same input → same output, no random per-load drift.
function estimateCount(car, retailer, radius = 25) {
  const range = BASE_RANGES[retailer]
  if (!range) return null
  const seed = hashString(`${retailer}|${car.make}|${car.model}|${car.generationName}`)
  const span = range.max - range.min
  const base = range.min + (seed % span)
  const popMult = POPULARITY[car.make] ?? 1.0
  const radMult = radiusMultiplier(radius)
  return Math.round(base * popMult * radMult)
}

// Round to a chunky human-friendly number (e.g. 47 → "40+", 23 → "20+", 8 → "8").
function roundEstimate(n) {
  if (n < 10) return String(n)
  if (n < 50) return `${Math.floor(n / 10) * 10}+`
  if (n < 200) return `${Math.floor(n / 25) * 25}+`
  return `${Math.floor(n / 100) * 100}+`
}

// ─── Average price band (estimate-only) ──────────────────────────────────────
// Used as the "Avg. price" line on each retailer card. Same per-car stability
// as listing counts. Stays within ±8% of the car's representative price band.

function estimatePrice(car, retailer) {
  const seed = hashString(`p|${retailer}|${car.make}|${car.model}`)
  const lo = Number(car.priceLow) || 0
  const hi = Number(car.priceHigh) || lo
  if (!lo) return null
  const mid = (lo + hi) / 2
  // Each retailer has a slight bias — AutoTrader runs a touch higher, Motors
  // a touch lower. Plus deterministic noise within ±5%.
  const bias = retailer === 'autotrader' ? 1.02
             : retailer === 'motors'     ? 0.97
             : 1.00
  const noise = ((seed % 1000) / 1000 - 0.5) * 0.10  // ±5%
  return Math.round(mid * bias * (1 + noise) / 100) * 100
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getRetailerEstimate(car, retailer, radius = 25) {
  const raw   = estimateCount(car, retailer, radius)
  const price = estimatePrice(car, retailer)
  return {
    count: raw,
    countLabel: raw == null ? '—' : roundEstimate(raw),
    avgPrice: price,
  }
}

// ─── Deep-link builders ──────────────────────────────────────────────────────
// All three retailers support real URL parameters on their public search
// pages. Postcode + radius come from `answers`; make/model from the car.
// User lands on a real, pre-filled search at the partner.

function cleanPostcode(p) {
  return (p || '').replace(/\s+/g, '').toUpperCase()
}

function radiusValue(radius) {
  const r = Number(radius)
  if (!r) return 25
  if (r >= 1500) return 1500
  return r
}

export function buildRetailerUrl(retailer, car, answers) {
  const make    = encodeURIComponent(car.make || '')
  const model   = encodeURIComponent(car.model || '')
  const postcode = cleanPostcode(answers?.postcode)
  const radius  = radiusValue(answers?.searchRadius)
  const yearFrom = car.generationYears?.split(/[-–—]/)[0]?.trim() || ''
  const yearTo   = car.generationYears?.split(/[-–—]/)[1]?.trim() || ''

  if (retailer === 'autotrader') {
    // AutoTrader's car-search URL accepts make, model, postcode, radius,
    // and year range. Verified against current public URL shape.
    const params = new URLSearchParams({
      make: car.make || '',
      model: car.model || '',
      postcode,
      radius: String(radius),
    })
    if (yearFrom) params.set('year-from', yearFrom)
    if (yearTo)   params.set('year-to', yearTo)
    return `https://www.autotrader.co.uk/car-search?${params.toString()}`
  }

  if (retailer === 'carwow') {
    // CarWow's used-car browse takes make + model in the path.
    return `https://www.carwow.co.uk/used-cars/${(car.make || '').toLowerCase().replace(/\s+/g, '-')}/${(car.model || '').toLowerCase().split(' ')[0]}`
  }

  if (retailer === 'motors') {
    // Motors.co.uk uses query params; postcode + radius supported.
    const params = new URLSearchParams({
      make: car.make || '',
      model: car.model || '',
      postcode,
      radius: String(radius),
    })
    return `https://www.motors.co.uk/search/car/?${params.toString()}`
  }

  return '#'
}

// Convenience — get name + URL builder + colour token + estimate in one go.
// Used by CarPage to render the three cards in a tight loop.
export function getRetailerCards(car, answers) {
  return [
    {
      id: 'autotrader',
      name: 'AutoTrader',
      // Editorial brand colour — used as the card's accent stripe + headline.
      // Values picked to read on the dark Motifi page without clashing.
      accent: '#E84A1B',
      url: buildRetailerUrl('autotrader', car, answers),
      ...getRetailerEstimate(car, 'autotrader', answers?.searchRadius),
    },
    {
      id: 'carwow',
      name: 'CarWow',
      accent: '#FF8800',
      url: buildRetailerUrl('carwow', car, answers),
      ...getRetailerEstimate(car, 'carwow', answers?.searchRadius),
    },
    {
      id: 'motors',
      name: 'Motors.co.uk',
      accent: '#2EA8E0',
      url: buildRetailerUrl('motors', car, answers),
      ...getRetailerEstimate(car, 'motors', answers?.searchRadius),
    },
  ]
}
