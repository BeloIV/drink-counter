import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { API_BASE } from "../config"
import { ThemeToggle } from "../ThemeToggle"

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}
    >
      <div className="card shadow-lg pop-in" style={{ maxWidth:340, width:'90%' }} onClick={e=>e.stopPropagation()}>
        <div className="card-body p-4 text-center">
          <div style={{ fontSize:'2.2rem', marginBottom:'0.5rem' }}>⚠️</div>
          <p className="mb-4">{msg}</p>
          <div className="d-flex gap-2">
            <button className="btn btn-danger flex-fill" onClick={onConfirm}>Potvrdiť</button>
            <button className="btn btn-secondary flex-fill" onClick={onCancel}>Zrušiť</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState("")

  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [persons, setPersons] = useState([])
  const [debts, setDebts] = useState({})

  const [filterCat, setFilterCat] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")

  const [form, setForm] = useState({ name: "", category_id: "", price: "", pricing_mode: "per_item", unit: "pcs", color: "#ffffff" })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", price: "", category_id: "", pricing_mode: "per_item", unit: "pcs", color: "#ffffff" })

  // === KÁVOVÉ FILTRE (globálne) ===
  const [coffeeFilters, setCoffeeFilters] = useState([])
  const [cfLoading, setCfLoading] = useState(false)
  const [cfForm, setCfForm] = useState({
    label: "",
    g_min: "",
    g_max: "",
    extra_eur: "",
  })
  const [cfEditId, setCfEditId] = useState(null)
  const [cfEditForm, setCfEditForm] = useState({
    label: "",
    g_min: "",
    g_max: "",
    extra_eur: "",
  })

  // === COLLAPSE STATE ===
  const [showAddItem, setShowAddItem] = useState(false)
  const [showCoffeeFilters, setShowCoffeeFilters] = useState(false)

  // === ANIMATION STATE ===
  const [deletingId, setDeletingId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, msg: "", onConfirm: null })
  const [filterBounce, setFilterBounce] = useState(null)
  const [dotPulseKey, setDotPulseKey] = useState(0)
  const [displayDebts, setDisplayDebts] = useState({})
  const prevColorRef = useRef(null)

  // --- helpers na čísla/validáciu ---
const toFixedStr = (v, places = 3) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(String(v).replace(",", "."));
  if (Number.isNaN(n)) return "";
  return n.toFixed(places);
};

const normDec = (v, places = 3) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  if (Number.isNaN(n)) return null;
  // vraciame string, lebo backend DRF DecimalField rád vidí string
  return n.toFixed(places);
};

const normInt = (v) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
};

// základná validácia intervalu a prirážky
const validateCoffeeFilter = ({ g_min, g_max, extra_eur }) => {
  const a = Number((g_min ?? "0").toString().replace(",", "."));
  const b = Number((g_max ?? "0").toString().replace(",", "."));
  const c = Number((extra_eur ?? "0").toString().replace(",", "."));
  if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c)) {
    return "Zadaj platné čísla (g_min, g_max, extra_eur).";
  }
  if (a < 0 || b <= 0) return "Rozsah gramáže musí byť kladný.";
  if (a > b) return "Od (g) nesmie byť viac než Do (g).";
  return null;
};

