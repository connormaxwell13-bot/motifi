// ChatInterface.jsx — v5 (Session 2)
// Changes from v4:
// - Shared <TopNav> replaces bespoke nav strip
// - Hands off to ReviewScreen instead of straight to LoadingScreen
// - Markdown parser for **bold** + *italic* in Cooper's bubbles
// - Cooper avatar: "Co" → "C"
// - LoadingScreen retreated to editorial Fraunces + staged check-steps

import { useState, useRef, useEffect } from 'react'
import TopNav from './TopNav'
import './design/tokens.css'
import './design/screens.css'

// ─── Tiny markdown parser ─────────────────────────────────────────────────────
// Cooper's API responses sometimes contain **bold** and *italic* spans.
// Render them as actual <strong> / <em> instead of literal asterisks.
// Keeps to two patterns — anything richer (lists, links, code) is out of scope.

function renderMarkdown(text) {
  if (!text) return null
  // Tokenize: split on **bold** first (since * inside ** would break),
  // then on *italic* within the resulting non-bold runs.
  const out = []
  let key = 0
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g)
  for (const seg of boldSplit) {
    if (!seg) continue
    if (seg.startsWith('**') && seg.endsWith('**')) {
      out.push(<strong key={key++}>{seg.slice(2, -2)}</strong>)
    } else {
      // Italic pass within plain segment
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

// ─── Body type SVG silhouettes ────────────────────────────────────────────────

const BODY_ICONS = {
  Hatchback: <img src="/hatchback.svg" alt="Hatchback" />,
  SUV:       <img src="/suv.svg"       alt="SUV" />,
  Estate:    <img src="/estate.svg"    alt="Estate" />,
  Saloon:    <img src="/saloon.svg"    alt="Saloon" />,
  MPV:       <img src="/mpv.svg"       alt="MPV" />,
  Coupe:     <img src="/coupe.svg"     alt="Coupe" />,
  Van:       <img src="/van.svg"       alt="Van" />,
  Crossover: <img src="/crossover.svg" alt="Crossover" />,
  'No preference': (
    <svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg">
      <text x="40" y="26" textAnchor="middle" fontSize="20" fill="currentColor">✓</text>
    </svg>
  ),
}

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

// ─── Loading screen — editorial handoff ───────────────────────────────────────
// Big serif headline + three staged check-steps. ~2.5s total before navigating
// to the review screen. Replaces the previous spinner-rings treatment.

function LoadingScreen() {
  const [shown, setShown] = useState([false, false, false])
  const steps = [
    'Filtering on fit',
    'Scoring on cost honesty',
    'Assembling your matches',
  ]

  useEffect(() => {
    const timers = [
      setTimeout(() => setShown([true, false, false]), 200),
      setTimeout(() => setShown([true, true, false]), 800),
      setTimeout(() => setShown([true, true, true]), 1400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="motifi-screen">
      <div className="loader-overlay">
        <div className="loader-av">C</div>
        <div className="loader-h">
          I've got enough — <em>loading your matches…</em>
        </div>
        <div className="loader-steps">
          {steps.map((s, i) => (
            <div key={i} className={'loader-step' + (shown[i] ? ' shown' : '')}>
              <span className="check">✓</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Chip renderers ───────────────────────────────────────────────────────────

function TextChips({ chips, onSelect }) {
  return (
    <div className="chips-row">
      {chips.map(opt => (
        <button key={opt} className="chip" onClick={() => onSelect(opt)}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function BodyTypeChips({ chips, onSelect }) {
  return (
    <div className="body-chips">
      {chips.map(opt => (
        <button key={opt} className="body-chip" onClick={() => onSelect(opt)}>
          <div className="body-chip-icon">
            {BODY_ICONS[opt] || BODY_ICONS['No preference']}
          </div>
          <span className="body-chip-label">{opt}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface({ onReview, onHome, onCompare }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm **Cooper**, your Motifi car advisor — I'll find your perfect used car in just a few questions. First up, what's your budget?",
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

      // When Cooper produces the JSON block, transition into the editorial
      // loading handoff for ~2.5s then route to the review screen, where
      // the user can sanity-check all 16 answers before scoring runs.
      if (answers) {
        setShowLoader(true)
        setTimeout(() => onReview({ answers }), 2500)
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
    <div className="motifi-screen chat">
      <TopNav
        current="find"
        onHome={onHome}
        onStart={() => { /* already here */ }}
        onCompare={onCompare}
      />

      <div className="chat-body">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={'msg-row ' + (msg.role === 'user' ? 'user' : 'assistant')}>
              {msg.role === 'assistant' && <span className="av">C</span>}
              <div className={'bubble ' + msg.role}>
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>

            {/* Chips — only on the latest assistant message */}
            {msg.role === 'assistant' && msg.chips && i === messages.length - 1 && !loading && (
              isBodyTypeChips(msg.chips)
                ? <BodyTypeChips chips={msg.chips} onSelect={send} />
                : <TextChips chips={msg.chips} onSelect={send} />
            )}
          </div>
        ))}

        {loading && (
          <div className="msg-row assistant">
            <span className="av">C</span>
            <div className="typing"><i></i><i></i><i></i></div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: '#FF6B6B', fontSize: '14px', padding: '8px' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="composer">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="send" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}

