// ReviewScreen.jsx — Session 2
// Sits between ChatInterface and Results. Lets the user sanity-check
// (and edit) every answer Cooper collected before scoring runs.
// All edits are local to this screen — confirming runs scoring once
// and hands off to Results.

import { useState } from 'react'
import TopNav from './TopNav'
import carsData from './data/cars.json'
import { applyHardFilters } from './scoring/filters.jsx'
import { getTopMatches } from './scoring/engine.jsx'
import './design/tokens.css'
import './design/screens.css'

// Field metadata — drives both the read-only display and the edit mode.
// `kind` controls the editor: 'chips' | 'text' | 'number' | 'budget'.
// `options` only applies to 'chips'.
const FIELDS = [
  { key: 'budgetMin',     label: 'Budget',          kind: 'budget',
    format: a => `£${Number(a.budgetMin || 0).toLocaleString()}–£${Number(a.budgetMax || 0).toLocaleString()}` },
  { key: 'paymentMethod', label: 'Payment',         kind: 'chips',
    options: ['Cash', 'Part Exchange', 'Hire Purchase', 'Bank Loan'] },
  { key: 'partExValue',   label: 'Part-ex value',   kind: 'number',
    showIf: a => a.paymentMethod === 'Part Exchange',
    format: a => a.partExValue ? `£${Number(a.partExValue).toLocaleString()}` : '—' },
  { key: 'depositAmount', label: 'Deposit',         kind: 'number',
    showIf: a => a.paymentMethod === 'Hire Purchase',
    format: a => a.depositAmount ? `£${Number(a.depositAmount).toLocaleString()}` : '—' },
  { key: 'transmission',  label: 'Transmission',    kind: 'chips',
    options: ['Manual', 'Automatic', 'No preference'] },
  { key: 'fuelType',      label: 'Fuel',            kind: 'chips',
    options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'No preference'] },
  { key: 'bodyType',      label: 'Body type',       kind: 'chips',
    options: ['Hatchback', 'SUV', 'Estate', 'Saloon', 'MPV', 'Coupe', 'Van', 'Crossover', 'No preference'] },
  { key: 'drivingContext', label: 'Driving',        kind: 'chips',
    options: ['Mostly city', 'Mostly motorway', 'Mostly rural', 'Mixed'] },
  { key: 'annualMileage', label: 'Annual mileage',  kind: 'chips',
    options: ['Under 3,000', '3,000-5,000', '5,000-8,000', '8,000+'] },
  { key: 'bootSpace',     label: 'Boot space',      kind: 'chips',
    options: ['Small', 'Medium', 'Large', 'Very Large', 'No preference'] },
  { key: 'priority',      label: 'Priority',        kind: 'chips',
    options: ['MPG', 'Reliability', 'Depreciation'] },
  { key: 'ulezRequired',  label: 'ULEZ required',   kind: 'chips',
    options: ['Yes', 'No'] },
  { key: 'postcode',      label: 'Postcode',        kind: 'text' },
  { key: 'searchRadius',  label: 'Search radius',   kind: 'chips',
    options: [10, 25, 50, 100, 1500],
    format: a => a.searchRadius === 1500 ? 'Nationwide' : `${a.searchRadius} miles` },
  { key: 'gender',        label: 'Gender',          kind: 'chips',
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
  { key: 'age',           label: 'Age',             kind: 'number' },
]

