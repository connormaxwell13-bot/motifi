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
          <h4><span>On the road cost</span><span className="meta-pill">{isFinance ? 'Hire Purchase' : 'Cash'}</span></h4>
          {onRoadRows.map(r => (
            <div key={r.k} className="car-cost-row">
              <span className="k">{r.k}</span>
              <span className="v">{r.v}</span>
            </div>
          ))}
          <div className="car-cost-total">
            <span className="lab">Month 1 outlay</span>
            <span className="v">{fmtGBP(onRoadTotal)}</span>
          </div>
        </div>
        <div className="car-cost-col">
          <h4><span>Ownership cost</span><span className="meta-pill">48 months</span></h4>
          {ownershipRows.map(r => (
            <div key={r.k} className="car-cost-row">
              <span className="k">{r.k}</span>
              <span className="v">{r.v}</span>
            </div>
          ))}
          <div className="car-cost-row">
            <span className="k">Depreciation (4 years)</span>
            <span className="v">−{fmtGBP(ownershipDepreciation)}</span>
          </div>
          <div className="car-cost-row positive">
            <span className="k">↑ Est. resale value (48 months)</span>
            <span className="v">{fmtGBP(ownershipResale)}</span>
          </div>
          <div className="car-cost-total">
            <span className="lab">True 48-month cost</span>
            <span className="v">{fmtGBP(ownershipTotal)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Retailer module ─────────────────────────────────────────────────────────

function RetailerModule({ car, answers }) {
  const cards  = useMemo(() => getRetailerCards(car, answers), [car, answers])
  const radius = Number(answers?.searchRadius) || 25
  const radLabel = radius >= 1500 ? 'nationwide' : `within ${radius} miles`
  const postcode = (answers?.postcode || '').toUpperCase() || 'your area'

  return (
    <section className="car-section">
      <div className="car-section-head">
        <span className="num">§ 02</span>
        <h2>Search available stock</h2>
        <span className="count">3 retailers</span>
      </div>
      <p className="car-section-lede">
        Live listings near you. Estimates updated weekly — click through for the real count.
      </p>
      <div className="car-retailers">
        {cards.map(c => (
          
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="car-retailer-card"
            style={{ '--accent': c.accent }}
          >
            <div className="car-retailer-name" style={{ color: c.accent }}>{c.name}</div>
            <div className="car-retailer-count">{c.countLabel}</div>
            <div className="car-retailer-sub">listings {radLabel}</div>
            {c.avgPrice && (
              <div className="car-retailer-avg">Avg. price {fmtGBP(c.avgPrice)}</div>
            )}
            <div className="car-retailer-cta">
              Search {c.name}<span className="arrow" aria-hidden="true"></span>
            </div>
          </a>
        ))}
      </div>
      <div className="car-section-foot">
        Searching in {postcode} {radLabel}.
      </div>
    </section>
  )
}

// ─── Insurance module ────────────────────────────────────────────────────────

function InsuranceModule({ car, answers }) {
  const est    = getInsuranceEstimate(car)
  const hero   = getInsuranceHero(car, answers)
  const direct = getInsuranceDirect(car, answers)

  return (
    <section className="car-section">
      <div className="car-section-head">
        <span className="num">§ 03</span>
        <h2>Get insured</h2>
        <span className="count">{est.band} risk band</span>
      </div>

      <div className="car-insurance">
        <div className="car-insurance-cost">
          <div className="kicker">◆ Estimated annual insurance</div>
          <div className="range">
            <span className="lo">{fmtGBP(est.min)}</span>
            <span className="dash">–</span>
            <span className="hi">{fmtGBP(est.max)}</span>
          </div>
          <div className="disclaimer">
            Estimates based on this car's risk band. Your real quote depends on driver profile.
          </div>
        </div>

        <div className="car-insurance-cta">
          <a href={hero.url} target="_blank" rel="noopener noreferrer" className="btn lg primary-cta">
            <span>{hero.label} on {hero.name}</span>
            <span className="arrow" aria-hidden="true"></span>
          </a>
          <div className="car-insurance-cta-sub">{hero.sub}</div>

          <div className="car-insurance-direct">
            <span className="or">Or go direct:</span>
            {direct.map(d => (
              
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="car-insurance-direct-btn"
              >
                {d.name}
                {d.pcFill && <span className="pcfill">postcode pre-filled</span>}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Finance module (HP only) ────────────────────────────────────────────────

function FinanceModule({ car, answers, cy }) {
  const hero   = getFinanceHero(car, answers)
  const direct = getFinanceDirect(car, answers)

  const deposit  = cy?.deposit ?? Math.round(getRepresentativePrice(car) * 0.10)
  const monthly  = cy?.financeMonthly ?? 0
  const total    = deposit + (monthly * 48)

  return (
    <section className="car-section">
      <div className="car-section-head">
        <span className="num">§ 04</span>
        <h2>Explore finance</h2>
        <span className="count">9.9% APR · 48 months</span>
      </div>

      <div className="car-finance">
        <div className="car-finance-cost">
          <div className="kicker">◆ Estimated HP terms</div>
          <div className="row"><span className="k">Deposit (10%)</span><span className="v">{fmtGBP(deposit)}</span></div>
          <div className="row"><span className="k">Monthly</span><span className="v">{fmtGBP(monthly)} / mo</span></div>
          <div className="row total"><span className="k">Total over 48 months</span><span className="v">{fmtGBP(total)}</span></div>
          <div className="disclaimer">
            Real rates depend on your credit profile. Quote engines below run a soft search.
          </div>
        </div>

        <div className="car-finance-cta">
          <a href={hero.url} target="_blank" rel="noopener noreferrer" className="btn lg primary-cta">
            <span>{hero.label} on {hero.name}</span>
            <span className="arrow" aria-hidden="true"></span>
          </a>
          <div className="car-finance-cta-sub">{hero.sub}</div>

          <div className="car-finance-direct">
            <span className="or">Or try:</span>
            {direct.map(d => (
              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="car-finance-direct-btn">
                {d.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Known issues ────────────────────────────────────────────────────────────

function KnownIssuesModule({ car }) {
  const notes = parseNotes(car.notes)
  if (notes.length === 0) {
    return (
      <section className="car-section">
        <div className="car-section-head">
          <span className="num">§ 05</span>
          <h2>Known issues & history</h2>
          <span className="count">Clean</span>
        </div>
        <p className="car-section-lede">
          Nothing significant flagged on this generation. Standard pre-purchase
          inspection still recommended.
        </p>
      </section>
    )
  }

  return (
    <section className="car-section">
      <div className="car-section-head">
        <span className="num">§ 05</span>
        <h2>Known issues & history</h2>
        <span className="count">{notes.length} flag{notes.length === 1 ? '' : 's'}</span>
      </div>
      <p className="car-section-lede">
        Things to check before buying — sourced from owner forums and MOT data.
      </p>
      <div className="car-issues">
        {notes.map((n, i) => (
          <div key={i} className="car-issue-pill">
            <span className="warn" aria-hidden="true">⚠</span>
            <span>{n}</span>
            <span className="check">CHECK BEFORE BUYING</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Right rail — Price ──────────────────────────────────────────────────────

function PriceRail({
  car, answers, repPrice, cy, trueCost, resale, matchScore, isFinance,
  onSearchStock, onGetFinance, onGetInsurance,
}) {
  const monthly = isFinance && cy?.financeMonthly ? cy.financeMonthly : null
  const month1  = isFinance
    ? (cy.deposit + cy.financeMonthly + cy.insuranceMonthly + cy.roadTax)
    : null

  return (
    <div className="car-rail-block car-rail-price">
      <div className="car-rail-price-v">{fmtGBP(repPrice)}</div>
      <div className="car-rail-price-meta">
        Representative price · {car.generationYears?.split(/[-–—]/)[1]?.trim() || ''} · ~48,000 miles
      </div>

      <div className="car-rail-stats">
        <div className="row">
          <span className="k">Match score</span>
          <span className="v"><strong>{matchScore}</strong> / 100</span>
        </div>
        {monthly && (
          <div className="row">
            <span className="k">HP monthly</span>
            <span className="v"><strong>{fmtGBP(monthly)}</strong> / mo</span>
          </div>
        )}
        {month1 && (
          <div className="row">
            <span className="k">Month 1 outlay</span>
            <span className="v"><strong>{fmtGBP(month1)}</strong></span>
          </div>
        )}
        <div className="row">
          <span className="k">True 48-month cost</span>
          <span className="v"><strong>{fmtGBP(trueCost)}</strong></span>
        </div>
        <div className="row">
          <span className="k">Est. resale value</span>
          <span className="v positive"><strong>−{fmtGBP(resale)}</strong></span>
        </div>
      </div>

      <button className="btn lg" onClick={onSearchStock}>
        Search available stock<span className="arrow" aria-hidden="true"></span>
      </button>
      {onGetFinance && (
        <button className="btn ghost" onClick={onGetFinance}>
          Get finance quote<span className="arrow" aria-hidden="true"></span>
        </button>
      )}
      <button className="btn ghost" onClick={onGetInsurance}>
        Get insurance quote<span className="arrow" aria-hidden="true"></span>
      </button>
      <button
        className="btn ghost disabled"
        disabled
        title="Coming soon — sign in to save cars"
      >
        Save this car
      </button>
    </div>
  )
}

// ─── Right rail — Verdict ────────────────────────────────────────────────────

function VerdictRail({ car, matchScore }) {
  const rel = Number(car.reliabilityPct) || 0
  const dep = car.depreciationBand
  const reliabilityStrength = rel >= 90 ? 'excellent' : rel >= 85 ? 'strong' : rel >= 80 ? 'fair' : 'mixed'
  const depreciationLine = dep === 'Low'
    ? 'predictable running costs and strong residuals'
    : dep === 'Medium'
    ? 'middle-of-pack residuals'
    : 'higher-than-average value loss'

  return (
    <div className="car-rail-block car-rail-verdict">
      <div className="kicker">◆ Motifi verdict</div>
      <div className="score">{matchScore}</div>
      <p>
        The <strong>{car.make} {car.model}</strong> is a {reliabilityStrength} all-round
        performer in your search. {reliabilityStrength === 'excellent' ? 'Excellent' : reliabilityStrength === 'strong' ? 'Strong' : 'Workable'} reliability,
        and {depreciationLine}.
      </p>
      {parseNotes(car.notes).length > 0 && (
        <p className="muted">
          Check the known-issues panel below before pulling the trigger.
        </p>
      )}
    </div>
  )
}

// ─── Right rail — Other matches ──────────────────────────────────────────────

function OtherMatchesRail({ cars, onSelectCar }) {
  return (
    <div className="car-rail-block car-rail-others">
      <div className="kicker">◆ Your other matches</div>
      {cars.map((c, i) => {
        const score = Math.round((c.scores?.finalScore || 0) * 10)
        const price = getRepresentativePrice(c)
        return (
          <button
            key={`${c.make}-${c.model}-${i}`}
            className="car-rail-other"
            onClick={() => onSelectCar?.(c)}
          >
            <div className="name">{c.make} {c.model}</div>
            <div className="meta">{fmtGBP(price)} · {score}/100</div>
            <span className="go">View<span className="arrow" aria-hidden="true"></span></span>
          </button>
        )
      })}
    </div>
  )
}
