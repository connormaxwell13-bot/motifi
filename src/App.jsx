import React, { useState } from 'react'
import carsData from './data/cars.json'
import { questions } from './questions.jsx'
import { applyHardFilters } from './scoring/filters.jsx'
import { scoreAllCars, getTopMatches } from './scoring/engine.jsx'
import { generateOneLiners } from './scoring/oneliners.jsx'
import { getYearOneCost } from './scoring/costs.jsx'
import ChatInterface from './ChatInterface'
import ReviewScreen from './ReviewScreen'
import Results from './Results'
import CompareFlow from './CompareFlow'
import CarPage from './CarPage'
import TopNav from './TopNav'
import './design/tokens.css'
import './design/home.css'

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
  // When the user clicks "Compare top 3 →" on Results, we hand the
  // top 3 cars + the answers object to CompareFlow via this state slot.
  const [comparePreload, setComparePreload] = useState(null)

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
    setResults([])
    setComparePreload(null)
    setScreen('home')
  }

  // Cooper finished collecting → review screen, NOT results directly.
  // The user gets to sanity-check all 16 answers before scoring runs.
  function handleChatReview({ answers }) {
    setAnswers(answers)
    setScreen('review')
  }

  // Review screen confirmed → score now and route to Results.
  function handleReviewConfirmed({ results, answers }) {
    setResults(results)
    setAnswers(answers)
    setScreen('results')
  }

  // Results "Compare top 3 →" → preload CompareFlow with results[0..2].
  function handleCompareTop() {
    setComparePreload({ cars: results.slice(0, 3), answers })
    setScreen('compare')
  }

  // Home (or any other entry) "Compare" → fresh CompareFlow with no preload.
  function handleCompareFromHome() {
    setComparePreload(null)
    setScreen('compare')
  }

  // ─── Routing ────────────────────────────────────────────────────────────────

  if (screen === 'home') {
    return (
      <Home
        onStart={() => setScreen('questions')}
        onCompare={handleCompareFromHome}
      />
    )
  }
  if (screen === 'questions') {
    return (
      <ChatInterface
        onReview={handleChatReview}
        onHome={startOver}
        onCompare={handleCompareFromHome}
      />
    )
  }
  if (screen === 'review') {
    return (
      <ReviewScreen
        initialAnswers={answers}
        onResults={handleReviewConfirmed}
        onBack={() => setScreen('questions')}
        onHome={startOver}
        onCompare={handleCompareFromHome}
      />
    )
  }
  if (screen === 'results') {
    return (
      <Results
        results={results}
        answers={answers}
        onBack={startOver}
        onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }}
        onCompareTop={handleCompareTop}
        onHome={startOver}
        onCompare={handleCompareFromHome}
      />
    )
  }
  if (screen === 'car') {
    return (
      <CarPage
        car={selectedCar}
        answers={answers}
        results={results}
        fromResults={results.length > 0}
        onBack={() => setScreen(results.length > 0 ? 'results' : 'home')}
        onHome={startOver}
        onCompare={handleCompareFromHome}
        onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }}
      />
    )
  }
  if (screen === 'compare') {
    return (
      <CompareFlow
        onBack={() => setScreen(results.length > 0 ? 'results' : 'home')}
        onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }}
        preloaded={comparePreload}
      />
    )
  }

  // ─── Legacy questions form (unused — kept until ChatInterface is the only
  //     entry path long enough to be sure we don't need a fallback). ───────────
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
        <h2 style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1.3', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {current?.question}
        </h2>
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
// Editorial landing page from Session 1, unchanged here.
// All styles live in src/design/home.css, scoped under .motifi-home.

function imaginUrl(make, modelFamily, year = 2022, angle = 23) {
  return `https://cdn.imagin.studio/getimage?customer=img&make=${make}&modelFamily=${modelFamily}&modelYear=${year}&angle=${angle}&paintdescription=grey`
}

function fmtGBP(n) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

