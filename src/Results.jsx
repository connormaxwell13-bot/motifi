// Results.jsx — Session 2
// Editorial retreatment of the results page.
// Hero (#1) gets the rich treatment: rank, name, body silhouette,
// rep. price, "Why this wins" prose from /api/explain, two-column
// cost panel, known issues row, "Full review →" + "Compare top 3 →".
// Ranks 2–10 render as compact editorial rows with rule-based one-liners.
//
// Radar + 6-dim grid moved to CarPage in Session 4 (per session plan).

import { useState, useEffect, useRef } from 'react'
import TopNav from './TopNav'
import { generateOneLiners } from './scoring/oneliners.jsx'
import { getYearOneCost, getRepresentativePrice } from './scoring/costs.jsx'
import './design/tokens.css'
import './design/screens.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(n) {
  return '£' + Math.round(Number(n) || 0).toLocaleString('en-GB')
}

// Render a one-liner string with [mint:...] / [amber:...] markup tokens
// converted to coloured spans. Unmarked text renders plain.
function renderHighlights(text) {
  if (!text) return null
  const out = []
  let key = 0
  // Single regex covering both colours; capture group for the inner span text.
  const parts = text.split(/(\[(?:mint|amber):[^\]]+\])/g)
  for (const p of parts) {
    if (!p) continue
    const m = p.match(/^\[(mint|amber):([^\]]+)\]$/)
    if (m) {
      const [, colour, inner] = m
      out.push(<span key={key++} className={colour}>{inner}</span>)
    } else {
      out.push(<span key={key++}>{p}</span>)
    }
  }
  return out
}

// Same parser as ChatInterface — strips **bold** + *italic* markdown.
// Used to render Cooper's "Why this wins" paragraph from /api/explain.
function renderMarkdown(text) {
  if (!text) return null
  const out = []
  let key = 0
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g)
  for (const seg of boldSplit) {
    if (!seg) continue
    if (seg.startsWith('**') && seg.endsWith('**')) {
      out.push(<strong key={key++}>{seg.slice(2, -2)}</strong>)
    } else {
      const italSplit = seg.split(/(\*[^*]+\*)/g)
      for (const piece of italSplit) {
        if (!piece) continue
        if (piece.startsWith('*') && piece.endsWith('*')) {
          out.push(<em key={key++}>{piece.slice(1, -1)}</em>)
        } else {
          out.push(<span key={key++}>{piece}</span>)
        }
      }
    }
  }
  return out
}

// Build the read-only filter chip strip from Cooper's collected answers.
// Skips "No preference" values and empty strings — only meaningful
// constraints land on the recap.
function buildFilterChips(answers) {
  const chips = []
  if (answers.paymentMethod) {
    chips.push({ label: answers.paymentMethod, primary: true })
  }
  if (answers.budgetMin && answers.budgetMax) {
    const min = Math.round(answers.budgetMin / 1000)
    const max = Math.round(answers.budgetMax / 1000)
    chips.push({ label: `£${min}k–£${max}k budget`, primary: true })
  }
  if (answers.bodyType && answers.bodyType !== 'No preference') {
    chips.push({ label: answers.bodyType })
  }
  if (answers.fuelType && answers.fuelType !== 'No preference') {
    chips.push({ label: answers.fuelType })
  }
  if (answers.transmission && answers.transmission !== 'No preference') {
    chips.push({ label: answers.transmission })
  }
  if (answers.priority) {
    chips.push({ label: `Priority: ${answers.priority}` })
  }
  if (answers.ulezRequired === 'Yes') {
    chips.push({ label: 'ULEZ compliant' })
  }
  if (answers.drivingContext) {
    chips.push({ label: answers.drivingContext })
  }
  return chips
}

// Inline SVG car silhouette — fallback when imagin.studio isn't wired
// for a given make/model. Inherits currentColor so the editorial
// frame controls the tint.
const CAR_SILHOUETTE = (
  <svg viewBox="0 0 480 200" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 140 L70 90 L160 60 L300 60 L380 95 L440 110 L450 140" />
    <path d="M70 90 L100 110" />
    <path d="M100 110 L370 110" />
    <path d="M370 60 L370 110" />
    <path d="M220 60 L220 110" />
    <path d="M30 140 L450 140" />
    <circle cx="120" cy="150" r="22" fill="var(--bg)" />
    <circle cx="350" cy="150" r="22" fill="var(--bg)" />
    <circle cx="120" cy="150" r="22" />
    <circle cx="350" cy="150" r="22" />
    <circle cx="120" cy="150" r="9" />
    <circle cx="350" cy="150" r="9" />
  </svg>
)