// nepovinné: upozorniť na prekrývanie intervalov
const overlapsAny = (all, candidate, skipId = null) => {
  const A1 = Number(String(candidate.g_min).replace(",", "."));
  const A2 = Number(String(candidate.g_max).replace(",", "."));
  return all.some(f => {
    if (skipId && f.id === skipId) return false;
    const B1 = Number(String(f.g_min));
    const B2 = Number(String(f.g_max));
    return Math.max(A1, B1) <= Math.min(A2, B2);
  });
};
  const load = async () => {
    const [c, i, p, s] = await Promise.all([
      api.categories(),
      api.items(),
      api.persons(),
      api.sessionActive(),
    ])
    setCats(c); setItems(i); setPersons(p)
    const map = {}
    ;(s?.per_person ?? []).forEach(row => { map[row.person_id] = Number(row.total_eur || 0) })
    setDebts(map)
    await loadCoffeeFilters()
  }

  useEffect(() => {
    api.csrf().catch(() => {})
    if (sessionStorage.getItem("adminAuthed") === "true") {
      setAuthed(true)
      load()
    }
  }, [])

  // Auto-dismiss message alert
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(""), 3500)
    return () => clearTimeout(t)
  }, [msg])

  // Sync displayDebts with debts (don't override mid-animation)
  useEffect(() => {
    setDisplayDebts(prev => ({ ...prev, ...debts }))
  }, [debts])

  // Pulse color dot when editForm.color changes
  useEffect(() => {
    if (prevColorRef.current !== null && prevColorRef.current !== editForm.color) {
      setDotPulseKey(k => k + 1)
    }
    prevColorRef.current = editForm.color
  }, [editForm.color])

  const showConfirm = (message, onConfirm) => setConfirmModal({ open: true, msg: message, onConfirm })
  const closeConfirm = () => setConfirmModal({ open: false, msg: "", onConfirm: null })

  const animateDebtToZero = (personId) => {
    const from = debts[personId] || 0
    if (from <= 0) return
    const start = performance.now()
    const duration = 900
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - (1 - p) ** 3
      setDisplayDebts(prev => ({ ...prev, [personId]: from * (1 - ease) }))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  const setFilterWithBounce = (setter, value, key) => {
    setter(value)
    setFilterBounce(key)
    setTimeout(() => setFilterBounce(null), 250)
  }

  const login = async (e) => {
    e.preventDefault()
    try {
      await api.csrf()
      await api.login(pin)
      sessionStorage.setItem("adminAuthed", "true")
      setAuthed(true)
      await load()
      setMsg("Prihlásený")
    } catch (err) {
      console.error("Login error:", err)
      setMsg("Zlý PIN")
    }
  }

  const logout = async () => {
    await api.logout()
    sessionStorage.removeItem("adminAuthed")
    setAuthed(false)
    setMsg("Odhlásený")
  }

  // ===== Položky (tvoje pôvodné) =====
  const saveItem = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.addItem({
        ...form,
        category_id: Number(form.category_id),
        price: String(form.price),
        color: form.color
      })
      setForm({ name:"", category_id:"", price:"", pricing_mode:"per_item", unit:"pcs", color:"#ffffff" })
      await load()
      setMsg("Položka pridaná")
    } catch {
      setMsg("Chyba pri ukladaní")
    }
    setLoading(false)
  }

  const toggleActiveItem = async (it) => {
    await api.updateItem(it.id, { active: !it.active })
    await load()
  }

  const startEditItem = (it) => {
    setEditId(it.id)
    setEditForm({
      name: it.name,
      price: String(it.price),
      category_id: String(it.category?.id ?? ""),
      pricing_mode: it.pricing_mode || "per_item",
      unit: it.unit || (it.category?.name === "Coffee" ? "g" : "pcs"),
      color: it.color || "#ffffff",
    })
  }

  const cancelEditItem = () => {
    setEditId(null)
    setEditForm({ name:"", price:"", category_id:"", pricing_mode:"per_item", unit:"pcs", color:"#ffffff" })
  }

  const saveEditItem = async (id) => {
    const payload = {
      name: editForm.name,
      price: String(editForm.price),
      category_id: Number(editForm.category_id || 0) || undefined,
      pricing_mode: editForm.pricing_mode,
      unit: editForm.unit,
      color: editForm.color,
    }
    await api.updateItem(id, payload)
    await load()
    setSavedId(id)
    setTimeout(() => setSavedId(null), 600)
    cancelEditItem()
    setMsg("Položka upravená")
  }

  // ===== Osoby =====
  const resetDebt = (person) => {
    showConfirm(`Naozaj vynulovať dlh pre ${person.name}?`, async () => {
      closeConfirm()
      animateDebtToZero(person.id)
      await api.resetDebt(person.id)
      await load()
      setMsg(`Dlh pre ${person.name} bol vynulovaný`)
    })
  }

  const filteredItems = items
    .filter(i => filterCat==="All" ? true : i.category?.name===filterCat)
    .filter(i => {
      if (filterStatus==="All") return true
      if (filterStatus==="Active") return i.active
      if (filterStatus==="Hidden") return !i.active
      return true
    })

  // ===== Kávové filtre (globálne CRUD) =====
  const loadCoffeeFilters = async () => {
    const r = await fetch(`${API_BASE}/coffee-filters/`, { credentials: "include" })
    const data = await r.json()
    setCoffeeFilters(data)
  }

