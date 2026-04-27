// CompareFlow.jsx — Session 3
// Full editorial rebuild.
//
// Three steps preserved from v1:
//   - 'details' — postcode + payment method + deposit (cold-from-Home entry)
//   - 'select'  — pick up to 3 cars
//   - 'results' — the comparison view itself (the big rebuild)
//
// New `preloaded={{ cars, answers }}` prop (from Session 2) still works:
//   when present, mount directly in 'results' with those cars/answers.

import { useMemo, useState } from 'react'
import TopNav from './TopNav'
import carsData from './data/cars.json'
import { getYearOneCost, getRepresentativePrice, getRetainedAfter48Months } from './scoring/costs.jsx'
import { buildComparison, getOverallVerdict } from './scoring/verdict.jsx'
import './design/tokens.css'
import './design/screens.css'

// ─── Markdown helper (bold + italic) ──────────────────────────────────────────
// Used to render the verdict panel's prose with **bold** and *italic* spans.
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

// ─── Imagin URL builder (stays inline, matches existing pattern) ──────────────
function imaginUrl(car) {
  const make    = (car.make || '').toLowerCase()
  const family  = (car.model || '').split(' ')[0].toLowerCase()
  const year    = car.generationYears?.split(/[—-]/)[0]?.trim() || '2022'
  return `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(family)}&modelYear=${year}&angle=23&paintdescription=grey`
}

const fmtGBP = (n) => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB')

// Letters used to label car columns in the prototype: A / B / C.
const COL_LETTERS = ['A', 'B', 'C']

// ─── Main component ──────────────────────────────────────────────────────────

export default function CompareFlow({ onBack, onSelectCar, onHome, onCompare, preloaded }) {
  const [step, setStep]                   = useState(preloaded ? 'results' : 'details')
  const [answers, setAnswers]             = useState(preloaded?.answers || {})
  const [selectedCars, setSelectedCars]   = useState(preloaded?.cars?.slice(0, 3) || [])
  const [brandFilter, setBrandFilter]     = useState('')
  const [bodyFilter, setBodyFilter]       = useState('')
  const [results, setResults]             = useState(preloaded?.cars?.slice(0, 3) || [])
  const [viewMode, setViewMode]           = useState('full') // 'full' | 'differences'

  const isFinance = ['Hire Purchase', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)']
    .includes(answers?.purchaseMethod || answers?.paymentMethod)

  // ─── Step routing ──────────────────────────────────────────────────────────

  if (step === 'results') {
    return (
      <CompareResults
        cars={results}
        answers={answers}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onClearAll={() => {
          setResults([])
          setSelectedCars([])
          if (preloaded) onBack()
          else setStep('select')
        }}
        onRemoveCar={(idx) => {
          const next = results.filter((_, i) => i !== idx)
          setResults(next)
          setSelectedCars(next)
          if (next.length === 0) {
            if (preloaded) onBack()
            else setStep('select')
          }
        }}
        onAddCar={() => setStep('select')}
        onSelectCar={onSelectCar}
        onHome={onHome}
        onCompare={onCompare}
      />
    )
  }

  if (step === 'select') {
    return (
      <CompareSelect
        cars={carsData}
        selectedCars={selectedCars}
        setSelectedCars={setSelectedCars}
        brandFilter={brandFilter}
        setBrandFilter={setBrandFilter}
        bodyFilter={bodyFilter}
        setBodyFilter={setBodyFilter}
        onBack={() => setStep('details')}
        onCompare={() => {
          setResults(selectedCars)
          setStep('results')
        }}
        onHome={onHome}
        onCompareNav={onCompare}
      />
    )
  }

  // step === 'details'
  return (
    <CompareDetails
      answers={answers}
      setAnswers={setAnswers}
      isFinance={isFinance}
      onBack={onBack}
      onContinue={() => setStep('select')}
      onHome={onHome}
      onCompare={onCompare}
    />
  )
}

// ─── Details step ────────────────────────────────────────────────────────────

