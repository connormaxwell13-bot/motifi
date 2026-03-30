import React, { useState } from 'react'

const COLORS = {
  midnight: '#0F1D35',
  navy: '#1A2E50',
  teal: '#00C896',
  offwhite: '#F5F7FA',
  muted: '#A8B8CC',
  dim: '#4A6080',
}

const questions = [
  {
    id: 'gender',
    question: 'What is your gender?',
    type: 'single',
    dataOnly: true,
    options: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'],
  },
  {
    id: 'age',
    question: 'What is your age?',
    type: 'single',
    dataOnly: true,
    options: ['17–24', '25–34', '35–44', '45–54', '55–64', '64+'],
  },
  {
    id: 'postcode',
    question: 'What is your postcode?',
    type: 'text',
    dataOnly: true,
    placeholder: 'e.g. SW1A 1AA',
  },
  {
    id: 'radius',
    question: 'What is your preferred search radius?',
    type: 'single',
    dataOnly: true,
    options: ['Up to 10 miles', 'Up to 25 miles', 'Up to 50 miles', 'Up to 100 miles', 'Nationwide'],
  },
  {
    id: 'budget',
    question: 'What is your budget?',
    type: 'budget',
    hint: 'Enter your minimum and maximum budget for a used car.',
  },
  {
    id: 'transmission',
    question: 'Do you have a preferred transmission?',
    type: 'single',
    options: ['Automatic', 'Manual', 'No preference'],
  },
  {
    id: 'fuel',
    question: 'Do you have a preferred fuel type?',
    type: 'single',
    options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'No preference'],
  },
  {
    id: 'bodyType',
    question: 'Do you have a preferred body type?',
    type: 'single',
    options: ['Hatchback', 'Saloon', 'Estate', 'SUV', 'Crossover', 'MPV', 'Coupe', 'Van', 'No preference'],
  },
  {
    id: 'driving',
    question: 'Where do you mostly drive?',
    type: 'single',
    options: ['Mostly city', 'Mostly motorway', 'Mostly rural', 'Mixed driving'],
  },
  {
    id: 'mileage',
    question: 'Roughly how many miles do you drive per year?',
    type: 'single',
    options: ['Under 3,000', '3,000–5,000', '5,000–8,000', '8,000–15,000', '15,000+'],
  },
  {
    id: 'runningCosts',
    question: 'How important are low running costs?',
    type: 'single',
    options: ['Not a concern', 'Something I would consider', 'Somewhat important', 'Extremely important'],
  },
  {
    id: 'space',
    question: 'How much space do you need?',
    type: 'single',
    options: ['Just me / couple', 'Small family', 'Family + luggage', 'As much as possible'],
  },
  {
    id: 'reliability',
    question: 'Do you want something very reliable, or are you happy with a bit of risk?',
    type: 'single',
    options: ['Maximum reliability', 'Balanced', 'Happy with some risk'],
  },
  {
    id: 'ulez',
    question: 'Do you need the car to be ULEZ compliant?',
    type: 'single',
    options: ['Yes', 'No', 'Indifferent'],
  },
]