// ─── Hero card (#1) ───────────────────────────────────────────────────────────

function HeroCard({ car, runnerUp, answers, explanation, loading, onSelectCar, onCompareTop }) {
  const costs = getYearOneCost(car, answers)
  const isFinance = ['Hire Purchase', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)']
    .includes(answers.paymentMethod || answers.purchaseMethod)
  const scorePct = Math.round((car.scores?.finalScore || 0) * 10)

  // Two-column cost panel data — derived from existing getYearOneCost.
  // Left: ON THE ROAD COST (Month 1 outlay). Right: OWNERSHIP COST (48m).
  const onRoadRows = isFinance
    ? [
        { k: 'Deposit (10%)',         v: fmtGBP(costs.deposit) },
        { k: 'First HP payment',      v: `${fmtGBP(costs.financeMonthly)} / mo` },
        { k: 'First insurance payment', v: `${fmtGBP(costs.insuranceMonthly)} / mo` },
        { k: 'Road tax (annual)',     v: costs.roadTax === 0 ? 'Free (EV)' : `${fmtGBP(costs.roadTax)} / yr` },
      ]
    : [
        { k: 'Car price',             v: fmtGBP(car.priceLow || 0) },
        { k: 'First insurance payment', v: `${fmtGBP(costs.insuranceMonthly)} / mo` },
        { k: 'Road tax (annual)',     v: costs.roadTax === 0 ? 'Free (EV)' : `${fmtGBP(costs.roadTax)} / yr` },
      ]
  const onRoadTotal = isFinance
    ? costs.deposit + costs.financeMonthly + costs.insuranceMonthly + costs.roadTax
    : (car.priceLow || 0) + costs.insuranceMonthly + costs.roadTax

  const ownershipRows = isFinance
    ? [
        { k: 'Deposit paid',          v: fmtGBP(costs.deposit) },
        { k: 'Total HP payments',     v: fmtGBP(costs.financeMonthly * 48) },
        { k: 'Insurance (48 months)', v: fmtGBP(costs.insuranceMonthly * 48) },
        { k: 'Road tax (4 years)',    v: fmtGBP(costs.roadTax * 4) },
      ]
    : [
        { k: 'Car price',             v: fmtGBP(car.priceLow || 0) },
        { k: 'Insurance (4 years)',   v: `${fmtGBP(costs.insuranceMin * 4)}–${fmtGBP(costs.insuranceMax * 4)}` },
        { k: 'Road tax (4 years)',    v: fmtGBP(costs.roadTax * 4) },
      ]
  const ownershipTotal = isFinance
    ? costs.deposit + (costs.financeMonthly * 48) + (costs.insuranceMonthly * 48) + (costs.roadTax * 4)
    : (car.priceLow || 0) + (costs.insuranceMin * 4) + (costs.roadTax * 4)

  // Try imagin.studio for this car; the silhouette is the fallback.
  const make = (car.make || '').toLowerCase()
  const modelFamily = (car.model || '').split(' ')[0].toLowerCase()
  const generationYear = car.generationYears?.split(/[—-]/)[0]?.trim() || '2022'
  const imgUrl = `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(modelFamily)}&modelYear=${generationYear}&angle=23&paintdescription=grey`

  const knownIssues = Array.isArray(car.knownIssues)
    ? car.knownIssues.filter(s => s && !/none significant/i.test(s))
    : []

  return (
    <div className="hero-card">
      <div className="hero-card-inner">
        <div className="hc-top">
          <span className="lab">◆ Best match · 01 of 10</span>
          <span className="score">{scorePct}/100</span>
        </div>

        <div className="hc-id">
          <div className="hc-id-l">
            <div className="hc-rank">01</div>
            <div>
              <div className="hc-id-meta">
                {car.make?.toUpperCase()} · {car.generationYears || ''} · {car.bodyType?.toUpperCase()}
              </div>
              <h2 className="hc-name">{car.model}</h2>
              <div className="hc-trim">
                {[car.generationName, car.fuelType, car.transmission,
                  answers.ulezRequired === 'Yes' ? 'ULEZ compliant' : null]
                  .filter(Boolean)
                  .map((t, i, arr) => (
                    <span key={i}>{t}{i < arr.length - 1 && <span className="sep" style={{ marginLeft: 10 }}>·</span>}</span>
                  ))}
              </div>
            </div>
          </div>
          <div className="hc-id-r">
            <img
              src={imgUrl}
              alt={`${car.make} ${car.model}`}
              onError={(e) => {
                // Replace broken img with the inline silhouette
                e.target.style.display = 'none'
                const fallback = e.target.nextSibling
                if (fallback) fallback.style.display = 'block'
              }}
            />
            <div style={{ display: 'none', width: '100%', height: '100%' }}>{CAR_SILHOUETTE}</div>
          </div>
        </div>

        <div className="hc-price">
          <span className="v">{fmtGBP(getRepresentativePrice(car))}</span>
          <span className="k">Rep. price</span>
        </div>

        <div className="hc-why">
          {loading ? (
            <span className="hc-why-loading">
              <span className="spinner" />
              Cooper's writing your verdict…
            </span>
          ) : (
            renderMarkdown(explanation || `**Why this wins.** Strong all-round match scoring ${scorePct}/100 against your priorities — ${answers.priority || 'overall value'} weighted highest.`)
          )}
        </div>

        <div className="hc-cost">
          <div className="hc-cost-col">
            <h4>
              <span>On the road cost</span>
              <span className="meta-pill">{isFinance ? 'Hire Purchase' : 'Cash'}</span>
            </h4>
            {onRoadRows.map(r => (
              <div key={r.k} className="hc-cost-row">
                <span className="hc-cost-k">{r.k}</span>
                <span className="hc-cost-v">{r.v}</span>
              </div>
            ))}
            <div className="hc-cost-total">
              <span className="lab">Month 1 outlay</span>
              <span className="v">{fmtGBP(onRoadTotal)}</span>
            </div>
          </div>

          <div className="hc-cost-col">
            <h4>
              <span>Ownership cost</span>
              <span className="meta-pill">48 months</span>
            </h4>
            {ownershipRows.map(r => (
              <div key={r.k} className="hc-cost-row">
                <span className="hc-cost-k">{r.k}</span>
                <span className="hc-cost-v">{r.v}</span>
              </div>
            ))}
            <div className="hc-cost-total">
              <span className="lab">True 48-month cost</span>
              <span className="v">{fmtGBP(ownershipTotal)}</span>
            </div>
          </div>
        </div>

        {knownIssues.length > 0 ? (
          <div className="hc-issues">
            <div className="hc-issues-lab">◆ Known issues<br />& history</div>
            <div className="hc-issues-pills">
              {knownIssues.map((issue, i) => (
                <span key={i} className="hc-issue-pill">{issue}</span>
              ))}
            </div>
            <div className="hc-actions">
              <button className="btn ghost" onClick={() => onSelectCar(car)}>
                Full review<span className="arrow" aria-hidden="true"></span>
              </button>
              <button className="btn" onClick={onCompareTop} disabled={!onCompareTop}>
                Compare top 3<span className="arrow" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        ) : (
          <div className="hc-no-issues">
            <button className="btn ghost" onClick={() => onSelectCar(car)}>
              Full review<span className="arrow" aria-hidden="true"></span>
            </button>
            <button className="btn" onClick={onCompareTop} disabled={!onCompareTop}>
              Compare top 3<span className="arrow" aria-hidden="true"></span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Compact row (#2 onwards) ─────────────────────────────────────────────────

function ScoreBar({ score }) {
  const filled = Math.round(score)
  return (
    <div className="bar">
      {Array.from({ length: 10 }).map((_, i) => (
        <i key={i} className={i < filled ? 'on' : ''} />
      ))}
    </div>
  )
}

function CompactRow({ rank, car, answers, oneLiner, onSelectCar }) {
  const costs = getYearOneCost(car, answers)
  const isFinance = ['Hire Purchase', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)']
    .includes(answers.paymentMethod || answers.purchaseMethod)
  const scorePct = Math.round((car.scores?.finalScore || 0) * 10)
  const true4yr = Math.round((getRepresentativePrice(car) + (costs.insuranceMin * 4) + (costs.roadTax * 4)) / 100) / 10

  return (
    <div className="tm-row" onClick={() => onSelectCar(car)} role="button" tabIndex={0}>
      <div className="tm-rank">{String(rank).padStart(2, '0')}</div>

      <div className="tm-id">
        <div className="tm-id-meta">
          {car.make?.toUpperCase()} · {car.generationYears || ''}
        </div>
        <h3 className="tm-id-name">{car.model}</h3>
        <div className="tm-id-trim">
          {car.generationName} · {car.transmission || ''}
        </div>
      </div>

      <div className="tm-price">
        <div className="v">{fmtGBP(getRepresentativePrice(car))}</div>
        {isFinance && <div className="mo">{fmtGBP(costs.financeMonthly)}/mo HP</div>}
        <div className="true">TRUE 4YR: £{true4yr.toFixed(1)}K</div>
      </div>

      <div className="tm-line">{renderHighlights(oneLiner)}</div>

      <div className="tm-score">
        <span className="num">
          <span className="v">{scorePct}</span>
          <span className="max">/100</span>
        </span>
        <ScoreBar score={car.scores?.finalScore || 0} />
      </div>
    </div>
  )
}

// ─── Main Results screen ──────────────────────────────────────────────────────

export default function Results({ results, answers, onBack, onSelectCar, onCompareTop, onHome, onCompare }) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading]         = useState(false)
  const topMatchesRef                 = useRef(null)

  // Fetch the rich "Why this wins" only for the hero. Ranks 2–10 are
  // rule-based via generateOneLiners — fast, deterministic, free.
  useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, results }),
    }).catch(() => {})

    const hero = results[0]
    if (!hero) return

    const runnerUp = results[1] || null

    setLoading(true)
    setExplanation('')
    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car: hero, runnerUp, answers }),
    })
      .then(r => r.text())
      .then(text => {
        try {
          const data = JSON.parse(text)
          setExplanation(data.explanation || '')
        } catch {
          setExplanation(text || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [results])

  // Empty state — no cars cleared the score threshold.
  if (!results || results.length === 0) {
    return (
      <div className="motifi-screen">
        <TopNav current="find" onHome={onHome} onStart={onBack} onCompare={onCompare} />
        <div className="no-results">
          <h1>No strong matches in your budget.</h1>
          <p>
            We couldn't find cars scoring 60% or higher for your priorities.
            Try widening your budget or relaxing filters — especially body type or fuel type.
          </p>
          <button className="btn lg" onClick={onBack}>
            Start again<span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    )
  }

  const hero = results[0]
  const runnerUp = results[1] || null
  const rest = results.slice(1)
  const filterChips = buildFilterChips(answers)

  // Smooth-scroll to "Your top matches" — the "Compare top 3" CTA on the
  // hero pre-fills CompareFlow so we don't anchor-scroll there. This is
  // unused in the wiring but kept for any future "see all matches" CTA.
  const scrollToList = () => {
    topMatchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // headlineCount — what the user reads as "Your N best matches".
  // Capped at 3 visually even though we surface up to 10 below.
  const headlineCount = Math.min(results.length, 3)

  return (
    <div className="motifi-screen">
      <TopNav
        current="find"
        onHome={onHome}
        onStart={onBack}
        onCompare={onCompare}
      />

      <div className="results-head">
        <div>
          <div className="results-kicker">◆ Your results · Generated just now</div>
          <h1 className="results-h1">
            Your <em>{headlineCount} best</em> matches,<br />
            with the full four-year cost.
          </h1>
        </div>
        <div className="results-meta">
          <span className="pill">
            <span className="dot" />
            {results.length} cars scored
          </span>
          <span>Scored across 6 dimensions</span>
          {answers.paymentMethod && answers.budgetMin && answers.budgetMax && (
            <span>
              {answers.paymentMethod} · £{Number(answers.budgetMin).toLocaleString()}–£{Number(answers.budgetMax).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {filterChips.length > 0 && (
        <div className="filters">
          {filterChips.map((c, i) => (
            <span
              key={i}
              className={'filter-chip' + (c.primary ? ' primary' : '')}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}

      <HeroCard
        car={hero}
        runnerUp={runnerUp}
        answers={answers}
        explanation={explanation}
        loading={loading}
        onSelectCar={onSelectCar}
        onCompareTop={results.length >= 2 ? onCompareTop : null}
      />

      {rest.length > 0 && (
        <div className="top-matches" ref={topMatchesRef}>
          <div className="tm-head">
            <h2 className="tm-h2">Your top matches <em>— worth seeing.</em></h2>
            <span className="tm-sort">Sort: Best match ↓</span>
          </div>
          {(() => {
            const oneLiners = generateOneLiners(rest, answers)
            return rest.map((car, i) => (
              <CompactRow
                key={`${car.make}-${car.model}-${i}`}
                rank={i + 2}
                car={car}
                answers={answers}
                oneLiner={oneLiners[i]}
                onSelectCar={onSelectCar}
              />
            ))
          })()}
        </div>
      )}
    </div>
  )
}
