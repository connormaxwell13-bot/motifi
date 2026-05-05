// CarPage.jsx — Session 4
// Editorial per-car detail page.
//
// Layout (desktop, ~1280px):
//   ┌───────────────────────────────────────────────────────────────┐
//   │ TopNav                                                        │
//   ├───────────────────────────────────────────────────────────────┤
//   │ ← Back / Your results / VW Golf 1.5 TSI                       │
//   │                                                               │
//   │ ┌─────────────────────────────────────┐  ┌──────────────────┐ │
//   │ │ ◆ MAKE · YEARS · BODY              │  │ £10,995          │ │
//   │ │                                     │  │ £228/mo HP       │ │
//   │ │ Volkswagen Golf 1.5 TSI            │  │                  │ │
//   │ │ trim line · capability chips       │  │ Match score 93   │ │
//   │ │                                     │  │ Month 1   £1,412 │ │
//   │ │ 93                                  │  │ 4-yr cost £15.1k │ │
//   │ │ MOTIFI SCORE / 100                  │  │ Resale    £7,800 │ │
//   │ │                                     │  │                  │ │
//   │ │ [imagin photo]                      │  │ [Search stock]   │ │
//   │ │                                     │  │ [Get finance]    │ │
//   │ │                                     │  │ [Save this car]  │ │
//   │ └─────────────────────────────────────┘  │                  │ │
//   │                                          │ ◆ MOTIFI VERDICT │ │
//   │ § 01 · Cost breakdown                    │ 93 / prose       │ │
//   │ § 02 · Search available stock            │                  │ │
//   │ § 03 · Get insured                       │ ◆ OTHER MATCHES  │ │
//   │ § 04 · Explore finance (HP only)         │ mini cards…      │ │
//   │ § 05 · Known issues & history            │                  │ │
//   │                                          └──────────────────┘ │
//   └───────────────────────────────────────────────────────────────┘

import { useEffect, useMemo, useRef, useState } from 'react'
import TopNav from './TopNav'
import {
  getYearOneCost,
  getRepresentativePrice,
  getResaleValue48m,
  getDepreciation48m,
  getTrue48MonthCost,
  getInsuranceCostRange,
} from './scoring/costs.jsx'
import { getRetailerCards } from './scoring/retailers.jsx'
import {
  getInsuranceEstimate,
  getInsuranceHero,
  getInsuranceDirect,
} from './scoring/insurers.jsx'
import {
  getFinanceHero,
  getFinanceDirect,
  shouldShowFinance,
} from './scoring/finance.jsx'
import './design/tokens.css'
import './design/screens.css'

const fmtGBP = (n) => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB')

// Imagin URL — same pattern used elsewhere across the app.
function imaginUrl(car) {
  const make    = (car?.make || '').toLowerCase()
  const family  = (car?.model || '').split(' ')[0].toLowerCase()
  const year    = car?.generationYears?.split(/[—-]/)[0]?.trim() || '2022'
  return `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(family)}&modelYear=${year}&angle=23&paintdescription=grey`
}

// Parse the dataset's notes field — comma/period separated lists of caveats —
// into individual chips. The dataset's notes look like:
//   "Timing chain (1.6 TDCi). Power steering pump. Avoid pre-2010 1.6 diesel."
// Split on sentence boundaries, drop empties, dedupe.
function parseNotes(notes) {
  if (!notes || typeof notes !== 'string') return []
  return notes
    .split(/\.\s*|;\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !/^none\s+significant/i.test(s))
}