const SILHOUETTE_HATCHBACK = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26 L10 18 L22 12 L40 10 L52 10 L68 19 L82 21 L84 26" /><path d="M22 12 L32 18" /><path d="M32 18 L52 18" /><path d="M52 18 L52 10" /><path d="M32 10 L32 18" /><path d="M4 26 L84 26" /><circle cx="22" cy="28" r="4" fill="#FFFFFF" /><circle cx="68" cy="28" r="4" fill="#FFFFFF" /><circle cx="22" cy="28" r="4" /><circle cx="68" cy="28" r="4" /></svg>`
const SILHOUETTE_SUV = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22 L8 10 L20 6 L68 6 L80 10 L86 14 L86 22" /><path d="M20 6 L26 14" /><path d="M26 14 L68 14" /><path d="M68 6 L68 14" /><path d="M44 6 L44 14" /><path d="M4 22 L86 22" /><circle cx="22" cy="26" r="6" fill="#FFFFFF" /><circle cx="68" cy="26" r="6" fill="#FFFFFF" /><circle cx="22" cy="26" r="6" /><circle cx="68" cy="26" r="6" /><circle cx="22" cy="26" r="2.5" /><circle cx="68" cy="26" r="2.5" /></svg>`
const SILHOUETTE_SALOON = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 26 L8 22 L20 14 L40 10 L58 10 L70 16 L86 20 L88 26" /><path d="M20 14 L26 18" /><path d="M26 18 L58 18" /><path d="M58 10 L58 18" /><path d="M40 10 L40 18" /><path d="M2 26 L88 26" /><circle cx="18" cy="28" r="4" fill="#FFFFFF" /><circle cx="72" cy="28" r="4" fill="#FFFFFF" /><circle cx="18" cy="28" r="4" /><circle cx="72" cy="28" r="4" /></svg>`
const SILHOUETTE_EV = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26 C 10 22, 14 18, 28 12 C 42 8, 56 8, 68 12 C 78 16, 82 20, 86 26" /><path d="M28 12 C 34 16, 38 18, 44 18 L 60 18 C 64 18, 68 16, 68 12" /><path d="M4 26 L86 26" /><circle cx="20" cy="28" r="4.5" fill="#FFFFFF" /><circle cx="70" cy="28" r="4.5" fill="#FFFFFF" /><circle cx="20" cy="28" r="4.5" /><circle cx="70" cy="28" r="4.5" /><path d="M45 4 L41 10 L47 10 L43 16" stroke="#007A57" stroke-width="1.8" fill="none" /></svg>`
const SILHOUETTE_CITY = `<svg viewBox="0 0 90 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 26 L26 20 L30 10 L56 10 L62 20 L68 22 L68 26" /><path d="M30 10 L36 20" /><path d="M36 20 L56 20" /><path d="M56 10 L56 20" /><path d="M22 26 L68 26" /><circle cx="30" cy="28" r="4" fill="#FFFFFF" /><circle cx="60" cy="28" r="4" fill="#FFFFFF" /><circle cx="30" cy="28" r="4" /><circle cx="60" cy="28" r="4" /></svg>`

