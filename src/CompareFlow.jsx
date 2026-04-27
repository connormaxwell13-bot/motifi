// CompareFlow.jsx — Session 3.5
// Reworked entry & picker flow.
//
// Steps:
//   1. landing  — empty "Pick your contenders." page (only when no cars + no postcode)
//   2. picker   — modal: search + body-type multi-select + 2-col grid (replaces old Select step)
//   3. results  — comparison view (always shown if at least 1 car is selected)
//
// Postcode is collected once (centred modal) before the picker first opens.
// Persisted on the answers object for the rest of the session.
//
// Warm-from-Results path (`preloaded`) skips landing AND postcode entirely:
// Cooper already collected postcode on review screen, so we trust it.

import { useEffect, useMemo, useState } from 'react'
import TopNav from './TopNav'
import carsData from './data/cars.json'
import { getYearOneCost, getRepresentativePrice, getRetainedAfter48Months } from './scoring/costs.jsx'
import { buildComparison, getOverallVerdict } from './scoring/verdict.jsx'
import './design/tokens.css'
import './design/screens.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function imaginUrl(car) {
  const make    = (car.make || '').toLowerCase()
  const family  = (car.model || '').split(' ')[0].toLowerCase()
  const year    = car.generationYears?.split(/[—-]/)[0]?.trim() || '2022'
  return `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(family)}&modelYear=${year}&angle=23&paintdescription=grey`
}

const fmtGBP = (n) => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB')
const COL_LETTERS = ['A', 'B', 'C']
const MAX_CARS = 3

// UK postcode regex — accepts standard formats with or without internal space.
// Source-of-truth for validation; the polite hint fires when this fails.
const POSTCODE_REGEX = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}$/i

// Body types that show as picker chips. Single source for chip generation.
const BODY_TYPES = ['Hatchback', 'SUV', 'Estate', 'Saloon', 'Crossover', 'MPV', 'Coupe', 'Van']

// Tiny debounce hook for the picker search box.
function useDebounced(value, delay = 150) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function CompareFlow({ onBack, onSelectCar, onHome, onCompare, preloaded }) {
  // Initialise from preloaded if Cooper-warm; otherwise empty cold start.
  const [answers, setAnswers]           = useState(preloaded?.answers || {})
  const [selectedCars, setSelectedCars] = useState(preloaded?.cars?.slice(0, MAX_CARS) || [])
  const [viewMode, setViewMode]         = useState('full') // 'full' | 'differences'

  // UI state — modals
  const [postcodeModalOpen, setPostcodeModalOpen] = useState(false)
  const [pickerOpen, setPickerOpen]               = useState(false)

  const hasPostcode = !!(answers?.postcode && POSTCODE_REGEX.test(answers.postcode))

  // Trigger the picker. If postcode isn't on file, ask for it first; the
  // modal sets postcode then re-fires this function.
  function openPicker() {
    if (!hasPostcode) {
      setPostcodeModalOpen(true)
      return
    }
    setPickerOpen(true)
  }

  function onPostcodeConfirmed(postcode) {
    setAnswers(prev => ({ ...prev, postcode }))
    setPostcodeModalOpen(false)
    // After confirming postcode, immediately open the picker — that's what
    // the user was trying to do.
    setPickerOpen(true)
  }

  function addCar(car) {
    if (selectedCars.length >= MAX_CARS) return
    const key = `${car.make}|${car.model}|${car.generationName}`
    const exists = selectedCars.some(c => `${c.make}|${c.model}|${c.generationName}` === key)
    if (exists) return
    setSelectedCars(prev => [...prev, car])
  }

  function removeCar(idx) {
    setSelectedCars(prev => prev.filter((_, i) => i !== idx))
  }

  function clearAll() {
    setSelectedCars([])
  }

  // ─── Routing ──────────────────────────────────────────────────────────────
  // Show landing page when there are no cars yet AND we're not warm-loaded
  // from Cooper. Otherwise show the comparison view.
  const showLanding = selectedCars.length === 0

  return (
    <>
      {showLanding ? (
        <CompareLanding
          onBrowse={openPicker}
          onAddCar={openPicker}
          onHome={onHome}
          onCompare={onCompare}
        />
      ) : (
        <CompareResults
          cars={selectedCars}
          answers={answers}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onClearAll={clearAll}
          onRemoveCar={removeCar}
          onAddCar={openPicker}
          onSelectCar={onSelectCar}
          onHome={onHome}
          onCompare={onCompare}
        />
      )}

      {postcodeModalOpen && (
        <PostcodeModal
          initial={answers?.postcode || ''}
          onCancel={() => setPostcodeModalOpen(false)}
          onConfirm={onPostcodeConfirmed}
        />
      )}

      {pickerOpen && (
        <PickerModal
          allCars={carsData}
          selectedCars={selectedCars}
          onClose={() => setPickerOpen(false)}
          onAdd={(car) => {
            addCar(car)
            // Close after add when this would fill the last slot — otherwise
            // keep open so the user can add a second/third in one session.
            if (selectedCars.length + 1 >= MAX_CARS) {
              setPickerOpen(false)
            }
          }}
        />
      )}
    </>
  )
}