export default function App() {
  const [screen, setScreen] = useState('home')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})

  const current = questions[step]
  const progress = ((step) / questions.length) * 100

  function handleAnswer(value) {
    setAnswers(prev => ({ ...prev, [current.id]: value }))
  }

  function handleNext() {
    if (step < questions.length - 1) {
      setStep(s => s + 1)
    } else {
      setScreen('results')
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
    else setScreen('home')
  }

  function canProceed() {
    const a = answers[current.id]
    if (current.type === 'budget') return answers.budgetMin && answers.budgetMax
    return a !== undefined && a !== ''
  }

  if (screen === 'home') return <Home onStart={() => setScreen('questions')} />
  if (screen === 'results') return <Results answers={answers} onBack={() => setScreen('questions')} />

  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: COLORS.midnight, minHeight: '100vh', color: COLORS.offwhite }}>

      {/* Nav */}
      <nav style={{ backgroundColor: COLORS.navy, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => setScreen('home')}>
          Mo<span style={{ color: COLORS.teal }}>ti</span>fi
        </div>
        <div style={{ fontSize: '13px', color: COLORS.muted }}>
          {step + 1} of {questions.length}
        </div>
      </nav>

      {/* Progress bar */}
      <div style={{ height: '3px', backgroundColor: COLORS.navy }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: COLORS.teal, transition: 'width 0.3s ease' }} />
      </div>

      {/* Question */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px' }}>

        {current.dataOnly && (
          <div style={{ display: 'inline-block', backgroundColor: COLORS.navy, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '500', color: COLORS.teal, letterSpacing: '0.05em', marginBottom: '20px' }}>
            FOR PERSONALISATION ONLY
          </div>
        )}

        <h2 style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1.3', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {current.question}
        </h2>

        {current.hint && (
          <p style={{ fontSize: '14px', color: COLORS.muted, marginBottom: '32px', lineHeight: '1.6' }}>{current.hint}</p>
        )}

        <div style={{ marginTop: '32px' }}>

          {/* Single choice */}
          {current.type === 'single' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {current.options.map(opt => {
                const selected = answers[current.id] === opt
                return (
                  <button
                    key={opt}
                    onClick={() => { handleAnswer(opt); }}
                    style={{
                      backgroundColor: selected ? COLORS.teal : COLORS.navy,
                      color: selected ? COLORS.midnight : COLORS.offwhite,
                      border: `1.5px solid ${selected ? COLORS.teal : '#2A4060'}`,
                      borderRadius: '10px',
                      padding: '16px 20px',
                      fontFamily: 'Satoshi, sans-serif',
                      fontSize: '15px',
                      fontWeight: selected ? '700' : '400',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {/* Text input */}
          {current.type === 'text' && (
            <input
              type="text"
              placeholder={current.placeholder}
              value={answers[current.id] || ''}
              onChange={e => handleAnswer(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: COLORS.navy,
                color: COLORS.offwhite,
                border: '1.5px solid #2A4060',
                borderRadius: '10px',
                padding: '16px 20px',
                fontFamily: 'Satoshi, sans-serif',
                fontSize: '16px',
                outline: 'none',
              }}
            />
          )}

          {/* Budget input */}
          {current.type === 'budget' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { key: 'budgetMin', label: 'Minimum budget', placeholder: '£5,000' },
                { key: 'budgetMax', label: 'Maximum budget', placeholder: '£15,000' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ flex: '1', minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>{label}</label>
                  <input
                    type="number"
                    placeholder={placeholder}
                    value={answers[key] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      width: '100%',
                      backgroundColor: COLORS.navy,
                      color: COLORS.offwhite,
                      border: '1.5px solid #2A4060',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      fontFamily: 'Satoshi, sans-serif',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <button
            onClick={handleBack}
            style={{
              backgroundColor: 'transparent',
              color: COLORS.muted,
              border: '1.5px solid #2A4060',
              borderRadius: '10px',
              padding: '14px 24px',
              fontFamily: 'Satoshi, sans-serif',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            style={{
              backgroundColor: canProceed() ? COLORS.teal : '#1A2E50',
              color: canProceed() ? COLORS.midnight : COLORS.dim,
              border: 'none',
              borderRadius: '10px',
              padding: '14px 32px',
              fontFamily: 'Satoshi, sans-serif',
              fontSize: '15px',
              fontWeight: '700',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            {step === questions.length - 1 ? 'Find my car →' : 'Next →'}
          </button>
        </div>

      </div>
    </div>
  )
}

function Home({ onStart }) {
  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#0F1D35', minHeight: '100vh', color: '#F5F7FA' }}>
      <nav style={{ backgroundColor: '#1A2E50', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>
          Mo<span style={{ color: '#00C896' }}>ti</span>fi
        </div>
        <button onClick={onStart} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
          Find my car
        </button>
      </nav>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#1A2E50', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: '500', color: '#00C896', letterSpacing: '0.05em', marginBottom: '32px' }}>
          INTELLIGENT CAR MATCHING
        </div>
        <h1 style={{ fontSize: '52px', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-0.04em', marginBottom: '24px' }}>
          The smarter way to find your <span style={{ color: '#00C896' }}>next car.</span>
        </h1>
        <p style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.6', color: '#A8B8CC', marginBottom: '40px', maxWidth: '520px', margin: '0 auto 40px' }}>
          Answer a few simple questions. We match you to the right used car — with the true cost of ownership made clear from the start.
        </p>
        <button onClick={onStart} style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '10px', padding: '16px 36px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
          Find my car →
        </button>
      </div>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {[
          { title: 'Smart matching', body: 'We ask the right questions and score every car in our database against your answers.' },
          { title: 'True cost, not just sticker price', body: 'Insurance, fuel, tax and running costs are built into every recommendation.' },
          { title: 'Three clear choices', body: 'No endless scrolling. Just your three best matches, explained in plain English.' },
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: '#1A2E50', borderRadius: '12px', padding: '28px 24px' }}>
            <div style={{ width: '32px', height: '3px', backgroundColor: '#00C896', borderRadius: '2px', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>{card.title}</h3>
            <p style={{ fontSize: '14px', fontWeight: '400', lineHeight: '1.6', color: '#A8B8CC' }}>{card.body}</p>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #1A2E50', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#4A6080' }}>
        © 2026 Motifi · The smarter way to find your next car
      </div>
    </div>
  )
}

function Results({ answers, onBack }) {
  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#0F1D35', minHeight: '100vh', color: '#F5F7FA' }}>
      <nav style={{ backgroundColor: '#1A2E50', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>
          Mo<span style={{ color: '#00C896' }}>ti</span>fi
        </div>
      </nav>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎯</div>
        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>Your answers are in.</h2>
