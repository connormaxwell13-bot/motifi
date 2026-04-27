import React, { useState } from 'react'
import carsData from './data/cars.json'
import { questions } from './questions.jsx'
import { applyHardFilters } from './scoring/filters.jsx'
import { scoreAllCars, getTopMatches } from './scoring/engine.jsx'
import { generateOneLiners } from './scoring/oneliners.jsx'
import { getYearOneCost } from './scoring/costs.jsx'
import ChatInterface from './ChatInterface'
import TopNav from './TopNav'
import './design/tokens.css'
import './design/home.css'

function RadarChart({ scores }) {
  const cx = 110, cy = 110, maxR = 85
  const axes = [
    { label: 'Budget', key: 'budgetScore', angle: 0 },
    { label: 'Driving', key: 'drivingScore', angle: 60 },
    { label: 'Running', key: 'runningScore', angle: 120 },
    { label: 'Safety', key: 'safetyScore', angle: 180 },
    { label: 'Deprec.', key: 'depreciationScore', angle: 240 },
    { label: 'Ownership', key: 'ownershipScore', angle: 300 },
  ]
  function pt(angle, r) {
    const rad = (angle - 90) * Math.PI / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const dataPoints = axes.map(a => pt(a.angle, (scores[a.key] / 10) * maxR))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'
  return (
    <svg viewBox="0 0 220 220" width="180" height="180" style={{ display: 'block', margin: '0 auto 16px' }}>
      {[0.25, 0.5, 0.75, 1].map(lv => {
        const pts = axes.map(a => pt(a.angle, maxR * lv))
        return <path key={lv} d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'} fill="none" stroke="rgba(168,184,204,0.15)" strokeWidth="1" />
      })}
      {axes.map(a => { const [x, y] = pt(a.angle, maxR); return <line key={a.key} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(168,184,204,0.15)" strokeWidth="1" /> })}
      <path d={dataPath} fill="rgba(0,200,150,0.18)" stroke="#00C896" strokeWidth="2" strokeLinejoin="round" />
      {dataPoints.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#00C896" />)}
      {axes.map(a => {
        const [x, y] = pt(a.angle, maxR + 18); return (
          <g key={a.key}>
            <text x={x} y={y - 4} textAnchor="middle" fontSize="9" fill="rgba(168,184,204,0.7)" fontFamily="Satoshi,sans-serif" fontWeight="600">{a.label.toUpperCase()}</text>
            <text x={x} y={y + 8} textAnchor="middle" fontSize="11" fill="#00C896" fontFamily="Satoshi,sans-serif" fontWeight="700">{scores[a.key]?.toFixed(1)}</text>
          </g>
        )
      })}
    </svg>
  )
}

const C = {
  midnight: '#0F1D35',
  navy: '#1A2E50',
  teal: '#00C896',
  offwhite: '#F5F7FA',
  muted: '#A8B8CC',
  dim: '#4A6080',
  white: '#FFFFFF',
}

function getTopForUser(answers) {
  const filtered = applyHardFilters(carsData, answers)
  return getTopMatches(filtered, answers, { maxResults: 10, minScore: 6.0 })
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [selectedCar, setSelectedCar] = useState(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState([])

  const visibleQuestions = questions.filter(q => !q.showIf || q.showIf(answers))
  const current = visibleQuestions[step]
  const progress = (step / visibleQuestions.length) * 100

  function handleAnswer(value) {
    setAnswers(prev => ({ ...prev, [current.id]: value }))
  }

  function handleNext() {
    if (step < visibleQuestions.length - 1) {
      setStep(s => s + 1)
    } else {
      setResults(getTopForUser(answers))
      setScreen('results')
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
    else setScreen('home')
  }

  function canProceed() {
    if (current.optional) return true
    if (current.type === 'budget') return answers.budgetMin && answers.budgetMax
    if (current.type === 'deposit') return answers.deposit
    if (current.type === 'email') return true
    return answers[current.id] !== undefined && answers[current.id] !== ''
  }

  function startOver() {
    setStep(0)
    setAnswers({})
    setScreen('home')
  }

  function handleChatResults({ results, answers }) {
    setResults(results)
    setAnswers(answers)
    setScreen('results')
  }

  if (screen === 'home') return <Home onStart={() => setScreen('questions')} onCompare={() => setScreen('compare')} />
  if (screen === 'results') return <Results results={results} answers={answers} onBack={startOver} onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }} />
  if (screen === 'car') return <CarPage car={selectedCar} answers={answers} onBack={() => setScreen('results')} />
  if (screen === 'compare') return <CompareFlow onBack={() => setScreen('home')} onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }} />
  if (screen === 'questions') return <ChatInterface onResults={handleChatResults} />

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.midnight, minHeight: '100vh', color: C.offwhite }}>
      <nav style={{ backgroundColor: C.navy, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={startOver}>
          Mo<span style={{ color: C.teal }}>ti</span>fi
        </div>
        <div style={{ fontSize: '13px', color: C.muted }}>{step + 1} of {visibleQuestions.length}</div>
      </nav>
      <div style={{ height: '3px', backgroundColor: C.navy }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: C.teal, transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px' }}>
        {current.dataOnly && (
          <div style={{ display: 'inline-block', backgroundColor: C.navy, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '500', color: C.teal, letterSpacing: '0.05em', marginBottom: '20px' }}>
            FOR PERSONALISATION ONLY
          </div>
        )}
        <h2 style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1.3', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {current.question}
        </h2>
        {current.hint && (
          <p style={{ fontSize: '14px', color: C.muted, marginBottom: '32px', lineHeight: '1.6' }}>{current.hint}</p>
        )}
        <div style={{ marginTop: current.hint ? '0' : '32px' }}>
          {current.type === 'single' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {current.options.map(opt => {
                const selected = answers[current.id] === opt
                return (
                  <button key={opt} onClick={() => handleAnswer(opt)} style={{ backgroundColor: selected ? C.teal : C.navy, color: selected ? C.midnight : C.offwhite, border: `1.5px solid ${selected ? C.teal : '#2A4060'}`, borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: selected ? '700' : '400', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}
          {current.type === 'text' && (
            <input type="text" placeholder={current.placeholder} value={answers[current.id] || ''} onChange={e => handleAnswer(e.target.value)} style={{ width: '100%', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
          )}
          {current.type === 'email' && (
            <input type="email" placeholder={current.placeholder} value={answers.email || ''} onChange={e => handleAnswer(e.target.value)} style={{ width: '100%', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
          )}
          {current.type === 'budget' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[{ key: 'budgetMin', label: 'Minimum budget', placeholder: '5000' }, { key: 'budgetMax', label: 'Maximum budget', placeholder: '15000' }].map(({ key, label, placeholder }) => (
                <div key={key} style={{ flex: '1', minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: C.muted, marginBottom: '8px', fontWeight: '500' }}>{label}</label>
                  <input type="number" placeholder={placeholder} value={answers[key] || ''} onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))} style={{ width: '100%', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          )}
          {current.type === 'deposit' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: C.muted, marginBottom: '8px', fontWeight: '500' }}>Deposit amount (£)</label>
              <input type="number" placeholder="e.g. 2000" value={answers.deposit || ''} onChange={e => setAnswers(prev => ({ ...prev, deposit: e.target.value }))} style={{ width: '100%', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <button onClick={handleBack} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '14px 24px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
            Back
          </button>
          <button onClick={handleNext} disabled={!canProceed()} style={{ backgroundColor: canProceed() ? C.teal : C.navy, color: canProceed() ? C.midnight : C.dim, border: 'none', borderRadius: '10px', padding: '14px 32px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: '700', cursor: canProceed() ? 'pointer' : 'not-allowed', transition: 'all 0.15s ease' }}>
            {step === visibleQuestions.length - 1 ? 'Find my car' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Home ──────────────────────────────────────────────────────────────────
// Editorial landing page — the "Issue № 01 · Buy Better" treatment.
// 6 sections: hero · §01 true cost · §02 tools · §03 dataset · §04 manifesto · CTA + footer
// All styles live in src/design/home.css, scoped under .motifi-home.

function imaginUrl(make, modelFamily, year = 2022, angle = 23) {
  return `https://cdn.imagin.studio/getimage?customer=img&make=${make}&modelFamily=${modelFamily}&modelYear=${year}&angle=${angle}&paintdescription=grey`
}

function fmtGBP(n) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

// Body-type silhouettes — inline SVG, inherit currentColor from .ds-silh.
const SILHOUETTE_HATCHBACK = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26 L10 18 L22 12 L40 10 L52 10 L68 19 L82 21 L84 26" /><path d="M22 12 L32 18" /><path d="M32 18 L52 18" /><path d="M52 18 L52 10" /><path d="M32 10 L32 18" /><path d="M4 26 L84 26" /><circle cx="22" cy="28" r="4" fill="#FFFFFF" /><circle cx="68" cy="28" r="4" fill="#FFFFFF" /><circle cx="22" cy="28" r="4" /><circle cx="68" cy="28" r="4" /></svg>`
const SILHOUETTE_SUV = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22 L8 10 L20 6 L68 6 L80 10 L86 14 L86 22" /><path d="M20 6 L26 14" /><path d="M26 14 L68 14" /><path d="M68 6 L68 14" /><path d="M44 6 L44 14" /><path d="M4 22 L86 22" /><circle cx="22" cy="26" r="6" fill="#FFFFFF" /><circle cx="68" cy="26" r="6" fill="#FFFFFF" /><circle cx="22" cy="26" r="6" /><circle cx="68" cy="26" r="6" /><circle cx="22" cy="26" r="2.5" /><circle cx="68" cy="26" r="2.5" /></svg>`
const SILHOUETTE_SALOON = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 26 L8 22 L20 14 L40 10 L58 10 L70 16 L86 20 L88 26" /><path d="M20 14 L26 18" /><path d="M26 18 L58 18" /><path d="M58 10 L58 18" /><path d="M40 10 L40 18" /><path d="M2 26 L88 26" /><circle cx="18" cy="28" r="4" fill="#FFFFFF" /><circle cx="72" cy="28" r="4" fill="#FFFFFF" /><circle cx="18" cy="28" r="4" /><circle cx="72" cy="28" r="4" /></svg>`
const SILHOUETTE_EV = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26 C 10 22, 14 18, 28 12 C 42 8, 56 8, 68 12 C 78 16, 82 20, 86 26" /><path d="M28 12 C 34 16, 38 18, 44 18 L 60 18 C 64 18, 68 16, 68 12" /><path d="M4 26 L86 26" /><circle cx="20" cy="28" r="4.5" fill="#FFFFFF" /><circle cx="70" cy="28" r="4.5" fill="#FFFFFF" /><circle cx="20" cy="28" r="4.5" /><circle cx="70" cy="28" r="4.5" /><path d="M45 4 L41 10 L47 10 L43 16" stroke="#007A57" stroke-width="1.8" fill="none" /></svg>`
const SILHOUETTE_CITY = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 26 L26 20 L30 10 L56 10 L62 20 L68 22 L68 26" /><path d="M30 10 L36 20" /><path d="M36 20 L56 20" /><path d="M56 10 L56 20" /><path d="M22 26 L68 26" /><circle cx="30" cy="28" r="4" fill="#FFFFFF" /><circle cx="60" cy="28" r="4" fill="#FFFFFF" /><circle cx="30" cy="28" r="4" /><circle cx="60" cy="28" r="4" /></svg>`

function Home({ onStart, onCompare }) {
  // Editorial worked example — VW Polo. Keeps the hero photo and §01 ledger
  // tied together thematically, as in the design prototype.
  const costBreakdown = [
    { label: 'Purchase (cash or finance)', value: 12044, kind: 'add' },
    { label: 'Insurance — 48 months',       value: 4032,  kind: 'add' },
    { label: 'Road tax + servicing',        value: 2240,  kind: 'add' },
    { label: 'Fuel at 8,000 mi/yr',         value: 4600,  kind: 'add' },
    { label: 'Projected resale at 48m',     value: -7800, kind: 'sub' },
  ]
  const trueCost = costBreakdown.reduce((a, r) => a + r.value, 0)
  const maxAbs   = Math.max(...costBreakdown.map(r => Math.abs(r.value)))

  // Clicking the wordmark from Home = scroll to top (we're already on Home).
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="motifi-home">
      <TopNav
        current="home"
        onHome={scrollTop}
        onStart={onStart}
        onCompare={onCompare}
      />

      {/* HERO — editorial variant ============================== */}
      <section className="hero">
        <div className="hero-kicker">
          <span className="dot" aria-hidden="true"></span>
          <span>Motifi · Spring 2026</span>
          <span className="sep">·</span>
          <span>Independent since 2024</span>
        </div>

        <div className="hero-ed-grid">
          <div className="hero-ed-left">
            <div className="hero-issue">Issue № 01 · Buy Better</div>
            <h1>
              The <em>true cost</em><br />
              of car ownership,<br />
              all in one place.
            </h1>
            <p className="hero-lede">
              Four years of finance, insurance, tax, servicing, fuel, and
              projected resale — the numbers most websites won't show you —
              on every car worth buying. <b>Free, forever, for the person
              actually paying for it.</b>
            </p>
            <div className="hero-cta">
              <button className="btn primary lg" onClick={onStart}>
                Find My Car<span className="arrow" aria-hidden="true"></span>
              </button>
              <button className="btn ghost lg" onClick={onCompare}>
                Compare<span className="arrow" aria-hidden="true"></span>
              </button>
            </div>
            <div className="hero-footnote">
              <span className="mono">01 —</span> Start with Cooper, our search assistant, or put cars head-to-head yourself.
            </div>
          </div>

          <div className="hero-ed-right">
            <div className="hero-photo-frame">
              <div className="hero-photo-tag">◆ THIS MONTH'S PICK</div>
              <div className="hero-photo-inner">
                <img
                  src={imaginUrl('volkswagen', 'polo', 2021, 23)}
                  alt="Volkswagen Polo 1.0 TSI"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
              <div className="hero-photo-foot">
                <div>
                  <div className="hpf-brand">VOLKSWAGEN</div>
                  <div className="hpf-name">Polo 1.0 TSI</div>
                </div>
                <div className="hpf-cost">
                  <div className="hpf-k">True 4yr cost</div>
                  <div className="hpf-v">£15,116</div>
                </div>
              </div>
            </div>
            <div className="hero-photo-caption">
              <span className="mono">FIG. 01</span>
              Hatchback · Petrol · £10,495 sticker.
              The honest number is below. We've done this 353 times.
            </div>
          </div>
        </div>

        <div className="hero-rule-stats">
          <div><span className="rs-k">Cars vetted</span><span className="rs-v">353</span></div>
          <div><span className="rs-k">Metrics / car</span><span className="rs-v">48</span></div>
          <div><span className="rs-k">Affiliate links</span><span className="rs-v">Zero</span></div>
          <div><span className="rs-k">Cost to use</span><span className="rs-v">£0</span></div>
        </div>
      </section>

      {/* §01 — TRUE COST (band-light) ============================ */}
      <div className="band-light">
        <section className="section tc-section">
          <div className="section-head">
            <div>
              <div className="tag">◆ §01 · The method</div>
              <h2>The sticker is <em>half the story.</em></h2>
            </div>
            <div className="tc-lede">
              <p>Every car you look at online is priced for the moment you drive away. Motifi
                calculates the <b>four-year true cost</b> — what the car actually takes from your
                account once you've finished paying for it, insured it, taxed it, serviced it,
                fuelled it, and sold it on.</p>
            </div>
          </div>

          <div className="tc-layout">
            <div className="tc-ledger">
              <div className="tc-ledger-head">
                <span>LEDGER</span>
                <span className="tc-ledger-car">VOLKSWAGEN POLO 1.0 TSI · 2021</span>
              </div>
              {costBreakdown.map((r, i) => {
                const pct = Math.abs(r.value) / maxAbs * 100
                return (
                  <div key={i} className={'tc-row ' + r.kind}>
                    <div className="tc-lab">
                      <span className="tc-idx">{String(i + 1).padStart(2, '0')}</span>
                      <span>{r.label}</span>
                    </div>
                    <div className="tc-bar"><i style={{ width: pct + '%' }}></i></div>
                    <div className={'tc-val ' + (r.value < 0 ? 'neg' : '')}>
                      {r.value < 0 ? '−' : ''}{fmtGBP(Math.abs(r.value))}
                    </div>
                  </div>
                )
              })}
              <div className="tc-row total">
                <div className="tc-lab">
                  <span className="tc-idx">=</span>
                  <span><b>True four-year cost</b></span>
                </div>
                <div className="tc-bar"></div>
                <div className="tc-val big">{fmtGBP(trueCost)}</div>
              </div>
            </div>

            <div className="tc-aside">
              <div className="tc-aside-head">◆ What this changes</div>
              <div className="tc-aside-row">
                <div className="tc-aside-n">+£4,621</div>
                <div className="tc-aside-t">
                  <b>Hidden cost</b> vs the asking price. The Polo costs £15,116 to own — not £10,495.
                </div>
              </div>
              <div className="tc-aside-row">
                <div className="tc-aside-n">3 / 10</div>
                <div className="tc-aside-t">
                  <b>Cheapest on paper rarely wins.</b> In our dataset, only three of every ten
                  bargains stay bargains once you run them for four years.
                </div>
              </div>
              <div className="tc-aside-row">
                <div className="tc-aside-n">£0</div>
                <div className="tc-aside-t">
                  <b>What we charge you.</b> Motifi is free. No pay-walls, no sponsored
                  rankings, no dealer fees passed back.
                </div>
              </div>
              <button className="btn ghost" onClick={onCompare}>
                See a full comparison<span className="arrow" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* §02 — TWO TOOLS ========================================= */}
      <section className="section tools-v2">
        <div className="tv2-head">
          <div>
            <div className="tag">◆ §02 · What you'll use</div>
            <h2>Two ways in.<br /><em>One honest answer.</em></h2>
          </div>
          <div className="tv2-lede">
            <p>Describe your life to <b>Cooper</b> and get a shortlist, or drop cars you're already
              considering into <b>Compare</b> and watch the data decide. Both roads lead to the same
              place: a car that actually fits your wallet and your week.</p>
          </div>
        </div>

        <div className="tv2-row-ab">
          {/* PLATE 01 — Cooper chat */}
          <div className="tv2-plate tv2-plate-cooper" onClick={onStart} role="button" tabIndex={0}>
            <div className="tv2-top">
              <div className="tv2-top-l">
                <span className="idx">01</span>
                <span className="tag">Find My Car</span>
              </div>
              <span className="live"><span className="blink" aria-hidden="true"></span>Try it</span>
            </div>
            <div className="tv2-cooper-intro">
              <h3>Talk to <em>Cooper</em>, not a filter wall.</h3>
              <p>Three minutes of natural conversation. No sliders, no 40-box forms. Cooper weighs
                your priorities and hands back a shortlist ranked by fit.</p>
            </div>
            <div className="tv2-cooper-win">
              <div className="tv2-cwin-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="title">cooper · session #26,431</span>
              </div>
              <div className="tv2-cwin-body">
                <div className="tv2-msg tv2-msg-cooper">
                  <span className="av">C</span>
                  <div className="body">
                    <div className="name">Cooper</div>
                    What's the car for?
                  </div>
                </div>
                <div className="tv2-msg tv2-msg-you">"Daily commute. Mostly rural, some M4. Wife, dog, no kids yet."</div>
                <div className="tv2-msg tv2-msg-cooper">
                  <span className="av">C</span>
                  <div className="body">
                    <div className="name">Cooper</div>
                    Got it. Budget?
                  </div>
                </div>
                <div className="tv2-chips">
                  <span className="tv2-chip">Under £8k</span>
                  <span className="tv2-chip selected">£10–14k</span>
                  <span className="tv2-chip">£14–20k</span>
                  <span className="tv2-chip">£20k+</span>
                </div>
                <div className="tv2-msg tv2-msg-you">"£12k-ish. Open to electric if the sums work."</div>
                <div className="tv2-typing"><i></i><i></i><i></i></div>
                <div className="tv2-result">
                  <div className="tv2-result-head">
                    <span className="lab">◆ Shortlist ready</span>
                    <span className="count">7 of 353</span>
                  </div>
                  <div className="tv2-result-cars">
                    <div className="tv2-result-car">
                      <div className="im"><img src={imaginUrl('volkswagen', 'polo', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                      <div className="nm">Polo 1.0</div>
                    </div>
                    <div className="tv2-result-car">
                      <div className="im"><img src={imaginUrl('renault', 'zoe', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                      <div className="nm">Zoe R110</div>
                    </div>
                    <div className="tv2-result-car">
                      <div className="im"><img src={imaginUrl('opel', 'corsa', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                      <div className="nm">Corsa-e</div>
                    </div>
                    <div className="tv2-result-car">
                      <div className="im"><img src={imaginUrl('ford', 'fiesta', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                      <div className="nm">Fiesta 1.0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tv2-cooper-foot">
              <span>~3 min · natural language · free</span>
              <span className="go">Start with Cooper<span className="arrow" aria-hidden="true"></span></span>
            </div>
          </div>

          {/* PLATE 02 — Compare diff */}
          <div className="tv2-plate tv2-plate-compare" onClick={onCompare} role="button" tabIndex={0}>
            <div className="tv2-top">
              <div className="tv2-top-l">
                <span className="idx">02</span>
                <span className="tag">Compare</span>
              </div>
              <span className="tag">48 metrics · 2–4 cars</span>
            </div>
            <div className="tv2-compare-intro">
              <h3>Put them <em>head-to-head</em>.</h3>
              <p>Every row scored, every winner highlighted, every loser dimmed. An opinionated
                verdict at the bottom — maths, not marketing copy.</p>
            </div>
            <div className="tv2-cmp">
              <div className="tv2-cmp-heads">
                <div>&nbsp;</div>
                <div className="car">
                  <div className="im"><img src={imaginUrl('volkswagen', 'polo', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                  <div className="nm">Polo 1.0 TSI</div>
                </div>
                <div className="car">
                  <div className="im"><img src={imaginUrl('opel', 'corsa', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                  <div className="nm">Corsa 1.2</div>
                </div>
                <div className="car">
                  <div className="im"><img src={imaginUrl('ford', 'fiesta', 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                  <div className="nm">Fiesta 1.0</div>
                </div>
              </div>
              <div className="tv2-cmp-row">
                <div className="lbl">4-yr true cost</div>
                <div className="cell best"><span className="v">£15,116</span><span className="pill">Best</span></div>
                <div className="cell worst"><span className="v">£16,842</span><span className="pill">Worst</span></div>
                <div className="cell"><span className="v">£15,410</span></div>
              </div>
              <div className="tv2-cmp-row">
                <div className="lbl">Reliability</div>
                <div className="cell"><span className="v">8.5 / 10</span></div>
                <div className="cell"><span className="v">7.8 / 10</span></div>
                <div className="cell best"><span className="v">8.7 / 10</span><span className="pill">Best</span></div>
              </div>
              <div className="tv2-cmp-row">
                <div className="lbl">Real-world MPG</div>
                <div className="cell"><span className="v">49 mpg</span></div>
                <div className="cell best"><span className="v">52 mpg</span><span className="pill">Best</span></div>
                <div className="cell"><span className="v">48 mpg</span></div>
              </div>
              <div className="tv2-cmp-row">
                <div className="lbl">Boot (litres)</div>
                <div className="cell"><span className="v">351 L</span></div>
                <div className="cell"><span className="v">309 L</span></div>
                <div className="cell worst"><span className="v">292 L</span><span className="pill">Worst</span></div>
              </div>
              <div className="tv2-verdict">
                <span className="lab">◆ Verdict</span>
                <span className="txt">The <b>Polo</b> wins on cost and residuals. Fiesta wins on reliability. Corsa is the efficiency pick.</span>
              </div>
            </div>
            <div className="tv2-compare-foot">
              <span>2–4 cars · 48 metrics · free</span>
              <span className="go">Open Compare<span className="arrow" aria-hidden="true"></span></span>
            </div>
          </div>
        </div>
      </section>

      {/* §03 — DATASET (band-light) ============================== */}
      <div className="band-light">
        <section className="section ds-section">
          <div className="section-head">
            <div>
              <div className="tag">◆ §03 · The dataset</div>
              <h2>Only the cars<br /><em>worth buying.</em></h2>
            </div>
            <div className="ds-lede">
              <p>353 used and new models, each vetted by hand before they enter the dataset.
                Known lemons, orphaned trims, and cars we can't honestly recommend don't make
                the cut. We'd rather cover fewer cars, properly.</p>
            </div>
          </div>

          <div className="ds-big">
            <div className="ds-num">
              <div className="ds-n">353</div>
              <div className="ds-lab">Models covered today</div>
              <div className="ds-sub">+18 in the next month</div>
            </div>
            <div className="ds-split">
              <div className="ds-split-row">
                <span className="ds-silh" dangerouslySetInnerHTML={{ __html: SILHOUETTE_HATCHBACK }}></span>
                <span className="k">Hatchbacks</span>
                <span className="bar"><i style={{ width: '78%' }}></i></span>
                <span className="v">118</span>
              </div>
              <div className="ds-split-row">
                <span className="ds-silh" dangerouslySetInnerHTML={{ __html: SILHOUETTE_SUV }}></span>
                <span className="k">SUVs & crossovers</span>
                <span className="bar"><i style={{ width: '62%' }}></i></span>
                <span className="v">94</span>
              </div>
              <div className="ds-split-row">
                <span className="ds-silh" dangerouslySetInnerHTML={{ __html: SILHOUETTE_SALOON }}></span>
                <span className="k">Saloons & estates</span>
                <span className="bar"><i style={{ width: '44%' }}></i></span>
                <span className="v">67</span>
              </div>
              <div className="ds-split-row">
                <span className="ds-silh" dangerouslySetInnerHTML={{ __html: SILHOUETTE_EV }}></span>
                <span className="k">EVs (pure electric)</span>
                <span className="bar ev"><i style={{ width: '35%' }}></i></span>
                <span className="v">53</span>
              </div>
              <div className="ds-split-row">
                <span className="ds-silh" dangerouslySetInnerHTML={{ __html: SILHOUETTE_CITY }}></span>
                <span className="k">Small / city cars</span>
                <span className="bar"><i style={{ width: '14%' }}></i></span>
                <span className="v">21</span>
              </div>
            </div>
          </div>

          <div className="ds-criteria">
            <div className="ds-crit">
              <span className="mono">01</span>
              <h5>Long-term data exists.</h5>
              <p>We won't publish what we can't prove. Every car in the index has enough sales and reliability history to model honestly.</p>
            </div>
            <div className="ds-crit">
              <span className="mono">02</span>
              <h5>Under £40,000 new.</h5>
              <p>Our audience is normal buyers. Supercars and £80k SUVs live elsewhere — by design.</p>
            </div>
            <div className="ds-crit">
              <span className="mono">03</span>
              <h5>Still serviceable.</h5>
              <p>Parts available, specialists available, and a working aftermarket. A car with no mechanics left is not a buy.</p>
            </div>
            <div className="ds-crit">
              <span className="mono">04</span>
              <h5>Handled the recall test.</h5>
              <p>Models with recurring unresolved recalls or major class actions are either footnoted or cut.</p>
            </div>
          </div>
        </section>
      </div>

      {/* §04 — FREE FOREVER (band-light) ========================= */}
      <div className="band-light">
        <section className="section free-section">
          <div className="free-grid">
            <div>
              <div className="tag">◆ §04 · The promise</div>
              <h2 className="free-h">Free. For you.<br /><em>Forever.</em></h2>
            </div>
            <div className="free-copy">
              <p>Motifi doesn't charge you. No sign-up wall, no premium tier, no freemium bait.
                If you're the one putting money down on a car, the tool stays free — because we'd
                rather be the thing you trust than the thing you pay for.</p>
              <p className="free-sig">— The Motifi editors, since 2024</p>
            </div>
          </div>
        </section>
      </div>

      {/* CTA SECTION ============================================== */}
      <section className="section cta-section">
        <div className="cta-inner">
          <div className="cta-head">
            <div className="tag">◆ Start where you like</div>
            <h2>
              Don't know what you want? <em>Ask Cooper.</em><br /><br />
              Already have a shortlist? <em>Compare.</em>
            </h2>
          </div>
          <div className="cta-two">
            <div className="cta-card" onClick={onStart} role="button" tabIndex={0}>
              <div className="cc-num">01</div>
              <div className="cc-body">
                <div className="cc-tag">FIND MY CAR</div>
                <h3>Start with Cooper.</h3>
                <p>Three minutes. Natural conversation. One shortlist.</p>
                <span className="cc-go">Open chat<span className="arrow" aria-hidden="true"></span></span>
              </div>
            </div>
            <div className="cta-card" onClick={onCompare} role="button" tabIndex={0}>
              <div className="cc-num">02</div>
              <div className="cc-body">
                <div className="cc-tag">COMPARE</div>
                <h3>Put them head to head.</h3>
                <p>Two to four cars. Forty-eight metrics. One verdict.</p>
                <span className="cc-go">Open Compare<span className="arrow" aria-hidden="true"></span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER =================================================== */}
      <footer>
        <div>
          <div className="wordmark"><span>motif</span><b>i</b></div>
          <div className="big">The true cost of car ownership, <em>all in one place.</em></div>
        </div>
        <div>
          <h5>Tools</h5>
          <ul>
            <li><a onClick={onStart}>Find My Car</a></li>
            <li><a onClick={onCompare}>Compare</a></li>
            <li><a>Your matches</a></li>
            <li><a>Finance explained</a></li>
          </ul>
        </div>
        <div>
          <h5>Method</h5>
          <ul>
            <li><a>Scoring methodology</a></li>
            <li><a>Data sources</a></li>
            <li><a>How we stay independent</a></li>
            <li><a>Residual-value model</a></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><a>About Motifi</a></li>
            <li><a>The index (353)</a></li>
            <li><a>Careers</a></li>
            <li><a>Contact</a></li>
          </ul>
        </div>
        <div className="bottom">
          <span>© MOTIFI LTD · INDEPENDENT SINCE 2024</span>
          <span>FREE FOR BUYERS · NO DEALER FUNNEL</span>
        </div>
      </footer>
    </div>
  )
}

// ─── Results ────────────────────────────────────────────────────────────────
// Hero card for #1 (rich treatment: AI explanation + radar + cost panel)
// Compact row list for #2–#10 (rule-based one-liner, score badge, click to open)

function HeroCard({ car, answers, explanation, loading, onSelectCar }) {
  const costs = getYearOneCost(car, answers)
  const isFinance = answers.paymentMethod === 'Hire Purchase'

  return (
    <div style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', border: `2px solid ${C.teal}`, boxShadow: '0 4px 24px rgba(0,200,150,0.08)' }}>
      <div style={{ padding: '28px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '6px' }}>BEST MATCH</div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em', color: C.midnight }}>{car.make} {car.model}</h3>
            <div style={{ fontSize: '13px', color: '#5A7090', marginTop: '4px' }}>
              {car.generationName} · {car.bodyType} · <span style={{ color: C.teal, fontWeight: '700' }}>£{Number(car.priceLow).toLocaleString()}–£{Number(car.priceHigh).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#8A9AB0', marginBottom: '4px' }}>Match score</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: C.teal }}>{Math.round(car.scores.finalScore * 10)}%</div>
          </div>
        </div>
        <div style={{ backgroundColor: C.offwhite, borderRadius: '10px', padding: '16px', marginBottom: '20px', minHeight: '56px', display: 'flex', alignItems: 'center' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '14px', height: '14px', border: `2px solid ${C.teal}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#8A9AB0' }}>Analysing your match...</span>
            </div>
          ) : (
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#3A4A5A', margin: 0 }}>{explanation || ''}</p>
          )}
        </div>
      </div>

      <div style={{ margin: '0 28px 20px', backgroundColor: C.midnight, borderRadius: '14px', padding: '20px 24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '16px' }}>COST OF OWNERSHIP</div>
        {isFinance ? (
          <div>
            <div style={{ backgroundColor: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.05em', marginBottom: '10px' }}>ON THE ROAD — DAY ONE COST</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                {[
                  { label: 'Deposit', value: `£${Number(costs.deposit).toLocaleString()}` },
                  { label: 'First month finance', value: `~£${costs.financeMonthly}` },
                  { label: 'First month insurance', value: `~£${costs.insuranceMonthly}` },
                  { label: 'Annual road tax', value: costs.roadTax === 0 ? 'Free (EV)' : `£${costs.roadTax}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: C.muted, marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: C.muted }}>Day one total estimate</span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: C.teal }}>~£{(costs.deposit + costs.financeMonthly + costs.insuranceMonthly + costs.roadTax).toLocaleString()}</span>
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.05em', marginBottom: '10px' }}>MONTHLY OVER 48 MONTHS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Finance (48 months)', value: `~£${costs.financeMonthly}/mo` },
                { label: 'Insurance est.', value: `~£${costs.insuranceMonthly}/mo` },
                { label: 'Road tax', value: `£${costs.roadTaxMonthly}/mo` },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', color: C.muted }}>Total monthly estimate</div>
                <div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>Finance over 48 months at 9.9% APR</div>
              </div>
              <span style={{ fontSize: '20px', fontWeight: '900', color: C.teal }}>~£{costs.totalMonthlyMin}–£{costs.totalMonthlyMax}/mo</span>
            </div>
            <div style={{ backgroundColor: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.05em', marginBottom: '10px' }}>TOTAL COST OVER 48 MONTHS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                {[
                  { label: 'Deposit', value: `£${Number(costs.deposit).toLocaleString()}` },
                  { label: 'Finance payments', value: `~£${Number(costs.financeMonthly * 48).toLocaleString()}` },
                  { label: 'Insurance (4 yrs)', value: `~£${Number(costs.insuranceMonthly * 48).toLocaleString()}` },
                  { label: 'Road tax (4 yrs)', value: `£${Number(costs.roadTax * 4).toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: C.muted, marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>48-month total estimate</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: C.teal }}>~£{Number(costs.deposit + (costs.financeMonthly * 48) + (costs.insuranceMonthly * 48) + (costs.roadTax * 4)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Car price', value: `£${Number(car.priceLow).toLocaleString()}` },
                { label: 'Road tax', value: costs.roadTax === 0 ? 'Free (EV)' : `£${costs.roadTax}/yr` },
                { label: 'Insurance est.', value: `£${costs.insuranceMin}–£${costs.insuranceMax}/yr` },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: C.muted }}>Year 1 total estimate</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: C.teal }}>£{costs.yearOneMin.toLocaleString()}–£{costs.yearOneMax.toLocaleString()}</span>
            </div>
            <div style={{ backgroundColor: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.05em', marginBottom: '10px' }}>TOTAL COST OVER 4 YEARS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                {[
                  { label: 'Car price', value: `£${Number(costs.carPrice).toLocaleString()}` },
                  { label: 'Insurance (4 yrs)', value: `~£${Number(costs.insuranceMin * 4).toLocaleString()}–£${Number(costs.insuranceMax * 4).toLocaleString()}` },
                  { label: 'Road tax (4 yrs)', value: `£${Number(costs.roadTax * 4).toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: C.muted, marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>4-year total estimate</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: C.teal }}>~£{Number(costs.carPrice + (costs.insuranceMin * 4) + (costs.roadTax * 4)).toLocaleString()}–£{Number(costs.carPrice + (costs.insuranceMax * 4) + (costs.roadTax * 4)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 28px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: car.bodySpaceConflict ? '16px' : '0' }}>
          <RadarChart scores={car.scores} />
          {[
            { label: 'Budget fit', score: car.scores.budgetScore },
            { label: 'Driving fit', score: car.scores.drivingScore },
            { label: 'Depreciation', score: car.scores.depreciationScore },
            { label: 'Running cost', score: car.scores.runningScore },
            { label: 'Ownership ease', score: car.scores.ownershipScore },
            { label: 'Safety', score: car.scores.safetyScore },
          ].map(({ label, score }) => (
            <div key={label} style={{ backgroundColor: C.offwhite, borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#8A9AB0', marginBottom: '4px' }}>{label}</div>
              <div style={{ height: '3px', backgroundColor: '#E8ECF0', borderRadius: '2px', marginBottom: '4px' }}>
                <div style={{ height: '100%', width: `${score * 10}%`, backgroundColor: C.teal, borderRadius: '2px' }} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: C.midnight }}>{Math.round(score * 10) / 10}/10</div>
            </div>
          ))}
        </div>
        {car.bodySpaceConflict && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#92400E', lineHeight: '1.5', marginTop: '16px' }}>
            You may also want to consider estates or SUVs if space is a priority for you.
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onSelectCar(car); }} style={{ width: '100%', marginTop: '16px', backgroundColor: C.teal, color: C.midnight, border: 'none', borderRadius: '10px', padding: '14px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
          View full details →
        </button>
      </div>
    </div>
  )
}

function ScoreBar({ score }) {
  const filled = Math.round(score)
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ width: '8px', height: '8px', backgroundColor: i < filled ? C.teal : 'rgba(168,184,204,0.25)' }} />
      ))}
    </div>
  )
}

function CompactRow({ rank, car, answers, oneLiner, onSelectCar }) {
  const costs = getYearOneCost(car, answers)
  const isFinance = answers.paymentMethod === 'Hire Purchase'
  const scorePct = Math.round(car.scores.finalScore * 10)

  return (
    <div
      onClick={() => onSelectCar(car)}
      style={{
        display: 'grid',
        gridTemplateColumns: '60px minmax(180px, 1.4fr) minmax(120px, 1fr) minmax(200px, 1.6fr) 100px',
        gap: '20px',
        alignItems: 'center',
        padding: '22px 24px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '14px',
        border: '1px solid rgba(168,184,204,0.1)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,200,150,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(168,184,204,0.1)' }}
    >
      <div style={{ fontSize: '34px', fontWeight: '300', color: C.muted, fontFamily: 'Satoshi, serif', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {String(rank).padStart(2, '0')}
      </div>

      <div>
        <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.08em', marginBottom: '4px' }}>
          {car.make.toUpperCase()} · {car.generationYears || ''}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: C.offwhite, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {car.model}
        </div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
          {car.generationName} · {car.transmission || ''}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: C.offwhite, letterSpacing: '-0.01em' }}>
          £{Number(car.priceLow).toLocaleString()}
        </div>
        {isFinance && (
          <div style={{ fontSize: '11px', color: C.teal, marginTop: '2px' }}>
            £{costs.financeMonthly}/mo HP
          </div>
        )}
        <div style={{ fontSize: '10px', fontWeight: '600', color: C.muted, letterSpacing: '0.06em', marginTop: '4px' }}>
          TRUE 4YR: £{Math.round((costs.carPrice + (costs.insuranceMin * 4) + (costs.roadTax * 4)) / 1000)}.{(Math.round((costs.carPrice + (costs.insuranceMin * 4) + (costs.roadTax * 4)) / 100) % 10)}K
        </div>
      </div>

      <div style={{ fontSize: '13px', lineHeight: '1.55', color: '#D0DCE8' }}>
        {oneLiner}
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '30px', fontWeight: '300', color: C.offwhite, letterSpacing: '-0.02em', fontFamily: 'Satoshi, serif' }}>{scorePct}</span>
          <span style={{ fontSize: '11px', color: C.muted }}>/100</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ScoreBar score={car.scores.finalScore} />
        </div>
      </div>
    </div>
  )
}

function Results({ results, answers, onBack, onSelectCar }) {
  const [explanations, setExplanations] = useState({})
  const [loading, setLoading] = useState({})

  React.useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, results }),
    }).catch(() => {})

    const hero = results[0]
    if (!hero) return

    setLoading({ 0: true })
    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car: hero, answers }),
    })
      .then(r => r.text())
      .then(text => {
        try {
          const data = JSON.parse(text)
          setExplanations({ 0: data.explanation || '' })
        } catch {
          setExplanations({ 0: text || '' })
        }
        setLoading({ 0: false })
      })
      .catch(() => setLoading({ 0: false }))
  }, [results])

  if (results.length === 0) {
    return (
      <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.midnight, minHeight: '100vh', color: C.offwhite, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', maxWidth: '500px' }}>No strong matches in your budget.</h2>
        <p style={{ fontSize: '16px', color: C.muted, marginBottom: '32px', maxWidth: '480px', lineHeight: 1.6 }}>
          We couldn't find cars scoring 60% or higher for your priorities. Try widening your budget or relaxing filters — especially body type or fuel type.
        </p>
        <button onClick={onBack} style={{ backgroundColor: C.teal, color: C.midnight, border: 'none', borderRadius: '10px', padding: '14px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Start again</button>
      </div>
    )
  }

  const hero = results[0]
  const rest = results.slice(1)
  const fewMatches = results.length < 3

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, minHeight: '100vh', color: C.midnight }}>
      <nav style={{ backgroundColor: C.midnight, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
        <button onClick={onBack} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Start again</button>
      </nav>

      <div style={{ backgroundColor: C.midnight, padding: '48px 5% 56px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>YOUR RESULTS · {results.length} {results.length === 1 ? 'MATCH' : 'MATCHES'}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', color: C.offwhite, lineHeight: '1.2' }}>Based on what you told us,<br />here are your best matches.</h2>
        {fewMatches && (
          <p style={{ fontSize: '14px', color: C.muted, marginTop: '20px', maxWidth: '520px', margin: '20px auto 0', lineHeight: 1.6 }}>
            Only {results.length} {results.length === 1 ? 'car' : 'cars'} scored above 60% for your priorities. Consider widening your budget to see more options.
          </p>
        )}
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <HeroCard
          car={hero}
          answers={answers}
          explanation={explanations[0]}
          loading={loading[0]}
          onSelectCar={onSelectCar}
        />
      </div>

      {rest.length > 0 && (
        <div style={{ backgroundColor: C.midnight, padding: '56px 5% 72px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '6px' }}>ALSO WORTH CONSIDERING</div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite, marginBottom: '28px' }}>
              {rest.length} strong {rest.length === 1 ? 'alternative' : 'alternatives'}.
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
          </div>
        </div>
      )}

      <div style={{ backgroundColor: C.offwhite, textAlign: 'center', padding: '40px 24px 60px' }}>
        <p style={{ fontSize: '12px', color: '#8A9AB0', marginBottom: '12px' }}>
          Cost estimates are indicative. Insurance based on risk band. Finance calculated at 9.9% APR over 48 months.
        </p>
        <button onClick={onBack} style={{ backgroundColor: C.midnight, color: C.offwhite, border: 'none', borderRadius: '10px', padding: '14px 32px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>Start a new search</button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function CarPage({ car, answers, onBack }) {
  const costs = getYearOneCost(car, answers)
  const isFinance = ['Hire Purchase (HP)', 'Personal Contract Purchase (PCP)'].includes(answers.paymentMethod)
  const postcode = (answers.postcode || '').replace(/\s/g, '')
  const radius = String(answers.searchRadius || 25)
  const autotraderUrl = `https://www.autotrader.co.uk/car-search?make=${encodeURIComponent(car.make)}&model=${encodeURIComponent(car.model)}&postcode=${postcode}&radius=${radius}&year-from=${car.generationYears?.split(/[-–]/)[0]?.trim() || ''}`
  const ebayUrl = `https://www.ebay.co.uk/sch/Cars/9801/i.html?_nkw=${encodeURIComponent(car.make + ' ' + car.model)}`
  const insuranceUrl = `https://www.comparethemarket.com/car-insurance/`
  const financeUrl = `https://www.zuto.com/apply/`
  const generationYear = car.generationYears?.split(/[—-]/)[0]?.trim() || '2020'
  const imaginUrl = `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(car.make.toLowerCase())}&modelFamily=${encodeURIComponent(car.model.split(' ')[0].toLowerCase())}&zoomType=fullscreen&modelYear=${generationYear}&angle=23`

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, minHeight: '100vh', color: C.midnight }}>
      <nav style={{ backgroundColor: C.midnight, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
        <button onClick={onBack} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>← Back to results</button>
      </nav>
      <div style={{ backgroundColor: '#1A2E50', padding: '0 5%', minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ flex: 1, paddingTop: '32px', paddingBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>{car.bodyType?.toUpperCase()}</div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '900', color: C.offwhite, letterSpacing: '-0.03em', marginBottom: '8px', lineHeight: '1.05' }}>{car.make} {car.model}</h1>
          <div style={{ fontSize: '14px', color: C.muted }}>{car.generationName} · {car.fuelType} · {car.transmission}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', maxWidth: '360px', height: '200px', overflow: 'hidden' }}>
          <img src={imaginUrl} alt={`${car.make} ${car.model}`} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom right' }} onError={(e) => { e.target.style.display = 'none' }} />
        </div>
      </div>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ backgroundColor: C.white, borderRadius: '16px', padding: '24px', border: '1px solid #E8ECF0', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '16px' }}>KEY SPECS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Price from', value: car.priceLow ? `£${Number(car.priceLow).toLocaleString()}` : 'N/A' },
              { label: 'MPG', value: car.mpgBand },
              { label: 'Boot size', value: car.bootBand },
              { label: 'Insurance risk', value: car.insuranceBand },
              { label: 'Reliability', value: car.reliabilityBand },
              { label: 'Safety', value: `${car.ncapStars}★ NCAP (${car.ncapAdultPct}%)` },
              { label: 'ULEZ', value: car.ulezCompliant },
              { label: 'Ownership stress', value: car.ownershipStress },
            ].map(({ label, value }) => (
              <div key={label} style={{ backgroundColor: C.offwhite, borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#8A9AB0', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: C.midnight }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: C.midnight, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '16px' }}>COST OF OWNERSHIP</div>
          {isFinance ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'Deposit', value: `£${Number(costs.deposit).toLocaleString()}` },
                  { label: 'Finance/mo', value: `~£${costs.financeMonthly}` },
                  { label: 'Insurance/mo', value: `~£${costs.insuranceMonthly}` },
                  { label: 'Road tax/mo', value: costs.roadTax === 0 ? 'Free' : `£${costs.roadTaxMonthly}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>Monthly total (48 months)</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: C.teal }}>~£{costs.totalMonthlyMin}–£{costs.totalMonthlyMax}/mo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>48-month total estimate</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: C.teal }}>~£{Number(costs.deposit + (costs.financeMonthly * 48) + (costs.insuranceMonthly * 48) + (costs.roadTax * 4)).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                {[
                  { label: 'Car price', value: `£${Number(car.priceLow || 0).toLocaleString()}` },
                  { label: 'Road tax/yr', value: costs.roadTax === 0 ? 'Free (EV)' : `£${costs.roadTax}` },
                  { label: 'Insurance/yr', value: `£${costs.insuranceMin}–£${costs.insuranceMax}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: C.offwhite }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>Year 1 total estimate</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: C.teal }}>£{costs.yearOneMin.toLocaleString()}–£{costs.yearOneMax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>4-year total estimate</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: C.teal }}>~£{Number(costs.carPrice + (costs.insuranceMin * 4) + (costs.roadTax * 4)).toLocaleString()}–£{Number(costs.carPrice + (costs.insuranceMax * 4) + (costs.roadTax * 4)).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ backgroundColor: C.white, borderRadius: '16px', padding: '24px', border: '1px solid #E8ECF0', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '6px' }}>FIND THIS CAR NEAR YOU</div>
          <p style={{ fontSize: '13px', color: '#8A9AB0', marginBottom: '16px', lineHeight: '1.6' }}>Search live listings within {answers.searchRadius || 50} miles of {answers.postcode || 'your location'}.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Search on AutoTrader', url: autotraderUrl, primary: true },
              { label: 'Search on eBay Motors', url: ebayUrl, primary: false },
            ].map(({ label, url, primary }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: primary ? C.teal : C.offwhite, color: C.midnight, border: primary ? 'none' : '1px solid #E8ECF0', borderRadius: '10px', padding: '14px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', textDecoration: 'none', textAlign: 'center' }}>
                {label} →
              </a>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: C.white, borderRadius: '16px', padding: '24px', border: '1px solid #E8ECF0', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '6px' }}>GET AN INSURANCE QUOTE</div>
          <p style={{ fontSize: '13px', color: '#8A9AB0', marginBottom: '16px', lineHeight: '1.6' }}>Based on your car's insurance risk band ({car.insuranceBand}), estimated annual cost is £{costs.insuranceMin}–£{costs.insuranceMax}. Get a personalised quote below.</p>
          <a href={insuranceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: C.offwhite, color: C.midnight, border: '1px solid #E8ECF0', borderRadius: '10px', padding: '14px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', textDecoration: 'none', textAlign: 'center' }}>
            Compare insurance quotes →
          </a>
        </div>
        {isFinance && (
          <div style={{ backgroundColor: C.white, borderRadius: '16px', padding: '24px', border: '1px solid #E8ECF0', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '6px' }}>GET A FINANCE QUOTE</div>
            <p style={{ fontSize: '13px', color: '#8A9AB0', marginBottom: '16px', lineHeight: '1.6' }}>Based on a £{Number(costs.deposit).toLocaleString()} deposit over 48 months, estimated monthly finance is ~£{costs.financeMonthly}. Get a personalised quote below.</p>
            <a href={financeUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: C.offwhite, color: C.midnight, border: '1px solid #E8ECF0', borderRadius: '10px', padding: '14px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', textDecoration: 'none', textAlign: 'center' }}>
              Get a finance quote →
            </a>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button onClick={onBack} style={{ backgroundColor: C.midnight, color: C.offwhite, border: 'none', borderRadius: '10px', padding: '14px 32px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>← Back to your results</button>
        </div>
      </div>
    </div>
  )
}

function CompareFlow({ onBack, onSelectCar }) {
  const [step, setStep] = useState('details')
  const [answers, setAnswers] = useState({})
  const [selectedCars, setSelectedCars] = useState([])
  const [brandFilter, setBrandFilter] = useState('')
  const [bodyFilter, setBodyFilter] = useState('')
  const [results, setResults] = useState([])

  const brands = [...new Set(carsData.map(c => c.make))].sort()

  const filteredCars = carsData.filter(car => {
    const matchBrand = !brandFilter || car.make === brandFilter
    const matchBody = !bodyFilter || (car.bodyType || '').toLowerCase().includes(bodyFilter.toLowerCase())
    return matchBrand && matchBody
  }).sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))

  function toggleCar(car) {
    const key = `${car.make} ${car.model} ${car.generationName}`
    const exists = selectedCars.find(c => `${c.make} ${c.model} ${c.generationName}` === key)
    if (exists) {
      setSelectedCars(prev => prev.filter(c => `${c.make} ${c.model} ${c.generationName}` !== key))
    } else if (selectedCars.length < 3) {
      setSelectedCars(prev => [...prev, car])
    }
  }

  function handleCompare() {
    setResults(selectedCars)
    setStep('results')
  }

  const isFinance = ['Hire Purchase (HP)', 'Personal Contract Purchase (PCP)'].includes(answers.purchaseMethod)

  if (step === 'results') {
    return (
      <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, minHeight: '100vh', color: C.midnight }}>
        <nav style={{ backgroundColor: C.midnight, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
          <button onClick={() => setStep('select')} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
        </nav>

        <div style={{ backgroundColor: C.midnight, padding: '40px 5% 48px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>YOUR COMPARISON</div>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', color: C.offwhite, lineHeight: '1.2' }}>Here's how your chosen cars compare.</h2>
        </div>

        <div style={{ backgroundColor: '#1A2E50', padding: '0 5%', display: 'grid', gridTemplateColumns: `repeat(${results.length}, 1fr)`, gap: '1px' }}>
          {results.map((car, i) => {
            const generationYear = car.generationYears?.split(/[—-]/)[0]?.trim() || '2020'
            const imaginUrl = `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(car.make.toLowerCase())}&modelFamily=${encodeURIComponent(car.model.split(' ')[0].toLowerCase())}&zoomType=fullscreen&modelYear=${generationYear}&angle=23`
            return (
              <div key={i} style={{ padding: '24px 16px', textAlign: 'center', borderRight: i < results.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <img src={imaginUrl} alt={`${car.make} ${car.model}`} style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: C.offwhite, letterSpacing: '-0.02em' }}>{car.make} {car.model}</div>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>{car.generationName}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: C.teal, marginTop: '6px' }}>£{Number(car.priceLow).toLocaleString()}–£{Number(car.priceHigh).toLocaleString()}</div>
              </div>
            )
          })}
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 5% 80px' }}>
          <div style={{ backgroundColor: C.white, borderRadius: '16px', border: '1px solid #E8ECF0', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ backgroundColor: C.midnight, padding: '14px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em' }}>KEY SPECS</div>
            </div>
            {[
              { label: 'Body type', key: 'bodyType' },
              { label: 'Fuel type', key: 'fuelType' },
              { label: 'Transmission', key: 'transmission' },
              { label: 'MPG', key: 'mpgBand' },
              { label: 'Boot size', key: 'bootBand' },
              { label: 'Insurance risk', key: 'insuranceBand' },
              { label: 'Reliability', fn: car => car.reliabilityBand },
              { label: 'Safety', fn: car => `${car.ncapStars}★ NCAP` },
              { label: 'ULEZ', key: 'ulezCompliant' },
              { label: 'Ownership stress', key: 'ownershipStress' },
            ].map(({ label, key, fn }, rowI) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${results.length}, 1fr)`, borderTop: '1px solid #E8ECF0', backgroundColor: rowI % 2 === 0 ? '#FAFBFC' : C.white }}>
                <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#5A7090', borderRight: '1px solid #E8ECF0' }}>{label}</div>
                {results.map((car, i) => (
                  <div key={i} style={{ padding: '12px 16px', fontSize: '13px', color: C.midnight, borderRight: i < results.length - 1 ? '1px solid #E8ECF0' : 'none' }}>
                    {fn ? fn(car) : car[key] || '—'}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: C.white, borderRadius: '16px', border: '1px solid #E8ECF0', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ backgroundColor: C.midnight, padding: '14px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em' }}>COST OF OWNERSHIP</div>
            </div>
            {(isFinance ? [
              { label: 'Deposit', fn: (car) => `£${Number(getYearOneCost(car, answers).deposit).toLocaleString()}` },
              { label: 'Finance/mo', fn: (car) => `~£${getYearOneCost(car, answers).financeMonthly}/mo` },
              { label: 'Insurance/mo', fn: (car) => `~£${getYearOneCost(car, answers).insuranceMonthly}/mo` },
              { label: 'Road tax/mo', fn: (car) => getYearOneCost(car, answers).roadTax === 0 ? 'Free (EV)' : `£${getYearOneCost(car, answers).roadTaxMonthly}/mo` },
              { label: 'Monthly total', fn: (car) => { const c = getYearOneCost(car, answers); return `~£${c.totalMonthlyMin}–£${c.totalMonthlyMax}/mo` }, highlight: true },
              { label: '48-month total', fn: (car) => { const c = getYearOneCost(car, answers); return `~£${Number(c.deposit + (c.financeMonthly * 48) + (c.insuranceMonthly * 48) + (c.roadTax * 4)).toLocaleString()}` }, highlight: true },
            ] : [
              { label: 'Car price', fn: (car) => `£${Number(car.priceLow).toLocaleString()}` },
              { label: 'Road tax/yr', fn: (car) => getYearOneCost(car, answers).roadTax === 0 ? 'Free (EV)' : `£${getYearOneCost(car, answers).roadTax}` },
              { label: 'Insurance/yr', fn: (car) => { const c = getYearOneCost(car, answers); return `£${c.insuranceMin}–£${c.insuranceMax}` } },
              { label: 'Year 1 total', fn: (car) => { const c = getYearOneCost(car, answers); return `£${c.yearOneMin.toLocaleString()}–£${c.yearOneMax.toLocaleString()}` }, highlight: true },
              { label: '4-year total', fn: (car) => { const c = getYearOneCost(car, answers); return `~£${Number(c.carPrice + (c.insuranceMin * 4) + (c.roadTax * 4)).toLocaleString()}–£${Number(c.carPrice + (c.insuranceMax * 4) + (c.roadTax * 4)).toLocaleString()}` }, highlight: true },
            ]).map(({ label, fn, highlight }, rowI) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${results.length}, 1fr)`, borderTop: '1px solid #E8ECF0', backgroundColor: highlight ? '#F0FDF9' : rowI % 2 === 0 ? '#FAFBFC' : C.white }}>
                <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: highlight ? C.teal : '#5A7090', borderRight: '1px solid #E8ECF0' }}>{label}</div>
                {results.map((car, i) => (
                  <div key={i} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: highlight ? '700' : '400', color: highlight ? C.teal : C.midnight, borderRight: i < results.length - 1 ? '1px solid #E8ECF0' : 'none' }}>
                    {fn(car)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${results.length}, 1fr)`, gap: '12px', marginBottom: '24px' }}>
            {results.map((car, i) => (
              <button key={i} onClick={() => onSelectCar(car)} style={{ backgroundColor: C.midnight, color: C.offwhite, border: 'none', borderRadius: '10px', padding: '14px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                View {car.make} {car.model} →
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#8A9AB0', marginBottom: '8px' }}>Cost estimates are indicative. Insurance based on risk band. Finance calculated at 9.9% APR over 48 months.</p>
            <button onClick={onBack} style={{ backgroundColor: 'transparent', color: C.midnight, border: '1px solid #E8ECF0', borderRadius: '10px', padding: '12px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>Start again</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'select') {
    return (
      <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.midnight, minHeight: '100vh', color: C.offwhite }}>
        <nav style={{ backgroundColor: C.navy, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
          <button onClick={() => setStep('details')} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
        </nav>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px 80px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>COMPARE CARS</div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '8px' }}>Select up to 3 cars to compare.</h2>
          <p style={{ fontSize: '14px', color: C.muted, marginBottom: '32px' }}>Filter by brand or body type to narrow the list.</p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ flex: '1', minWidth: '140px', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '12px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '14px', outline: 'none' }}>
              <option value=''>All brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={bodyFilter} onChange={e => setBodyFilter(e.target.value)} style={{ flex: '1', minWidth: '140px', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '12px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '14px', outline: 'none' }}>
              <option value=''>All body types</option>
              {['Hatchback', 'Saloon', 'Estate', 'SUV', 'Crossover', 'MPV', 'Coupe', 'Van'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {selectedCars.length > 0 && (
            <div style={{ backgroundColor: C.navy, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: C.teal, fontWeight: '600', marginBottom: '8px' }}>SELECTED ({selectedCars.length}/3)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedCars.map(car => (
                  <div key={`${car.make}${car.model}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{car.make} {car.model}</span>
                    <button onClick={() => toggleCar(car)} style={{ backgroundColor: 'transparent', color: C.muted, border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
            {filteredCars.map(car => {
              const key = `${car.make} ${car.model} ${car.generationName}`
              const selected = selectedCars.find(c => `${c.make} ${c.model} ${c.generationName}` === key)
              const disabled = !selected && selectedCars.length >= 3
              return (
                <button key={key} onClick={() => !disabled && toggleCar(car)} style={{ backgroundColor: selected ? C.teal : C.navy, color: selected ? C.midnight : disabled ? C.dim : C.offwhite, border: `1.5px solid ${selected ? C.teal : '#2A4060'}`, borderRadius: '10px', padding: '12px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '14px', fontWeight: selected ? '700' : '400', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: disabled ? 0.5 : 1 }}>
                  <span style={{ fontWeight: '600' }}>{car.make} {car.model}</span>
                  <span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.7 }}>{car.generationName}</span>
                </button>
              )
            })}
          </div>

          <button onClick={handleCompare} disabled={selectedCars.length < 1} style={{ width: '100%', backgroundColor: selectedCars.length > 0 ? C.teal : '#1A2E50', color: selectedCars.length > 0 ? C.midnight : C.dim, border: 'none', borderRadius: '10px', padding: '16px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: selectedCars.length > 0 ? 'pointer' : 'not-allowed' }}>
            Compare {selectedCars.length > 0 ? `${selectedCars.length} car${selectedCars.length > 1 ? 's' : ''}` : 'cars'} →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.midnight, minHeight: '100vh', color: C.offwhite }}>
      <nav style={{ backgroundColor: C.navy, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
        <button onClick={onBack} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
      </nav>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>COMPARE CARS</div>
        <h2 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '8px' }}>Already know what you're looking for?</h2>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '32px', lineHeight: '1.6' }}>Tell us a bit about yourself and we'll show you the true cost of ownership for each car you choose.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: C.muted, marginBottom: '8px', fontWeight: '500' }}>Your postcode</label>
            <input type="text" placeholder="e.g. SW1A 1AA" value={answers.postcode || ''} onChange={e => setAnswers(p => ({ ...p, postcode: e.target.value }))} style={{ width: '100%', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '14px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: C.muted, marginBottom: '8px', fontWeight: '500' }}>How are you planning to pay?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Cash', 'Part exchange', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)'].map(opt => {
                const selected = answers.purchaseMethod === opt
                return (
                  <button key={opt} onClick={() => setAnswers(p => ({ ...p, purchaseMethod: opt }))} style={{ backgroundColor: selected ? C.teal : C.navy, color: selected ? C.midnight : C.offwhite, border: `1.5px solid ${selected ? C.teal : '#2A4060'}`, borderRadius: '10px', padding: '14px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '14px', fontWeight: selected ? '700' : '400', cursor: 'pointer', textAlign: 'left' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {isFinance && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: C.muted, marginBottom: '8px', fontWeight: '500' }}>Deposit amount (£)</label>
              <input type="number" placeholder="e.g. 2000" value={answers.deposit || ''} onChange={e => setAnswers(p => ({ ...p, deposit: e.target.value }))} style={{ width: '100%', backgroundColor: C.navy, color: C.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '14px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <button onClick={() => setStep('select')} disabled={!answers.purchaseMethod} style={{ backgroundColor: answers.purchaseMethod ? C.teal : '#1A2E50', color: answers.purchaseMethod ? C.midnight : C.dim, border: 'none', borderRadius: '10px', padding: '16px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: answers.purchaseMethod ? 'pointer' : 'not-allowed', marginTop: '8px' }}>
            Choose my cars →
          </button>
        </div>
      </div>
    </div>
  )
}
