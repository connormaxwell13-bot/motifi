import React, { useState } from 'react'
import carsData from './data/cars.json'
import { questions } from './questions.jsx'
import { applyHardFilters } from './scoring/filters.jsx'
import { scoreAllCars, getTopMatches } from './scoring/engine.jsx'
import { generateOneLiners } from './scoring/oneliners.jsx'
import { getYearOneCost } from './scoring/costs.jsx'
import ChatInterface from './ChatInterface'

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

function Home({ onStart, onCompare }) {
  const [activeTab, setActiveTab] = React.useState('find')
  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#F5F7FA', color: '#0F1D35' }}>
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '0 5%', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.02em', color: '#F5F7FA' }}>Mo<span style={{ color: '#00C896' }}>ti</span>fi</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={{ backgroundColor: 'transparent', color: '#F5F7FA', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '9px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>How it works</button>
          <button onClick={onStart} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '8px', padding: '9px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Get started</button>
        </div>
      </nav>
      <div style={{ background: 'linear-gradient(to bottom, #0F1D35 70%, #F5F7FA 100%)', paddingTop: '68px' }}>
        <div style={{ padding: '32px 5% 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: '600', color: '#00C896', letterSpacing: '0.06em', marginBottom: '20px' }}>
            FREE · NO SIGN-UP REQUIRED
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: '900', lineHeight: '1.03', letterSpacing: '-0.04em', color: '#F5F7FA', marginBottom: '16px', maxWidth: '700px' }}>
            The smarter way to find your <span style={{ color: '#00C896' }}>next car.</span>
          </h1>
          <p style={{ fontSize: '17px', color: '#A8B8CC', lineHeight: '1.7', maxWidth: '520px', marginBottom: '28px' }}>
            Answer a few questions. Get up to ten personalised matches — with the true cost of ownership made clear.
          </p>
          <div style={{ width: '100%', maxWidth: '580px', backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '28px', position: 'relative', zIndex: 3, margin: '0 auto' }}>
            <div style={{ display: 'flex', backgroundColor: '#F0F2F5', borderRadius: '12px', padding: '5px', marginBottom: '18px' }}>
              {[['find', 'Find my car'], ['compare', 'Compare cars']].map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: '13px', fontFamily: 'Satoshi, sans-serif', fontSize: '15px', fontWeight: '700', borderRadius: '9px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === key ? '#0F1D35' : 'transparent', color: activeTab === key ? '#F5F7FA' : '#8A9AB0', transition: 'all 0.15s ease' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={activeTab === 'find' ? onStart : onCompare} style={{ width: '100%', backgroundColor: '#FFFFFF', color: '#0F1D35', border: '1.5px solid #D0D5DD', borderRadius: '12px', padding: '18px', fontFamily: 'Satoshi, sans-serif', fontWeight: '600', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' }}>
              {activeTab === 'find' ? 'Find my perfect car →' : 'Compare cars now →'}
            </button>
            <p style={{ fontSize: '12px', color: '#8A9AB0', textAlign: 'center', marginBottom: '20px' }}>
              {activeTab === 'find' ? 'Already know what you want? Switch to Compare cars above.' : 'Not sure? Switch to Find my car above.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #E8ECF0', paddingTop: '18px', gap: '8px' }}>
              {[['353', 'Cars rated'], ['6', 'Scoring dimensions'], ['3 mins', 'To your results'], ['Free', 'Always']].map(([val, label]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F1D35', letterSpacing: '-0.02em' }}>{val}</div>
                  <div style={{ fontSize: '11px', color: '#8A9AB0', marginTop: '3px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '-120px', height: '650px', position: 'relative', backgroundColor: '#F5F7FA' }}>
          <img src="dextar-vision-IB7loQ5s334-unsplash.jpg" alt="Car driving" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 50%', borderRadius: '0 0 40px 40px', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,29,53,0.6) 0%, rgba(15,29,53,0) 60%)', borderRadius: '0 0 40px 40px' }} />
        </div>
      </div>
      <div style={{ backgroundColor: '#F5F7FA', padding: '72px 5%' }}>
        <div style={{ margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#00C896', letterSpacing: '0.08em', marginBottom: '12px' }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', color: '#0F1D35', lineHeight: '1.15', marginBottom: '48px' }}>Three steps to your best match.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {[
              { n: '1', title: 'Tell us what matters', body: 'Budget, driving habits, space, fuel. Simple questions — no jargon, no sign-up required.' },
              { n: '2', title: 'We score every car', body: 'Our engine scores 353 cars across 6 dimensions — budget fit, running costs, safety, reliability and more.' },
              { n: '3', title: 'Get up to ten clear matches', body: 'Ranked by score, with a plain-English explanation and true cost of ownership for each.' },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '32px', border: '1px solid #E8ECF0' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#0F1D35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '900', color: '#00C896', marginBottom: '20px' }}>{n}</div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F1D35', marginBottom: '10px', lineHeight: '1.3' }}>{title}</h3>
                <p style={{ fontSize: '14px', lineHeight: '1.75', color: '#5A7090' }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={onStart} style={{ backgroundColor: '#0F1D35', color: '#F5F7FA', border: 'none', borderRadius: '10px', padding: '14px 36px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Start matching →</button>
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: '#1A2E50', padding: '52px 5%' }}>
        <div style={{ margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', textAlign: 'center' }}>
          {[
            { stat: '7.5M', label: 'Transactions' },
            { stat: '£15,500', label: 'Avg sales price' },
            { stat: '£503', label: 'Avg annual saving' },
            { stat: '0', label: 'Sign-ups required' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#00C896', letterSpacing: '-0.02em' }}>{stat}</div>
              <div style={{ fontSize: '13px', color: '#A8B8CC', marginTop: '6px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ backgroundColor: '#F5F7FA', padding: '72px 5%' }}>
        <div style={{ margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: '900', letterSpacing: '-0.03em', color: '#0F1D35', lineHeight: '1.2', marginBottom: '8px' }}>
            Everything you need to know<br />before buying a used car.
          </h2>
          <div style={{ fontSize: '13px', color: '#00C896', fontWeight: '600', marginBottom: '36px' }}>The latest news.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', tag: 'BUYING GUIDE', title: 'The true cost of owning a used car in 2026', body: "Sticker price is just the start. Insurance, fuel, tax and depreciation all add up — here's how to calculate the real number." },
              { img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80', tag: 'RELIABILITY', title: 'Which used cars are the most reliable?', body: 'Reliability varies enormously by make and model. We break down which cars score highest for long-term ownership.' },
              { img: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80', tag: 'ELECTRIC', title: 'Should your next used car be electric?', body: 'Used EVs are now genuinely affordable. But are they right for your driving pattern? We look at the real-world case.' },
            ].map(({ img, tag, title, body }) => (
              <div key={title} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E8ECF0' }}>
                <div style={{ height: '180px', overflow: 'hidden' }}>
                  <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#00C896', letterSpacing: '0.06em', marginBottom: '10px' }}>{tag}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.4', marginBottom: '8px', color: '#0F1D35' }}>{title}</h3>
                  <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#5A7090' }}>{body}</p>
                  <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: '700', color: '#0F1D35' }}>Read more →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: '#0F1D35', padding: '40px 5%' }}>
        <div style={{ margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', paddingBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#F5F7FA' }}>Mo<span style={{ color: '#00C896' }}>ti</span>fi</div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {['Find My Car', 'Compare Cars', 'How It Works', 'About Us', 'Contact Us', 'Terms & Conditions', 'Privacy Policy'].map(link => (
                <span key={link} style={{ fontSize: '13px', color: '#A8B8CC', cursor: 'pointer' }}>{link}</span>
              ))}
            </div>
          </div>
          <div style={{ paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="https://www.instagram.com/motifiuk?igsh=cnc4cjI5YnNwbDdk" target="_blank" rel="noopener noreferrer" style={{ color: '#4A6080', transition: 'color 0.15s ease' }} onMouseEnter={e => e.target.style.color = '#00C896'} onMouseLeave={e => e.target.style.color = '#4A6080'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </a>
              <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4A6080', transition: 'color 0.15s ease' }} onMouseEnter={e => e.target.style.color = '#00C896'} onMouseLeave={e => e.target.style.color = '#4A6080'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
            </div>
            <div style={{ fontSize: '12px', color: '#4A6080' }}>© 2026 Motifi · The smarter way to find your next car</div>
          </div>
        </div>
      </div>
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
  // 10-segment bar matching the reference design. Filled segments = teal, empty = muted.
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
      {/* Rank */}
      <div style={{ fontSize: '34px', fontWeight: '300', color: C.muted, fontFamily: 'Satoshi, serif', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {String(rank).padStart(2, '0')}
      </div>

      {/* Make + model + trim */}
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

      {/* Price block */}
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

      {/* One-liner */}
      <div style={{ fontSize: '13px', lineHeight: '1.55', color: '#D0DCE8' }}>
        {oneLiner}
      </div>

      {/* Score + bar */}
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

  // Only fetch AI explanation for the hero card (#1). Ranks 2–10 use rule-based.
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

  // Edge case: no matches above score threshold
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

      {/* Hero card container — narrower, centred */}
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <HeroCard
          car={hero}
          answers={answers}
          explanation={explanations[0]}
          loading={loading[0]}
          onSelectCar={onSelectCar}
        />
      </div>

      {/* Compact row list — wider, dark background band */}
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
