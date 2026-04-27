// ChatInterface.jsx — v6 (Session 2.5)
// Editorial Cooper retreatment.
// Adds the page header (kicker + Fraunces hero + lede), the live
// "What Cooper knows so far" profile strip, and the cars-match
// counter that drops as constraints accumulate. Bubble styling,
// chip styling and composer shape rebuilt to match the prototype.

import { useState, useRef, useEffect, useMemo } from 'react'
import TopNav from './TopNav'
import carsData from './data/cars.json'
import { applyHardFilters } from './scoring/filters.jsx'
import './design/tokens.css'
import './design/screens.css'

// ─── Markdown parser (bold + italic only, no library) ────────────────────────

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

// ─── Body type SVG silhouettes ───────────────────────────────────────────────

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

// ─── System prompt (unchanged from v5) ───────────────────────────────────────

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

PARTIAL ANSWERS — every time you receive a user reply, IF you can confidently extract one or more answers from it, end your message with a partial-answers tag BEFORE any <CHIPS> tag, like this:
<MOTIFI_PARTIAL>{"key":"value","key2":"value2"}</MOTIFI_PARTIAL>

Example after the user gives their budget: <MOTIFI_PARTIAL>{"budgetMin":10000,"budgetMax":14000}</MOTIFI_PARTIAL>
Example after the user picks fuel: <MOTIFI_PARTIAL>{"fuelType":"Electric"}</MOTIFI_PARTIAL>

Use the EXACT keys from the question list. Numbers as numbers, strings as strings. Only emit keys you are confident about.

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

// ─── Tag extractors ──────────────────────────────────────────────────────────