const addCoffeeFilter = async (e) => {
  e.preventDefault();
  setCfLoading(true);
  try {
    // validácia
    const err = validateCoffeeFilter(cfForm);
    if (err) { setMsg(err); setCfLoading(false); return; }

    // nepovinné: upozorni na prekrývanie
    const cand = {
      g_min: normDec(cfForm.g_min, 3),
      g_max: normDec(cfForm.g_max, 3),
    };
    if (overlapsAny(coffeeFilters, cand)) {
      if (!confirm("Tento interval sa prekrýva s existujúcim. Pokračovať?")) {
        setCfLoading(false); return;
      }
    }

    await api.csrf().catch(()=>{});
    const res = await fetch(`${API_BASE}/coffee-filters/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        label: (cfForm.label || "").trim() || null,
        g_min: normDec(cfForm.g_min, 3),
        g_max: normDec(cfForm.g_max, 3),
        extra_eur: normDec(cfForm.extra_eur, 3), // backend Decimal(3 places OK)

      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Server: ${res.status} ${txt}`);
    }

    setCfForm({ label: "", g_min: "", g_max: "", extra_eur: ""});
    await loadCoffeeFilters();
    setMsg("Kávový filter pridaný");
  } catch (e) {
    setMsg(`Chyba pri pridávaní kávového filtra: ${e.message || e}`);
  } finally {
    setCfLoading(false);
  }
};

  const startEditCoffeeFilter = (f) => {
    setCfEditId(f.id)
    setCfEditForm({
      label: f.label ?? "",
      g_min: String(f.g_min ?? ""),
      g_max: String(f.g_max ?? ""),
      extra_eur: String(f.extra_eur ?? ""),
      sort_order: Number(f.sort_order ?? 0),
      active: !!f.active,
      color: f.color ?? "",
      note: f.note ?? "",
    })
  }

  const cancelEditCoffeeFilter = () => {
    setCfEditId(null)
    setCfEditForm({ label: "", g_min: "", g_max: "", extra_eur: "", sort_order: 0, active: true, color: "", note: "" })
  }

