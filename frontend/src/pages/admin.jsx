import { useEffect, useState } from "react"
import { api } from "../api"
import { API_BASE } from "../config"

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState("")

  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [persons, setPersons] = useState([])
  const [debts, setDebts] = useState({})

  const [filterCat, setFilterCat] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")

  const [form, setForm] = useState({ name: "", category_id: "", price: "", pricing_mode: "per_item", unit: "pcs" })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", price: "", category_id: "", pricing_mode: "per_item", unit: "pcs" })

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

  useEffect(() => { api.csrf().catch(()=>{}) }, [])

const login = async (e) => {
  e.preventDefault()
  try {
    await api.csrf()
    await api.login(pin)
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
        price: String(form.price)
      })
      setForm({ name:"", category_id:"", price:"", pricing_mode:"per_item", unit:"pcs" })
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
    })
  }

  const cancelEditItem = () => {
    setEditId(null)
    setEditForm({ name:"", price:"", category_id:"", pricing_mode:"per_item", unit:"pcs" })
  }

  const saveEditItem = async (id) => {
    const payload = {
      name: editForm.name,
      price: String(editForm.price),
      category_id: Number(editForm.category_id || 0) || undefined,
      pricing_mode: editForm.pricing_mode,
      unit: editForm.unit,
    }
    await api.updateItem(id, payload)
    await load()
    cancelEditItem()
    setMsg("Položka upravená")
  }

  // ===== Osoby =====
  const resetDebt = async (person) => {
    if (!confirm(`Naozaj vynulovať dlh pre ${person.name}?`)) return
    await api.resetDebt(person.id)
    await load()
    setMsg(`Dlh pre ${person.name} bol vynulovaný`)
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

  const toggleCoffeeFilterActive = async (f) => {
    await api.csrf().catch(()=>{})
    await fetch(`${API_BASE}/coffee-filters/${f.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active: !f.active }),
    })
    await loadCoffeeFilters()
  }

  const deleteCoffeeFilter = async (f) => {
    if (!confirm(`Zmazať filter ${f.label ? `"${f.label}"` : `${f.g_min}-${f.g_max} g` }?`)) return
    await api.csrf().catch(()=>{})
    await fetch(`${API_BASE}/coffee-filters/${f.id}/`, {
      method: "DELETE",
      credentials: "include",
    })
    await loadCoffeeFilters()
    setMsg("Kávový filter zmazaný")
  }

  return (
    <div className="container py-3">
      <h2 className="mb-3">Admin</h2>
      {msg && <div className="alert alert-info py-2">{msg}</div>}

      {!authed ? (
        <form onSubmit={login} className="card p-3 mx-auto" style={{maxWidth:420}}>
          <label className="form-label">Admin PIN</label>
          <input className="form-control mb-2" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Zadaj PIN" />
          <button className="btn btn-primary w-100" type="submit">Prihlásiť</button>
        </form>
      ) : (
        <>
          {/* Filtre + akcie (položky) */}
          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
            <div className="d-flex flex-wrap gap-2">
              <div className="btn-group btn-group-sm actions">
                <button className={`btn ${filterStatus==='All'?'btn-secondary':'btn-outline-secondary'}`} onClick={()=>setFilterStatus('All')}>Všetky</button>
                <button className={`btn ${filterStatus==='Active'?'btn-success':'btn-outline-success'}`} onClick={()=>setFilterStatus('Active')}>Aktívne</button>
                <button className={`btn ${filterStatus==='Hidden'?'btn-warning':'btn-outline-warning'}`} onClick={()=>setFilterStatus('Hidden')}>Skryté</button>
              </div>
              <div className="btn-group btn-group-sm actions">
                <button className={`btn ${filterCat==='All'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setFilterCat('All')}>Všetko</button>
                {cats.map(c => (
                  <button key={c.id} className={`btn ${filterCat===c.name?'btn-primary':'btn-outline-primary'}`} onClick={()=>setFilterCat(c.name)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* Položky */}
            <div className="col-12 col-xxl-7">
              <div className="card p-3">
                <h5 className="mb-3">Položky</h5>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Názov</th><th>Kategória</th><th>Režim</th><th>Cena</th><th>Stav</th><th className="text-end">Akcie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(it => (
                        <tr key={it.id} className={!it.active ? "table-warning" : ""}>
                          <td>
                            {editId===it.id ? (
                              <input className="form-control form-control-sm" value={editForm.name}
                                     onChange={e=>setEditForm(f=>({...f, name:e.target.value}))} />
                            ) : it.name}
                          </td>
                          <td>
                            {editId===it.id ? (
                              <select className="form-select form-select-sm" value={editForm.category_id}
                                      onChange={e=>setEditForm(f=>({...f, category_id:e.target.value}))}>
                                <option value="">—</option>
                                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : (it.category?.name ?? "—")}
                          </td>
                          <td style={{width:150}}>
                            {editId===it.id ? (
                              <select className="form-select form-select-sm" value={editForm.pricing_mode}
                                      onChange={e=>setEditForm(f=>({...f, pricing_mode:e.target.value}))}>
                                <option value="per_item">per_item</option>
                                <option value="per_gram">per_gram</option>
                              </select>
                            ) : it.pricing_mode}
                          </td>
                          <td style={{width:140}}>
                            {editId===it.id ? (
                              <input className="form-control form-control-sm" inputMode="decimal" value={editForm.price}
                                     onChange={e=>setEditForm(f=>({...f, price:e.target.value}))} />
                            ) : (it.pricing_mode==='per_gram'
                                  ? `${Number(it.price).toFixed(3)} €/g`
                                  : `${Number(it.price).toFixed(2)} €`)}
                          </td>
                          <td>
                            <span className={`badge ${it.active?'bg-success':'bg-secondary'}`}>{it.active?'aktívne':'skryté'}</span>
                          </td>
                          <td className="text-end">
                            {editId===it.id ? (
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-primary" onClick={()=>saveEditItem(it.id)}>Uložiť</button>
                                <button className="btn btn-outline-secondary" onClick={cancelEditItem}>Zrušiť</button>
                              </div>
                            ) : (
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-secondary" onClick={()=>startEditItem(it)}>Upraviť</button>
                                <button className={`btn ${it.active?'btn-outline-warning':'btn-outline-success'}`} onClick={()=>toggleActiveItem(it)}>
                                  {it.active ? 'Skryť' : 'Zobraziť'}
                                </button>
                                <button className="btn btn-outline-danger" onClick={async ()=>{ await api.deleteItem(it.id); await load() }}>
                                  Zmazať
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length===0 && (<tr><td colSpan="6" className="text-center text-muted">Žiadne položky</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pridať položku */}
            <div className="col-12 col-xxl-5">
              <div className="card p-3 mb-3">
                <h5 className="mb-3">Pridať položku</h5>
                <form onSubmit={saveItem} className="row g-2">
                  <div className="col-12">
                    <label className="form-label">Názov</label>
                    <input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Kategória</label>
                    <select className="form-select" value={form.category_id} onChange={e=>setForm(f=>({...f, category_id:e.target.value}))} required>
                      <option value="" disabled>Vyber…</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Režim</label>
                    <select className="form-select" value={form.pricing_mode} onChange={e=>setForm(f=>({...f, pricing_mode:e.target.value}))} required>
                      <option value="per_item">per_item</option>
                      <option value="per_gram">per_gram</option>
                    </select>
                  </div>

                  <div className="col-6">
                    <label className="form-label">Cena</label>
                    <input className="form-control" inputMode="decimal" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} required />
                    <div className="form-text">
                      pri <code>per_gram</code> = €/g, pri <code>per_item</code> = € za kus
                    </div>
                  </div>
                  <div className="col-12 d-flex justify-content-end">
                    <button className="btn btn-primary" disabled={loading} type="submit">Uložiť</button>
                  </div>
                </form>
              </div>

              {/* =================== KÁVOVÉ FILTRE – GLOBÁLNE =================== */}
              <div className="card p-3">
                <h5 className="mb-3">Kávové filtre (globálne)</h5>
                <p className="text-muted small mb-3">
                  Intervaly gramáže s prirážkou k výslednej cene kávy.
                  Výpočet: <code>(cena_za_g * gramy) + extra_eur</code> podľa toho, do ktorého intervalu gramy spadnú.
                </p>

                <div className="table-responsive mb-2">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Od (g)</th>
                        <th>Do (g)</th>
                        <th>Prirážka €</th>

                      </tr>
                    </thead>
                    <tbody>
                      {coffeeFilters.map(f => (
                        <tr key={f.id} className={!f.active ? "table-warning" : ""}>
                          <td>
                            {cfEditId===f.id ? (
                              <input className="form-control form-control-sm" value={cfEditForm.label}
                                     onChange={e=>setCfEditForm(v=>({...v, label:e.target.value}))} />
                            ) : (f.label || "—")}
                          </td>
                         <td style={{width:110}}>
                      {cfEditId===f.id ? (
                        <input className="form-control form-control-sm" inputMode="decimal" step="0.001"
                               value={cfEditForm.g_min}
                               onChange={e=>setCfEditForm(v=>({...v, g_min:e.target.value}))} />
                      ) : toFixedStr(f.g_min, 3)}
                    </td>

                    <td style={{width:110}}>
                      {cfEditId===f.id ? (
                        <input className="form-control form-control-sm" inputMode="decimal" step="0.001"
                               value={cfEditForm.g_max}
                               onChange={e=>setCfEditForm(v=>({...v, g_max:e.target.value}))} />
                      ) : toFixedStr(f.g_max, 3)}
                    </td>

                    <td style={{width:140}}>
                      {cfEditId===f.id ? (
                        <input className="form-control form-control-sm" inputMode="decimal" step="0.01"
                               value={cfEditForm.extra_eur}
                               onChange={e=>setCfEditForm(v=>({...v, extra_eur:e.target.value}))} />
                      ) : Number(toFixedStr(f.extra_eur, 2)).toFixed(2)}
                    </td>
                          <td className="text-end">
                              {cfEditId === f.id ? (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-primary"
                                    disabled={cfLoading}
                                    onClick={() => saveCoffeeFilter(f.id)}
                                  >
                                    Uložiť
                                  </button>
                                  <button
                                    className="btn btn-outline-secondary"
                                    onClick={cancelEditCoffeeFilter}
                                  >
                                    Zrušiť
                                  </button>
                                </div>
                              ) : (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => startEditCoffeeFilter(f)}
                                  >
                                    Upraviť
                                  </button>
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => deleteCoffeeFilter(f)}
                                  >
                                    Zmazať
                                  </button>
                                </div>
                              )}
                            </td>
                        </tr>
                      ))}
                      {coffeeFilters.length===0 && (
                        <tr><td colSpan="9" className="text-center text-muted">Žiadne kávové filtre</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <form onSubmit={addCoffeeFilter} className="row g-2">
                  <div className="col-md-3">
                    <label className="form-label">Label</label>
                    <input className="form-control" value={cfForm.label} onChange={e=>setCfForm(v=>({...v, label:e.target.value}))} placeholder="napr. Štandard" />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Od (g)</label>
                    <input className="form-control" inputMode="decimal" value={cfForm.g_min} onChange={e=>setCfForm(v=>({...v, g_min:e.target.value}))} required />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Do (g)</label>
                    <input className="form-control" inputMode="decimal" value={cfForm.g_max} onChange={e=>setCfForm(v=>({...v, g_max:e.target.value}))} required />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Prirážka (€)</label>
                    <input className="form-control" inputMode="decimal" value={cfForm.extra_eur} onChange={e=>setCfForm(v=>({...v, extra_eur:e.target.value}))} required />
                  </div>

                  <div className="col-12 d-flex justify-content-end">
                    <button className="btn btn-primary" disabled={cfLoading} type="submit">Pridať filter</button>
                  </div>
                </form>
              </div>
              {/* =================== /KÁVOVÉ FILTRE =================== */}
            </div>

            {/* Osoby */}
            <div className="col-12">
              <div className="card p-3">
                <h5 className="mb-3">Osoby</h5>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Meno</th>
                        <th className="text-end">Pivá</th>
                        <th className="text-end">Kávy</th>
                        <th className="text-end">Dlh (€)</th>
                        <th className="text-end">Akcie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {persons.map(p => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td className="text-end">{p.total_beers}</td>
                          <td className="text-end">{p.total_coffees}</td>
                          <td className="text-end">{(debts[p.id] ?? 0).toFixed(2)}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => window.open(`/api/persons/${p.id}/pay-by-square/`, "_blank")}
                            >
                              Pay by Square
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => resetDebt(p)}
                            >
                              Vynulovať dlh
                            </button>
                          </td>
                        </tr>
                      ))}
                      {persons.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-muted">
                            Žiadne osoby
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

function AddCategory({ onAdded }) {
  const [name, setName] = useState("")
  const add = async () => {
    if (!name.trim()) return
    await onAdded(name.trim())
    setName("")
  }
  return (
    <div className="input-group">
      <input className="form-control" placeholder="Nová kategória" value={name} onChange={e=>setName(e.target.value)} />
      <button className="btn btn-outline-primary" onClick={add}>Pridať</button>
    </div>
  )
}