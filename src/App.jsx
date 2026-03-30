import React, { useState } from 'react'
import carsData from './data/cars.json'

const COLORS = {
  midnight: '#0F1D35',
  navy: '#1A2E50',
  teal: '#00C896',
  offwhite: '#F5F7FA',
  muted: '#A8B8CC',
  dim: '#4A6080',
}

const questions = [
  { id: 'gender', question: 'What is your gender?', type: 'single', dataOnly: true, options: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'] },
  { id: 'age', question: 'What is your age?', type: 'single', dataOnly: true, options: ['17-24', '25-34', '35-44', '45-54', '55-64', '64+'] },
  { id: 'postcode', question: 'What is your postcode?', type: 'text', dataOnly: true, placeholder: 'e.g. SW1A 1AA' },
  { id: 'radius', question: 'What is your preferred search radius?', type: 'single', dataOnly: true, options: ['Up to 10 miles', 'Up to 25 miles', 'Up to 50 miles', 'Up to 100 miles', 'Nationwide'] },
  { id: 'budget', question: 'What is your budget?', type: 'budget', hint: 'Enter your minimum and maximum budget for a used car.' },
  { id: 'transmission', question: 'Do you have a preferred transmission?', type: 'single', options: ['Automatic', 'Manual', 'No preference'] },
  { id: 'fuel', question: 'Do you have a preferred fuel type?', type: 'single', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'No preference'] },
  { id: 'bodyType', question: 'Do you have a preferred body type?', type: 'single', options: ['Hatchback', 'Saloon', 'Estate', 'SUV', 'Crossover', 'MPV', 'Coupe', 'Van', 'No preference'] },
  { id: 'driving', question: 'Where do you mostly drive?', type: 'single', options: ['Mostly city', 'Mostly motorway', 'Mostly rural', 'Mixed driving'] },
  { id: 'mileage', question: 'Roughly how many miles do you drive per year?', type: 'single', options: ['Under 3,000', '3,000-5,000', '5,000-8,000', '8,000-15,000', '15,000+'] },
  { id: 'runningCosts', question: 'How important are low running costs?', type: 'single', options: ['Not a concern', 'Something I would consider', 'Somewhat important', 'Extremely important'] },
  { id: 'space', question: 'How much space do you need?', type: 'single', options: ['Just me / couple', 'Small family', 'Family + luggage', 'As much as possible'] },
  { id: 'reliability', question: 'Do you want something very reliable, or are you happy with a bit of risk?', type: 'single', options: ['Maximum reliability', 'Balanced', 'Happy with some risk'] },
  { id: 'ulez', question: 'Do you need the car to be ULEZ compliant?', type: 'single', options: ['Yes', 'No', 'Indifferent'] },
]

function clamp(val, min = 0, max = 10) {
  return Math.min(max, Math.max(min, val))
}

