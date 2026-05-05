// finance.jsx — Session 4
// Deep-link builders for the "Explore finance" module on CarPage.
// Conditionally rendered only for HP buyers (per Session 4 spec).
//
// Honest framing: cost panel uses real numbers from getYearOneCost.
// Partner buttons deep-link where supported, soft handoff otherwise.

function cleanPostcode(p) {
  return (p || '').replace(/\s+/g, '').toUpperCase()
}

// Zuto — supports vehicle deep-link via `?vehicle=` query param.
// User lands with car already filled in, just adds personal details.
// Hero CTA in the module.
function zutoUrl(car, answers) {
  const params = new URLSearchParams()
  const vehicle = [car.make, car.model].filter(Boolean).join(' ')
  if (vehicle) params.set('vehicle', vehicle)
  const pc = cleanPostcode(answers?.postcode)
  if (pc) params.set('postcode', pc)
  // Loan amount = effective price after deposit. getYearOneCost returns this
  // for HP, but to keep this file self-contained we don't import — the link
  // works without amount; Zuto's flow handles defaults.
  return `https://www.zuto.com/apply/?${params.toString()}`
}

// CarWow Finance — reachable via the CarWow car page. We pass make + model
// in the path; the user picks their finance flow on the page.
function carwowFinanceUrl(car) {
  const make  = (car.make || '').toLowerCase().replace(/\s+/g, '-')
  const model = (car.model || '').toLowerCase().split(' ')[0]
  return `https://www.carwow.co.uk/used-cars/${make}/${model}`
}

// Carmoola — landing-page handoff. No URL parameter pre-fill currently.
// Marked for swap when affiliate program is set up.
function carmoolaUrl() {
  return `https://www.carmoola.co.uk/get-started/`
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getFinanceHero(car, answers) {
  return {
    name: 'Zuto',
    label: 'Get a real quote',
    sub: 'Pre-fills car · soft credit search · no impact on score',
    url: zutoUrl(car, answers),
  }
}

export function getFinanceDirect(car, answers) {
  return [
    { id: 'carwow',   name: 'Carwow Finance', url: carwowFinanceUrl(car) },
    { id: 'carmoola', name: 'Carmoola',       url: carmoolaUrl() },
  ]
}

// Whether the module should render at all.
export function shouldShowFinance(answers) {
  const m = answers?.paymentMethod || answers?.purchaseMethod
  return [
    'Hire Purchase',
    'Hire Purchase (HP)',
    'Personal Contract Purchase (PCP)',
  ].includes(m)
}
