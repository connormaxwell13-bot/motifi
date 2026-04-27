// CompareFlow.jsx — Session 2
// Extracted from App.jsx unchanged, plus one addition:
//   `preloaded={{ cars, answers }}` — when present, mount directly in
//   the comparison view with those cars pre-selected. Used by Results'
//   "Compare top 3 →" button. Absent → original Home flow unchanged.

import { useState } from 'react'
import carsData from './data/cars.json'
import { getYearOneCost } from './scoring/costs.jsx'

const C = {
  midnight: '#0F1D35',
  navy: '#1A2E50',
  teal: '#00C896',
  offwhite: '#F5F7FA',
  muted: '#A8B8CC',
  dim: '#4A6080',
  white: '#FFFFFF',
}

export default function CompareFlow({ onBack, onSelectCar, preloaded }) {
  // Initial step + state are seeded from `preloaded` when present so the
  // "Compare top 3 →" entry skips straight into the comparison view.
  const [step, setStep] = useState(preloaded ? 'results' : 'details')
  const [answers, setAnswers] = useState(preloaded?.answers || {})
  const [selectedCars, setSelectedCars] = useState(preloaded?.cars?.slice(0, 3) || [])
  const [brandFilter, setBrandFilter] = useState('')
  const [bodyFilter, setBodyFilter] = useState('')
  const [results, setResults] = useState(preloaded?.cars?.slice(0, 3) || [])

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

  // Honour both keys — Cooper writes paymentMethod, the bespoke details
  // step writes purchaseMethod. Either should mean "treat this as finance".
  const isFinance = ['Hire Purchase (HP)', 'Personal Contract Purchase (PCP)', 'Hire Purchase']
    .includes(answers.purchaseMethod || answers.paymentMethod)

  if (step === 'results') {
    return (
      <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, minHeight: '100vh', color: C.midnight }}>
        <nav style={{ backgroundColor: C.midnight, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
          <button onClick={() => preloaded ? onBack() : setStep('select')} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
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