// ─── Landing — empty state ───────────────────────────────────────────────────

function CompareLanding({ onBrowse, onAddCar, onHome, onCompare }) {
  return (
    <div className="motifi-screen compare">
      <TopNav current="compare" onHome={onHome} onStart={() => {}} onCompare={onCompare} />

      <div className="cmp-landing">
        <div className="cmp-landing-head">
          <div className="cmp-landing-l">
            <div className="cmp-head-kicker">◆ Comparison · Empty</div>
            <h1 className="cmp-head-h1">
              Pick your<br /><em>contenders.</em>
            </h1>
          </div>
          <div className="cmp-landing-r">
            <button className="btn lg" onClick={onAddCar}>
              Add a car<span className="arrow" aria-hidden="true"></span>
            </button>
          </div>
        </div>

        <div className="cmp-landing-card">
          <div className="cmp-landing-kicker">◆ Nothing to compare</div>
          <h2 className="cmp-landing-h2">
            Add up to 3 cars to begin.
          </h2>
          <p className="cmp-landing-lede">
            We'll line them up on 18 metrics across cost, ownership, practicality
            and reliability — and pick a winner on true four-year cost.
          </p>
          <button className="btn lg" onClick={onBrowse}>
            Browse the index<span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Postcode modal ──────────────────────────────────────────────────────────

function PostcodeModal({ initial, onCancel, onConfirm }) {
  const [v, setV]         = useState(initial || '')
  const [touched, setTouched] = useState(false)

  const isValid = POSTCODE_REGEX.test(v.trim())
  const showHint = touched && !isValid && v.length > 0

  function submit(e) {
    e?.preventDefault?.()
    setTouched(true)
    if (!isValid) return
    onConfirm(v.trim().toUpperCase())
  }

  // ESC closes
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="cmp-modal-backdrop" onClick={onCancel}>
      <div className="cmp-postcode-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmp-modal-kicker">◆ One thing first</div>
        <h2 className="cmp-modal-h2">
          What's your <em>postcode?</em>
        </h2>
        <p className="cmp-modal-lede">
          We use it to surface live local listings on the cars you compare.
          Stored only for this session.
        </p>

        <form className="cmp-modal-form" onSubmit={submit}>
          <input
            type="text"
            value={v}
            placeholder="e.g. SW1A 1AA"
            autoFocus
            autoCapitalize="characters"
            onChange={(e) => { setV(e.target.value); if (touched) setTouched(false) }}
            aria-invalid={showHint}
          />
          {showHint && (
            <div className="cmp-modal-hint">
              That doesn't look like a UK postcode. Try the full form, e.g. <code>SW1A 1AA</code>.
            </div>
          )}
          <div className="cmp-modal-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn" disabled={!isValid}>
              Continue<span className="arrow" aria-hidden="true"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Picker modal ────────────────────────────────────────────────────────────

function PickerModal({ allCars, selectedCars, onClose, onAdd }) {
  const [query, setQuery]                 = useState('')
  const [bodyFilters, setBodyFilters]     = useState(new Set())
  const debouncedQuery                    = useDebounced(query, 150)

  // ESC closes the modal
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleBody(b) {
    setBodyFilters(prev => {
      const next = new Set(prev)
      if (next.has(b)) next.delete(b)
      else next.add(b)
      return next
    })
  }
  function clearBodyFilters() { setBodyFilters(new Set()) }

  const selectedKeys = useMemo(
    () => new Set(selectedCars.map(c => `${c.make}|${c.model}|${c.generationName}`)),
    [selectedCars]
  )

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    return allCars
      .filter(car => {
        // Body filter — multi-select OR. Empty set = no filter.
        if (bodyFilters.size > 0 && !bodyFilters.has(car.bodyType)) return false
        if (!q) return true
        // Search — make / model / body / fuel / generation name. Case-insensitive.
        const haystack = [
          car.make, car.model, car.bodyType, car.fuelType,
          car.transmission, car.generationName, car.generationYears
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
  }, [allCars, debouncedQuery, bodyFilters])

  const totalShown = filtered.length
  const totalIndex = allCars.length
  const slotsLeft  = MAX_CARS - selectedCars.length

  return (
    <div className="cmp-modal-backdrop" onClick={onClose}>
      <div className="cmp-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmp-picker-head">
          <div>
            <div className="cmp-modal-kicker">
              ◆ Add to comparison · {selectedCars.length}/{MAX_CARS} slots used
            </div>
            <h2 className="cmp-modal-h2">
              Which car <em>next?</em>
            </h2>
          </div>
          <button className="cmp-picker-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="cmp-picker-controls">
          <div className="cmp-picker-search">
            <span className="cmp-picker-search-glyph" aria-hidden="true">⌕</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by make, model or body style…"
              autoFocus
            />
          </div>
          <div className="cmp-picker-chips">
            <button
              type="button"
              className={'cmp-picker-chip' + (bodyFilters.size === 0 ? ' on' : '')}
              onClick={clearBodyFilters}
            >
              All
            </button>
            {BODY_TYPES.map(b => (
              <button
                key={b}
                type="button"
                className={'cmp-picker-chip' + (bodyFilters.has(b) ? ' on' : '')}
                onClick={() => toggleBody(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="cmp-picker-grid">
          {filtered.map(car => {
            const key = `${car.make}|${car.model}|${car.generationName}`
            const isSelected = selectedKeys.has(key)
            const isFull     = !isSelected && slotsLeft <= 0
            const score      = Math.round((Number(car.reliabilityPct) || 0))
            return (
              <button
                key={key}
                type="button"
                className={'cmp-picker-card'
                  + (isSelected ? ' selected' : '')
                  + (isFull ? ' disabled' : '')}
                onClick={() => { if (!isSelected && !isFull) onAdd(car) }}
                disabled={isSelected || isFull}
              >
                <div className="cmp-picker-card-photo">
                  <img
                    src={imaginUrl(car)}
                    alt={`${car.make} ${car.model}`}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.opacity = '0.15' }}
                  />
                </div>
                <div className="cmp-picker-card-body">
                  <div className="cmp-picker-card-brand">
                    ◆ {(car.make || '').toUpperCase()}
                  </div>
                  <div className="cmp-picker-card-name">{car.model}</div>
                  <div className="cmp-picker-card-meta">
                    {fmtGBP(getRepresentativePrice(car))} · {car.bodyType} · {car.fuelType?.split(',')[0]?.trim()} · {score}/100
                  </div>
                </div>
                <span className="cmp-picker-card-add" aria-hidden="true">
                  {isSelected ? '✓' : '+'}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="cmp-picker-empty">
              No cars match your filters. Try clearing them or searching for a make.
            </div>
          )}
        </div>

        <div className="cmp-picker-foot">
          <span>Showing <strong>{totalShown}</strong> of {totalIndex} in index</span>
          <span>◆ Press Esc or click outside to close</span>
        </div>
      </div>
    </div>
  )
}

// ─── Comparison view (largely unchanged from Session 3) ──────────────────────

function CompareResults({
  cars, answers, viewMode, setViewMode,
  onClearAll, onRemoveCar, onAddCar, onSelectCar,
  onHome, onCompare,
}) {
  const { sections, totalMetrics } = useMemo(
    () => buildComparison(cars, answers),
    [cars, answers]
  )
  const verdict = useMemo(
    () => (cars.length >= 2 ? getOverallVerdict(cars, answers) : null),
    [cars, answers]
  )

  const visibleSections = useMemo(() => {
    if (viewMode === 'full') return sections
    return sections.map(s => ({
      ...s,
      rows: s.rows.filter(r => r.cells.some(c => c.verdict === 'best' || c.verdict === 'worst')),
    })).filter(s => s.rows.length > 0)
  }, [sections, viewMode])

  const slotsLeft = Math.max(0, MAX_CARS - cars.length)

  return (
    <div className="motifi-screen compare">
      <TopNav current="compare" onHome={onHome} onStart={() => {}} onCompare={onCompare} />

      {/* Page header */}
      <div className="cmp-head">
        <div className="cmp-head-l">
          <div className="cmp-head-kicker">
            ◆ Comparison · {cars.length} of up to {MAX_CARS} cars · {totalMetrics} metrics
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
          <button className="btn ghost sm" onClick={() => { /* TODO Session 7 */ }}>
            Share results<span className="arrow" aria-hidden="true"></span>
          </button>
          <button className="btn ghost sm" onClick={() => { /* TODO Session 7 */ }}>
            Export PDF<span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      {/* Selected pills */}
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

      {/* Hero strip */}
      <div className="cmp-hero">
        <CompareGrid>
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
          {Array.from({ length: slotsLeft }).map((_, i) => (
            <EmptySlotHero
              key={`empty-${i}`}
              slotsLeft={slotsLeft}
              isFirstEmpty={i === 0}
              onAdd={onAddCar}
            />
          ))}
        </CompareGrid>
      </div>

      {/* Metric sections */}
      {visibleSections.map(section => (
        <Section key={section.id} section={section} cars={cars} slotsLeft={slotsLeft} />
      ))}

      {visibleSections.length === 0 && (
        <div className="cmp-no-diff">
          <p>These cars match on every metric we measure. Try adding a different one.</p>
        </div>
      )}

      {/* Verdict panel — only with 2+ cars */}
      {verdict && cars.length >= 2 && (
        <VerdictPanel verdict={verdict} onSelectCar={onSelectCar} />
      )}
    </div>
  )
}

function CompareGrid({ children }) {
  return <div className="cmp-grid">{children}</div>
}

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

// Empty slot in the hero strip — large hollow mint circle. Hover grey→mint.
// Only the first empty slot gets the interactive treatment; subsequent empty
// slots render as quiet placeholders so the row visual doesn't get noisy.
function EmptySlotHero({ slotsLeft, isFirstEmpty, onAdd }) {
  if (!isFirstEmpty) {
    return <div className="cmp-col cmp-col-empty quiet" aria-hidden="true" />
  }
  return (
    <button className="cmp-col cmp-col-empty interactive" onClick={onAdd}>
      <div className="cmp-col-empty-circle">
        <span className="cmp-col-empty-plus">+</span>
      </div>
      <div className="cmp-col-empty-lab">Add another</div>
      <div className="cmp-col-empty-sub">{slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left</div>
    </button>
  )
}

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
        {Array.from({ length: slotsLeft }).map((_, i) => (
          <div key={`empty-${i}`} className="cmp-cell empty" />
        ))}
      </CompareGrid>
    </div>
  )
}

function Cell({ cell }) {
  const cls = ['cmp-cell']
  if (cell.verdict === 'best')   cls.push('best')
  if (cell.verdict === 'worst')  cls.push('worst')
  if (cell.verdict === 'middle') cls.push('middle')
  if (cell.verdict === null)     cls.push('plain')

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

function VerdictPanel({ verdict, onSelectCar }) {
  const { winnerCar, copy, recommendedReasons } = verdict
  const repPrice = getRepresentativePrice(winnerCar)

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