export default function ReviewScreen({ initialAnswers, onResults, onHome, onCompare, onBack }) {
  const [answers, setAnswers] = useState(initialAnswers || {})
  const [editingKey, setEditingKey] = useState(null)

  const visibleFields = FIELDS.filter(f => !f.showIf || f.showIf(answers))

  function startEdit(key) { setEditingKey(key) }
  function cancelEdit()   { setEditingKey(null) }

  function commitEdit(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
    setEditingKey(null)
  }

  function commitBudget(min, max) {
    setAnswers(prev => ({ ...prev, budgetMin: min, budgetMax: max }))
    setEditingKey(null)
  }

  function findMatches() {
    const filtered = applyHardFilters(carsData, answers)
    const top      = getTopMatches(filtered, answers, { maxResults: 10, minScore: 6.0 })
    onResults({ results: top, answers })
  }

  return (
    <div className="motifi-screen">
      <TopNav
        current="find"
        onHome={onHome}
        onStart={() => { /* already here */ }}
        onCompare={onCompare}
      />

      <div className="review">
        <div className="kicker">◆ Almost there · Step 2 of 2</div>
        <h1>Quick check — <em>did I get it all right?</em></h1>
        <p className="lede">
          Here's everything you told me. Edit anything that's off, then I'll
          run the numbers and hand back your shortlist.
        </p>

        <div className="review-card">
          {visibleFields.map(f => (
            <ReviewRow
              key={f.key}
              field={f}
              answers={answers}
              isEditing={editingKey === f.key}
              onStartEdit={() => startEdit(f.key)}
              onCancel={cancelEdit}
              onCommit={(v) => commitEdit(f.key, v)}
              onCommitBudget={commitBudget}
            />
          ))}
        </div>

        <div className="review-cta">
          <span className="note">All edits stay local until you continue.</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn ghost" onClick={onBack}>
              <span style={{ marginRight: 4 }}>←</span> Back to Cooper
            </button>
            <button className="btn lg" onClick={findMatches}>
              Find my matches<span className="arrow" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ field, answers, isEditing, onStartEdit, onCancel, onCommit, onCommitBudget }) {
  const display = field.format
    ? field.format(answers)
    : (answers[field.key] ?? '—')

  return (
    <div className={'review-row' + (isEditing ? ' editing' : '')}>
      <div className="review-k">{field.label}</div>
      <div className="review-v">{display}</div>
      {!isEditing && (
        <button className="review-edit" onClick={onStartEdit}>Edit</button>
      )}

      {isEditing && (
        <div className="review-edit-inline">
          {field.kind === 'chips' && (
            <ChipsEditor
              options={field.options}
              value={answers[field.key]}
              onSelect={(v) => onCommit(v)}
              format={field.format}
              answers={answers}
              fieldKey={field.key}
            />
          )}
          {field.kind === 'text' && (
            <TextEditor
              initial={answers[field.key] || ''}
              onCommit={onCommit}
            />
          )}
          {field.kind === 'number' && (
            <NumberEditor
              initial={answers[field.key] || ''}
              onCommit={(v) => onCommit(Number(v))}
            />
          )}
          {field.kind === 'budget' && (
            <BudgetEditor
              initialMin={answers.budgetMin || ''}
              initialMax={answers.budgetMax || ''}
              onCommit={onCommitBudget}
            />
          )}
          <div className="edit-actions">
            <button className="btn ghost sm" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChipsEditor({ options, value, onSelect, format, answers, fieldKey }) {
  return (
    <div className="edit-chips">
      {options.map(opt => {
        const selected = value === opt
        // For searchRadius the value is numeric — render the friendly label
        const label = fieldKey === 'searchRadius'
          ? (opt === 1500 ? 'Nationwide' : `${opt} miles`)
          : String(opt)
        return (
          <button
            key={String(opt)}
            className={'edit-chip' + (selected ? ' selected' : '')}
            onClick={() => onSelect(opt)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function TextEditor({ initial, onCommit }) {
  const [v, setV] = useState(initial)
  return (
    <input
      type="text"
      value={v}
      autoFocus
      onChange={e => setV(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onCommit(v) }}
      onBlur={() => onCommit(v)}
    />
  )
}

function NumberEditor({ initial, onCommit }) {
  const [v, setV] = useState(initial)
  return (
    <input
      type="number"
      value={v}
      autoFocus
      onChange={e => setV(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onCommit(v) }}
      onBlur={() => v !== '' && onCommit(v)}
    />
  )
}

function BudgetEditor({ initialMin, initialMax, onCommit }) {
  const [min, setMin] = useState(initialMin)
  const [max, setMax] = useState(initialMax)
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <input
        type="number"
        placeholder="Min £"
        value={min}
        autoFocus
        onChange={e => setMin(e.target.value)}
      />
      <input
        type="number"
        placeholder="Max £"
        value={max}
        onChange={e => setMax(e.target.value)}
        onBlur={() => min !== '' && max !== '' && onCommit(Number(min), Number(max))}
        onKeyDown={e => { if (e.key === 'Enter' && min !== '' && max !== '') onCommit(Number(min), Number(max)) }}
      />
    </div>
  )
}
