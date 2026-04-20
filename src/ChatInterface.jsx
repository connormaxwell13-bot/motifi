// ChatInterface.jsx
// Replaces the step-by-step question form entirely.
// Collect answers conversationally via Claude, then runs filtering and scoring.
// Place in src/ alongside App.jsx.
// Wire into App.jsx: when screen === 'questions', render <ChatInterface onResults={...} />

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAnswers(text) {
  const match = text.match(/<MOTIFI_ANSWERS>([\s\S]*?)<\/MOTIFI_ANSWERS>/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

function cleanText(text) {
  return text.replace(/<MOTIFI_ANSWERS>[\s\S]*?<\/MOTIFI_ANSWERS>/, '').trim()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatInterface({ onResults }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Motifi car advisor. I'll find your perfect used car in a few quick questions. To kick off — what's your budget?"
    }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg   = { role: 'user', content: input.trim() }
    const history   = [...messages, userMsg]
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

      if (answers) {
        setTimeout(() => {
          const filtered = applyHardFilters(carsData, answers)
          const scored   = scoreAllCars(filtered, answers)
          onResults({ results: scored.slice(0, 3), answers })
        }, 1000)
      }
    } catch (err) {
      setError('Something went wrong — please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      backgroundColor: C.midnight, fontFamily: 'Satoshi, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        backgroundColor: C.navy, padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em', color: C.offwhite }}>
          Mo<span style={{ color: C.teal }}>ti</span>fi
        </div>
        <div style={{ fontSize: '13px', color: C.muted }}>Finding your perfect car</div>
      </nav>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: '10px',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: C.teal, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '13px', fontWeight: '700',
                color: C.midnight, flexShrink: 0,
              }}>M</div>
            )}
            <div style={{
              maxWidth: '75%',
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

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: C.teal, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: '700',
              color: C.midnight, flexShrink: 0,
            }}>M</div>
            <div style={{
              backgroundColor: C.navy, borderRadius: '18px 18px 18px 4px',
              padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: C.muted,
                  animation: 'pulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            textAlign: 'center', color: '#FF6B6B', fontSize: '14px', padding: '8px',
          }}>{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{
        padding: '16px 24px 24px', backgroundColor: C.navy,
        display: 'flex', gap: '12px', flexShrink: 0,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your answer..."
          disabled={loading}
          autoFocus
          style={{
            flex: 1, backgroundColor: C.midnight, color: C.offwhite,
            border: '1.5px solid #2A4060', borderRadius: '10px',
            padding: '14px 18px', fontSize: '15px', outline: 'none',
            fontFamily: 'Satoshi, sans-serif',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            backgroundColor: input.trim() && !loading ? C.teal : '#2A4060',
            color: input.trim() && !loading ? C.midnight : C.dim,
            border: 'none', borderRadius: '10px',
            padding: '14px 22px', fontSize: '15px', fontWeight: '700',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 0.15s ease', fontFamily: 'Satoshi, sans-serif',
          }}
        >
          Send
        </button>
      </form>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
