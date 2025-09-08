import { useEffect, useState } from "react"
import { api } from "../api"

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState("")

  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [persons, setPersons] = useState([])
  const [debts, setDebts] = useState({}) // { [personId]: number }

  const [filterCat, setFilterCat] = useState("All")       // All | názov kategórie
  const [filterStatus, setFilterStatus] = useState("All") // All | Active | Hidden

  const [form, setForm] = useState({
    name: "", category_id: "", price: "",
    pricing_mode: "per_item", unit: "pcs"
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: "", price: "", category_id: "",
    pricing_mode: "per_item", unit: "pcs"
  })

  const load = async () => {
    const [c, i, p, s] = await Promise.all([
      api.categories(),
      api.items(),        // všetky položky (aj skryté)
      api.persons(),
      api.sessionActive(),
    ])
    setCats(c); setItems(i); setPersons(p)
    const map = {}
    ;(s?.per_person ?? []).forEach(row => { map[row.person_id] = Number(row.total_eur || 0) })
    setDebts(map)
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
    } catch {
      setMsg("Zlý PIN")
    }
  }

  const logout = async () => {
    await api.logout()
    setAuthed(false)
    setMsg("Odhlásený")
  }

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

  const toggleActive = async (it) => {
    await api.updateItem(it.id, { active: !it.active })
    await load()
  }

  const startEdit = (it) => {
    setEditId(it.id)
    setEditForm({
      name: it.name,
      price: String(it.price),
      category_id: String(it.category?.id ?? ""),
      pricing_mode: it.pricing_mode || "per_item",
      unit: it.unit || (it.category?.name === "Coffee" ? "g" : "pcs"),
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ name:"", price:"", category_id:"", pricing_mode:"per_item", unit:"pcs" })
  }

  const saveEdit = async (id) => {
    const payload = {
      name: editForm.name,
      price: String(editForm.price),
      category_id: Number(editForm.category_id || 0) || undefined,
      pricing_mode: editForm.pricing_mode,
      unit: editForm.unit,
    }
    await api.updateItem(id, payload)
    await load()
    cancelEdit()
    setMsg("Položka upravená")
  }

  const resetDebt = async (person) => {
    if (!confirm(`Naozaj vynulovať dlh pre ${person.name}?`)) return
    await api.resetDebt(person.id)
    await load() // obnoví aj dlhy
    setMsg(`Dlh pre ${person.name} bol vynulovaný`)
  }

  const filtered = items
    .filter(i => filterCat==="All" ? true : i.category?.name===filterCat)
    .filter(i => {
      if (filterStatus==="All") return true
      if (filterStatus==="Active") return i.active
      if (filterStatus==="Hidden") return !i.active
      return true
    })

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
          {/* Filtre + akcie */}
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
            <div className="d-flex gap-2">
              <AddCategory onAdded={async (name)=>{ await api.addCategory({name}); await load() }} />
              <button className="btn btn-outline-secondary" onClick={logout}>Odhlásiť</button>
            </div>
          </div>

          {/* Položky */}
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <div className="card p-3">
                <h5 className="mb-3">Položky</h5>
                <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Názov</th><th>Kategória</th><th>Režim</th><th>Jedn.</th><th>Cena</th><th>Stav</th><th className="text-end">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
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
                        <td style={{width:90}}>
                          {editId===it.id ? (
                            <input className="form-control form-control-sm" value={editForm.unit}
                                   onChange={e=>setEditForm(f=>({...f, unit:e.target.value}))} />
                          ) : it.unit}
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
                              <button className="btn btn-primary" onClick={()=>saveEdit(it.id)}>Uložiť</button>
                              <button className="btn btn-outline-secondary" onClick={cancelEdit}>Zrušiť</button>
                            </div>
                          ) : (
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-secondary" onClick={()=>startEdit(it)}>Upraviť</button>
                              <button className={`btn ${it.active?'btn-outline-warning':'btn-outline-success'}`} onClick={()=>toggleActive(it)}>
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
                    {filtered.length===0 && (<tr><td colSpan="7" className="text-center text-muted">Žiadne položky</td></tr>)}
                  </tbody>
                </table>
                  </div>
              </div>
            </div>

            {/* Pridanie položky */}
            <div className="col-12 col-lg-5">
              <div className="card p-3">
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
                    <label className="form-label">Jednotka</label>
                    <input className="form-control" value={form.unit} onChange={e=>setForm(f=>({...f, unit:e.target.value}))} placeholder="pcs alebo g" required />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Cena</label>
                    <input className="form-control" inputMode="decimal" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} required />
                    <div className="form-text">
                      pri <code>per_gram</code> = €/g, pri <code>per_item</code> = € za kus
                    </div>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary" disabled={loading} type="submit">Uložiť</button>
                  </div>
                </form>
              </div>
            </div>

            {/* Osoby + dlh + vynulovanie */}
            <div className="col-12">
              <div className="card p-3">
                <h5 className="mb-3">Osoby</h5>
                <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr><th>Meno</th><th className="text-end">Dlh (€)</th><th className="text-end">Akcie</th></tr>
                  </thead>
                  <tbody>
                    {persons.map(p => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="text-end">{(debts[p.id] ?? 0).toFixed(2)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => resetDebt(p)}
                          >
                            Vynulovať dlh
                          </button>
                        </td>
                      </tr>
                    ))}
                    {persons.length===0 && (
                      <tr><td colSpan="3" className="text-center text-muted">Žiadne osoby</td></tr>
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