const saveCoffeeFilter = async (id) => {
  setCfLoading(true);
  try {
    const err = validateCoffeeFilter(cfEditForm);
    if (err) { setMsg(err); setCfLoading(false); return; }

    const cand = {
      g_min: normDec(cfEditForm.g_min, 3),
      g_max: normDec(cfEditForm.g_max, 3),
    };
    if (overlapsAny(coffeeFilters, cand, id)) {
      if (!confirm("Tento interval sa prekrýva s iným filtrom. Pokračovať?")) {
        setCfLoading(false); return;
      }
    }

    await api.csrf().catch(() => {}); // Ensure CSRF token is fetched
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1]; // Retrieve CSRF token from cookies

    const res = await fetch(`${API_BASE}/coffee-filters/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken, // Include CSRF token in headers
      },
      credentials: "include",
      body: JSON.stringify({
        label: (cfEditForm.label || "").trim() || null,
        g_min: normDec(cfEditForm.g_min, 3),
        g_max: normDec(cfEditForm.g_max, 3),
        extra_eur: normDec(cfEditForm.extra_eur, 3),
        sort_order: normInt(cfEditForm.sort_order),
        active: !!cfEditForm.active,
        color: (cfEditForm.color || "").trim() || null,
        note: (cfEditForm.note || "").trim() || null,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Server: ${res.status} ${txt}`);
    }

    await loadCoffeeFilters();
    cancelEditCoffeeFilter();
    setMsg("Kávový filter upravený");
  } catch (e) {
    setMsg(`Chyba pri úprave kávového filtra: ${e.message || e}`);
  } finally {
    setCfLoading(false);
  }
};

  const deleteCoffeeFilter = (f) => {
    showConfirm(`Zmazať filter ${f.label ? `"${f.label}"` : `${f.g_min}–${f.g_max} g`}?`, async () => {
      closeConfirm()
      await api.csrf().catch(() => {})
      await fetch(`${API_BASE}/coffee-filters/${f.id}/`, { method: "DELETE", credentials: "include" })
      await loadCoffeeFilters()
      setMsg("Kávový filter zmazaný")
    })
  }

  return (
    <div className="container py-3">

      {confirmModal.open && (
        <ConfirmModal
          msg={confirmModal.msg}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {/* ── Hlavička ── */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="mb-0">Admin</h2>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {authed && (
            <Link to="/users" className="btn btn-sm btn-info">👥 Useri</Link>
          )}
          {authed && (
            <button onClick={logout} className="btn btn-sm btn-outline-danger">Odhlásiť</button>
          )}
          <Link to="/" className="btn btn-sm btn-outline-secondary">← Späť</Link>
          <ThemeToggle />
        </div>
      </div>

      {msg && (
        <div className="alert alert-info alert-flash py-2 mb-3 position-relative overflow-hidden">
          {msg}
          <div className="alert-dismiss-bar" style={{ animationDuration: '3.5s' }} />
        </div>
      )}

      {/* ── Login ── */}
      {!authed ? (
        <div className="row justify-content-center mt-4">
          <div className="col-12 col-sm-8 col-md-5 col-lg-4">
            <div className="card shadow-lg">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="display-4 mb-2">🔐</div>
                  <h4 className="mb-1">Admin</h4>
                  <p className="text-muted small">Zadaj PIN pre prístup</p>
                </div>
                <form onSubmit={login}>
                  <input
                    className="form-control form-control-lg mb-3"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="PIN"
                    autoFocus
                  />
                  <button className="btn btn-primary w-100 btn-lg" type="submit">Prihlásiť</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Filtre ── */}
          <div className="card p-3 mb-4 fade-in-up" style={{ animationDelay: '0.05s' }}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-6">
                <div className="text-muted small fw-bold mb-1">Stav</div>
                <div className="d-flex gap-1 flex-wrap">
                  {[['All','btn-secondary','btn-outline-secondary','Všetky'],
                    ['Active','btn-success','btn-outline-success','✓ Aktívne'],
                    ['Hidden','btn-warning text-dark','btn-outline-warning','👁 Skryté']
                  ].map(([val, active, outline, label]) => (
                    <button
                      key={val}
                      className={`btn btn-sm ${filterStatus===val ? active : outline} ${filterBounce==='s-'+val ? 'filter-btn-bounce' : ''}`}
                      onClick={() => setFilterWithBounce(setFilterStatus, val, 's-'+val)}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="text-muted small fw-bold mb-1">Kategória</div>
                <div className="d-flex gap-1 flex-wrap">
                  <button
                    className={`btn btn-sm ${filterCat==='All'?'btn-primary':'btn-outline-primary'} ${filterBounce==='c-All'?'filter-btn-bounce':''}`}
                    onClick={() => setFilterWithBounce(setFilterCat, 'All', 'c-All')}
                  >Všetko</button>
                  {cats.map(c => (
                    <button
                      key={c.id}
                      className={`btn btn-sm ${filterCat===c.name?'btn-primary':'btn-outline-primary'} ${filterBounce==='c-'+c.name?'filter-btn-bounce':''}`}
                      onClick={() => setFilterWithBounce(setFilterCat, c.name, 'c-'+c.name)}
                    >{c.name === 'Beer' ? '🍺' : c.name === 'Coffee' ? '☕' : '📦'} {c.name}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* ── Zoznam položiek ── */}
            <div className="col-12 col-xl-7 fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="card p-3">
                <h5 className="mb-3">Položky</h5>
                <div className="d-flex flex-column gap-2">
                  {filteredItems.map((it, idx) => (
                    <div
                      key={it.id}
                      className={[
                        'card',
                        !it.active ? 'border-warning' : '',
                        deletingId === it.id ? 'item-card-exit' : 'item-card-enter',
                        savedId === it.id ? 'item-card-flash' : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        animationDelay: deletingId === it.id ? '0s' : `${idx * 0.05}s`,
                        opacity: !it.active ? 0.6 : 1,
                        transition: 'opacity 0.35s ease',
                      }}
                    >
                      <div className="card-body p-2 px-3">
                        {editId===it.id ? (
                          <>
                            <div className="row g-2 mb-3">
                              <div className="col-12">
                                <label className="form-label small text-muted mb-1">Názov</label>
                                <input className="form-control" value={editForm.name}
                                  onChange={e=>setEditForm(f=>({...f, name:e.target.value}))} />
                              </div>
                              <div className="col-6">
                                <label className="form-label small text-muted mb-1">Kategória</label>
                                <select className="form-select" value={editForm.category_id}
                                  onChange={e=>setEditForm(f=>({...f, category_id:e.target.value}))}>
                                  <option value="">—</option>
                                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                              <div className="col-6">
                                <label className="form-label small text-muted mb-1">Režim</label>
                                <select className="form-select" value={editForm.pricing_mode}
                                  onChange={e=>setEditForm(f=>({...f, pricing_mode:e.target.value}))}>
                                  <option value="per_item">per_item</option>
                                  <option value="per_gram">per_gram</option>
                                </select>
                              </div>
                              <div className="col-8">
                                <label className="form-label small text-muted mb-1">Cena</label>
                                <input className="form-control" inputMode="decimal" value={editForm.price}
                                  onChange={e=>setEditForm(f=>({...f, price:e.target.value}))} />
                              </div>
                              <div className="col-4">
                                <label className="form-label small text-muted mb-1 d-flex align-items-center gap-2">
                                  Farba
                                  <span
                                    key={dotPulseKey}
                                    className="dot-pulse-anim"
                                    style={{ display:'inline-block', width:12, height:12, borderRadius:'50%', backgroundColor:editForm.color, border:'1px solid rgba(128,128,128,0.4)', flexShrink:0 }}
                                  />
                                </label>
                                <input type="color" className="form-control form-control-color w-100" value={editForm.color}
                                  onChange={e=>setEditForm(f=>({...f, color:e.target.value}))} />
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <button className="btn btn-success flex-fill" onClick={()=>saveEditItem(it.id)}>✓ Uložiť</button>
                              <button className="btn btn-secondary flex-fill" onClick={cancelEditItem}>✕ Zrušiť</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    backgroundColor: it.color || '#aaa',
                                    border: '1px solid rgba(128,128,128,0.4)',
                                    flexShrink: 0,
                                  }}
                                />
                                <span className="fw-semibold">{it.name}</span>
                                <span className="badge bg-secondary">{it.category?.name ?? "—"}</span>
                                <span className={`badge ${it.active?'bg-success':'bg-warning text-dark'}`}>
                                  {it.active ? 'aktívne' : 'skryté'}
                                </span>
                              </div>
                              <div className="text-end ms-2 flex-shrink-0">
                                <span className="fw-bold text-primary">
                                  {it.pricing_mode==='per_gram'
                                    ? `${Number(it.price).toFixed(3)} €/g`
                                    : `${Number(it.price).toFixed(2)} €`}
                                </span>
                              </div>
                            </div>
                            <div className="d-flex gap-2 pt-2 border-top">
                              <button className="btn btn-sm btn-outline-primary flex-fill" onClick={()=>startEditItem(it)}>
                                Upraviť
                              </button>
                              <button className={`btn btn-sm flex-fill ${it.active?'btn-outline-warning':'btn-outline-success'}`}
                                onClick={()=>toggleActiveItem(it)}>
                                {it.active ? 'Skryť' : 'Zobraziť'}
                              </button>
                              <button className="btn btn-sm btn-outline-danger flex-fill"
                                onClick={() => showConfirm('Naozaj zmazať túto položku?', async () => {
                                  closeConfirm()
                                  setDeletingId(it.id)
                                  setTimeout(async () => { await api.deleteItem(it.id); await load(); setDeletingId(null) }, 250)
                                })}>
                                Zmazať
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredItems.length===0 && (
                    <div className="text-center text-muted py-3">Žiadne položky</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Pridať položku + Kávové filtre ── */}
            <div className="col-12 col-xl-5 fade-in-up" style={{ animationDelay: '0.15s' }}>
              {/* Pridať položku */}
              <div className="card mb-3">
                <div
                  className="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                  style={{cursor:'pointer'}}
                  onClick={()=>setShowAddItem(!showAddItem)}
                >
                  <h6 className="mb-0">➕ Pridať položku</h6>
                  <span>{showAddItem ? '▼' : '▶'}</span>
                </div>
                {showAddItem && (
                  <div className="card-body">
                    <form onSubmit={saveItem} className="row g-2">
                      <div className="col-12">
                        <label className="form-label small text-muted mb-1">Názov</label>
                        <input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
                      </div>
                      <div className="col-6">
                        <label className="form-label small text-muted mb-1">Kategória</label>
                        <select className="form-select" value={form.category_id} onChange={e=>setForm(f=>({...f, category_id:e.target.value}))} required>
                          <option value="" disabled>Vyber…</option>
                          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small text-muted mb-1">Režim</label>
                        <select className="form-select" value={form.pricing_mode} onChange={e=>setForm(f=>({...f, pricing_mode:e.target.value}))} required>
                          <option value="per_item">per_item</option>
                          <option value="per_gram">per_gram</option>
                        </select>
                      </div>
                      <div className="col-8">
                        <label className="form-label small text-muted mb-1">Cena</label>
                        <input className="form-control" inputMode="decimal" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} required />
                        <div className="form-text"><code>per_gram</code> = €/g &nbsp;|&nbsp; <code>per_item</code> = €/ks</div>
                      </div>
                      <div className="col-4">
                        <label className="form-label small text-muted mb-1">Farba</label>
                        <input type="color" className="form-control form-control-color w-100" value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
                      </div>
                      <div className="col-12">
                        <button className="btn btn-primary w-100" disabled={loading} type="submit">Uložiť položku</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Kávové filtre */}
              <div className="card">
                <div
                  className="card-header bg-info text-white d-flex justify-content-between align-items-center"
                  style={{cursor:'pointer'}}
                  onClick={()=>setShowCoffeeFilters(!showCoffeeFilters)}
                >
                  <h6 className="mb-0">☕ Kávové filtre</h6>
                  <span>{showCoffeeFilters ? '▼' : '▶'}</span>
                </div>
                {showCoffeeFilters && (
                  <div className="card-body">
                    <p className="text-muted small mb-3">
                      <code>(cena_za_g × gramy) + extra_eur</code> podľa intervalu gramáže.
                    </p>
                    <div className="table-responsive mb-3">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Label</th>
                            <th>Od</th>
                            <th>Do</th>
                            <th>+ €</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {coffeeFilters.map(f => (
                            <tr key={f.id} className={!f.active ? "table-warning" : ""}>
                              <td>
                                {cfEditId===f.id
                                  ? <input className="form-control form-control-sm" value={cfEditForm.label} onChange={e=>setCfEditForm(v=>({...v, label:e.target.value}))} />
                                  : (f.label || "—")}
                              </td>
                              <td style={{width:90}}>
                                {cfEditId===f.id
                                  ? <input className="form-control form-control-sm" inputMode="decimal" value={cfEditForm.g_min} onChange={e=>setCfEditForm(v=>({...v, g_min:e.target.value}))} />
                                  : toFixedStr(f.g_min, 1)}
                              </td>
                              <td style={{width:90}}>
                                {cfEditId===f.id
                                  ? <input className="form-control form-control-sm" inputMode="decimal" value={cfEditForm.g_max} onChange={e=>setCfEditForm(v=>({...v, g_max:e.target.value}))} />
                                  : toFixedStr(f.g_max, 1)}
                              </td>
                              <td style={{width:90}}>
                                {cfEditId===f.id
                                  ? <input className="form-control form-control-sm" inputMode="decimal" value={cfEditForm.extra_eur} onChange={e=>setCfEditForm(v=>({...v, extra_eur:e.target.value}))} />
                                  : Number(toFixedStr(f.extra_eur, 2)).toFixed(2)}
                              </td>
                              <td className="text-end" style={{whiteSpace:'nowrap'}}>
                                {cfEditId===f.id ? (
                                  <div className="btn-group btn-group-sm">
                                    <button className="btn btn-success" disabled={cfLoading} onClick={()=>saveCoffeeFilter(f.id)}>✓</button>
                                    <button className="btn btn-outline-secondary" onClick={cancelEditCoffeeFilter}>✕</button>
                                  </div>
                                ) : (
                                  <div className="btn-group btn-group-sm">
                                    <button className="btn btn-outline-secondary" onClick={()=>startEditCoffeeFilter(f)}>Upraviť</button>
                                    <button className="btn btn-outline-danger" onClick={()=>deleteCoffeeFilter(f)}>✕</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                          {coffeeFilters.length===0 && (
                            <tr><td colSpan="5" className="text-center text-muted py-2">Žiadne filtre</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <form onSubmit={addCoffeeFilter} className="row g-2">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small text-muted mb-1">Label</label>
                        <input className="form-control form-control-sm" value={cfForm.label} onChange={e=>setCfForm(v=>({...v, label:e.target.value}))} placeholder="napr. Štandard" />
                      </div>
                      <div className="col-4 col-sm-2">
                        <label className="form-label small text-muted mb-1">Od (g)</label>
                        <input className="form-control form-control-sm" inputMode="decimal" value={cfForm.g_min} onChange={e=>setCfForm(v=>({...v, g_min:e.target.value}))} required />
                      </div>
                      <div className="col-4 col-sm-2">
                        <label className="form-label small text-muted mb-1">Do (g)</label>
                        <input className="form-control form-control-sm" inputMode="decimal" value={cfForm.g_max} onChange={e=>setCfForm(v=>({...v, g_max:e.target.value}))} required />
                      </div>
                      <div className="col-4 col-sm-2">
                        <label className="form-label small text-muted mb-1">+ € </label>
                        <input className="form-control form-control-sm" inputMode="decimal" value={cfForm.extra_eur} onChange={e=>setCfForm(v=>({...v, extra_eur:e.target.value}))} required />
                      </div>
                      <div className="col-12">
                        <button className="btn btn-sm btn-primary w-100" disabled={cfLoading} type="submit">Pridať filter</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* ── Osoby a dlhy ── */}
            <div className="col-12 fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="card p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">👥 Osoby a dlhy</h5>
                  <div className="text-end">
                    <div className="text-muted small">Celkový dlh</div>
                    <h4 className="mb-0 text-danger fw-bold">
                      {Object.values(debts).reduce((sum, d) => sum + d, 0).toFixed(2)} €
                    </h4>
                  </div>
                </div>
                <div className="row g-3">
                  {persons.map(p => {
                    const debt = debts[p.id] ?? 0
                    const displayDebt = displayDebts[p.id] ?? debt
                    return (
                      <div key={p.id} className="col-12 col-md-6 col-xl-4">
                        <div className={`card h-100 ${debt > 0 ? 'border-danger' : 'border-success'}`}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1">{p.name}</h6>
                                {p.is_guest && <span className="badge bg-secondary">Hosť</span>}
                              </div>
                              <div
                                className="fs-5 fw-bold debt-value"
                                style={{ color: debt > 0 ? '#dc3545' : '#198754' }}
                              >
                                {displayDebt.toFixed(2)} €
                              </div>
                            </div>
                            <div className="d-flex gap-3 mb-3 text-muted small">
                              <span>🍺 {p.total_beers}</span>
                              <span>☕ {p.total_coffees}</span>
                            </div>
                            <div className="d-flex flex-column gap-2">
                              {debt > 0 && (
                                <button className="btn btn-sm btn-outline-primary w-100"
                                  onClick={()=>window.open(`/api/persons/${p.id}/pay-by-square/`, "_blank")}>
                                  💳 Pay by Square
                                </button>
                              )}
                              {debt > 0 && (
                                <button className="btn btn-sm btn-outline-danger w-100" onClick={()=>resetDebt(p)}>
                                  ✕ Vynulovať dlh
                                </button>
                              )}
                              {debt === 0 && (
                                <div className="text-center text-success small py-1">✓ Bez dlhu</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {persons.length === 0 && (
                    <div className="col-12 text-center text-muted py-3">Žiadne osoby</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

