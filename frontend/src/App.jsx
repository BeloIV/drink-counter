import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import './App.css'
import { getFunnyMessage } from './funnyMessages'
import { PageHeader } from './components/PageHeader'
import { Modal } from './components/Modal'
import { Icon } from './components/Icon'
import { useDialog } from './lib/dialogContext'
import { nameGradient, getInitials } from './lib/avatar'

// ── tara sáčkov (g) ───────────────────────────────────────────────────────
const BAG_SIZES = [
  { label: '1 kg sáčok', tare: 28 },
  { label: '500 g sáčok', tare: 19.5 },
  { label: '250 g sáčok', tare: 14 },
  { label: '100 g sáčok', tare: 11 },
  { label: 'Bez sáčka', tare: 0 },
]

const unitOf = (mode) => mode === 'per_gram' ? 'g' : mode === 'per_ml' ? 'ml' : 'ks'

function CoffeeCheckModal({ item, onClose }) {
  const [measured, setMeasured] = useState('')
  const [bagIdx, setBagIdx] = useState(0)

  const tare = BAG_SIZES[bagIdx].tare
  const measuredNum = parseFloat(String(measured).replace(',', '.'))
  const net = isNaN(measuredNum) ? null : Math.max(0, measuredNum - tare)
  const systemStock = item ? Number(item.stock_quantity) : 0
  const diff = net !== null ? net - systemStock : null

  return (
    <Modal
      onClose={onClose}
      icon="scales"
      title="Kontrola zásoby kávy"
      subtitle="Každých 10 šálok — odváž sáčok a skontrolujme zásoby."
      actions={<button className="btn btn-outline-secondary" onClick={onClose}>Zavrieť</button>}
    >
      <p className="fw-semibold mb-3 d-flex align-items-center gap-2">
        <Icon name="coffee" /> {item.name}
      </p>

      <div className="mb-3">
        <label className="form-label text-muted">Veľkosť sáčka (tara)</label>
        <div className="d-flex flex-wrap gap-1">
          {BAG_SIZES.map((b, idx) => (
            <button
              key={idx}
              className={`btn btn-sm ${bagIdx === idx ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setBagIdx(idx)}
            >
              {b.label}
              <span className="num ms-1 opacity-75">({b.tare} g)</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label text-muted" htmlFor="measured">Nameraná hmotnosť sáčka (g)</label>
        <input
          id="measured"
          className="form-control"
          type="number"
          inputMode="decimal"
          placeholder="napr. 320"
          value={measured}
          onChange={e => setMeasured(e.target.value)}
          data-autofocus
        />
      </div>

      {net !== null && (
        <table className="table table-sm mb-3">
          <tbody>
            <tr>
              <td className="text-muted">Namerané</td>
              <td className="num fw-semibold">{measuredNum.toFixed(1)} g</td>
            </tr>
            <tr>
              <td className="text-muted">Tara sáčka</td>
              <td className="num">− {tare} g</td>
            </tr>
            <tr className="table-info">
              <td className="fw-bold">Čistá káva</td>
              <td className="num fw-bold">{net.toFixed(1)} g</td>
            </tr>
            <tr>
              <td className="text-muted">Systém hovorí</td>
              <td className="num">{systemStock.toFixed(1)} g</td>
            </tr>
            <tr className={diff === 0 ? 'table-success' : Math.abs(diff) < 20 ? 'table-warning' : 'table-danger'}>
              <td className="fw-bold">Rozdiel</td>
              <td className="fw-bold">
                <span className="num">{diff > 0 ? '+' : ''}{diff.toFixed(1)} g</span>
                <span className="ms-2 opacity-75" style={{ fontSize: 'var(--fs-xs)' }}>
                  {diff === 0 ? 'sedí' : diff > 0 ? 'viac než systém' : 'menej než systém'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {diff !== null && diff !== 0 && (
        <div className="alert alert-warning py-2 mb-0" style={{ fontSize: 'var(--fs-sm)' }}>
          Ak zásoby nesedia, uprav ich v <strong>Admin → položka → zásoby</strong>.
        </div>
      )}
    </Modal>
  )
}

// ── PersonCard — memo, aby sa pri zmene dlhu inej osoby nerenderovala ──
const PersonCard = memo(function PersonCard({ p, multi, selected, debt, onClick, enterDelay }) {
  const avatarUrl = p.avatar?.startsWith('/media/') ? p.avatar : null
  const debtClass = debt >= 20 ? 'debt--high' : debt >= 10 ? 'debt--mid' : 'debt--ok'
  const pulse = debt >= 30 ? ' debt-pulse-fast' : debt >= 25 ? ' debt-pulse-slow' : ''

  return (
    <button
      className={`choice choice-enter ${!avatarUrl ? 'choice-initials' : ''} ${multi ? (selected ? 'multi-selected' : 'multi-dim') : ''}`}
      onClick={onClick}
      aria-pressed={multi ? selected : undefined}
      style={avatarUrl
        ? { backgroundImage: `url(${avatarUrl})`, animationDelay: enterDelay ?? '0s' }
        : { background: nameGradient(p.name), animationDelay: enterDelay ?? '0s' }}
    >
      <div className="overlay">
        {!avatarUrl && <div className="initials-letter">{getInitials(p.name)}</div>}
        <div className="fw-bold">{p.name}</div>
        <div className={`num mt-1 fw-bold debt-value ${debtClass}${pulse}`}>
          {debt.toFixed(2)} €
        </div>
      </div>
      {multi && (
        <div className={`multi-check ${selected ? 'multi-check-on' : ''}`}>
          {selected && <Icon name="check" size={14} />}
        </div>
      )}
    </button>
  )
})

export default function App() {
  const dialog = useDialog()

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
  const [stockWarning, setStockWarning] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)
  const [coffeeCheckModal, setCoffeeCheckModal] = useState(null)

  // per_item qty picker (pivá/ks položky)
  const [itemQty, setItemQty] = useState({})
  const [itemQtyVersion, setItemQtyVersion] = useState({})
  const itemQtyRef = useRef({})
  const itemTimerRef = useRef({})
  const maybeAddItemRef = useRef(null)
  const goToCategoryRef = useRef(null)

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
  const multiRef = useRef(multi)
  multiRef.current = multi

  const toggleMulti = useCallback(() => {
    setMulti(m => !m)
    setSelectedPersons([])
    setSelectedPerson(null)
  }, [])

  const onPersonClick = useCallback((p) => {
    if (!multiRef.current) {
      setSelectedPerson(p)
      goToCategoryRef.current()
      return
    }
    setSelectedPersons(list => {
      const exists = list.find(x => x.id === p.id)
      if (exists) return list.filter(x => x.id !== p.id)
      return [...list, p]
    })
  }, [])

  const continueFromMulti = useCallback(() => {
    if (selectedPersons.length === 0) return
    goToCategoryRef.current()
  }, [selectedPersons.length])

  const clearAllItemQty = () => {
    Object.keys(itemTimerRef.current).forEach(id => clearTimeout(itemTimerRef.current[id]))
    itemTimerRef.current = {}
    itemQtyRef.current = {}
    setItemQty({})
    setItemQtyVersion({})
  }

  const submitAllPending = useCallback(() => {
    const pendingIds = Object.keys(itemQtyRef.current)
    if (!pendingIds.length) return
    pendingIds.forEach(id => {
      if (itemTimerRef.current[id]) { clearTimeout(itemTimerRef.current[id]); delete itemTimerRef.current[id] }
    })
    const toSubmit = pendingIds.map(id => ({
      qty: itemQtyRef.current[id],
      item: categoryItems.find(i => String(i.id) === id),
    })).filter(x => x.qty && x.item)
    itemQtyRef.current = {}
    setItemQty({})
    setItemQtyVersion({})
    toSubmit.forEach(({ item, qty }) => maybeAddItemRef.current(item, qty))
  }, [categoryItems])

  // --- výber kategórie a itemu ---
  const availableCategories = useMemo(() => {
    const cats = []
    if (items.some(i => i.category?.name?.toLowerCase() === 'beer')) cats.push('Beer')
    if (items.some(i => i.category?.name?.toLowerCase() === 'coffee')) cats.push('Coffee')
    if (items.some(i => i.category?.name?.toLowerCase() === 'cold brew')) cats.push('Cold Brew')
    return cats
  }, [items])

  const pickCategory = (c) => { setSelectedCategory(c); setSelectedItem(null); setStep('item') }

  const goToCategory = () => {
    if (availableCategories.length === 1) {
      pickCategory(availableCategories[0])
    } else {
      setStep('category')
    }
  }
  goToCategoryRef.current = goToCategory

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
        // cold brew (per_ml): každý dostane plnú hodnotu
        // káva (per_gram): rozdelí sa medzi ľudí
        const qtyEach = item.pricing_mode === 'per_ml'
          ? Number(quantity)
          : item.pricing_mode === 'per_gram'
          ? Number(quantity) / n
          : undefined

        const results = await Promise.all(
          selectedPersons.map(p => api.addTransaction({
            person_id: p.id,
            item_id: item.id,
            ...(isPerUnit ? { quantity: qtyEach } : {})
          }))
        )

        await Promise.all([refreshSummary(), loadItems()])
        setNotice(
          item.pricing_mode === 'per_ml'
            ? `Pridané ${Number(quantity)} ml na osobu pre ${n} ľudí`
            : item.pricing_mode === 'per_gram'
            ? `Pridané ${Number(quantity)} g → ${qtyEach.toFixed(1)} g na osobu pre ${n} ľudí`
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
      // tx.item.stock_quantity je už po odpočítaní aktuálnej šálky
      if (tx.trigger_check && tx.item?.stock_quantity !== null) {
        setCoffeeCheckModal({ item: tx.item })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // kontrola zásob a dlhu pred pridaním
  const maybeAddItem = (item, quantity) => {
    if (item.stock_quantity !== null && item.stock_quantity !== undefined) {
      const perItemCount = quantity ? Number(quantity) : (multi ? selectedPersons.length : 1)
      const needed = item.pricing_mode === 'per_item'
        ? perItemCount
        : item.pricing_mode === 'per_ml' && multi
        ? Number(quantity || 0) * (multi ? selectedPersons.length : 1)
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

  const addGuest = async () => {
    const name = await dialog.prompt({
      title: 'Pridať hosťa',
      label: 'Meno hosťa',
      placeholder: 'napr. Katka',
      confirmLabel: 'Pridať',
    })
    if (!name) return
    await api.csrf().catch(() => {})
    await api.addPerson({ name, is_guest: true })
    await loadPersons()
    await refreshSummary()
  }

  return (
    <div className="container py-3">
      <PageHeader title="Drink Counter" icon="logo" onTitleClick={resetFlow} />

      {coffeeCheckModal && (
        <CoffeeCheckModal
          item={coffeeCheckModal.item}
          onClose={() => setCoffeeCheckModal(null)}
        />
      )}

      {notice && (
        <div className="alert alert-success alert-flash py-2 position-relative overflow-hidden">
          {notice}
          <div className="alert-dismiss-bar" style={{ animationDuration: '3s' }} />
        </div>
      )}

      {/* krokovník — skrytý na prvej obrazovke */}
      {step !== 'person' && (
        <div className="steps mb-3">
          <span className="done">Osoba</span>
          <span className={step === 'category' ? 'active' : selectedCategory ? 'done' : ''}>Kategória</span>
          <span className={step === 'item' ? 'active' : step === 'grams' || step === 'done' ? 'done' : ''}>Typ</span>
          <span className={step === 'grams' ? 'active' : step === 'done' && selectedItem?.pricing_mode !== 'per_item' ? 'done' : ''}>Gramáž</span>
          <span className={step === 'done' ? 'active' : ''}>Dlh</span>
        </div>
      )}

      {/* krok 1: výber osôb */}
      {step === 'person' && (
        <>
          <div className="d-flex justify-content-between align-items-center gap-2 mb-4">
            <h2 className="m-0" style={{ fontSize: 'var(--fs-lg)' }}>Vyber osobu</h2>
            <button
              className={`btn ${multi ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-2`}
              onClick={toggleMulti}
              aria-pressed={multi}
              style={{ minHeight: 'var(--tap-min)' }}
            >
              <Icon name={multi ? 'check' : 'users'} size={16} />
              Viac osôb
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
                  <div className="initials-letter"><Icon name="plus" size={34} /></div>
                  <div className="fw-bold">Pridať hosťa</div>
                </div>
              </button>
            </div>
          </Section>

          {multi && selectedPersons.length > 0 && (
            <div className="fixed-bottom-button">
              <button className="btn btn-primary btn-lg" onClick={continueFromMulti}>
                Pokračovať <span className="num">({selectedPersons.length})</span>
              </button>
            </div>
          )}
        </>
      )}

      {step === 'item' && Object.keys(itemQty).length > 0 && (
        <div className="fixed-bottom-button">
          <button className="btn btn-primary btn-lg d-flex align-items-center gap-2" onClick={submitAllPending} disabled={isSubmitting}>
            <Icon name="check" size={18} />
            Pridať <span className="num">{Object.values(itemQty).reduce((s, q) => s + q, 0)} ks</span>
          </button>
        </div>
      )}

      {/* krok 2: kategória */}
      {step === 'category' && (
        <Section title={multi ? `Vybraní: ${selectedPersons.length} — čo pijete?` : `Ahoj, ${selectedPerson?.name} — čo piješ?`}>
          <div className="grid-choices">
            {availableCategories.includes('Beer') && (
              <button className="choice choice-beer" onClick={() => pickCategory('Beer')}>
                <Icon name="beer" size={40} />
                <div>Pivo</div>
              </button>
            )}
            {availableCategories.includes('Coffee') && (
              <button className="choice choice-coffee" onClick={() => pickCategory('Coffee')}>
                <Icon name="coffee" size={40} />
                <div>Káva</div>
              </button>
            )}
            {availableCategories.includes('Cold Brew') && (
              <button className="choice choice-cold-brew" onClick={() => pickCategory('Cold Brew')}>
                <Icon name="coldBrew" size={40} />
                <div>Cold Brew</div>
              </button>
            )}
          </div>
          <div className="mt-4">
            <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={resetFlow}>
              <Icon name="back" size={16} /> Späť
            </button>
          </div>
        </Section>
      )}

      {/* krok 3: typ nápoja */}
      {step === 'item' && (
        <Section title={`Vyber ${selectedCategory === 'Beer' ? 'pivo' : selectedCategory === 'Cold Brew' ? 'cold brew' : 'kávu'}`}>
          <div className="grid-choices">
            {categoryItems.map((i, idx) => {
              const qty = itemQty[i.id]
              const unit = unitOf(i.pricing_mode)
              const lowStock = Number(i.stock_quantity) < (i.pricing_mode === 'per_item' ? 3 : 50)
              return (
                <button
                  key={i.id}
                  className="choice choice-enter"
                  disabled={isSubmitting}
                  onClick={() => onItemClick(i)}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  {i.color && <span className="choice-swatch" style={{ background: i.color }} />}
                  {qty ? (
                    <>
                      <div className="fw-semibold text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{i.name}</div>
                      <div className="d-flex align-items-center gap-2">
                        <button className="qty-step" onClick={(e) => onItemMinus(i, e)} aria-label="Odobrať">
                          <Icon name="minus" size={16} />
                        </button>
                        <span className="qty-value">{qty}</span>
                        <button className="qty-step" onClick={(e) => onItemPlus(i, e)} aria-label="Pridať">
                          <Icon name="plus" size={16} />
                        </button>
                      </div>
                      <div className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                        {(Number(i.price) * qty).toFixed(2)} €
                      </div>
                      <div className="countdown-bar" style={{ width: '70%' }}>
                        <div
                          key={itemQtyVersion[i.id]}
                          className="countdown-bar-fill"
                          style={{ animationDuration: '5s' }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="fw-bold">{i.name}</div>
                      <div className="num text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                        {i.pricing_mode === 'per_gram'
                          ? `${Number(i.price).toFixed(3)} €/g`
                          : i.pricing_mode === 'per_ml'
                          ? `${Number(i.price).toFixed(3)} €/ml`
                          : `${Number(i.price).toFixed(2)} €`}
                      </div>
                      {i.stock_quantity !== null && i.stock_quantity !== undefined && (
                        <div
                          className="d-flex align-items-center gap-1 mt-1"
                          style={{
                            fontSize: 'var(--fs-xs)',
                            color: lowStock ? 'var(--warn)' : 'var(--text-dim)',
                            fontWeight: lowStock ? 600 : 400,
                          }}
                        >
                          <Icon name="stock" size={13} />
                          <span className="num">{Number(i.stock_quantity).toFixed(0)} {unit}</span>
                        </div>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-4 d-flex gap-2 flex-wrap">
            <button
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
              onClick={() => { clearAllItemQty(); availableCategories.length === 1 ? resetFlow() : setStep('category') }}
            >
              <Icon name="back" size={16} /> Späť
            </button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Zmeniť osobu</button>
          </div>
        </Section>
      )}

      {/* krok 3b: gramáž / ml */}
      {step === 'grams' && (
        <Section title={
          selectedItem?.pricing_mode === 'per_ml'
            ? `Koľko ml cold brew?${multi ? ' (každý dostane toľko)' : ''}`
            : `Koľko gramov kávy?${multi && selectedPersons.length > 1 ? ` (rozdelí sa medzi ${selectedPersons.length} ľudí)` : ''}`
        }>
          <div className="grid-choices">
            {(selectedItem?.pricing_mode === 'per_ml' ? [200, 250, 400] : [15, 20, 30, 45, 60]).map((g, idx) => {
              const n = multi ? selectedPersons.length : 1
              const eachG = selectedItem?.pricing_mode === 'per_gram' && n > 1 ? g / n : g
              const totalPrice = selectedItem?.pricing_mode === 'per_gram'
                ? Number(selectedItem.price) * eachG
                : Number(selectedItem.price) * g
              return (
                <button
                  key={g}
                  className="choice choice-enter"
                  onClick={() => maybeAddItem(selectedItem, g)}
                  disabled={isSubmitting}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <span className="num" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700 }}>
                    {g} {selectedItem?.pricing_mode === 'per_ml' ? 'ml' : 'g'}
                  </span>
                  {selectedItem?.pricing_mode === 'per_gram' && n > 1 && (
                    <div className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>{eachG.toFixed(1)} g na osobu</div>
                  )}
                  <div className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                    ≈ {totalPrice.toFixed(2)} € na osobu
                  </div>
                </button>
              )
            })}

            <div className="choice choice-enter" style={{ animationDelay: '0.25s' }}>
              <div className="mb-2">Vlastné</div>
              <div className="input-group">
                <input
                  className="form-control"
                  inputMode="decimal"
                  aria-label={selectedItem?.pricing_mode === 'per_ml' ? 'Vlastný počet ml' : 'Vlastná gramáž'}
                  value={grams}
                  onChange={e => setGrams(e.target.value)}
                />
                <button className="btn btn-primary" onClick={() => maybeAddItem(selectedItem, grams)} disabled={isSubmitting}>OK</button>
              </div>
              <div className="num text-muted mt-2" style={{ fontSize: 'var(--fs-xs)' }}>
                {(Number(selectedItem?.price || 0) * Number(grams || 0)).toFixed(2)} €
              </div>
            </div>
          </div>
          <div className="mt-4 d-flex gap-2 flex-wrap">
            <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={() => setStep('item')}>
              <Icon name="back" size={16} /> Späť
            </button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Zmeniť osobu</button>
          </div>
        </Section>
      )}

      {/* krok 4: potvrdenie pre single */}
      {step === 'done' && !multi && (
        <Section title="Hotovo">
          <div className="card p-4 text-center pop-in">
            <div className="done-check"><Icon name="check" size={56} /></div>
            <div className="text-muted mt-2">Aktuálny dlh pre</div>
            <div className="fw-bold mb-2" style={{ fontSize: 'var(--fs-lg)' }}>{selectedPerson?.name}</div>
            <div className="num fw-bold" style={{ fontSize: 'var(--fs-3xl)', lineHeight: 1 }}>
              {Number(personTotal).toFixed(2)} €
            </div>
            {lastOrder && (
              <div className="mt-3 text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                {lastOrder.item?.name}
                {lastOrder.item?.pricing_mode === 'per_gram' && <> · <span className="num">{Number(lastOrder.quantity).toFixed(0)} g</span></>}
                {lastOrder.item?.pricing_mode === 'per_ml' && <> · <span className="num">{Number(lastOrder.quantity).toFixed(0)} ml</span></>}
                {lastOrder.item?.pricing_mode === 'per_item' && Number(lastOrder.quantity) > 1 && <> · <span className="num">{Number(lastOrder.quantity).toFixed(0)} ks</span></>}
                {' · '}
                <span className="num fw-bold" style={{ color: 'var(--accent)' }}>
                  +{Number(lastOrder.price_at_time).toFixed(2)} €
                </span>
              </div>
            )}
            {funnyMsg && (
              <div className="funny-msg mt-3">
                <div className="funny-msg-emoji">{funnyMsg.emoji}</div>
                <div className="funny-msg-text">{funnyMsg.text}</div>
              </div>
            )}
            <div className="countdown-bar mt-4">
              <div className="countdown-bar-fill" style={{ animationDuration: '5s' }} />
            </div>
            <div className="text-muted mt-2" style={{ fontSize: 'var(--fs-xs)' }}>
              Auto-reset za <span className="num">{countdown}</span> s
            </div>
          </div>
          <div className="mt-4 d-flex flex-wrap gap-2 justify-content-center">
            <button
              className="btn btn-primary"
              onClick={() => { setCountdown(null); setStep(selectedItem?.pricing_mode === 'per_gram' || selectedItem?.pricing_mode === 'per_ml' ? 'grams' : 'item') }}
            >
              Pridať ďalší
            </button>
            <button
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
              onClick={undoLast}
              disabled={isUndoing}
            >
              <Icon name="undo" size={16} />
              {isUndoing ? 'Ruším…' : 'Vrátiť späť'}
            </button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Domov</button>
          </div>
        </Section>
      )}

      {/* Modal: málo zásoby */}
      {stockWarning && (
        <Modal
          onClose={() => setStockWarning(null)}
          tone="warning"
          icon="warning"
          size="sm"
          title="Málo zásoby"
          subtitle={`${stockWarning.item.name} nemá dosť na túto objednávku.`}
          actions={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setStockWarning(null)}>Zrušiť</button>
              <button className="btn btn-primary" onClick={stockWarning.onConfirm}>Aj tak pridať</button>
            </>
          }
        >
          <table className="table table-sm mb-0">
            <tbody>
              <tr>
                <td className="text-muted">Dostupné</td>
                <td className="num fw-semibold text-end">
                  {stockWarning.available.toFixed(0)} {unitOf(stockWarning.item.pricing_mode)}
                </td>
              </tr>
              <tr>
                <td className="text-muted">Potrebné</td>
                <td className="num fw-semibold text-end" style={{ color: 'var(--warn)' }}>
                  {stockWarning.needed.toFixed(0)} {unitOf(stockWarning.item.pricing_mode)}
                </td>
              </tr>
            </tbody>
          </table>
        </Modal>
      )}

      {/* Modal: vysoký dlh ≥ 35 € */}
      {showDebtModal && (
        <Modal
          onClose={() => { setShowDebtModal(false); setPendingAdd(null) }}
          tone="danger"
          icon="warning"
          size="sm"
          title="Vysoký dlh"
          subtitle={multi
            ? 'Niektorý z vybraných ľudí má dlh nad 35 €. Najprv ho prosím vyrovnajte.'
            : `${selectedPerson?.name} má dlh ${(debts[selectedPerson?.id] ?? 0).toFixed(2)} €. Najprv ho prosím vyrovnajte.`}
          actions={
            <>
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
              <button
                className="btn btn-danger"
                onClick={() => { setShowDebtModal(false); setPendingAdd(null) }}
              >
                Zavrieť
              </button>
            </>
          }
        />
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-5 step-zoom-in">
      <h2 className="mb-3 text-center" style={{ fontSize: 'var(--fs-lg)' }}>{title}</h2>
      {children}
    </section>
  )
}
