// insurers.jsx — Session 4
// Deep-link builders for the "Get insured" module on CarPage.
//
// Editorial choice: ONE honest cost-band figure (from getInsuranceCostRange),
// surfaced with multiple deep-link CTAs. The brands are buttons — not
// per-carrier price quotes. We never claim "Admiral will quote you £X"
// because we can't know that without a real quote API.

import { getInsuranceCostRange } from './costs.jsx'

function cleanPostcode(p) {
  return (p || '').replace(/\s+/g, '').toUpperCase()
}

function yearFrom(car) {
  return car?.generationYears?.split(/[-–—]/)[0]?.trim() || ''
}

// Compare The Market — the only carrier-comparison destination that genuinely
// pre-fills vehicle details from URL params. Hero CTA in the module.
function compareTheMarketUrl(car, answers) {
  const params = new URLSearchParams()
  if (car.make)        params.set('make', car.make)
  if (car.model)       params.set('model', car.model)
  const yr = yearFrom(car)
  if (yr)              params.set('year', yr)
  const pc = cleanPostcode(answers?.postcode)
  if (pc)              params.set('postcode', pc)
  return `https://www.comparethemarket.com/car-insurance/?${params.toString()}`
}

// Direct insurer landing pages. Postcode pre-fill where supported.
// Aviva intentionally has no postcode param — their public flow doesn't
// accept one. We surface them anyway so users who specifically want them
// can click through; the call-out copy explains the limitation.

function admiralUrl(answers) {
  const pc = cleanPostcode(answers?.postcode)
  return pc
    ? `https://www.admiral.com/car-insurance?postcode=${pc}`
    : `https://www.admiral.com/car-insurance`
}

function avivaUrl() {
  return `https://www.aviva.co.uk/insurance/motor/car-insurance/`
}

function directLineUrl(answers) {
  const pc = cleanPostcode(answers?.postcode)
  return pc
    ? `https://www.directline.com/car-insurance?postcode=${pc}`
    : `https://www.directline.com/car-insurance`
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Estimated annual range — already correct, just re-exported here so CarPage
// only needs to import one module for the Insurance section.
export function getInsuranceEstimate(car) {
  const range = getInsuranceCostRange(car)
  return {
    min: range.min,
    max: range.max,
    band: car.insuranceBand,
  }
}

// Hero CTA — Compare The Market.
export function getInsuranceHero(car, answers) {
  return {
    name: 'Compare The Market',
    label: 'Compare quotes',
    sub: 'Pre-fills your car details · multi-carrier',
    url: compareTheMarketUrl(car, answers),
  }
}

// Three direct-carrier follow-ons.
export function getInsuranceDirect(car, answers) {
  return [
    { id: 'admiral',    name: 'Admiral',    url: admiralUrl(answers),    pcFill: !!answers?.postcode },
    { id: 'aviva',      name: 'Aviva',      url: avivaUrl(),             pcFill: false },
    { id: 'directline', name: 'Direct Line', url: directLineUrl(answers), pcFill: !!answers?.postcode },
  ]
}
