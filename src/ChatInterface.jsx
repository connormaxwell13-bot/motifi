// ChatInterface.jsx — v2
// - Quick-reply chips for fixed-answer questions
// - Loading transition animation before results
// - Mobile-optimised layout and touch targets

import { useState, useRef, useEffect } from 'react'
import { applyHardFilters } from './scoring/filters'
import { scoreAllCars } from './scoring/engine'
import carsData from './data/cars.json'

const C = {
  midnight: '#0F1D35',
  navy:     '#1A2E50',
  teal:     '#00C896',
  offwhite: '#F5F7FA',
  muted:    '#A8B8CC',
  dim:      '#4A6080',
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Motifi's car advisor. Have a warm, natural conversation to understand what the user needs, then help them find their perfect used car.

Collect the following through conversation — don't list them all at once. Ask naturally, group related questions, and use what they tell you to infer answers where possible.

INFORMATION TO COLLECT:
1. gender — Male / Female / Non-binary / Prefer not to say (mention it's for personalisation only)
2. age — number
3. budgetMin — minimum budget in GBP as a number (ask as a range: "what's your budget?")
4. budgetMax — maximum budget in GBP as a number
5. paymentMethod — Cash / Part Exchange / Hire Purchase / Bank Loan
6. partExValue — if Part Exchange: approximate value of their current car in GBP, else null
7. depositAmount — if Hire Purchase: deposit amount in GBP, else null
8. transmission — Manual / Automatic / No preference
9. fuelType — Petrol / Diesel / Hybrid / Electric / No preference
10. bodyType — Hatchback / SUV / Estate / Saloon / MPV / Coupe / Van / Crossover / No preference
11. drivingContext — Mostly city / Mostly motorway / Mostly rural / Mixed
12. annualMileage — Under 3,000 / 3,000-5,000 / 5,000-8,000 / 8,000+
13. bootSpace — Small / Medium / Large / Very Large / No preference
14. priority — MPG / Reliability / Depreciation (ask: "Is MPG, reliability, or holding its value most important?")
15. ulezRequired — Yes / No
16. postcode — UK postcode
17. searchRadius — number in miles (suggest: 10 / 25 / 50 / 100 / nationwide=1500)

STYLE:
- Warm, concise, conversational. 2-3 sentences per reply max.
- Group related questions naturally (e.g. budget and payment together).
- If they say something that implies an answer, use it.
- If they're unsure, offer a sensible default.
- Never repeat a question already answered.

WHEN YOU HAVE ALL ANSWERS, end your message with exactly this block:

<MOTIFI_ANSWERS>
{
  "gender": "...",
  "age": 0,
  "budgetMin": 0,
  "budgetMax": 0,
  "paymentMethod": "...",
  "partExValue": null,
  "depositAmount": null,
  "transmission": "...",
  "fuelType": "...",
  "bodyType": "...",
  "drivingContext": "...",
  "annualMileage": "...",
  "bootSpace": "...",
  "priority": "...",
  "ulezRequired": "...",
  "postcode": "...",
  "searchRadius": 0
}
</MOTIFI_ANSWERS>`

// ─── Quick-reply chip detection ───────────────────────────────────────────────

const CHIP_SETS = [
  {
    keywords: ['gender', 'personalise', 'personalisation'],
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  {
    keywords: ['pay', 'cash', 'hire purchase', 'part exchange', 'bank loan', 'planning to pay', 'finance'],
    options: ['Cash', 'Part Exchange', 'Hire Purchase', 'Bank Loan'],
  },
  {
    keywords: ['transmission', 'manual', 'automatic', 'gearbox'],
    options: ['Manual', 'Automatic', 'No preference'],
  },
  {
    keywords: ['fuel', 'petrol', 'diesel', 'hybrid', 'electric'],
    options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'No preference'],
  },
  {
    keywords: ['body type', 'body style', 'hatchback', 'estate', 'suv', 'saloon', 'crossover', 'mpv', 'coupe', 'van'],
    options: ['Hatchback', 'SUV', 'Estate', 'Saloon', 'Crossover', 'No preference'],
  },
  {
    keywords: ['mostly drive', 'driving', 'motorway', 'mostly city', 'mostly rural', 'mix of'],
    options: ['Mostly city', 'Mostly motorway', 'Mostly rural', 'Mixed'],
  },
  {
    keywords: ['miles', 'mileage', 'drive per year', 'drive a year', 'annually', 'how far'],
    options: ['Under 3,000', '3,000-5,000', '5,000-8,000', '8,000+'],
  },
  {
    keywords: ['boot', 'space', 'storage', 'luggage', 'how much room'],
    options: ['Small', 'Medium', 'Large', 'No preference'],
  },
  {
    keywords: ['priority', 'mpg', 'reliability', 'depreciation', 'hold its value', 'most important', 'fuel economy'],
    options: ['MPG', 'Reliability', 'Depreciation'],
  },
  {
    keywords: ['ulez', 'ultra low emission', 'emission zone', 'london'],
    options: ['Yes', 'No'],
  },
  {
    keywords: ['radius', 'search area', 'how far are you', 'distance', 'search radius', 'miles from'],
    options: ['10 miles', '25 miles', '50 miles', '100 miles', 'Nationwide'],
  },
]

function detectChips(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const set of CHIP_SETS) {
    if (set.keywords.some(k => lower.includes(k))) {
      return set.options
    }
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAnswers(text) {
  const match = text.match(/<MOTIFI_ANSWERS>([\s\S]*?)<\/MOTIFI_ANSWERS>/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

function cleanText(text) {
  return text.replace(/<MOTIFI_ANSWERS>[\s\S]*?<\/MOTIFI_ANSWERS>/, '').trim()
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  const [count, setCount] = useState(0)
  const messages = [
    'Filtering 353 cars to your budget…',
    'Scoring fuel efficiency & running costs…',
    'Weighing up reliability & safety…',
    'Ranking your best matches…',
  ]

  useEffect(() => {
    const t = setInterval(() => setCount(c => Math.min(c + 1, messages.length - 1)), 700)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: C.midnight,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'Satoshi, sans-serif', zIndex: 100,
    }}>
      {/* Animated rings */}
      <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '40px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: `${i * 12}px`,
            border: `2px solid ${i === 0 ? C.teal : i === 1 ? 'rgba(0,200,150,0.4)' : 'rgba(0,200,150,0.15)'}`,
            borderRadius: '50%',
            animation: `spin ${1.2 + i * 0.4}s linear infinite`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: '28px', backgroundColor: C.teal,
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: C.midnight,
        }}>M</div>
      </div>

      {/* Progress messages */}
      <div style={{ textAlign: 'center', maxWidth: '280px' }}>
        {messages.slice(0, count + 1).map((msg, i) => (
          <div key={i} style={{
            fontSize: i === count ? '16px' : '13px',
            fontWeight: i === count ? '600' : '400',
            color: i === count ? C.offwhite : C.dim,
            marginBottom: '8px',
            transition: 'all 0.3s ease',
          }}>{msg}</div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: '40px', width: '200px', height: '3px',
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', backgroundColor: C.teal, borderRadius: '2px',
          width: `${((count + 1) / messages.length) * 100}%`,
          transition: 'width 0.7s ease',
        }} />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface({ onResults }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Motifi car advisor. I'll find your perfect used car in a few quick questions. To kick off — what's your budget?"
    }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError]       = useState(null)
  const bottomRef               = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const chips = loading ? null : detectChips(lastAssistantMsg?.content || '')

  async function send(text) {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg = { role: 'user', content }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system:   SYSTEM_PROMPT,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)

      const data    = await res.json()
      const raw     = data.content?.[0]?.text || ''
      const answers = extractAnswers(raw)
      const display = cleanText(raw)

      setMessages(prev => [...prev, { role: 'assistant', content: display }])
      setLoading(false)

      if (answers) {
        // Show loading animation for 3 seconds before results
        setShowLoader(true)
        setTimeout(() => {
          const filtered = applyHardFilters(carsData, answers)
          const scored   = scoreAllCars(filtered, answers)
          onResults({ results: scored.slice(0, 3), answers })
        }, 3000)
      }
    } catch (err) {
      setError('Something went wrong — please try again.')
      setLoading(false)
      console.error(err)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    send()
  }

  if (showLoader) return <LoadingScreen />

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', // dvh for mobile browser chrome handling
      backgroundColor: C.midnight,
      fontFamily: 'Satoshi, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        backgroundColor: C.navy, padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>
          Mo<span style={{ color: C.teal }}>ti</span>fi
        </div>
        <div style={{ fontSize: '12px', color: C.muted }}>Finding your perfect car</div>
      </nav>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: '8px',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: C.teal, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                color: C.midnight, flexShrink: 0,
              }}>M</div>
            )}
            <div style={{
              maxWidth: 'min(78%, 480px)',
              backgroundColor: msg.role === 'user' ? C.teal : C.navy,
              color: msg.role === 'user' ? C.midnight : C.offwhite,
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px',
              fontSize: '15px', lineHeight: '1.6',
              fontWeight: msg.role === 'user' ? '500' : '400',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: C.teal, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '12px', fontWeight: '700',
              color: C.midnight, flexShrink: 0,
            }}>M</div>
            <div style={{
              backgroundColor: C.navy, borderRadius: '18px 18px 18px 4px',
              padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  backgroundColor: C.muted,
                  animation: 'dot-pulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Quick-reply chips */}
        {chips && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            paddingLeft: '36px', paddingTop: '4px',
          }}>
            {chips.map(opt => (
              <button
                key={opt}
                onClick={() => send(opt)}
                style={{
                  backgroundColor: 'transparent',
                  border: `1.5px solid ${C.teal}`,
                  borderRadius: '20px',
                  padding: '8px 16px',
                  color: C.teal,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'Satoshi, sans-serif',
                  minHeight: '44px',
                  transition: 'all 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = C.teal
                  e.currentTarget.style.color = C.midnight
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = C.teal
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: '#FF6B6B', fontSize: '14px', padding: '8px' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} style={{
        padding: '12px 16px 20px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        backgroundColor: C.navy,
        display: 'flex', gap: '10px', flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={loading}
          autoFocus
          style={{
            flex: 1, backgroundColor: C.midnight, color: C.offwhite,
            border: '1.5px solid #2A4060', borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '16px', // 16px prevents iOS zoom on focus
            outline: 'none',
            fontFamily: 'Satoshi, sans-serif',
            minHeight: '48px',
            WebkitAppearance: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            backgroundColor: input.trim() && !loading ? C.teal : '#2A4060',
            color: input.trim() && !loading ? C.midnight : C.dim,
            border: 'none', borderRadius: '12px',
            padding: '0 20px',
            fontSize: '15px', fontWeight: '700',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
            fontFamily: 'Satoshi, sans-serif',
            minHeight: '48px',
            minWidth: '72px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Send
        </button>
      </form>

      <style>{`
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