function Home({ onStart, onCompare }) {
  const costBreakdown = [
    { label: 'Purchase (cash or finance)', value: 12044, kind: 'add' },
    { label: 'Insurance — 48 months',       value: 4032,  kind: 'add' },
    { label: 'Road tax + servicing',        value: 2240,  kind: 'add' },
    { label: 'Fuel at 8,000 mi/yr',         value: 4600,  kind: 'add' },
    { label: 'Projected resale at 48m',     value: -7800, kind: 'sub' },
  ]
  const trueCost = costBreakdown.reduce((a, r) => a + r.value, 0)
  const maxAbs   = Math.max(...costBreakdown.map(r => Math.abs(r.value)))

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="motifi-home">
      <TopNav current="home" onHome={scrollTop} onStart={onStart} onCompare={onCompare} />

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
                <div className="tc-aside-t"><b>Hidden cost</b> vs the asking price. The Polo costs £15,116 to own — not £10,495.</div>
              </div>
              <div className="tc-aside-row">
                <div className="tc-aside-n">3 / 10</div>
                <div className="tc-aside-t"><b>Cheapest on paper rarely wins.</b> In our dataset, only three of every ten bargains stay bargains once you run them for four years.</div>
              </div>
              <div className="tc-aside-row">
                <div className="tc-aside-n">£0</div>
                <div className="tc-aside-t"><b>What we charge you.</b> Motifi is free. No pay-walls, no sponsored rankings, no dealer fees passed back.</div>
              </div>
              <button className="btn ghost" onClick={onCompare}>
                See a full comparison<span className="arrow" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </section>
      </div>

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
          <div className="tv2-plate tv2-plate-cooper" onClick={onStart} role="button" tabIndex={0}>
            <div className="tv2-top">
              <div className="tv2-top-l"><span className="idx">01</span><span className="tag">Find My Car</span></div>
              <span className="live"><span className="blink" aria-hidden="true"></span>Try it</span>
            </div>
            <div className="tv2-cooper-intro">
              <h3>Talk to <em>Cooper</em>, not a filter wall.</h3>
              <p>Three minutes of natural conversation. No sliders, no 40-box forms. Cooper weighs your priorities and hands back a shortlist ranked by fit.</p>
            </div>
            <div className="tv2-cooper-win">
              <div className="tv2-cwin-bar">
                <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
                <span className="title">cooper · session #26,431</span>
              </div>
              <div className="tv2-cwin-body">
                <div className="tv2-msg tv2-msg-cooper">
                  <span className="av">C</span>
                  <div className="body"><div className="name">Cooper</div>What's the car for?</div>
                </div>
                <div className="tv2-msg tv2-msg-you">"Daily commute. Mostly rural, some M4. Wife, dog, no kids yet."</div>
                <div className="tv2-msg tv2-msg-cooper">
                  <span className="av">C</span>
                  <div className="body"><div className="name">Cooper</div>Got it. Budget?</div>
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
                    {[['volkswagen','polo','Polo 1.0'],['renault','zoe','Zoe R110'],['opel','corsa','Corsa-e'],['ford','fiesta','Fiesta 1.0']].map(([mk, mdl, nm]) => (
                      <div key={nm} className="tv2-result-car">
                        <div className="im"><img src={imaginUrl(mk, mdl, 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                        <div className="nm">{nm}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="tv2-cooper-foot">
              <span>~3 min · natural language · free</span>
              <span className="go">Start with Cooper<span className="arrow" aria-hidden="true"></span></span>
            </div>
          </div>

          <div className="tv2-plate tv2-plate-compare" onClick={onCompare} role="button" tabIndex={0}>
            <div className="tv2-top">
              <div className="tv2-top-l"><span className="idx">02</span><span className="tag">Compare</span></div>
              <span className="tag">48 metrics · 2–4 cars</span>
            </div>
            <div className="tv2-compare-intro">
              <h3>Put them <em>head-to-head</em>.</h3>
              <p>Every row scored, every winner highlighted, every loser dimmed. An opinionated verdict at the bottom — maths, not marketing copy.</p>
            </div>
            <div className="tv2-cmp">
              <div className="tv2-cmp-heads">
                <div>&nbsp;</div>
                {[['volkswagen','polo','Polo 1.0 TSI'],['opel','corsa','Corsa 1.2'],['ford','fiesta','Fiesta 1.0']].map(([mk, mdl, nm]) => (
                  <div key={nm} className="car">
                    <div className="im"><img src={imaginUrl(mk, mdl, 2022, 23)} alt="" onError={(e) => { e.target.style.display = 'none' }} /></div>
                    <div className="nm">{nm}</div>
                  </div>
                ))}
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

      <div className="band-light">
        <section className="section ds-section">
          <div className="section-head">
            <div>
              <div className="tag">◆ §03 · The dataset</div>
              <h2>Only the cars<br /><em>worth buying.</em></h2>
            </div>
            <div className="ds-lede">
              <p>353 used and new models, each vetted by hand before they enter the dataset. Known lemons, orphaned trims, and cars we can't honestly recommend don't make the cut. We'd rather cover fewer cars, properly.</p>
            </div>
          </div>
          <div className="ds-big">
            <div className="ds-num">
              <div className="ds-n">353</div>
              <div className="ds-lab">Models covered today</div>
              <div className="ds-sub">+18 in the next month</div>
            </div>
            <div className="ds-split">
              {[[SILHOUETTE_HATCHBACK,'Hatchbacks','78%','118',false],
                [SILHOUETTE_SUV,'SUVs & crossovers','62%','94',false],
                [SILHOUETTE_SALOON,'Saloons & estates','44%','67',false],
                [SILHOUETTE_EV,'EVs (pure electric)','35%','53',true],
                [SILHOUETTE_CITY,'Small / city cars','14%','21',false]].map(([svg, k, w, v, ev]) => (
                <div key={k} className="ds-split-row">
                  <span className="ds-silh" dangerouslySetInnerHTML={{ __html: svg }}></span>
                  <span className="k">{k}</span>
                  <span className={'bar' + (ev ? ' ev' : '')}><i style={{ width: w }}></i></span>
                  <span className="v">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ds-criteria">
            {[['01','Long-term data exists.','We won\'t publish what we can\'t prove. Every car in the index has enough sales and reliability history to model honestly.'],
              ['02','Under £40,000 new.','Our audience is normal buyers. Supercars and £80k SUVs live elsewhere — by design.'],
              ['03','Still serviceable.','Parts available, specialists available, and a working aftermarket. A car with no mechanics left is not a buy.'],
              ['04','Handled the recall test.','Models with recurring unresolved recalls or major class actions are either footnoted or cut.']].map(([n, h, p]) => (
              <div key={n} className="ds-crit">
                <span className="mono">{n}</span>
                <h5>{h}</h5>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="band-light">
        <section className="section free-section">
          <div className="free-grid">
            <div>
              <div className="tag">◆ §04 · The promise</div>
              <h2 className="free-h">Free. For you.<br /><em>Forever.</em></h2>
            </div>
            <div className="free-copy">
              <p>Motifi doesn't charge you. No sign-up wall, no premium tier, no freemium bait. If you're the one putting money down on a car, the tool stays free — because we'd rather be the thing you trust than the thing you pay for.</p>
              <p className="free-sig">— The Motifi editors, since 2024</p>
            </div>
          </div>
        </section>
      </div>

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

// ─── CarPage ──────────────────────────────────────────────────────────────────
// Existing detail view, unchanged. Session 4 will rebuild this editorially.