// Capability chips derived from the car. Tier-A reliability when reliabilityPct
// >= 90, Tier B 85-90, Tier C below. NCAP year banded for honesty.
function capabilityChips(car) {
  const out = []
  if (car.ulezCompliant === 'Yes') out.push('ULEZ compliant')

  const stars = Number(car.ncapStars)
  const ncapYr = car.ncapYear
  if (stars && ncapYr) out.push(`${stars}-star NCAP ${ncapYr}`)
  else if (stars)      out.push(`${stars}-star NCAP`)

  const rel = Number(car.reliabilityPct)
  if (rel >= 90)      out.push('Reliability tier A')
  else if (rel >= 85) out.push('Reliability tier B')
  else if (rel)       out.push('Reliability tier C')

  return out
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function CarPage({
  car,
  answers,
  results,
  fromResults,
  onBack,
  onHome,
  onCompare,
  onSelectCar,
}) {
  if (!car) return null

  const repPrice = getRepresentativePrice(car)
  const cy       = getYearOneCost(car, answers || {})
  const resale   = getResaleValue48m(car)
  const trueCost = getTrue48MonthCost(car, answers || {})
  const matchScore = Math.round((car.scores?.finalScore || 0) * 10)
  const isFinance  = shouldShowFinance(answers)
  const showFinanceModule = isFinance

  // Anchors for in-page nav from the right rail
  const stockRef    = useRef(null)
  const insuranceRef = useRef(null)
  const financeRef  = useRef(null)

  function scrollTo(ref) {
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="motifi-screen car">
      <TopNav
        current="find"
        onHome={onHome}
        onStart={() => onHome?.()}
        onCompare={onCompare}
      />

      {/* Breadcrumb */}
      <div className="car-crumb">
        <button className="car-crumb-back" onClick={onBack}>
          <span className="arrow back" aria-hidden="true"></span> Back to results
        </button>
        <span className="sep">/</span>
        <span className="muted">{fromResults ? 'Your results' : 'Compare'}</span>
        <span className="sep">/</span>
        <span>{car.make} {car.model}</span>
      </div>

      <div className="car-layout">
        {/* ─── Main column ─────────────────────────────────────────────── */}
        <main className="car-main">
          <CarHeader car={car} matchScore={matchScore} />

          <CostBreakdown car={car} answers={answers} cy={cy} />

          <div ref={stockRef}>
            <RetailerModule car={car} answers={answers} />
          </div>

          <div ref={insuranceRef}>
            <InsuranceModule car={car} answers={answers} />
          </div>

          {showFinanceModule && (
            <div ref={financeRef}>
              <FinanceModule car={car} answers={answers} cy={cy} />
            </div>
          )}

          <KnownIssuesModule car={car} />
        </main>

        {/* ─── Right rail ──────────────────────────────────────────────── */}
        <aside className="car-rail">
          <PriceRail
            car={car}
            answers={answers}
            repPrice={repPrice}
            cy={cy}
            trueCost={trueCost}
            resale={resale}
            matchScore={matchScore}
            isFinance={isFinance}
            onSearchStock={() => scrollTo(stockRef)}
            onGetFinance={isFinance ? () => scrollTo(financeRef) : null}
            onGetInsurance={() => scrollTo(insuranceRef)}
          />

          <VerdictRail car={car} matchScore={matchScore} />

          {fromResults && results?.length > 1 && (
            <OtherMatchesRail
              cars={results.filter(c =>
                `${c.make}|${c.model}|${c.generationName}` !==
                `${car.make}|${car.model}|${car.generationName}`
              ).slice(0, 4)}
              onSelectCar={onSelectCar}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function CarHeader({ car, matchScore }) {
  const chips = capabilityChips(car)
  return (
    <section className="car-hero">
      <div className="car-hero-l">
        <div className="car-hero-meta">
          ◆ {(car.make || '').toUpperCase()} · {car.generationYears || ''} · {(car.bodyType || '').toUpperCase()}
        </div>
        <h1 className="car-hero-h1">
          {car.make} {car.model}
        </h1>
        <div className="car-hero-trim">
          {[car.generationName, car.fuelType, car.transmission].filter(Boolean).join(' · ')}
        </div>
        <div className="car-hero-chips">
          {chips.map((c, i) => (
            <span key={i} className="car-cap-chip">{c}</span>
          ))}
        </div>
        <div className="car-hero-score">
          <span className="v">{matchScore}</span>
          <span className="k">Motifi score<br />/ 100</span>
        </div>
      </div>
      <div className="car-hero-r">
        <div className="car-hero-photo">
          <img
            src={imaginUrl(car)}
            alt={`${car.make} ${car.model}`}
            onError={(e) => { e.currentTarget.style.opacity = '0.15' }}
          />
        </div>
      </div>
    </section>
  )
}

// ─── Cost breakdown ──────────────────────────────────────────────────────────

function CostBreakdown({ car, answers, cy }) {
  const isFinance = ['Hire Purchase', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)']
    .includes(answers?.paymentMethod || answers?.purchaseMethod)

  const onRoadRows = isFinance
    ? [
        { k: 'Deposit (10%)',           v: fmtGBP(cy.deposit) },
        { k: 'First HP payment',        v: `${fmtGBP(cy.financeMonthly)} / mo` },
        { k: 'First insurance payment', v: `${fmtGBP(cy.insuranceMonthly)} / mo` },
        { k: 'Road tax (annual)',       v: cy.roadTax === 0 ? 'Free (EV)' : `${fmtGBP(cy.roadTax)} / yr` },
      ]
    : [
        { k: 'Car price',               v: fmtGBP(cy.effectivePrice ?? getRepresentativePrice(car)) },
        { k: 'Insurance (annual est.)', v: `${fmtGBP(cy.insuranceMin)}–${fmtGBP(cy.insuranceMax)} / yr` },
        { k: 'Road tax (annual)',       v: cy.roadTax === 0 ? 'Free (EV)' : `${fmtGBP(cy.roadTax)} / yr` },
      ]
  const onRoadTotal = isFinance
    ? cy.deposit + cy.financeMonthly + cy.insuranceMonthly + cy.roadTax
    : (cy.effectivePrice ?? getRepresentativePrice(car)) + ((cy.insuranceMin + cy.insuranceMax) / 2 / 12) + cy.roadTax

  const ownershipRows = isFinance
    ? [
        { k: 'Deposit paid',          v: fmtGBP(cy.deposit) },
        { k: 'Total HP payments',     v: fmtGBP(cy.financeMonthly * 48) },
        { k: 'Insurance (48 months)', v: fmtGBP(cy.insuranceMonthly * 48) },
        { k: 'Road tax (4 years)',    v: fmtGBP(cy.roadTax * 4) },
      ]
    : [
        { k: 'Car price',             v: fmtGBP(cy.effectivePrice ?? getRepresentativePrice(car)) },
        { k: 'Insurance (4 years)',   v: `${fmtGBP(cy.insuranceMin * 4)}–${fmtGBP(cy.insuranceMax * 4)}` },
        { k: 'Road tax (4 years)',    v: fmtGBP(cy.roadTax * 4) },
      ]
  const ownershipDepreciation = getDepreciation48m(car)
  const ownershipResale       = getResaleValue48m(car)
  const ownershipTotal        = getTrue48MonthCost(car, answers || {})

  return (
    <section className="car-section">
      <div className="car-section-head">
        <span className="num">§ 01</span>
        <h2>Cost breakdown</h2>
        <span className="count">{onRoadRows.length + ownershipRows.length + 2} lines</span>
      </div>
      <div className="car-cost">
        <div className="car-cost-col">
          <h4><span>On the road cost</span><span className="meta-pill">{isFinance ? 'Hire Purchase' : 'Ca