function scoreCar(car, answers) {
  const budget = parseFloat(answers.budgetMax) || 0
  const price = parseFloat(car.price) || 0

  // ── HARD FILTERS ──────────────────────────────────────────
  if (price > budget * 1.10) return null

  if (answers.transmission !== 'No preference') {
    const t = car.transmission || ''
    if (answers.transmission === 'Automatic' && !t.toLowerCase().includes('automatic')) return null
    if (answers.transmission === 'Manual' && !t.toLowerCase().includes('manual')) return null
  }

  if (answers.fuel !== 'No preference') {
    const f = car.fuelType || ''
    if (!f.toLowerCase().includes(answers.fuel.toLowerCase())) return null
  }

  if (answers.ulez === 'Yes' && car.ulezCompliance === 'Low') return null

  if (answers.space === 'As much as possible' && car.bootSize === 'Small') return null

  if (answers.bodyType !== 'No preference') {
    const bt = (car.bodyType || '').toLowerCase()
    const want = answers.bodyType.toLowerCase()
    if (!bt.includes(want) && !want.includes(bt)) return null
  }

  // ── BUDGET FIT (1/6) ──────────────────────────────────────
  const ratio = price / budget
  let priceScore = 0
  if (ratio <= 0.70) priceScore = 10
  else if (ratio <= 0.80) priceScore = 9
  else if (ratio <= 0.90) priceScore = 8
  else if (ratio <= 1.00) priceScore = 7
  else if (ratio <= 1.10) priceScore = 4
  else priceScore = 0

  const depScores = { Low: 10, Medium: 6, High: 2 }
  const depScore = depScores[car.depreciationBand] || 5
  const budgetFit = clamp((0.70 * priceScore) + (0.30 * depScore))

  // ── DRIVING FIT (2/6) ─────────────────────────────────────
  const mpgAdjust = { Excellent: 1, 'Very Good': 1, Good: 0, Average: -1, Poor: -2 }
  const mpgAdj = mpgAdjust[car.mpgBand] || 0
  const seg = car.segment || ''
  let drivingBase = 5

  if (answers.driving === 'Mostly city') {
    const urbanBase = { High: 10, Medium: 6, Low: 2 }
    drivingBase = urbanBase[car.urbanSuitability] || 5
    const segAdj = { Supermini: 1, 'Family Hatchback': 1, 'Compact SUV': 0, 'Large SUV': -2, Executive: -2, Van: -3 }
    drivingBase += (segAdj[seg] || 0)
  } else if (answers.driving === 'Mostly motorway') {
    const segBase = { Estate: 9, 'Family Saloon': 9, Executive: 9, 'Large SUV': 8, 'Family Hatchback': 7, 'Compact SUV': 7, Supermini: 4, MPV: 6, Van: 5 }
    drivingBase = segBase[seg] || 6
  } else if (answers.driving === 'Mostly rural') {
    const segBase = { 'Large SUV': 9, 'Compact SUV': 8, Estate: 8, 'Family Hatchback': 7, 'Family Saloon': 7, Supermini: 6, Executive: 6, Van: 7, MPV: 7 }
    drivingBase = segBase[seg] || 6
  } else {
    const segBase = { 'Family Hatchback': 9, 'Compact SUV': 8, Estate: 8, 'Family Saloon': 8, Supermini: 7, 'Large SUV': 6, Executive: 6, MPV: 6, Van: 4 }
    drivingBase = segBase[seg] || 6
    const urbanAdj = { High: 1, Medium: 0, Low: -1 }
    drivingBase += (urbanAdj[car.urbanSuitability] || 0)
  }
  const drivingFit = clamp(drivingBase + mpgAdj)

  // ── SPACE FIT (3/6) ───────────────────────────────────────
  const spaceScores = {
    'Just me / couple': { Small: 10, Medium: 9, Large: 7, 'Very Large': 5 },
    'Small family': { Small: 3, Medium: 7, Large: 9, 'Very Large': 10 },
    'Family + luggage': { Small: 1, Medium: 4, Large: 8, 'Very Large': 10 },
    'As much as possible': { Small: 0, Medium: 3, Large: 8, 'Very Large': 10 },
  }
  let spaceFit = (spaceScores[answers.space] || spaceScores['Just me / couple'])[car.bootSize] || 5
  if (['Family + luggage', 'As much as possible'].includes(answers.space)) {
    if (['Estate', 'MPV', 'Large SUV'].includes(seg)) spaceFit += 1
    if (['Sports / Performance'].includes(seg)) spaceFit -= 2
  }
  spaceFit = clamp(spaceFit)

  // flag conflict
  const bodySpaceConflict = answers.bodyType !== 'No preference' &&
    ['Hatchback', 'Saloon', 'Coupe'].includes(answers.bodyType) &&
    ['Family + luggage', 'As much as possible'].includes(answers.space)

  // ── RUNNING COST FIT (4/6) ────────────────────────────────
  const mpgScores = { Excellent: 10, 'Very Good': 8, Good: 6, Average: 4, Poor: 2 }
  const mpgScore = mpgScores[car.mpgBand] || 5
  const insScores = { Low: 10, Medium: 6, High: 3, 'Very High': 1 }
  const insScore = insScores[car.insuranceBand] || 5

  let mpgW = 0.5, insW = 0.5
  if (['Under 3,000', '3,000-5,000'].includes(answers.mileage)) { mpgW = 0.40; insW = 0.60 }
  else if (answers.mileage === '5,000-8,000') { mpgW = 0.50; insW = 0.50 }
  else if (answers.mileage === '8,000-15,000') { mpgW = 0.60; insW = 0.40 }
  else if (answers.mileage === '15,000+') { mpgW = 0.70; insW = 0.30 }
  const runningFit = clamp((mpgW * mpgScore) + (insW * insScore))

  // ── OWNERSHIP EASE (5/6) ──────────────────────────────────
  const relScores = { '8-10': 10, '6-8': 7, '4-6': 4, '1-4': 1 }
  const relScore = relScores[car.reliabilityScore] || 5
  const stressScores = { Low: 10, Medium: 6, High: 2 }
  const stressScore = stressScores[car.ownershipStress] || 5

  let ownershipFit
  if (answers.ulez === 'Yes') {
    const ulezScores = { High: 10, Medium: 5, Low: 0 }
    const ulezScore = ulezScores[car.ulezCompliance] || 5
    ownershipFit = clamp((0.50 * relScore) + (0.30 * stressScore) + (0.20 * ulezScore))
  } else if (answers.reliability === 'Maximum reliability') {
    ownershipFit = clamp((0.70 * relScore) + (0.30 * stressScore))
  } else if (answers.reliability === 'Balanced') {
    ownershipFit = clamp((0.60 * relScore) + (0.40 * stressScore))
  } else {
    ownershipFit = clamp((0.50 * relScore) + (0.50 * stressScore))
  }

  // ── SAFETY (6/6) ──────────────────────────────────────────
  const safetyScores = { '8-10': 10, '6-8': 7, '4-6': 4, '1-4': 1 }
  const safetyFit = clamp(safetyScores[car.safetyScore] || 5)

  // ── WEIGHTS (adjust running cost weight by importance) ─────
  let rcW = 0.15, drivW = 0.20
  if (answers.runningCosts === 'Not a concern') { rcW = 0.10; drivW = 0.25 }
  else if (answers.runningCosts === 'Somewhat important') { rcW = 0.20; drivW = 0.15 }
  else if (answers.runningCosts === 'Extremely important') { rcW = 0.25; drivW = 0.10 }

  // ── FINAL SCORE ───────────────────────────────────────────
  const finalScore = clamp(
    (0.25 * budgetFit) +
    (drivW * drivingFit) +
    (0.20 * spaceFit) +
    (rcW * runningFit) +
    (0.10 * ownershipFit) +
    (0.10 * safetyFit)
  )

  return {
    ...car,
    scores: { budgetFit, drivingFit, spaceFit, runningFit, ownershipFit, safetyFit, finalScore },
    bodySpaceConflict,
  }
}

