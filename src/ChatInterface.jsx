// ChatInterface.jsx — v4
// Changes from v3:
// - Advisor renamed to Cooper
// - Body type chips show SVG silhouettes + label (visual cards)
// - All other chip sets remain as text pills

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

// ─── Body type SVG silhouettes ────────────────────────────────────────────────
// Simple, clean side-profile silhouettes for each body type

const BODY_ICONS = {
  Hatchback: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28 Q6 22 12 22 L22 22 L32 12 L56 12 L64 22 L70 22 Q74 22 74 28 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  SUV: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 27 Q6 20 12 20 L18 20 L24 11 L56 11 L62 20 L68 20 Q74 20 74 27 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  Estate: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28 Q6 22 12 22 L20 22 L28 14 L62 14 L62 22 L68 22 Q74 22 74 28 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  Saloon: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28 Q6 22 12 22 L20 22 L28 14 L52 14 L60 22 L68 22 Q74 22 74 28 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  MPV: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 27 Q6 20 12 20 L18 20 L20 11 L62 11 L64 20 L68 20 Q74 20 74 27 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  Coupe: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28 Q6 22 12 22 L22 22 L36 13 L58 13 L66 22 L68 22 Q74 22 74 28 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  Van: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 27 Q6 20 12 20 L14 20 L14 10 L58 10 L64 20 L68 20 Q74 20 74 27 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  Crossover: (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 27 Q6 21 12 21 L20 21 L28 13 L54 13 L62 21 L68 21 Q74 21 74 27 L74 30 L68 30 Q68 24 62 24 Q56 24 56 30 L24 30 Q24 24 18 24 Q12 24 12 30 L6 30 Z"/>
      <circle cx="18" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="62" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="30" r="2"/>
      <circle cx="62" cy="30" r="2"/>
    </svg>
  ),
  'No preference': (
    <svg viewBox="0 0 80 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <text x="40" y="26" textAnchor="middle" fontSize="20" fill="currentColor" fontFamily="Satoshi,sans-serif">✓</text>
    </svg>
  ),
}

const BODY_TYPE_OPTIONS = ['Hatchback', 'SUV', 'Estate', 'Saloon', 'MPV', 'Coupe', 'Van', 'Crossover', 'No preference']

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Cooper, Motifi's friendly car advisor. Your job is to collect exactly 16 answers from the user through friendly conversation, then return them as structured JSON.

Your name is Cooper. Sign off warmly but don't overdo it. Be concise and human.

STRICT RULES:
- Ask questions in the ORDER listed below. Do not skip ahead or go back.
- NEVER ask a question that has already been answered.
- Ask max 2 questions per message. Group related ones naturally.
- Keep replies to 2-3 sentences max.
- When a user sends a short word like "Cash", "Manual", "Yes" — treat it as the answer to your most recent question.

