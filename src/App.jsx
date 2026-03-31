import React, { useState } from 'react'
import carsData from './data/cars.json'
import { questions } from './questions.jsx'
import { applyHardFilters } from './scoring/filters.jsx'
import { scoreAllCars } from './scoring/engine.jsx'
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

function getTop3(answers) {
  const filtered = applyHardFilters(carsData, answers)
  const scored = scoreAllCars(filtered, answers)
  return scored.sort((a, b) => b.scores.finalScore - a.scores.finalScore).slice(0, 3)
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

  if (screen === 'home') return <Home onStart={() => setScreen('questions')} onCompare={() => setScreen('compare')} />
  if (screen === 'results') return <Results results={results} answers={answers} onBack={startOver} onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }} />
  if (screen === 'car') return <CarPage car={selectedCar} answers={answers} onBack={() => setScreen('results')} />
if (screen === 'compare') return <CompareFlow onBack={() => setScreen('home')} onSelectCar={(car) => { setSelectedCar(car); setScreen('car') }} />

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
function Home({ onStart, onCompare }) {
  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, color: C.midnight }}>
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '0 5%', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
        <button onClick={onStart} style={{ backgroundColor: C.teal, color: C.midnight, border: 'none', borderRadius: '8px', padding: '10px 22px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Find my car</button>
      </nav>
      <div style={{ backgroundColor: C.midnight, padding: '140px 5% 100px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', backgroundColor: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '28px' }}>FREE · NO SIGN-UP REQUIRED</div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '900', lineHeight: '1.05', letterSpacing: '-0.04em', color: C.offwhite, maxWidth: '800px', margin: '0 auto 16px' }}>Find your perfect used car.</h1>
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: '1.7', color: C.muted, maxWidth: '480px', margin: '0 auto 12px' }}>Answer a few simple questions. We do the matching — surfacing your three best options with the true cost of ownership made clear.</p>
        <p style={{ fontSize: '14px', color: '#4A8070', maxWidth: '480px', margin: '0 auto 32px', lineHeight: '1.6' }}>Unlike comparison sites, Motifi doesn't show you a list — it tells you which car is right for <em>you</em>, and why.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
  <button onClick={onStart} style={{ backgroundColor: C.teal, color: C.midnight, border: 'none', borderRadius: '50px', padding: '16px 40px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>Find my car →</button>
  <button onClick={onCompare} style={{ backgroundColor: 'transparent', color: C.offwhite, border: `2px solid ${C.teal}`, borderRadius: '50px', padding: '16px 40px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>Compare cars →</button>
</div>
<p style={{ fontSize: '13px', color: C.dim, marginTop: '12px' }}>Already know what you're looking for?</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '56px', flexWrap: 'wrap' }}>
          {[['105+', 'Cars rated'], ['6', 'Scoring dimensions'], ['Free', 'Always free']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: C.teal }}>{val}</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '3px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ backgroundColor: C.offwhite, padding: '80px 5%' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', color: C.midnight, lineHeight: '1.15' }}>Three steps to your best match.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { n: '1', title: 'Tell us what matters', body: 'Budget, driving habits, how much space you need, fuel preference. Simple questions, no jargon, no sign-up.' },
              { n: '2', title: 'We score every car', body: 'Our engine scores 105+ cars across 6 dimensions — budget fit, running costs, safety, reliability and more.' },
              { n: '3', title: 'Get three clear matches', body: 'Your top three cars ranked by match score, each with a plain-English explanation and true cost of ownership.' },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ backgroundColor: C.white, borderRadius: '16px', padding: '32px', border: '1px solid #E8ECF0' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: C.midnight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900', color: C.teal, marginBottom: '20px' }}>{n}</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: C.midnight, marginBottom: '10px' }}>{title}</h3>
                <p style={{ fontSize: '14px', lineHeight: '1.75', color: '#5A7090' }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={onStart} style={{ backgroundColor: C.midnight, color: C.offwhite, border: 'none', borderRadius: '10px', padding: '14px 36px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Start matching →</button>
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: C.navy, padding: '56px 5%' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px', textAlign: 'center' }}>
          {[['£15,000', 'Average UK used car purchase'], ['3 mins', 'Average time to your results'], ['105+', 'Cars in our database'], ['0', 'Sign-ups required']].map(({ 0: stat, 1: label }) => (
            <div key={label}>
              <div style={{ fontSize: '34px', fontWeight: '900', color: C.teal, letterSpacing: '-0.02em' }}>{stat}</div>
              <div style={{ fontSize: '13px', color: C.muted, marginTop: '6px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ backgroundColor: C.offwhite, padding: '80px 5%' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>FROM THE MOTIFI GUIDE</div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '900', letterSpacing: '-0.03em', color: C.midnight }}>Everything you need to know before buying a used car.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', tag: 'BUYING GUIDE', title: 'The true cost of owning a used car in 2026', body: "Sticker price is just the start. Insurance, fuel, tax and depreciation all add up — here's how to calculate the real number." },
              { img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80', tag: 'RELIABILITY', title: 'Which used cars are the most reliable?', body: 'Reliability varies enormously by make and model. We break down which cars score highest for long-term ownership.' },
              { img: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80', tag: 'ELECTRIC', title: 'Should your next used car be electric?', body: 'Used EVs are now genuinely affordable. But are they right for your driving pattern? We look at the real-world case.' },
            ].map(({ img, tag, title, body }) => (
              <div key={title} style={{ backgroundColor: C.white, borderRadius: '16px', overflow: 'hidden', border: '1px solid #E8ECF0', cursor: 'pointer' }}>
                <div style={{ height: '180px', overflow: 'hidden' }}>
                  <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.teal, letterSpacing: '0.06em', marginBottom: '10px' }}>{tag}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.4', marginBottom: '8px', color: C.midnight }}>{title}</h3>
                  <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#5A7090' }}>{body}</p>
                  <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: '700', color: C.midnight }}>Read more →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: C.midnight, padding: '36px 5%' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: '900', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
          <div style={{ fontSize: '13px', color: C.dim }}>© 2026 Motifi · The smarter way to find your next car</div>
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
            setExplanations(prev => ({ ...prev, [i]: data.explanation || '' }))
          } catch {
            setExplanations(prev => ({ ...prev, [i]: text || '' }))
          }
          setLoading(prev => ({ ...prev, [i]: false }))
        })
        .catch(() => setLoading(prev => ({ ...prev, [i]: false })))
    })
  }, [results])

  if (results.length === 0) {
    return (
      <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.midnight, minHeight: '100vh', color: C.offwhite, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>No exact matches found.</h2>
        <p style={{ fontSize: '16px', color: C.muted, marginBottom: '32px' }}>Try widening your budget or adjusting your preferences.</p>
        <button onClick={onBack} style={{ backgroundColor: C.teal, color: C.midnight, border: 'none', borderRadius: '10px', padding: '14px 28px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Start again</button>
      </div>
    )
  }

  const labels = ['Best match', 'Strong alternative', 'Also worth considering']

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, minHeight: '100vh', color: C.midnight }}>
      <nav style={{ backgroundColor: C.midnight, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
        <button onClick={onBack} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>Start again</button>
      </nav>
      <div style={{ backgroundColor: C.midnight, padding: '48px 5% 56px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>YOUR RESULTS</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', color: C.offwhite, lineHeight: '1.2' }}>Based on what you told us,<br />here are your best matches.</h2>
      </div>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {results.map((car, i) => {
            const costs = getYearOneCost(car, answers)
            const isFinance = ['Hire Purchase (HP)', 'Personal Contract Purchase (PCP)'].includes(answers.purchaseMethod)
            return (
              <div key={i} style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', border: i === 0 ? `2px solid ${C.teal}` : '1px solid #E8ECF0', boxShadow: i === 0 ? '0 4px 24px rgba(0,200,150,0.08)' : 'none' }}>
                <div style={{ padding: '28px 28px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: i === 0 ? C.teal : '#8A9AB0', letterSpacing: '0.06em', marginBottom: '6px' }}>{labels[i].toUpperCase()}</div>
                      <h3 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em', color: C.midnight }}>{car.make} {car.model}</h3>
                      <div style={{ fontSize: '13px', color: '#8A9AB0', marginTop: '4px' }}>{car.generation} · {car.segment} · <span style={{ color: C.teal, fontWeight: '700' }}>Avg. £{Number(car.price).toLocaleString()}</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#8A9AB0', marginBottom: '4px' }}>Match score</div>
                      <div style={{ fontSize: '32px', fontWeight: '900', color: C.teal }}>{Math.round(car.scores.finalScore * 10)}%</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: C.offwhite, borderRadius: '10px', padding: '16px', marginBottom: '20px', minHeight: '56px', display: 'flex', alignItems: 'center' }}>
                    {loading[i] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '14px', height: '14px', border: `2px solid ${C.teal}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: '13px', color: '#8A9AB0' }}>Analysing your match...</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#3A4A5A', margin: 0 }}>{explanations[i] || ''}</p>
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
                          { label: 'Car price', value: `£${Number(car.price).toLocaleString()}` },
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
                    {[
                      { label: 'Budget fit', score: car.scores.budgetFit },
                      { label: 'Driving fit', score: car.scores.drivingFit },
                      { label: 'Space fit', score: car.scores.spaceFit },
                      { label: 'Running cost', score: car.scores.runningFit },
                      { label: 'Ownership ease', score: car.scores.ownershipFit },
                      { label: 'Safety', score: car.scores.safetyFit },
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
                  <button onClick={(e) => { e.stopPropagation(); onSelectCar(car); }} style={{ width: '100%', marginTop: '16px', backgroundColor: i === 0 ? C.teal : C.offwhite, color: C.midnight, border: i === 0 ? 'none' : '1px solid #E8ECF0', borderRadius: '10px', padding: '14px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
                    View full details →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '12px', color: '#8A9AB0', marginBottom: '8px' }}>Cost estimates are indicative. Insurance based on risk band. Finance calculated at 9.9% APR over 48 months.</p>
          <button onClick={onBack} style={{ backgroundColor: C.midnight, color: C.offwhite, border: 'none', borderRadius: '10px', padding: '14px 32px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>Start a new search</button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
function CarPage({ car, answers, onBack }) {
  const costs = getYearOneCost(car, answers)
  const isFinance = ['Hire Purchase (HP)', 'Personal Contract Purchase (PCP)'].includes(answers.purchaseMethod)
  const postcode = (answers.postcode || '').replace(/\s/g, '')
  const radius = (answers.radius || 'Up to 25 miles').replace(/\D/g, '') || '25'
  const autotraderUrl = `https://www.autotrader.co.uk/car-search?make=${encodeURIComponent(car.make)}&model=${encodeURIComponent(car.model)}&postcode=${postcode}&radius=${radius}&year-from=${car.generation?.split(/[-–]/)[0]?.trim() || ''}`
  const ebayUrl = `https://www.ebay.co.uk/sch/Cars/9801/i.html?_nkw=${encodeURIComponent(car.make + ' ' + car.model)}`
  const insuranceUrl = `https://www.comparethemarket.com/car-insurance/`
  const financeUrl = `https://www.zuto.com/apply/`
  const generationYear = car.generation?.split(/[-–]/)[0]?.trim() || '2020'
  const imaginUrl = `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(car.make.toLowerCase())}&modelFamily=${encodeURIComponent(car.model.split(' ')[0].toLowerCase())}&zoomType=fullscreen&modelYear=${generationYear}&angle=23`

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: C.offwhite, minHeight: '100vh', color: C.midnight }}>
      <nav style={{ backgroundColor: C.midnight, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>Mo<span style={{ color: C.teal }}>ti</span>fi</div>
        <button onClick={onBack} style={{ backgroundColor: 'transparent', color: C.muted, border: '1.5px solid #2A4060', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Satoshi, sans-serif', fontSize: '13px', cursor: 'pointer' }}>← Back to results</button>
      </nav>
      <div style={{ backgroundColor: '#1A2E50', padding: '0 5%', minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ flex: 1, paddingTop: '32px', paddingBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: C.teal, letterSpacing: '0.06em', marginBottom: '12px' }}>{car.segment?.toUpperCase()}</div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '900', color: C.offwhite, letterSpacing: '-0.03em', marginBottom: '8px', lineHeight: '1.05' }}>{car.make} {car.model}</h1>
          <div style={{ fontSize: '14px', color: C.muted }}>{car.generation} · {car.fuelType} · {car.transmission}</div>
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
              { label: 'Price from', value: car.price ? `£${Number(car.price).toLocaleString()}` : 'N/A' },
              { label: 'MPG', value: car.mpgBand },
              { label: 'Boot size', value: car.bootSize },
              { label: 'Insurance risk', value: car.insuranceBand },
              { label: 'Reliability', value: `Tier ${car.reliabilityTier}` },
              { label: 'Safety', value: `Tier ${car.safetyTier}` },
              { label: 'ULEZ', value: car.ulezCompliance },
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
                  { label: 'Car price', value: `£${Number(car.price).toLocaleString()}` },
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
          <p style={{ fontSize: '13px', color: '#8A9AB0', marginBottom: '16px', lineHeight: '1.6' }}>Search live listings within {answers.radius || '25 miles'} of {answers.postcode || 'your location'}.</p>
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