function getTop3(answers) {
  const results = carsData
    .map(car => scoreCar(car, answers))
    .filter(Boolean)
    .sort((a, b) => b.scores.finalScore - a.scores.finalScore)
  return results.slice(0, 3)
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState([])

  const current = questions[step]
  const progress = (step / questions.length) * 100

  function handleAnswer(value) {
    setAnswers(prev => ({ ...prev, [current.id]: value }))
  }

  function handleNext() {
    if (step < questions.length - 1) {
      setStep(s => s + 1)
    } else {
      const top3 = getTop3(answers)
      setResults(top3)
      setScreen('results')
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
    else setScreen('home')
  }

  function canProceed() {
    if (current.type === 'budget') return answers.budgetMin && answers.budgetMax
    return answers[current.id] !== undefined && answers[current.id] !== ''
  }

  if (screen === 'home') return <Home onStart={() => { setStep(0); setAnswers({}); setScreen('questions') }} />
  if (screen === 'results') return <Results results={results} answers={answers} onBack={() => setScreen('home')} />

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: COLORS.midnight, minHeight: '100vh', color: COLORS.offwhite }}>
      <nav style={{ backgroundColor: COLORS.navy, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => setScreen('home')}>
          Mo<span style={{ color: COLORS.teal }}>ti</span>fi
        </div>
        <div style={{ fontSize: '13px', color: COLORS.muted }}>{step + 1} of {questions.length}</div>
      </nav>

      <div style={{ height: '3px', backgroundColor: COLORS.navy }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: COLORS.teal, transition: 'width 0.3s ease' }} />
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px' }}>
        {current.dataOnly && (
          <div style={{ display: 'inline-block', backgroundColor: COLORS.navy, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '500', color: COLORS.teal, letterSpacing: '0.05em', marginBottom: '20px' }}>
            FOR PERSONALISATION ONLY
          </div>
        )}
        <h2 style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1.3', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {current.question}
        </h2>
        {current.hint && <p style={{ fontSize: '14px', color: COLORS.muted, marginBottom: '32px', lineHeight: '1.6' }}>{current.hint}</p>}

        <div style={{ marginTop: '32px' }}>
          {current.type === 'single' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {current.options.map(opt => {
                const selected = answers[current.id] === opt
                return (
                  <button key={opt} onClick={() => handleAnswer(opt)} style={{ backgroundColor: selected ? COLORS.teal : COLORS.navy, color: selected ? COLORS.midnight : COLORS.offwhite, border: `1.5px solid ${selected ? COLORS.teal : '#2A4060'}`, borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: selected ? '700' : '400', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {current.type === 'text' && (
            <input type="text" placeholder={current.placeholder} value={answers[current.id] || ''} onChange={e => handleAnswer(e.target.value)} style={{ width: '100%', backgroundColor: COLORS.navy, color: COLORS.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '16px', outline: 'none' }} />
          )}

          {current.type === 'budget' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[{ key: 'budgetMin', label: 'Minimum budget', placeholder: '5000' }, { key: 'budgetMax', label: 'Maximum budget', placeholder: '15000' }].map(({ key, label, placeholder }) => (
                <div key={key} style={{ flex: '1', minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>{label}</label>
                  <input type="number" placeholder={placeholder} value={answers[key] || ''} onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))} style={{ width: '100%', backgroundColor: COLORS.navy, color: COLORS.offwhite, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '16px 20px', fontFamily: 'Satoshi, sans-serif', fontSize: '16px', outline: 'none' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <button onClick={handleBack} style={{ backgroundColor: 'transparent', color: COLORS.muted, border: '1.5px solid #2A4060', borderRadius: '10px', padding: '14px 24px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
            Back
          </button>
          <button onClick={handleNext} disabled={!canProceed()} style={{ backgroundColor: canProceed() ? COLORS.teal : '#1A2E50', color: canProceed() ? COLORS.midnight : COLORS.dim, border: 'none', borderRadius: '10px', padding: '14px 32px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: '700', cursor: canProceed() ? 'pointer' : 'not-allowed', transition: 'all 0.15s ease' }}>
            {step === questions.length - 1 ? 'Find my car' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Home({ onStart }) {
  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#0F1D35', minHeight: '100vh', color: '#F5F7FA' }}>

      {/* Nav */}
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '0 32px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em' }}>Mo<span style={{ color: '#00C896' }}>ti</span>fi</div>
        <button onClick={onStart} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '8px', padding: '10px 22px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Find my car</button>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', height: '92vh', minHeight: '600px', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1800&q=80"
          alt="Car on road"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,29,53,0.95) 40%, rgba(15,29,53,0.4) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8%', paddingTop: '72px' }}>
          <div style={{ maxWidth: '600px' }}>
            <div style={{ display: 'inline-block', backgroundColor: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.4)', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', fontWeight: '500', color: '#00C896', letterSpacing: '0.06em', marginBottom: '28px' }}>
              INTELLIGENT CAR MATCHING
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: '900', lineHeight: '1.05', letterSpacing: '-0.04em', marginBottom: '24px' }}>
              The smarter way<br />to find your<br /><span style={{ color: '#00C896' }}>next car.</span>
            </h1>
            <p style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.7', color: '#A8B8CC', marginBottom: '36px', maxWidth: '440px' }}>
              Answer a few simple questions. We score every car in our database against your answers and surface your three best matches — with the true cost of ownership made clear.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={onStart} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '10px', padding: '16px 32px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
                Find my car →
              </button>
              <button onClick={onStart} style={{ backgroundColor: 'transparent', color: '#F5F7FA', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '16px 32px', fontFamily: 'Satoshi, sans-serif', fontWeight: '500', fontSize: '16px', cursor: 'pointer' }}>
                How it works
              </button>
            </div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '48px' }}>
              {[['105+', 'Cars rated'], ['6', 'Scoring dimensions'], ['Free', 'Always']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#00C896' }}>{val}</div>
                  <div style={{ fontSize: '12px', color: '#A8B8CC', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ backgroundColor: '#0F1D35', padding: '80px 8%' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#00C896', letterSpacing: '0.06em', marginBottom: '14px' }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.1' }}>From questions to your perfect car<br />in under 3 minutes.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { step: '01', title: 'Tell us about yourself', body: 'Budget, driving habits, space needs, fuel preference. Simple questions, no jargon.' },
            { step: '02', title: 'We score every car', body: 'Our engine scores 105+ cars across 6 dimensions — budget fit, running costs, safety and more.' },
            { step: '03', title: 'Get your three matches', body: 'Your top three cars, ranked by match score, with a plain-English explanation for each.' },
            { step: '04', title: 'Know the real cost', body: 'Insurance band, MPG, depreciation and ownership stress — all surfaced upfront.' },
          ].map(({ step, title, body }) => (
            <div key={step} style={{ backgroundColor: '#1A2E50', borderRadius: '16px', padding: '32px 28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '64px', fontWeight: '900', color: 'rgba(0,200,150,0.08)', position: 'absolute', top: '12px', right: '20px', lineHeight: 1 }}>{step}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#00C896', marginBottom: '14px', letterSpacing: '0.02em' }}>{step}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', lineHeight: '1.3' }}>{title}</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#A8B8CC' }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof strip */}
      <div style={{ backgroundColor: '#1A2E50', padding: '40px 8%' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', textAlign: 'center' }}>
          {[
            { stat: '£15,000', label: 'Average UK used car purchase' },
            { stat: '3 mins', label: 'Average time to your results' },
            { stat: '105+', label: 'Cars in our database' },
            { stat: '6', label: 'Scoring dimensions per car' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#00C896', letterSpacing: '-0.02em' }}>{stat}</div>
              <div style={{ fontSize: '13px', color: '#A8B8CC', marginTop: '6px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo break */}
      <div style={{ position: 'relative', height: '400px', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1800&q=80"
          alt="Cars on motorway"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,29,53,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8%' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '20px' }}>
              No more platform-hopping.<br />No more guesswork.
            </h2>
            <button onClick={onStart} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '10px', padding: '14px 32px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
              Find my car →
            </button>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div style={{ backgroundColor: '#0F1D35', padding: '80px 8%' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#00C896', letterSpacing: '0.06em', marginBottom: '14px' }}>FROM THE MOTIFI GUIDE</div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '900', letterSpacing: '-0.03em' }}>Everything you need to know<br />before buying a used car.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {[
            {
              img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
              tag: 'BUYING GUIDE',
              title: 'The true cost of owning a used car in 2026',
              body: 'Sticker price is just the start. Insurance, fuel, tax, servicing and depreciation all add up — here\'s how to calculate the real number before you commit.',
            },
            {
              img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
              tag: 'RELIABILITY',
              title: 'Which used cars are the most reliable?',
              body: 'Reliability varies enormously by make and model. We break down which cars consistently score highest for long-term ownership peace of mind.',
            },
            {
              img: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
              tag: 'ELECTRIC',
              title: 'Should your next used car be electric?',
              body: 'Used EVs are now genuinely affordable. But are they right for your driving pattern? We look at the real-world case for and against going electric.',
            },
          ].map(({ img, tag, title, body }) => (
            <div key={title} style={{ backgroundColor: '#1A2E50', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ height: '200px', overflow: 'hidden' }}>
                <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00C896', letterSpacing: '0.06em', marginBottom: '10px' }}>{tag}</div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', lineHeight: '1.4', marginBottom: '10px' }}>{title}</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#A8B8CC' }}>{body}</p>
                <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: '600', color: '#00C896' }}>Read more →</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#1A2E50', padding: '40px 8%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em' }}>Mo<span style={{ color: '#00C896' }}>ti</span>fi</div>
          <div style={{ fontSize: '13px', color: '#4A6080' }}>© 2026 Motifi · The smarter way to find your next car</div>
        </div>
      </div>

    </div>
  )
}

function Results({ results, answers, onBack }) {
  const [explanations, setExplanations] = useState({})
  const [loading, setLoading] = useState({})

  React.useEffect(() => {
    // Log to Supabase
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, results }),
    }).catch(err => console.error('Logging failed:', err))

    // Get LLM explanations
    results.forEach((car, i) => {
      setLoading(prev => ({ ...prev, [i]: true }))
fetch('/api/explain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ car, answers }),
})
  .then(r => r.text())
  .then(text => {
    try {
      const data = JSON.parse(text)
      setExplanations(prev => ({ ...prev, [i]: data.explanation || 'Analysis unavailable.' }))
    } catch {
      setExplanations(prev => ({ ...prev, [i]: text || 'Analysis unavailable.' }))
    }
    setLoading(prev => ({ ...prev, [i]: false }))
  })
  .catch(() => {
    setExplanations(prev => ({ ...prev, [i]: 'Analysis unavailable.' }))
    setLoading(prev => ({ ...prev, [i]: false }))
  })
    })
  }, [results])

  if (results.length === 0) {
    return (
      <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#0F1D35', minHeight: '100vh', color: '#F5F7FA' }}>
        <nav style={{ backgroundColor: '#1A2E50', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>Mo<span style={{ color: '#00C896' }}>ti</span>fi</div>
        </nav>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>No exact matches found.</h2>
          <p style={{ fontSize: '16px', color: '#A8B8CC', lineHeight: '1.6', marginBottom: '32px' }}>Try widening your budget or adjusting your preferences.</p>
          <button onClick={onBack} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '10px', padding: '14px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Start again</button>
        </div>
      </div>
    )
  }

  const labels = ['Best match', 'Strong alternative', 'Also worth considering']

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#0F1D35', minHeight: '100vh', color: '#F5F7FA' }}>
      <nav style={{ backgroundColor: '#1A2E50', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>Mo<span style={{ color: '#00C896' }}>ti</span>fi</div>
        <button onClick={onBack} style={{ backgroundColor: 'transparent', color: '#A8B8CC', border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Start again</button>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#00C896', letterSpacing: '0.05em', marginBottom: '12px' }}>YOUR RESULTS</div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.2' }}>Based on what you told us, here are your best matches.</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.map((car, i) => (
            <div key={i} style={{ backgroundColor: '#1A2E50', borderRadius: '16px', padding: '28px', border: i === 0 ? '1.5px solid #00C896' : '1.5px solid #2A4060' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: i === 0 ? '#00C896' : '#A8B8CC', letterSpacing: '0.05em', marginBottom: '6px' }}>{labels[i].toUpperCase()}</div>
                  <h3 style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>{car.make} {car.model}</h3>
                  <div style={{ fontSize: '13px', color: '#A8B8CC', marginTop: '4px' }}>{car.generation} · {car.segment}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#A8B8CC', marginBottom: '4px' }}>Match score</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#00C896' }}>{Math.round(car.scores.finalScore * 10)}%</div>
                </div>
              </div>

              {/* LLM Explanation */}
              <div style={{ backgroundColor: '#0F1D35', borderRadius: '10px', padding: '16px', marginBottom: '16px', minHeight: '60px', display: 'flex', alignItems: 'center' }}>
                {loading[i] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid #00C896', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px', color: '#A8B8CC' }}>Analysing your match...</span>
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#F5F7FA', margin: 0 }}>
                    {explanations[i] || 'Analysis unavailable.'}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Price from', value: car.price ? `£${Number(car.price).toLocaleString()}` : 'N/A' },
                  { label: 'Fuel', value: car.fuelType },
                  { label: 'MPG', value: car.mpgBand },
                  { label: 'Boot size', value: car.bootSize },
                  { label: 'Insurance', value: car.insuranceBand },
                  { label: 'Reliability', value: `Tier ${car.reliabilityTier}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: '#0F1D35', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: '#A8B8CC', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: car.bodySpaceConflict ? '16px' : '0' }}>
                {[
                  { label: 'Budget fit', score: car.scores.budgetFit },
                  { label: 'Driving fit', score: car.scores.drivingFit },
                  { label: 'Space fit', score: car.scores.spaceFit },
                  { label: 'Running cost', score: car.scores.runningFit },
                  { label: 'Ownership ease', score: car.scores.ownershipFit },
                  { label: 'Safety', score: car.scores.safetyFit },
                ].map(({ label, score }) => (
                  <div key={label} style={{ backgroundColor: '#0F1D35', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '10px', color: '#A8B8CC', marginBottom: '4px' }}>{label}</div>
                    <div style={{ height: '4px', backgroundColor: '#1A2E50', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${score * 10}%`, backgroundColor: '#00C896', borderRadius: '2px' }} />
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '4px' }}>{Math.round(score * 10) / 10}/10</div>
                  </div>
                ))}
              </div>

              {car.bodySpaceConflict && (
                <div style={{ backgroundColor: '#2A1F00', border: '1px solid #664400', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#FFB84D', lineHeight: '1.5' }}>
                  You may also want to consider estates or SUVs if space is a priority for you.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
