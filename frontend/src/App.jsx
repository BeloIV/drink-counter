import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import './App.css'
import { FaBeer, FaCoffee, FaSnowflake } from 'react-icons/fa'
import logo from '/favicon.png'
import { useTheme } from './useTheme'
import { getFunnyMessage } from './funnyMessages'

// ── bag tare weights (g) ──────────────────────────────────────────────────────
const BAG_SIZES = [
  { label: '1 kg sáčok', tare: 28 },
  { label: '500 g sáčok', tare: 19.5 },
  { label: '250 g sáčok', tare: 14 },
  { label: '100 g sáčok', tare: 11 },
  { label: 'Bez sáčka', tare: 0 },
]

function CoffeeCheckModal({ item, onClose, onUpdated }) {
  const [measured, setMeasured] = useState('')
  const [bagIdx, setBagIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const tare = BAG_SIZES[bagIdx].tare
  const measuredNum = parseFloat(String(measured).replace(',', '.'))
  const net = isNaN(measuredNum) ? null : Math.max(0, measuredNum - tare)
  const systemStock = item ? Number(item.stock_quantity) : 0
  const diff = net !== null ? net - systemStock : null

  const [saveErr, setSaveErr] = useState('')

  const handleSave = async () => {
    if (net === null || !item) return
    setSaving(true)
    setSaveErr('')
    try {
      await api.csrf().catch(() => {})
      await api.setStock(item.id, net)
      setSaved(true)
      setTimeout(onUpdated, 800)
    } catch (e) {
      setSaving(false)
      setSaveErr(e?.status === 403
        ? 'Potrebné admin prihlásenie — zásobu uprav v Admin paneli.'
        : 'Chyba pri ukladaní.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
    >
      <div className="card shadow-lg pop-in" style={{ maxWidth:400, width:'100%' }} onClick={e => e.stopPropagation()}>
        <div className="card-body p-4">
          <div style={{ fontSize:'2rem', textAlign:'center', marginBottom:'0.25rem' }}>⚖️</div>
          <h5 className="text-center mb-1">Kontrola zásoby kávy</h5>
          <p className="text-muted small text-center mb-3">Každých 10 šálok — odváž sáčok a skontrolujme zásoby.</p>

          <p className="text-center fw-semibold mb-3">☕ {item.name}</p>

          <div className="mb-3">
            <label className="form-label small text-muted mb-1">Veľkosť sáčka (tara)</label>
            <div className="d-flex flex-wrap gap-1">
              {BAG_SIZES.map((b, idx) => (
                <button
                  key={idx}
                  className={`btn btn-sm ${bagIdx === idx ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setBagIdx(idx)}
                >
                  {b.label}
                  <span className="ms-1 text-muted" style={{ fontSize: 10 }}>({b.tare}g)</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small text-muted mb-1">Nameraná hmotnosť sáčka (g)</label>
            <input
              className="form-control"
              type="number"
              inputMode="decimal"
              placeholder="napr. 320"
              value={measured}
              onChange={e => setMeasured(e.target.value)}
              autoFocus
            />
          </div>

          {net !== null && (
            <table className="table table-sm mb-3">
              <tbody>
                <tr>
                  <td className="text-muted">Namerané</td>
                  <td className="fw-semibold">{measuredNum.toFixed(1)} g</td>
                </tr>
                <tr>
                  <td className="text-muted">Tara sáčka</td>
                  <td>− {tare} g</td>
                </tr>
                <tr className="table-info">
                  <td className="fw-bold">Čistá káva</td>
                  <td className="fw-bold">{net.toFixed(1)} g</td>
                </tr>
                <tr>
                  <td className="text-muted">Systém hovorí</td>
                  <td>{systemStock.toFixed(1)} g</td>
                </tr>
                <tr className={diff === 0 ? 'table-success' : Math.abs(diff) < 20 ? 'table-warning' : 'table-danger'}>
                  <td className="fw-bold">Rozdiel</td>
                  <td className="fw-bold">
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} g
                    {' '}
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {diff === 0 ? '✓ Sedí' : diff > 0 ? '(viac než systém)' : '(menej než systém)'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {saveErr && (
            <div className="alert alert-danger py-2 small mb-2">{saveErr}</div>
          )}
          <div className="d-flex gap-2">
            {net !== null && !saved && (
              <button className="btn btn-success flex-fill" disabled={saving} onClick={handleSave}>
                {saving ? '...' : '📦 Aktualizovať zásobu'}
              </button>
            )}
            {saved && <div className="btn btn-success flex-fill disabled">✓ Uložené</div>}
            <button className="btn btn-outline-secondary flex-fill" onClick={onClose}>
              Zavrieť
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PersonCard — memo = re-renderuje len ked sa jej vlastné props zmenia ──
const PersonCard = memo(function PersonCard({ p, multi, selected, debt, onClick, enterDelay }) {
  const avatarUrl = p.avatar?.startsWith('/media/') ? p.avatar : null

  return (
    <button
      className={`choice choice-enter ${!avatarUrl ? 'choice-initials' : ''} ${multi ? (selected ? 'multi-selected' : 'multi-dim') : ''}`}
      onClick={onClick}
      style={avatarUrl
        ? { backgroundImage: `url(${avatarUrl})`, animationDelay: enterDelay ?? '0s' }
        : { background: nameGradient(p.name), animationDelay: enterDelay ?? '0s' }}
    >
      <div className="overlay">
        {!avatarUrl && <div className="initials-letter">{getInitials(p.name)}</div>}
        <div className="fw-bold">{p.name}</div>
        <div
          className={`small mt-1 fw-bold debt-value${debt >= 30 ? ' debt-pulse-fast' : debt >= 25 ? ' debt-pulse-slow' : ''}`}
          style={{
            color: debt >= 20 ? '#ff4444' : debt >= 10 ? '#ffa94d' : 'rgba(255,255,255,0.85)',
            textShadow: debt >= 10 ? '0 1px 4px rgba(0,0,0,0.9)' : 'none',
          }}
        >
          {debt.toFixed(2)} €
        </div>
      </div>
      {multi && (
        <div className={`multi-check ${selected ? 'multi-check-on' : ''}`}>
          {selected ? '✓' : ''}
        </div>
      )}
    </button>
  )
})

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
  const [isUndoing, setIsUndoing] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(null) // {item, quantity}
  const [stockWarning, setStockWarning] = useState(null) // { item, quantity, onConfirm }
  const [lastOrder, setLastOrder] = useState(null)
  const [coffeeCheckModal, setCoffeeCheckModal] = useState(null) // { coffeeItems }

  // per_item qty picker (beer/ks items)
  const [itemQty, setItemQty] = useState({})
  const [itemQtyVersion, setItemQtyVersion] = useState({})
  const itemQtyRef = useRef({})
  const itemTimerRef = useRef({})
  const maybeAddItemRef = useRef(null)

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

  const loadPersons = () => api.persons().then(setPersons)
  const loadItems = () => api.items('?active=true').then(data => setItems(Array.isArray(data) ? data : []))
  const refreshSummary = () => api.sessionActive().then(setSummary)

  useEffect(() => { Promise.all([loadPersons(), loadItems(), refreshSummary()]) }, [])

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

  const undoLast = async () => {
    if (!selectedPerson || isUndoing) return
    setIsUndoing(true)
    try {
      await api.undoTransaction(selectedPerson.id)
      await Promise.all([refreshSummary(), loadItems()])
      resetFlow()
    } catch {
      setNotice('Undo sa nepodarilo')
      setTimeout(() => setNotice(''), 3000)
    } finally {
      setIsUndoing(false)
    }
  }

  const clearItemQty = (id) => {
    if (itemTimerRef.current[id]) { clearTimeout(itemTimerRef.current[id]); delete itemTimerRef.current[id] }
    delete itemQtyRef.current[id]
    setItemQty(prev => { const { [id]: _, ...rest } = prev; return rest })
    setItemQtyVersion(prev => { const { [id]: _, ...rest } = prev; return rest })
  }

  const scheduleItemSubmit = (item) => {
    const id = item.id
    if (itemTimerRef.current[id]) clearTimeout(itemTimerRef.current[id])
    itemTimerRef.current[id] = setTimeout(() => {
      const qty = itemQtyRef.current[id]
      delete itemTimerRef.current[id]
      delete itemQtyRef.current[id]
      setItemQty(prev => { const { [id]: _, ...rest } = prev; return rest })
      setItemQtyVersion(prev => { const { [id]: _, ...rest } = prev; return rest })
      if (qty) maybeAddItemRef.current(item, qty)
    }, 5000)
  }

  const onItemClick = (item) => {
    if (item.pricing_mode !== 'per_item') { proceedItem(item); return }
    const id = item.id
    const newQty = (itemQtyRef.current[id] || 0) + 1
    itemQtyRef.current[id] = newQty
    setItemQty(prev => ({ ...prev, [id]: newQty }))
    setItemQtyVersion(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    scheduleItemSubmit(item)
  }

  const onItemMinus = (item, e) => {
    e.stopPropagation()
    const id = item.id
    const cur = itemQtyRef.current[id] || 0
    if (cur <= 1) { clearItemQty(id); return }
    const newQty = cur - 1
    itemQtyRef.current[id] = newQty
    setItemQty(prev => ({ ...prev, [id]: newQty }))
    setItemQtyVersion(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    scheduleItemSubmit(item)
  }

  const onItemPlus = (item, e) => {
    e.stopPropagation()
    const id = item.id
    const newQty = (itemQtyRef.current[id] || 0) + 1
    itemQtyRef.current[id] = newQty
    setItemQty(prev => ({ ...prev, [id]: newQty }))
    setItemQtyVersion(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    scheduleItemSubmit(item)
  }

  const resetFlow = () => {
    Object.keys(itemTimerRef.current).forEach(id => clearTimeout(itemTimerRef.current[id]))
    itemTimerRef.current = {}
    itemQtyRef.current = {}
    setItemQty({})
    setItemQtyVersion({})
    setStep('person')
    setSelectedPerson(null)
    setSelectedPersons([])
    setSelectedCategory(null)
    setSelectedItem(null)
    setGrams('7')
    setCountdown(null)
    setFunnyMsg(null)
    setLastOrder(null)
  }

  // --- výber osôb ---
  const toggleMulti = useCallback(() => {
    setMulti(m => !m)
    setSelectedPersons([])
    setSelectedPerson(null)
  }, [])

  const onPersonClick = useCallback((p) => {
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
  }, [multi])

  const continueFromMulti = useCallback(() => {
    if (selectedPersons.length === 0) return
    setStep('category')
  }, [selectedPersons.length])

  // --- výber kategórie a itemu ---
  const pickCategory = (c) => { setSelectedCategory(c); setSelectedItem(null); setStep('item') }

  const proceedItem = (i) => {
    setSelectedItem(i)
    if (i.pricing_mode === 'per_gram') {
      setGrams('7')
      setStep('grams')
    } else if (i.pricing_mode === 'per_ml') {
      setGrams('200')
      setStep('grams')
    } else {
      maybeAddItem(i, null)
    }
  }

  // --- odoslanie transakcií ---
  const addItem = async (item, quantity) => {
    setIsSubmitting(true)
    try {
      if (multi && selectedPersons.length > 0) {
        const n = selectedPersons.length
        const isPerUnit = item.pricing_mode === 'per_gram' || item.pricing_mode === 'per_ml'
        const unit = item.pricing_mode === 'per_ml' ? 'ml' : 'g'
        const qtyPerPerson = isPerUnit ? Number(quantity) / n : undefined

        const results = await Promise.all(
          selectedPersons.map(p => api.addTransaction({
            person_id: p.id,
            item_id: item.id,
            ...(isPerUnit ? { quantity: qtyPerPerson } : {})
          }))
        )

        await Promise.all([refreshSummary(), loadItems()])
        setNotice(
          isPerUnit
            ? `Pridané ${Number(quantity)} ${unit} (${(Number(quantity) / n).toFixed(2)} ${unit}/osoba) pre ${n} ľudí`
            : `Pridaný 1 ks pre ${n} ľudí`
        )
        setTimeout(() => setNotice(''), 3000)
        setStep('person')

        const triggerTx = results.find(tx => tx.trigger_check && tx.item?.stock_quantity !== null)
        if (triggerTx) setCoffeeCheckModal({ item: triggerTx.item })
        return
      }

      if (!selectedPerson) return
      const tx = await api.addTransaction({
        person_id: selectedPerson.id,
        item_id: item.id,
        ...(quantity !== null && quantity !== undefined ? { quantity: Number(quantity) } : {})
      })
      setLastOrder(tx)
      await Promise.all([refreshSummary(), loadItems()])
      setFunnyMsg(getFunnyMessage())
      setCountdown(5)
      setStep('done')

      // backend signalizuje každých 10 varení tej konkrétnej kávy
      // tx.item.stock_quantity je už po odpočítaní aktuálnej šálky — správny aktuálny stav
      if (tx.trigger_check && tx.item?.stock_quantity !== null) {
        setCoffeeCheckModal({ item: tx.item })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // kontrola dlhu pred pridaním
  const maybeAddItem = (item, quantity) => {
    // Stock check
    if (item.stock_quantity !== null && item.stock_quantity !== undefined) {
      const perItemCount = quantity ? Number(quantity) : (multi ? selectedPersons.length : 1)
      const needed = item.pricing_mode === 'per_item'
        ? perItemCount
        : Number(quantity || 0)
      if (needed > Number(item.stock_quantity)) {
        setStockWarning({
          item,
          quantity,
          available: Number(item.stock_quantity),
          needed,
          onConfirm: () => { setStockWarning(null); addItem(item, quantity) }
        })
        return
      }
    }
    // Debt check
    const currentDebt = multi
      ? Math.max(...selectedPersons.map(p => debts[p.id] ?? 0))
      : (debts[selectedPerson?.id] ?? 0)
    if (currentDebt >= 35) {
      setPendingAdd({ item, quantity })
      setShowDebtModal(true)
      return
    }
    addItem(item, quantity)
  }

  maybeAddItemRef.current = maybeAddItem

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
      {coffeeCheckModal && (
        <CoffeeCheckModal
          item={coffeeCheckModal.item}
          onClose={() => setCoffeeCheckModal(null)}
          onUpdated={async () => { setCoffeeCheckModal(null); await loadItems() }}
        />
      )}
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
              {multi ? '👥 Viac osôb' : 'Viac osôb'}
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
          </Section>

          {multi && selectedPersons.length > 0 && (
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
            {items.some(i => i.category?.name?.toLowerCase() === 'beer') && (
              <button className="choice choice-beer" onClick={() => pickCategory('Beer')}>
                <FaBeer size={36} style={{ marginBottom: 6 }} />
                <div>Pivo</div>
              </button>
            )}
            {items.some(i => i.category?.name?.toLowerCase() === 'coffee') && (
              <button className="choice choice-coffee" onClick={() => pickCategory('Coffee')}>
                <FaCoffee size={36} style={{ marginBottom: 6 }} />
                <div>Káva</div>
              </button>
            )}
            {items.some(i => i.category?.name?.toLowerCase() === 'cold brew') && (
              <button className="choice choice-cold-brew" onClick={() => pickCategory('Cold Brew')}>
                <FaSnowflake size={36} style={{ marginBottom: 6 }} />
                <div>Cold Brew</div>
              </button>
            )}
          </div>
          <div className="mt-3">
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Späť</button>
          </div>
        </Section>
      )}

      {/* krok 3: typ nápoja */}
      {step === 'item' && (
        <Section title={`Vyber ${selectedCategory === 'Beer' ? 'pivo' : selectedCategory === 'Cold Brew' ? 'cold brew' : 'kávu'}`}>
          <div className="grid-choices">
            {categoryItems.map((i, idx) => {
              const bgColor = i.color || '#ffffff'
              const isLight = bgColor === '#ffffff' || bgColor.toLowerCase() === '#fff'
              const qty = itemQty[i.id]
              return (
                <button
                  key={i.id}
                  className="choice choice-enter"
                  disabled={isSubmitting}
                  onClick={() => onItemClick(i)}
                  style={{
                    backgroundColor: bgColor,
                    color: isLight ? '#000' : '#fff',
                    border: isLight ? '2px solid #ddd' : 'none',
                    animationDelay: `${idx * 0.06}s`,
                    position: 'relative',
                  }}
                >
                  {qty ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 6 }}>
                      <div className="fw-semibold small" style={{ opacity: 0.75 }}>{i.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={(e) => onItemMinus(i, e)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)',
                            color: isLight ? '#000' : '#fff', fontSize: 20, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >−</button>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, minWidth: 36, textAlign: 'center' }}>{qty}</span>
                        <button
                          onClick={(e) => onItemPlus(i, e)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)',
                            color: isLight ? '#000' : '#fff', fontSize: 20, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >+</button>
                      </div>
                      <div style={{ opacity: 0.65, fontSize: 11 }}>
                        = {(Number(i.price) * qty).toFixed(2)} €
                      </div>
                      <div style={{ width: '75%', height: 3, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden', marginTop: 2 }}>
                        <div
                          key={itemQtyVersion[i.id]}
                          style={{ height: '100%', borderRadius: 99, background: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', animation: 'shrink-bar 5s linear forwards' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="fw-bold">{i.name}</div>
                      <div className="small" style={{ color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }}>
                        {i.pricing_mode === 'per_gram'
                          ? `${Number(i.price).toFixed(3)} €/g`
                          : i.pricing_mode === 'per_ml'
                          ? `${Number(i.price).toFixed(3)} €/ml`
                          : `${Number(i.price).toFixed(2)} €`}
                      </div>
                      {i.stock_quantity !== null && i.stock_quantity !== undefined && (
                        <div className="small mt-1" style={{
                          color: Number(i.stock_quantity) < (i.pricing_mode === 'per_item' ? 3 : 50)
                            ? '#fd7e14'
                            : isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)',
                          fontWeight: Number(i.stock_quantity) < (i.pricing_mode === 'per_item' ? 3 : 50) ? '600' : 'normal',
                        }}>
                          📦 {Number(i.stock_quantity).toFixed(0)}{' '}
                          {i.pricing_mode === 'per_gram' ? 'g' : i.pricing_mode === 'per_ml' ? 'ml' : 'ks'}
                        </div>
                      )}
                    </>
                  )}
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

      {/* krok 3b: gramáž / ml */}
      {step === 'grams' && (
        <Section title={`Koľko ${selectedItem?.pricing_mode === 'per_ml' ? 'ml cold brew' : 'gramov kávy'}? ${multi ? `(delí sa medzi ${selectedPersons.length} os.)` : ''}`}>
          <div className="grid-choices">
            {(selectedItem?.pricing_mode === 'per_ml' ? [200, 250, 400] : [15, 20, 30, 45, 60]).map((g, idx) => (
              <button key={g} className="choice choice-enter" onClick={() => maybeAddItem(selectedItem, g)} disabled={isSubmitting}
                style={{ animationDelay: `${idx * 0.05}s` }}>
                {g} {selectedItem?.pricing_mode === 'per_ml' ? 'ml' : 'g'}
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
                <button className="btn btn-primary" onClick={() => maybeAddItem(selectedItem, grams)} disabled={isSubmitting}>OK</button>
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
            {lastOrder && (
              <div className="mt-2 mb-1 text-muted small">
                {lastOrder.item?.name}
                {lastOrder.item?.pricing_mode === 'per_gram' && ` · ${Number(lastOrder.quantity).toFixed(0)} g`}
                {lastOrder.item?.pricing_mode === 'per_ml' && ` · ${Number(lastOrder.quantity).toFixed(0)} ml`}
                {lastOrder.item?.pricing_mode === 'per_item' && Number(lastOrder.quantity) > 1 && ` · ${Number(lastOrder.quantity).toFixed(0)} ks`}
                {' · '}
                <span className="text-success fw-bold">+{Number(lastOrder.price_at_time).toFixed(2)} €</span>
              </div>
            )}
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
              onClick={() => { setCountdown(null); setStep(selectedItem?.pricing_mode === 'per_gram' || selectedItem?.pricing_mode === 'per_ml' ? 'grams' : 'item') }}
            >
              Pridať ďalší
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={undoLast}
              disabled={isUndoing}
            >
              {isUndoing ? 'Ruším…' : '↩ Undo'}
            </button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Domov</button>
          </div>
        </Section>
      )}

      {/* odkaz na admin */}
      <div className="mt-4 text-center d-flex gap-2 justify-content-center">
        <Link className="btn btn-outline-secondary" to="/admin">Admin</Link>
        <Link className="btn btn-outline-primary" to="/transactions">Transakcie</Link>
        <Link className="btn btn-outline-secondary" to="/stats">📊 Štatistiky</Link>
      </div>

      {/* Modal: málo zásoby */}
      {stockWarning && (
        <div className="debt-modal-overlay" onClick={() => setStockWarning(null)}>
          <div className="debt-modal pop-in" style={{ borderColor: '#fd7e14', boxShadow: '0 0 32px rgba(253,126,20,0.35)' }} onClick={e => e.stopPropagation()}>
            <div className="debt-modal-icon">⚠️</div>
            <div className="debt-modal-title" style={{ color: '#fd7e14' }}>Málo zásoby!</div>
            <div className="debt-modal-body">
              Dostupné: <strong>{stockWarning.available.toFixed(0)} {stockWarning.item.pricing_mode === 'per_gram' ? 'g' : stockWarning.item.pricing_mode === 'per_ml' ? 'ml' : 'ks'}</strong><br />
              Potrebné: <strong>{stockWarning.needed.toFixed(0)} {stockWarning.item.pricing_mode === 'per_gram' ? 'g' : stockWarning.item.pricing_mode === 'per_ml' ? 'ml' : 'ks'}</strong>
            </div>
            <div className="debt-modal-actions">
              <button className="btn btn-warning" onClick={stockWarning.onConfirm}>Aj tak pridať</button>
              <button className="btn btn-outline-secondary" onClick={() => setStockWarning(null)}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: vysoký dlh ≥35 */}
      {showDebtModal && (
        <div className="debt-modal-overlay" onClick={() => setShowDebtModal(false)}>
          <div className="debt-modal pop-in" onClick={e => e.stopPropagation()}>
            <div className="debt-modal-icon">⚠️</div>
            <div className="debt-modal-title">Vysoký dlh!</div>
            <div className="debt-modal-body">
              {multi
                ? 'Niektorý z vybraných ľudí má dlh nad 35 €.'
                : `${selectedPerson?.name} má dlh ${(debts[selectedPerson?.id] ?? 0).toFixed(2)} €.`}
              <br />Najprv zaplaťte, prosím.
            </div>
            <div className="debt-modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  setShowDebtModal(false)
                  setPendingAdd(null)
                }}
              >
                Zatvoriť
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowDebtModal(false)
                  addItem(pendingAdd.item, pendingAdd.quantity)
                  setPendingAdd(null)
                }}
              >
                Aj tak pridať
              </button>
            </div>
          </div>
        </div>
      )}

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
    <div className="mb-4 step-zoom-in">
      <h4 className="mb-3 text-center">{title}</h4>
      {children}
    </div>
  )
}