QUESTION ORDER (collect these in sequence):
1. budgetMin + budgetMax — ask together as a range ("what's your budget?")
2. paymentMethod — Cash / Part Exchange / Hire Purchase / Bank Loan
3. partExValue — only if paymentMethod is "Part Exchange" (ask value of their car)
4. depositAmount — only if paymentMethod is "Hire Purchase" (ask deposit amount)
5. transmission — Manual / Automatic / No preference
6. fuelType — Petrol / Diesel / Hybrid / Electric / No preference
7. bodyType — Hatchback / SUV / Estate / Saloon / MPV / Coupe / Van / Crossover / No preference
8. drivingContext — Mostly city / Mostly motorway / Mostly rural / Mixed
9. annualMileage — Under 3,000 / 3,000-5,000 / 5,000-8,000 / 8,000+
10. bootSpace — Small / Medium / Large / Very Large / No preference
11. priority — MPG / Reliability / Depreciation
12. ulezRequired — Yes / No
13. postcode — UK postcode
14. searchRadius — 10 / 25 / 50 / 100 / 1500 (nationwide)
15. gender — Male / Female / Non-binary / Prefer not to say (mention it's just for personalisation)
16. age — number

CHIPS — whenever you ask a fixed-choice question, end your message with a chips tag:
<CHIPS>Option1|Option2|Option3</CHIPS>

Examples:
- Payment: <CHIPS>Cash|Part Exchange|Hire Purchase|Bank Loan</CHIPS>
- Transmission: <CHIPS>Manual|Automatic|No preference</CHIPS>
- Fuel: <CHIPS>Petrol|Diesel|Hybrid|Electric|No preference</CHIPS>
- Body type: <CHIPS>Hatchback|SUV|Estate|Saloon|MPV|Coupe|Van|Crossover|No preference</CHIPS>
- Driving context: <CHIPS>Mostly city|Mostly motorway|Mostly rural|Mixed</CHIPS>
- Mileage: <CHIPS>Under 3,000|3,000-5,000|5,000-8,000|8,000+</CHIPS>
- Boot space: <CHIPS>Small|Medium|Large|No preference</CHIPS>
- Priority: <CHIPS>MPG|Reliability|Depreciation</CHIPS>
- ULEZ: <CHIPS>Yes|No</CHIPS>
- Search radius: <CHIPS>10 miles|25 miles|50 miles|100 miles|Nationwide</CHIPS>
- Gender: <CHIPS>Male|Female|Non-binary|Prefer not to say</CHIPS>
- Do NOT add chips for budget, postcode, deposit, part-ex value, or age.

WHEN YOU HAVE ALL 16 ANSWERS, respond with a brief closing message then end with exactly this block:

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAnswers(text) {
  const match = text.match(/<MOTIFI_ANSWERS>([\s\S]*?)<\/MOTIFI_ANSWERS>/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

function extractChips(text) {
  const match = text.match(/<CHIPS>(.*?)<\/CHIPS>/)
  if (!match) return null
  return match[1].split('|').map(s => s.trim()).filter(Boolean)
}

function cleanText(text) {
  return text
    .replace(/<MOTIFI_ANSWERS>[\s\S]*?<\/MOTIFI_ANSWERS>/, '')
    .replace(/<CHIPS>.*?<\/CHIPS>/, '')
    .trim()
}

function isBodyTypeChips(chips) {
  if (!chips) return false
  return chips.some(c => ["Hatchback","SUV","Estate","Saloon","MPV","Coupe","Van","Crossover"].includes(c))
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
      <div style={{ textAlign: 'center', maxWidth: '280px' }}>
        {messages.slice(0, count + 1).map((msg, i) => (
          <div key={i} style={{
            fontSize: i === count ? '16px' : '13px',
            fontWeight: i === count ? '600' : '400',
            color: i === count ? C.offwhite : C.dim,
            marginBottom: '8px', transition: 'all 0.3s ease',
          }}>{msg}</div>
        ))}
      </div>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Chip renderers ───────────────────────────────────────────────────────────

function TextChips({ chips, onSelect }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '8px',
      paddingLeft: '36px', paddingTop: '10px',
    }}>
      {chips.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            backgroundColor: 'transparent',
            border: `1.5px solid ${C.teal}`,
            borderRadius: '20px',
            padding: '8px 16px',
            color: C.teal,
            fontSize: '14px', fontWeight: '600',
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
  )
}

function BodyTypeChips({ chips, onSelect }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '8px',
      paddingLeft: '36px',
      paddingTop: '10px',
      paddingRight: '8px',
    }}>
      {chips.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            backgroundColor: 'transparent',
            border: `1.5px solid rgba(0,200,150,0.5)`,
            borderRadius: '12px',
            padding: '10px 6px 8px',
            color: C.teal,
            cursor: 'pointer',
            fontFamily: 'Satoshi, sans-serif',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '6px',
            transition: 'all 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(0,200,150,0.1)'
            e.currentTarget.style.borderColor = C.teal
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.borderColor = 'rgba(0,200,150,0.5)'
          }}
        >
          <div style={{ width: '56px', height: '28px', color: C.teal }}>
            {BODY_ICONS[opt] || BODY_ICONS['No preference']}
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', textAlign: 'center', lineHeight: '1.2' }}>
            {opt}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface({ onResults }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Cooper, your Motifi car advisor — I'll find your perfect used car in just a few questions. First up, what's your budget?",
      chips: null,
    }
  ])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError]           = useState(null)
  const bottomRef                   = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      const chips   = extractChips(raw)
      const display = cleanText(raw)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: display,
        chips: answers ? null : chips,
      }])
      setLoading(false)

      if (answers) {
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
      height: '100dvh',
      backgroundColor: C.midnight,
      fontFamily: 'Satoshi, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        backgroundColor: C.navy, padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>
          Mo<span style={{ color: C.teal }}>ti</span>fi
        </div>
        <div style={{ fontSize: '12px', color: C.muted }}>Cooper · Your car advisor</div>
      </nav>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: '8px',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: C.teal, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: '700',
                  color: C.midnight, flexShrink: 0, letterSpacing: '-0.02em',
                }}>Co</div>
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

            {/* Chips — only on last assistant message */}
            {msg.role === 'assistant' && msg.chips && i === messages.length - 1 && !loading && (
              isBodyTypeChips(msg.chips)
                ? <BodyTypeChips chips={msg.chips} onSelect={send} />
                : <TextChips chips={msg.chips} onSelect={send} />
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: C.teal, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '11px', fontWeight: '700',
              color: C.midnight, flexShrink: 0,
            }}>Co</div>
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

        {error && (
          <div style={{ textAlign: 'center', color: '#FF6B6B', fontSize: '14px', padding: '8px' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '12px 16px 20px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        backgroundColor: C.navy,
        display: 'flex', gap: '10px', flexShrink: 0,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={loading}
          autoFocus
          style={{
            flex: 1, backgroundColor: C.midnight, color: C.offwhite,
            border: '1.5px solid #2A4060', borderRadius: '12px',
            padding: '14px 16px', fontSize: '16px',
            outline: 'none', fontFamily: 'Satoshi, sans-serif',
            minHeight: '48px', WebkitAppearance: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            backgroundColor: input.trim() && !loading ? C.teal : '#2A4060',
            color: input.trim() && !loading ? C.midnight : C.dim,
            border: 'none', borderRadius: '12px',
            padding: '0 20px', fontSize: '15px', fontWeight: '700',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
            fontFamily: 'Satoshi, sans-serif',
            minHeight: '48px', minWidth: '72px',
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