function CompareDetails({ answers, setAnswers, isFinance, onBack, onContinue, onHome, onCompare }) {
  return (
    <div className="motifi-screen compare-pre">
      <TopNav current="compare" onHome={onHome} onStart={() => {}} onCompare={onCompare} />

      <div className="cmp-pre">
        <div className="kicker">◆ Compare cars · Step 1 of 2</div>
        <h1>Already know what you're <em>looking for?</em></h1>
        <p className="lede">
          Tell us a bit about how you're paying and we'll show you the true four-year
          cost for every car you put head-to-head.
        </p>

        <div className="cmp-pre-form">
          <label>
            <span className="lbl">Your postcode</span>
            <input
              type="text"
              placeholder="e.g. SW1A 1AA"
              value={answers.postcode || ''}
              onChange={e => setAnswers(p => ({ ...p, postcode: e.target.value }))}
            />
          </label>

          <label>
            <span className="lbl">How are you planning to pay?</span>
            <div className="cmp-pre-chips">
              {['Cash', 'Part Exchange', 'Hire Purchase', 'Bank Loan'].map(opt => {
                const selected = (answers.paymentMethod || answers.purchaseMethod) === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    className={'cmp-pre-chip' + (selected ? ' selected' : '')}
                    onClick={() => setAnswers(p => ({ ...p, paymentMethod: opt, purchaseMethod: opt }))}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </label>

          {isFinance && (
            <label>
              <span className="lbl">Deposit amount (£)</span>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={answers.depositAmount || ''}
                onChange={e => setAnswers(p => ({ ...p, depositAmount: e.target.value }))}
              />
            </label>
          )}

          <button
            className="btn lg"
            onClick={onContinue}
            disabled={!(answers.paymentMethod || answers.purchaseMethod)}
          >
            Choose my cars<span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Select step ─────────────────────────────────────────────────────────────

function CompareSelect({
  cars, selectedCars, setSelectedCars,
  brandFilter, setBrandFilter, bodyFilter, setBodyFilter,
  onBack, onCompare, onHome, onCompareNav,
}) {
  const brands = useMemo(() => [...new Set(cars.map(c => c.make))].sort(), [cars])
  const bodyTypes = ['Hatchback', 'Saloon', 'Estate', 'SUV', 'Crossover', 'MPV', 'Coupe', 'Van']

  const filtered = useMemo(() => cars
    .filter(car => {
      const matchBrand = !brandFilter || car.make === brandFilter
      const matchBody  = !bodyFilter  || (car.bodyType || '').toLowerCase().includes(bodyFilter.toLowerCase())
      return matchBrand && matchBody
    })
    .sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)),
    [cars, brandFilter, bodyFilter]
  )

  function toggle(car) {
    const key = `${car.make} ${car.model} ${car.generationName}`
    const exists = selectedCars.find(c => `${c.make} ${c.model} ${c.generationName}` === key)
    if (exists) {
      setSelectedCars(prev => prev.filter(c => `${c.make} ${c.model} ${c.generationName}` !== key))
    } else if (selectedCars.length < 3) {
      setSelectedCars(prev => [...prev, car])
    }
  }

  return (
    <div className="motifi-screen compare-pre">
      <TopNav current="compare" onHome={onHome} onStart={() => {}} onCompare={onCompareNav} />

      <div className="cmp-pre">
        <div className="kicker">◆ Compare cars · Step 2 of 2</div>
        <h1>Choose up to <em>three.</em></h1>
        <p className="lede">
          Filter by brand or body type to narrow the list. The order you pick them in
          becomes the column order on the comparison page.
        </p>

        <div className="cmp-select-filters">
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
            <option value="">All brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={bodyFilter} onChange={e => setBodyFilter(e.target.value)}>
            <option value="">All body types</option>
            {bodyTypes.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {selectedCars.length > 0 && (
          <div className="cmp-select-pills">
            <span className="cmp-select-pills-lab">SELECTED · {selectedCars.length} of 3</span>
            <div className="cmp-select-pills-row">
              {selectedCars.map((car, i) => (
                <span key={`${car.make}${car.model}${i}`} className="cmp-select-pill">
                  <span className="opt">{COL_LETTERS[i]}</span>
                  {car.make} {car.model}
                  <button onClick={() => toggle(car)} aria-label="Remove">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="cmp-select-list">
          {filtered.map(car => {
            const key = `${car.make} ${car.model} ${car.generationName}`
            const selected = selectedCars.find(c => `${c.make} ${c.model} ${c.generationName}` === key)
            const disabled = !selected && selectedCars.length >= 3
            return (
              <button
                key={key}
                type="button"
                className={'cmp-select-row' + (selected ? ' selected' : '') + (disabled ? ' disabled' : '')}
                onClick={() => !disabled && toggle(car)}
              >
                <span className="cmp-select-row-name">
                  <strong>{car.make} {car.model}</strong>
                  <span className="trim">{car.generationName} · {car.generationYears}</span>
                </span>
                <span className="cmp-select-row-price">{fmtGBP(getRepresentativePrice(car))}</span>
              </button>
            )
          })}
        </div>

        <div className="cmp-select-cta">
          <button className="btn ghost" onClick={onBack}>
            <span className="arrow back" aria-hidden="true"></span> Back
          </button>
          <button className="btn lg" onClick={onCompare} disabled={selectedCars.length < 1}>
            Compare {selectedCars.length} {selectedCars.length === 1 ? 'car' : 'cars'}
            <span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Comparison view (the big one) ───────────────────────────────────────────

function CompareResults({
  cars, answers, viewMode, setViewMode,
  onClearAll, onRemoveCar, onAddCar, onSelectCar,
  onHome, onCompare,
}) {
  // Build the metric grid + verdict once per render.
  // useMemo ensures we don't recompute on cosmetic state changes.
  const { sections, totalMetrics } = useMemo(
    () => buildComparison(cars, answers),
    [cars, answers]
  )
  const verdict = useMemo(
    () => getOverallVerdict(cars, answers),
    [cars, answers]
  )

  // Filter rows when view mode is 'differences'. A row "differs" if at least
  // one cell carries a 'best' or 'worst' verdict — i.e. there's spread in
  // the values. All-middle rows get hidden.
  const visibleSections = useMemo(() => {
    if (viewMode === 'full') return sections
    return sections.map(s => ({
      ...s,
      rows: s.rows.filter(r => r.cells.some(c => c.verdict === 'best' || c.verdict === 'worst')),
    })).filter(s => s.rows.length > 0)
  }, [sections, viewMode])

  if (cars.length === 0) {
    return (
      <div className="motifi-screen compare">
        <TopNav current="compare" onHome={onHome} onStart={() => {}} onCompare={onCompare} />
        <div className="cmp-empty">
          <h1>No cars selected.</h1>
          <p>Add at least one car to start comparing.</p>
          <button className="btn lg" onClick={onAddCar}>
            Add a car<span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    )
  }

  const slotsLeft = Math.max(0, 3 - cars.length)

  return (
    <div className="motifi-screen compare">
      <TopNav current="compare" onHome={onHome} onStart={() => {}} onCompare={onCompare} />

      {/* ─── Page header ───────────────────────────────────────────────────── */}
      <div className="cmp-head">
        <div className="cmp-head-l">
          <div className="cmp-head-kicker">
            ◆ Comparison · {cars.length} of up to 3 cars · {totalMetrics} metrics
          </div>
          <h1 className="cmp-head-h1">
            Head <br />to <em>head.</em>
          </h1>
        </div>
        <div className="cmp-head-r">
          <div className="cmp-view-toggle" role="radiogroup" aria-label="View mode">
            <span className="cmp-view-lab">View</span>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'full'}
              className={'cmp-view-btn' + (viewMode === 'full' ? ' on' : '')}
              onClick={() => setViewMode('full')}
            >Full</button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'differences'}
              className={'cmp-view-btn' + (viewMode === 'differences' ? ' on' : '')}
              onClick={() => setViewMode('differences')}
            >Differences only</button>
          </div>
          <button className="btn ghost sm" onClick={onClearAll}>Clear all</button>
        </div>
      </div>

      {/* ─── Selected pills row ────────────────────────────────────────────── */}
      <div className="cmp-selected">
        <span className="cmp-selected-lab">◆ Selected</span>
        <div className="cmp-selected-row">
          {cars.map((car, i) => (
            <span key={i} className="cmp-selected-pill">
              <span className="opt">{COL_LETTERS[i]}</span>
              {car.make} {car.model}
              <button onClick={() => onRemoveCar(i)} aria-label={`Remove ${car.make} ${car.model}`}>×</button>
            </span>
          ))}
          {slotsLeft > 0 && (
            <button className="cmp-selected-add" onClick={onAddCar}>
              + Add car
            </button>
          )}
        </div>
      </div>

      {/* ─── Hero strip — metric column + 1–3 car columns ─────────────────── */}
      <div className="cmp-hero">
        <CompareGrid cars={cars}>
          <div className="cmp-hero-meta">
            <div className="cmp-hero-meta-kicker">◆ Metric</div>
            <h2 className="cmp-hero-meta-h2">{totalMetrics} points <br />of truth</h2>
            <p className="cmp-hero-meta-lede">
              Mint = best in set. Coral = trails. Switch to "Differences only"
              to fade rows where all cars match.
            </p>
          </div>
          {cars.map((car, i) => (
            <CarColumnHero
              key={i}
              car={car}
              optLetter={COL_LETTERS[i]}
              onRemove={() => onRemoveCar(i)}
              answers={answers}
            />
          ))}
          {slotsLeft > 0 && <EmptySlotHero slotsLeft={slotsLeft} onAdd={onAddCar} />}
        </CompareGrid>
      </div>

      {/* ─── Metric sections ───────────────────────────────────────────────── */}
      {visibleSections.map(section => (
        <Section key={section.id} section={section} cars={cars} slotsLeft={slotsLeft} />
      ))}

      {visibleSections.length === 0 && (
        <div className="cmp-no-diff">
          <p>These cars match on every metric we measure. Try adding a different one.</p>
        </div>
      )}

      {/* ─── Verdict panel ─────────────────────────────────────────────────── */}
      {verdict && cars.length >= 2 && (
        <VerdictPanel
          verdict={verdict}
          onSelectCar={onSelectCar}
        />
      )}
    </div>
  )
}

// ─── Compare grid — shared layout primitive ──────────────────────────────────
// 4 fixed columns (label + 3 cars) regardless of how many cars are picked.
// Empty slots fade visually so the rhythm stays consistent.
function CompareGrid({ children }) {
  return <div className="cmp-grid">{children}</div>
}

// ─── Car column hero ─────────────────────────────────────────────────────────

function CarColumnHero({ car, optLetter, onRemove, answers }) {
  const cy        = getYearOneCost(car, answers)
  const repPrice  = getRepresentativePrice(car)
  const isFinance = ['Hire Purchase', 'Hire Purchase (HP)', 'Personal Contract Purchase (PCP)']
    .includes(answers?.paymentMethod || answers?.purchaseMethod)
  const monthly   = isFinance && cy?.financeMonthly ? cy.financeMonthly : null

  return (
    <div className="cmp-col cmp-col-hero">
      <div className="cmp-col-top">
        <span className="cmp-col-brand">
          ◆ <strong>{(car.make || '').toUpperCase()}</strong>
          <span className="opt">OPT {optLetter}</span>
        </span>
        <button className="cmp-col-x" onClick={onRemove} aria-label="Remove">×</button>
      </div>

      <h3 className="cmp-col-name">{car.model}</h3>
      <div className="cmp-col-trim">
        {[car.generationName, car.transmission, car.generationYears].filter(Boolean).join(' · ')}
      </div>

      <div className="cmp-col-photo">
        <img
          src={imaginUrl(car)}
          alt={`${car.make} ${car.model}`}
          onError={(e) => { e.currentTarget.style.opacity = '0.15' }}
        />
      </div>

      <div className="cmp-col-price">
        <span className="v">{fmtGBP(repPrice)}</span>
        {monthly && <span className="mo">{fmtGBP(monthly)}/mo</span>}
      </div>
    </div>
  )
}

// ─── Empty slot ──────────────────────────────────────────────────────────────

function EmptySlotHero({ slotsLeft, onAdd }) {
  return (
    <button className="cmp-col cmp-col-empty" onClick={onAdd}>
      <div className="cmp-col-empty-plus">+</div>
      <div className="cmp-col-empty-lab">Add another</div>
      <div className="cmp-col-empty-sub">{slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left</div>
    </button>
  )
}

// ─── Section block ───────────────────────────────────────────────────────────

function Section({ section, cars, slotsLeft }) {
  return (
    <div className="cmp-section">
      <div className="cmp-section-head">
        <div className="cmp-section-num">§ {section.number}</div>
        <h2 className="cmp-section-title">{section.title}</h2>
        <span className="cmp-section-count">{section.rows.length} metrics</span>
      </div>

      {section.rows.map((row, ri) => (
        <Row key={ri} row={row} cars={cars} slotsLeft={slotsLeft} />
      ))}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({ row, cars, slotsLeft }) {
  return (
    <div className={'cmp-row' + (row.headline ? ' headline' : '')}>
      <CompareGrid>
        <div className="cmp-row-lab">
          <div className="cmp-row-lab-k">{row.label}</div>
          {row.sub && <div className="cmp-row-lab-sub">{row.sub}</div>}
        </div>

        {row.cells.map((cell, ci) => (
          <Cell key={ci} cell={cell} />
        ))}

        {slotsLeft > 0 && Array.from({ length: slotsLeft }).map((_, i) => (
          <div key={`empty-${i}`} className="cmp-cell empty" />
        ))}
      </CompareGrid>
    </div>
  )
}

// ─── Cell ────────────────────────────────────────────────────────────────────

function Cell({ cell }) {
  const cls = ['cmp-cell']
  if (cell.verdict === 'best')   cls.push('best')
  if (cell.verdict === 'worst')  cls.push('worst')
  if (cell.verdict === 'middle') cls.push('middle')
  if (cell.verdict === null)     cls.push('plain')

  // Verdict tag glyph + label
  let verdictTag = null
  if (cell.verdict === 'best')   verdictTag = <span className="cmp-tag best">↑ Best of set</span>
  if (cell.verdict === 'worst')  verdictTag = <span className="cmp-tag worst">↓ Trails</span>
  if (cell.verdict === 'middle') verdictTag = <span className="cmp-tag middle">— Middle of pack</span>

  return (
    <div className={cls.join(' ')}>
      <div className="cmp-cell-v">{cell.displayValue}</div>
      {cell.subValue && <div className="cmp-cell-sub">{cell.subValue}</div>}
      {verdictTag}
      {cell.verdict && (
        <div className="cmp-cell-bar">
          <i style={{ width: `${Math.round((cell.position || 0) * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

// ─── Verdict panel (light cream pull-quote band) ─────────────────────────────

function VerdictPanel({ verdict, onSelectCar }) {
  const { winnerCar, copy, recommendedReasons } = verdict
  const repPrice = getRepresentativePrice(winnerCar)
  const retained = Math.round(getRetainedAfter48Months(winnerCar) * 100)

  return (
    <div className="cmp-verdict">
      <div className="cmp-verdict-inner">
        <div className="cmp-verdict-l">
          <div className="cmp-verdict-kicker">◆ Our verdict</div>
          <h2 className="cmp-verdict-h2">
            On true four-year cost,<br />
            the <em>{winnerCar.make} {winnerCar.model}</em><br />
            takes it.
          </h2>
          <p className="cmp-verdict-copy">{renderMarkdown(copy)}</p>
        </div>

        <aside className="cmp-verdict-r">
          <div className="cmp-verdict-card">
            <div className="cmp-verdict-card-photo">
              <img
                src={imaginUrl(winnerCar)}
                alt={`${winnerCar.make} ${winnerCar.model}`}
                onError={(e) => { e.currentTarget.style.opacity = '0.15' }}
              />
            </div>

            <div className="cmp-verdict-card-tags">
              <span className="dot" /> Recommended · Lowest true cost
            </div>

            <h3 className="cmp-verdict-card-name">
              {winnerCar.make} {winnerCar.model}
            </h3>
            <div className="cmp-verdict-card-meta">
              {fmtGBP(repPrice)} · {winnerCar.generationYears}
            </div>

            <div className="cmp-verdict-card-reasons">
              {recommendedReasons.map((r, i) => (
                <div key={i} className="cmp-reason">
                  <span className="cmp-reason-arrow">→</span>
                  <div>
                    <div className="cmp-reason-lab">{r.label}</div>
                    <div className="cmp-reason-val">{r.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cmp-verdict-card-cta">
              <button className="btn" onClick={() => onSelectCar(winnerCar)}>
                Full review<span className="arrow" aria-hidden="true"></span>
              </button>
              <button className="btn ghost" onClick={() => onSelectCar(winnerCar)}>
                Find local stock
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
