import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from './config'
import { api } from './api'
import './App.css'
import { FaBeer, FaCoffee } from 'react-icons/fa'
import logo from '/favicon.png'
import { useTheme } from './useTheme'
import { getFunnyMessage } from './funnyMessages'

// ── PersonCard — defined outside App so React doesn't remount on every render ──
function PersonCard({ p, multi, selected, debt, onClick, enterDelay }) {
  const avatarUrl = p.avatar || null
  const btnRef = useRef(null)
  const prevSelected = useRef(selected)

  useEffect(() => {
    if (selected && !prevSelected.current) {
      btnRef.current?.classList.add('choice-just-selected')
      setTimeout(() => btnRef.current?.classList.remove('choice-just-selected'), 250)
    }
    prevSelected.current = selected
  }, [selected])

  return (
    <button
      ref={btnRef}
      className={`choice choice-enter ${!avatarUrl ? 'choice-initials' : ''} ${multi && selected ? 'selected' : ''}`}
      onClick={onClick}
      style={avatarUrl
        ? { backgroundImage: `url(${avatarUrl})`, animationDelay: enterDelay ?? '0s' }
        : { background: nameGradient(p.name), animationDelay: enterDelay ?? '0s' }}
    >
      <div className="overlay">
        {!avatarUrl && <div className="initials-letter">{getInitials(p.name)}</div>}
        <div className="fw-bold">{p.name}</div>
        <div className="small mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {debt.toFixed(2)} €
        </div>
      </div>
      {multi && selected && <div className="tick">✓</div>}
    </button>
  )
}

