import React from 'react'

/**
 * Shared top navigation bar. Used by Home in Session 1; later sessions
 * will import it from the other screens (Results, CarPage, etc.) once
 * those adopt the editorial design system.
 *
 * All styling lives in src/design/home.css (scoped under .motifi-home
 * for Session 1). When the whole app adopts the system, drop the scope.
 *
 * Props:
 *   current   — which nav item to mark active ('home' | 'find' | 'compare')
 *   onHome    — click handler for wordmark + "How it works"
 *   onStart   — click handler for "Find My Car" + "New search"
 *   onCompare — click handler for "Compare"
 *
 * Dead buttons (no handlers, ship Session 5+):
 *   - Sign in
 *   - Your matches
 *   - Finance explained
 */
export default function TopNav({ current = 'home', onHome, onStart, onCompare }) {
  return (
    <header className="topbar">
      <button className="wordmark" onClick={onHome} aria-label="Motifi — home">
        <span>motif</span><b>i</b>
      </button>

      <nav className="nav" aria-label="Primary">
        <button
          className={current === 'home' ? 'active' : ''}
          onClick={onHome}
        >How it works</button>
        <button
          className={current === 'find' ? 'active' : ''}
          onClick={onStart}
        >Find My Car</button>
        <button
          className={current === 'compare' ? 'active' : ''}
          onClick={onCompare}
        >Compare</button>
        <button>Your matches</button>
        <button>Finance explained</button>
      </nav>

      <div className="actions">
        <button className="btn ghost sm" aria-label="Sign in (coming soon)">Sign in</button>
        <button className="btn sm" onClick={onStart}>
          New search<span className="arrow" aria-hidden="true"></span>
        </button>
      </div>
    </header>
  )
}
