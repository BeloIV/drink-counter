import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from './config'
import { api } from './api'
import './App.css'
import { FaBeer, FaCoffee } from 'react-icons/fa'
export default function App() {
  const [persons, setPersons] = useState([])
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ total: 0, per_person: [], session: null })

  // kroky: person | category | item | grams | done
  const [step, setStep] = useState('person')

  // single-select
  const [selectedPerson, setSelectedPerson] = useState(null)

  // multi-select
  const [multi, setMulti] = useState(false)
  const [selectedPersons, setSelectedPersons] = useState([]) // array of Person

  // výber nápoja
  const [selectedCategory, setSelectedCategory] = useState(null) // 'Beer' | 'Coffee'
  const [selectedItem, setSelectedItem] = useState(null)
  const [grams, setGrams] = useState('20')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  // dlhy mapované podľa person_id
  const debts = useMemo(() => {
    const map = {}
    for (const row of (summary?.per_person || [])) {
      map[row.person_id] = Number(row.total_eur || 0)
    }
    return map
  }, [summary])

  const home = persons.filter(p => !p.is_guest)
  const guests = persons.filter(p => p.is_guest)

  const loadPersons = () => fetch(`${API_BASE}/persons/`).then(r=>r.json()).then(setPersons)
  const loadItems   = () => fetch(`${API_BASE}/items/`).then(r=>r.json()).then(setItems)
  const refreshSummary = () => fetch(`${API_BASE}/session/active`).then(r => r.json()).then(setSummary)

  useEffect(() => { loadPersons() }, [])
  useEffect(() => { loadItems() }, [])
  useEffect(() => { refreshSummary() }, [])

  const personTotal = useMemo(() => {
    if (!selectedPerson) return 0
    return debts[selectedPerson.id] ?? 0
  }, [selectedPerson, debts])

 const categoryItems = useMemo(() => {
  if (!selectedCategory) return []
  return items
    .filter(i => i.active) // ← zobraz len aktívne
    .filter(i => i.category?.name?.toLowerCase() === selectedCategory.toLowerCase())
}, [items, selectedCategory])

  const resetFlow = () => {
    setStep('person')
    setSelectedPerson(null)
    setSelectedPersons([])
    setSelectedCategory(null)
    setSelectedItem(null)
    setGrams('7')
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
    // multi-mode toggle
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
          ? `Pridané ${Number(quantity)} g (${(Number(quantity)/n).toFixed(2)} g/osoba) pre ${n} ľudí`
          : `Pridaný 1 ks pre ${n} ľudí`
      )
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
    setStep('done')
  } finally {
    setIsSubmitting(false)
    if (notice) setTimeout(() => setNotice(''), 2500)
  }
}

  // hosť
  const addGuest = async () => {
    const name = prompt('Meno hosťa:')
    if (!name || !name.trim()) return
    await api.csrf().catch(()=>{})
    await api.addPerson({ name: name.trim(), is_guest: true })
    await loadPersons()
    await refreshSummary()
  }

  return (
    <div className="container py-3">
      <h2 className="mb-3">Drink Counter</h2>

      {/* INFO / notice */}
      {notice && <div className="alert alert-success py-2">{notice}</div>}

      {/* krokovník */}
      <div className="steps mb-3">
        <span className={step === 'person' ? 'active' : (selectedPerson || selectedPersons.length) ? 'done' : ''}>1. Osoba</span>
        <span className={step === 'category' ? 'active' : selectedCategory ? 'done' : ''}>2. Kategória</span>
        <span className={step === 'item' || step === 'grams' ? 'active' : step === 'done' ? 'done' : ''}>3. Typ</span>
        <span className={step === 'grams' ? 'active' : ''}>3b. Gramáž</span>
        <span className={step === 'done' ? 'active' : ''}>4. Dlh</span>
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
              {home.map(p => {
                const selected = !!selectedPersons.find(x => x.id === p.id)
                return (
                  <button
                    key={p.id}
                    className={`choice ${multi && selected ? 'selected' : ''}`}
                    onClick={() => onPersonClick(p)}
                  >
                    <div className="fw-bold">{p.name}</div>
                    <div className="small text-muted mt-1">{(debts[p.id] ?? 0).toFixed(2)} €</div>
                    {multi && selected && <div className="tick">✓</div>}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="Hostia">
            <div className="grid-choices">
              {guests.map(p => {
                const selected = !!selectedPersons.find(x => x.id === p.id)
                return (
                  <button
                    key={p.id}
                    className={`choice ${multi && selected ? 'selected' : ''}`}
                    onClick={() => onPersonClick(p)}
                  >
                    <div className="fw-bold">{p.name}</div>
                    <div className="small text-muted mt-1">{(debts[p.id] ?? 0).toFixed(2)} €</div>
                    {multi && selected && <div className="tick">✓</div>}
                  </button>
                )
              })}
              <button className="choice" onClick={addGuest}>
                <div className="fw-bold">+ Pridať hosťa</div>
              </button>
            </div>

            {multi && (
              <div className="mt-3 text-center">
                <button
                  className="btn btn-success"
                  disabled={selectedPersons.length === 0}
                  onClick={continueFromMulti}
                >
                  Pokračovať ({selectedPersons.length})
                </button>
              </div>
            )}
          </Section>
        </>
      )}

      {/* krok 2: kategória */}
      {step === 'category' && (
        <Section title={`${multi ? `Vybraní: ${selectedPersons.length}` : `Ahoj, ${selectedPerson?.name}`} – čo piješ?`}>
          <div className="grid-choices">
            <button className="choice choice-beer" onClick={() => pickCategory('Beer')}>
              <FaBeer size={36} style={{marginBottom:6}} />
              <div>Pivo</div>
            </button>
            <button className="choice choice-coffee" onClick={() => pickCategory('Coffee')}>
              <FaCoffee size={36} style={{marginBottom:6}} />
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
            {categoryItems.map(i => (
              <button key={i.id} className="choice" disabled={isSubmitting} onClick={() => proceedItem(i)}>
                <div className="fw-bold">{i.name}</div>
                <div className="small text-muted">
                  {i.pricing_mode === 'per_gram'
                    ? `${Number(i.price).toFixed(3)} €/g`
                    : `${Number(i.price).toFixed(2)} €`}
                </div>
              </button>
            ))}
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
            {[15,30,45].map(g => (
              <button key={g} className="choice" onClick={() => addItem(selectedItem, g)} disabled={isSubmitting}>
                {g} g
                <div className="small text-muted">
                  ≈ {(Number(selectedItem.price) * g).toFixed(2)} €
                </div>
              </button>
            ))}
            <div className="choice">
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
          <div className="card p-3 text-center">
            <div className="fs-5">Aktuálny dlh pre</div>
            <div className="fs-3 fw-bold mb-2">{selectedPerson?.name}</div>
            <div className="display-6 fw-bold">{Number(personTotal).toFixed(2)} €</div>
          </div>
          <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
            <button className="btn btn-primary" onClick={() => setStep(selectedItem?.pricing_mode === 'per_gram' ? 'grams' : 'item')}>Pridať ďalší</button>
            <button className="btn btn-outline-secondary" onClick={resetFlow}>Nová osoba</button>
          </div>
        </Section>
      )}

      {/* odkaz na admin */}
      <div className="mt-4 text-center">
        <Link className="btn btn-outline-secondary" to="/admin">Admin</Link>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h4 className="mb-3 text-center">{title}</h4>
      {children}
    </div>
  )
}