// ── helpers ─────────────────────────────────────────────────────
function nameGradient(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const h = Math.abs(hash) % 360
  return `linear-gradient(145deg, hsl(${h},60%,38%), hsl(${(h + 50) % 360},70%,28%))`
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
// ────────────────────────────────────────────────────────────────

export default function App() {
  const { theme, toggle } = useTheme()
  const [persons, setPersons] = useState([])
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ total: 0, per_person: [], session: null })

  // kroky: person | category | item | grams | done
  const [step, setStep] = useState('person')

  // single-select
  const [selectedPerson, setSelectedPerson] = useState(null)

  // multi-select
  const [multi, setMulti] = useState(false)
  const [selectedPersons, setSelectedPersons] = useState([])

  // výber nápoja
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [grams, setGrams] = useState('20')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  // countdown pre auto-reset na "done" kroku
  const [countdown, setCountdown] = useState(null)
  const [funnyMsg, setFunnyMsg] = useState(null)

  // sledovanie scroll pozície
  const [isAtBottom, setIsAtBottom] = useState(false)

  // dlhy mapované podľa person_id
  const debts = useMemo(() => {
    const map = {}
    for (const row of (summary?.per_person || [])) {
      map[row.person_id] = Number(row.total_eur || 0)
    }
    return map
  }, [summary])

  const home = persons.filter(p => !p.is_guest)
  const guests = persons.filter(p => p.is_guest).sort((a, b) => {
    const hasAvatarA = !!a.avatar
    const hasAvatarB = !!b.avatar
    if (hasAvatarA !== hasAvatarB) return hasAvatarB ? 1 : -1
    const totalA = (a.total_beers || 0) + (a.total_coffees || 0)
    const totalB = (b.total_beers || 0) + (b.total_coffees || 0)
    return totalB - totalA
  })

  const loadPersons = () => fetch(`${API_BASE}/persons/`).then(r => r.json()).then(setPersons)
  const loadItems = () =>
    fetch(`${API_BASE}/items/`)
      .then(r => r.json())
      .then(data => setItems(data.filter(i => i.active)))
  const refreshSummary = () => fetch(`${API_BASE}/session/active`).then(r => r.json()).then(setSummary)

  useEffect(() => { loadPersons() }, [])
  useEffect(() => { loadItems() }, [])
  useEffect(() => { refreshSummary() }, [])

  // sledovanie scroll pozície
  useEffect(() => {
    const handleScroll = () => {
      const isBottom =
        (window.innerHeight + (window.scrollY || document.documentElement.scrollTop)) >=
        (document.documentElement.scrollHeight - 100)
      setIsAtBottom(isBottom)
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // auto-reset countdown na "done" kroku
  useEffect(() => {
    if (step !== 'done' || countdown === null) return
    if (countdown <= 0) { resetFlow(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown])

  const personTotal = useMemo(() => {
    if (!selectedPerson) return 0
    return debts[selectedPerson.id] ?? 0
  }, [selectedPerson, debts])

  const categoryItems = useMemo(() => {
    if (!selectedCategory) return []
    return items.filter(i => i.category?.name?.toLowerCase() === selectedCategory.toLowerCase())
  }, [items, selectedCategory])

  const resetFlow = () => {
    setStep('person')
    setSelectedPerson(null)
    setSelectedPersons([])
    setSelectedCategory(null)
    setSelectedItem(null)
    setGrams('7')
    setCountdown(null)
    setFunnyMsg(null)
  }

  // --- výber osôb ---
  const toggleMulti = () => {
    setMulti(m => !m)
    setSelectedPersons([])
    setSelectedPerson(null)
  }

  const onPersonClick = (p) => {
    if (!multi) {
      setSelectedPerson(p)
      setStep('category')
      return
    }
    setSelectedPersons(list => {
      const exists = list.find(x => x.id === p.id)
      if (exists) return list.filter(x => x.id !== p.id)
      return [...list, p]
    })
  }

  const continueFromMulti = () => {
    if (selectedPersons.length === 0) return
    setStep('category')
  }

  // --- výber kategórie a itemu ---
  const pickCategory = (c) => { setSelectedCategory(c); setSelectedItem(null); setStep('item') }

  const proceedItem = (i) => {
    setSelectedItem(i)
    if (i.pricing_mode === 'per_gram') {
      setGrams('7')
      setStep('grams')
    } else {
      addItem(i, null)
    }
  }

  // --- odoslanie transakcií ---
  const addItem = async (item, quantity) => {
    setIsSubmitting(true)
    try {
      if (multi && selectedPersons.length > 0) {
        const n = selectedPersons.length
        const isPerGram = item.pricing_mode === 'per_gram'
        const qtyPerPerson = isPerGram ? Number(quantity) / n : undefined

        await Promise.all(
          selectedPersons.map(p => api.addTransaction({
            person_id: p.id,
            item_id: item.id,
            ...(isPerGram ? { quantity: qtyPerPerson } : {})
          }))
        )

        await refreshSummary()
        setNotice(
          isPerGram
            ? `Pridané ${Number(quantity)} g (${(Number(quantity) / n).toFixed(2)} g/osoba) pre ${n} ľudí`
            : `Pridaný 1 ks pre ${n} ľudí`
        )
        setTimeout(() => setNotice(''), 3000)
        setStep('person')
        return
      }

      if (!selectedPerson) return
      await api.addTransaction({
        person_id: selectedPerson.id,
        item_id: item.id,
        ...(quantity !== null && quantity !== undefined ? { quantity: Number(quantity) } : {})
      })
      await refreshSummary()
      setFunnyMsg(getFunnyMessage())
      setCountdown(5)
      setStep('done')
    } finally {
      setIsSubmitting(false)
    }
  }

  // hosť
  const addGuest = async () => {
    const name = prompt('Meno hosťa:')
    if (!name || !name.trim()) return
    await api.csrf().catch(() => {})
    await api.addPerson({ name: name.trim(), is_guest: true })
    await loadPersons()
    await refreshSummary()
  }

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-link p-0 text-decoration-none logo-header"
          onClick={resetFlow}
        >
          <img src={logo} alt="Drink Counter logo" />
          <h2>Drink Counter</h2>
        </button>
        <button className="theme-toggle" onClick={toggle} title="Prepnúť tému">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* INFO / notice */}
      {notice && (
        <div className="alert alert-success alert-flash py-2 position-relative overflow-hidden">
          {notice}
          <div className="alert-dismiss-bar" style={{ animationDuration: '3s' }} />
        </div>
      )}

      {/* krokovník */}
      <div className="steps mb-3">
        <span className={step === 'person' ? 'active' : (selectedPerson || selectedPersons.length) ? 'done' : ''}>Osoba</span>
        <span className={step === 'category' ? 'active' : selectedCategory ? 'done' : ''}>Kategória</span>
        <span className={step === 'item' || step === 'grams' ? 'active' : step === 'done' ? 'done' : ''}>Typ</span>
        <span className={step === 'grams' ? 'active' : ''}>Gramáž</span>
        <span className={step === 'done' ? 'active' : ''}>Dlh</span>
      </div>

      {/* krok 1: výber osôb */}
      {step === 'person' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="m-0">Vyber osobu</h5>
            <button className={`btn btn-sm ${multi ? 'btn-primary' : 'btn-outline-primary'}`} onClick={toggleMulti}>
              {multi ? 'Viac osôb: zapnuté' : 'Viac osôb'}
            </button>
          </div>

          <Section title="Domáci">
            <div className="grid-choices">
              {home.map((p, idx) => (
                <PersonCard
                  key={p.id}
                  p={p}
                  multi={multi}
                  selected={!!selectedPersons.find(x => x.id === p.id)}
                  debt={debts[p.id] ?? 0}
                  onClick={() => onPersonClick(p)}
                  enterDelay={`${idx * 0.05}s`}
                />
              ))}
            </div>
          </Section>

          <Section title="Hostia">
            <div className="grid-choices">
              {guests.map((p, idx) => (
                <PersonCard
                  key={p.id}
                  p={p}
                  multi={multi}
                  selected={!!selectedPersons.find(x => x.id === p.id)}
                  debt={debts[p.id] ?? 0}
                  onClick={() => onPersonClick(p)}
                  enterDelay={`${(home.length + idx) * 0.05}s`}
                />
              ))}
              <button className="choice choice-initials" style={{ background: nameGradient('+ Hosť') }} onClick={addGuest}>
                <div className="overlay">
                  <div className="initials-letter">+</div>
                  <div className="fw-bold">Pridať hosťa</div>
                </div>
              </button>
            </div>

            {multi && selectedPersons.length > 0 && isAtBottom && (
              <div className="mt-3 text-center">
                <button className="btn btn-success btn-lg" onClick={continueFromMulti}>
                  Pokračovať ({selectedPersons.length})
                </button>
              </div>
            )}
          </Section>

          {multi && selectedPersons.length > 0 && !isAtBottom && (
            <div className="fixed-bottom-button">
              <button className="btn btn-success btn-lg" onClick={continueFromMulti}>
                Pokračovať ({selectedPersons.length})
              </button>
            </div>
          )}
        </>
      )}

      {/* krok 2: kategória */}
      {step === 'category' && (
        <Section title={`${multi ? `Vybraní: ${selectedPersons.length}` : `Ahoj, ${selectedPerson?.name}`} – čo piješ?`}>
          <div className="grid-choices">
            <button className="choice choice-beer" onClick={() => pickCategory('Beer')}>
              <FaBeer size={36} style={{ marginBottom: 6 }} />
              <div>Pivo</div>
            </button>
            <button className="choice choice-coffee" onClick={() => pickCategory('Coffee')}>
              <FaCoffee size={36} style={{ marginBottom: 6 }} />
              <div>Káva</div>
            </button>
          </div>
          <div className="mt-3">
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Späť</button>
          </div>
        </Section>
      )}

      {/* krok 3: typ nápoja */}
      {step === 'item' && (
        <Section title={`Vyber ${selectedCategory === 'Beer' ? 'pivo' : 'kávu'}`}>
          <div className="grid-choices">
            {categoryItems.map((i, idx) => {
              const bgColor = i.color || '#ffffff'
              const isLight = bgColor === '#ffffff' || bgColor.toLowerCase() === '#fff'
              return (
                <button
                  key={i.id}
                  className="choice choice-enter"
                  disabled={isSubmitting}
                  onClick={() => proceedItem(i)}
                  style={{
                    backgroundColor: bgColor,
                    color: isLight ? '#000' : '#fff',
                    border: isLight ? '2px solid #ddd' : 'none',
                    animationDelay: `${idx * 0.06}s`,
                  }}
                >
                  <div className="fw-bold">{i.name}</div>
                  <div className="small" style={{ color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }}>
                    {i.pricing_mode === 'per_gram'
                      ? `${Number(i.price).toFixed(3)} €/g`
                      : `${Number(i.price).toFixed(2)} €`}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setStep('category')}>Späť</button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Zmeniť osobu</button>
          </div>
        </Section>
      )}

      {/* krok 3b: gramáž pre kávu */}
      {step === 'grams' && (
        <Section title={`Koľko gramov kávy? ${multi ? `(delí sa medzi ${selectedPersons.length} os.)` : ''}`}>
          <div className="grid-choices">
            {[15, 20, 30, 45, 60].map((g, idx) => (
              <button key={g} className="choice choice-enter" onClick={() => addItem(selectedItem, g)} disabled={isSubmitting}
                style={{ animationDelay: `${idx * 0.05}s` }}>
                {g} g
                <div className="small text-muted">
                  ≈ {(Number(selectedItem.price) * g).toFixed(2)} €
                </div>
              </button>
            ))}
            <div className="choice choice-enter" style={{ animationDelay: '0.25s' }}>
              <div className="mb-2">Vlastné</div>
              <div className="input-group">
                <input
                  className="form-control"
                  inputMode="decimal"
                  value={grams}
                  onChange={e => setGrams(e.target.value)}
                />
                <button className="btn btn-primary" onClick={() => addItem(selectedItem, grams)} disabled={isSubmitting}>OK</button>
              </div>
              <div className="small text-muted mt-2">
                {(Number(selectedItem?.price || 0) * Number(grams || 0)).toFixed(2)} €
              </div>
            </div>
          </div>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setStep('item')}>Späť</button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Zmeniť osobu</button>
          </div>
        </Section>
      )}

      {/* krok 4: potvrdenie pre single */}
      {step === 'done' && !multi && (
        <Section title="Hotovo!">
          <div className="card p-3 text-center pop-in">
            <div className="done-check">✓</div>
            <div className="fs-5 mt-2">Aktuálny dlh pre</div>
            <div className="fs-3 fw-bold mb-2">{selectedPerson?.name}</div>
            <div className="display-6 fw-bold">{Number(personTotal).toFixed(2)} €</div>
            {funnyMsg && (
              <div className="funny-msg mt-3">
                <div className="funny-msg-emoji">{funnyMsg.emoji}</div>
                <div className="funny-msg-text">{funnyMsg.text}</div>
              </div>
            )}
            <div className="countdown-bar mt-3">
              <div className="countdown-bar-fill" style={{ animationDuration: '5s' }} />
            </div>
            <div className="text-muted small mt-1">Auto-reset za {countdown}s</div>
          </div>
          <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
            <button
              className="btn btn-primary"
              onClick={() => { setCountdown(null); setStep(selectedItem?.pricing_mode === 'per_gram' ? 'grams' : 'item') }}
            >
              Pridať ďalší
            </button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Domov</button>
          </div>
        </Section>
      )}

      {/* odkaz na admin */}
      <div className="mt-4 text-center d-flex gap-2 justify-content-center">
        <Link className="btn btn-outline-secondary" to="/admin">Admin</Link>
        <Link className="btn btn-outline-primary" to="/transactions">Transakcie</Link>
      </div>

      {/* Pätička */}
      <footer className="text-center mt-4">
        <p className="small text-muted">&copy; {new Date().getFullYear()} Drink Counter.</p>
        <ul className="small text-muted" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>1 kg sáčok → 28 g</li>
          <li>500 g sáčok → 19,5 g</li>
          <li>250 g sáčok → 14 g</li>
          <li>100 g sáčok → 11 g</li>
        </ul>
      </footer>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-4 fade-in-up">
      <h4 className="mb-3 text-center">{title}</h4>
      {children}
    </div>
  )
}