function extractAnswers(text) {
  const match = text.match(/<MOTIFI_ANSWERS>([\s\S]*?)<\/MOTIFI_ANSWERS>/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

function extractPartial(text) {
  const match = text.match(/<MOTIFI_PARTIAL>([\s\S]*?)<\/MOTIFI_PARTIAL>/)
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
    .replace(/<MOTIFI_PARTIAL>[\s\S]*?<\/MOTIFI_PARTIAL>/, '')
    .replace(/<CHIPS>.*?<\/CHIPS>/, '')
    .trim()
}

function isBodyTypeChips(chips) {
  if (!chips) return false
  return chips.some(c => ["Hatchback","SUV","Estate","Saloon","MPV","Coupe","Van","Crossover"].includes(c))
}

// ─── Profile strip — derived from accumulated partial answers ────────────────
// Five slots, populated as Cooper learns. Only filled slots render —
// the strip builds up left-to-right as the conversation progresses.

function buildProfile(partial) {
  const slots = []
  if (partial.drivingContext) {
    slots.push({ k: 'Use', v: partial.drivingContext.replace(/^Mostly /, '') + ' miles' })
  }
  if (partial.paymentMethod) {
    const short = ({
      'Cash': 'Cash',
      'Part Exchange': 'Part-ex',
      'Hire Purchase': 'HP',
      'Bank Loan': 'Loan',
    })[partial.paymentMethod] || partial.paymentMethod
    slots.push({ k: 'Finance', v: short })
  }
  if (partial.budgetMax) {
    slots.push({ k: 'Budget', v: '£' + Number(partial.budgetMax).toLocaleString() })
  }
  if (partial.fuelType) {
    slots.push({ k: 'Fuel', v: partial.fuelType })
  }
  if (partial.postcode || partial.ulezRequired) {
    let loc = '—'
    if (partial.ulezRequired === 'Yes') loc = 'Inside ULEZ'
    else if (partial.ulezRequired === 'No') loc = 'Outside ULEZ'
    else if (partial.postcode) loc = String(partial.postcode).toUpperCase().slice(0, 4).trim()
    slots.push({ k: 'Location', v: loc })
  }
  return slots
}

// ─── Loading handoff (unchanged from v5) ─────────────────────────────────────

function LoadingScreen() {
  const [shown, setShown] = useState([false, false, false])
  const steps = ['Filtering on fit', 'Scoring on cost honesty', 'Assembling your matches']
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
        <div className="loader-h">I've got enough — <em>loading your matches…</em></div>
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

// ─── Chips ───────────────────────────────────────────────────────────────────

function TextChips({ chips, onSelect }) {
  return (
    <div className="chips-row">
      {chips.map(opt => (
        <button key={opt} className="chip" onClick={() => onSelect(opt)}>
          <span className="chip-plus">+</span>{opt}
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

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChatInterface({ onReview, onHome, onCompare }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi, I'm *Cooper* — your Motifi advisor.", chips: null },
    { role: 'assistant', content: "Instead of a 40-field form, tell me what's going on and I'll narrow down the 353 cars in our index to the few that actually fit.", chips: null },
    { role: 'assistant', content: "Let's start easy — what's your budget?", chips: null },
  ])
  const [partial, setPartial]       = useState({})
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError]           = useState(null)
  const bottomRef                   = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Cars matching the live partial answers — recomputed only when answers
  // change. Starts at the full dataset size and narrows as Cooper learns.
  const carsMatch = useMemo(() => {
    if (Object.keys(partial).length === 0) return carsData.length
    try {
      return applyHardFilters(carsData, partial).length
    } catch {
      return carsData.length
    }
  }, [partial])

  const profileSlots = useMemo(() => buildProfile(partial), [partial])

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
      const partialUpdate = extractPartial(raw)
      const chips   = extractChips(raw)
      const display = cleanText(raw)

      // Merge partial updates into the running state — drives both the
      // profile strip and the cars-match counter.
      if (partialUpdate) {
        setPartial(prev => ({ ...prev, ...partialUpdate }))
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: display,
        chips: answers ? null : chips,
      }])
      setLoading(false)

      if (answers) {
        // Final answers merge over partial — Cooper's terminal JSON wins.
        setShowLoader(true)
        setTimeout(() => onReview({ answers: { ...partial, ...answers } }), 2500)
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
    <div className="motifi-screen cooper light">
      <TopNav
        current="find"
        onHome={onHome}
        onStart={() => { /* already here */ }}
        onCompare={onCompare}
      />

      {/* Live profile strip — fills as Cooper learns */}
      <div className="cooper-strip">
        <div className="cooper-strip-l">
          <span className="cooper-strip-kicker">
            <span className="dot" aria-hidden="true"></span>
            What Cooper knows so far
          </span>
          <div className="cooper-strip-slots">
            {profileSlots.map((s, i) => (
              <div key={i} className="cooper-slot">
                <span className="cooper-slot-k">{s.k}</span>
                <span className="cooper-slot-v">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="cooper-strip-r">
          <div className="cooper-count">{carsMatch}</div>
          <div className="cooper-count-lab">Cars match</div>
        </div>
      </div>

      {/* Editorial hero */}
      <div className="cooper-hero">
        <h1>Hi, I'm <em>Cooper</em>.</h1>
        <p>Tell me what's going on and I'll find the car that actually fits — no
          showroom theatre, no dealer funnel. About two minutes.</p>
      </div>

      {/* Transcript */}
      <div className="chat-body">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={'msg-row ' + (msg.role === 'user' ? 'user' : 'assistant')}>
              {msg.role === 'assistant' && (
                <span className="av">
                  C<span className="av-dot" aria-hidden="true"></span>
                </span>
              )}
              <div className={'bubble ' + msg.role}>
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>

            {msg.role === 'assistant' && msg.chips && i === messages.length - 1 && !loading && (
              isBodyTypeChips(msg.chips)
                ? <BodyTypeChips chips={msg.chips} onSelect={send} />
                : <TextChips chips={msg.chips} onSelect={send} />
            )}
          </div>
        ))}

        {loading && (
          <div className="msg-row assistant">
            <span className="av">C<span className="av-dot" aria-hidden="true"></span></span>
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

      {/* Composer — pill input + circular send */}
      <form onSubmit={handleSubmit} className="composer">
        <div className="composer-pill">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your reply to Cooper…"
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="composer-send" disabled={loading || !input.trim()} aria-label="Send">
            <span className="arrow" aria-hidden="true"></span>
          </button>
        </div>
      </form>
    </div>
  )
}

