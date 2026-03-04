import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { ThemeToggle } from "../ThemeToggle"

export default function Users() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState("")
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", avatar: null })
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    const s = sessionStorage.getItem("adminAuthed")
    if (s === "true") {
      setAuthed(true)
      loadPersons()
    }
  }, [])

  const loadPersons = async () => {
    const p = await api.persons()
    setPersons(p)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await api.csrf()
      await api.login(pin)
      sessionStorage.setItem("adminAuthed", "true")
      setAuthed(true)
      loadPersons()
    } catch (err) {
      alert("Nesprávny PIN")
    }
  }

  const handleLogout = async () => {
    await api.logout()
    sessionStorage.removeItem("adminAuthed")
    setAuthed(false)
  }

  const startEdit = (person) => {
    setEditId(person.id)
    setEditForm({ 
      name: person.name, 
      email: person.email || "", 
      avatar: null 
    })
    setPreviewUrl(person.avatar || null)
    setMsg("")
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ name: "", email: "", avatar: null })
    setPreviewUrl(null)
    setMsg("")
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditForm({ ...editForm, avatar: file })
      // Vytvor preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim()) {
      setMsg("Meno je povinné")
      return
    }
    
    setLoading(true)
    setMsg("")
    try {
      const formData = new FormData()
      formData.append("name", editForm.name)
      formData.append("email", editForm.email)
      
      // Pridaj avatar len ak je vybraný nový súbor
      if (editForm.avatar) {
        formData.append("avatar", editForm.avatar)
      }

      await api.updatePerson(editId, formData)
      setMsg("✅ Uložené")
      loadPersons()
      cancelEdit()
    } catch (err) {
      console.error(err)
      setMsg("❌ Chyba pri ukladaní")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Naozaj odstrániť ${name}?`)) return
    
    setLoading(true)
    try {
      await api.deletePerson(id)
      setMsg("✅ Odstránené")
      loadPersons()
    } catch (err) {
      console.error(err)
      setMsg("❌ Chyba pri odstraňovaní")
    } finally {
      setLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="container">
        <div className="d-flex justify-content-end pt-3">
          <ThemeToggle />
        </div>
        <div className="row justify-content-center align-items-center" style={{ minHeight: "90vh" }}>
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card shadow-lg">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="display-4 mb-3">🔒</div>
                  <h3 className="card-title">Admin Login</h3>
                  <p className="text-muted">Správa používateľov</p>
                </div>
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label className="form-label">PIN</label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      placeholder="Zadaj PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg w-100 mb-3">
                    Prihlásiť
                  </button>
                  <Link to="/admin" className="btn btn-outline-secondary w-100">
                    ← Späť na Admin
                  </Link>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">👥 Správa používateľov</h2>
        <div className="d-flex gap-2 align-items-center">
          <Link to="/admin" className="btn btn-outline-secondary">
            ← Späť na Admin
          </Link>
          <button onClick={handleLogout} className="btn btn-outline-danger">
            Odhlásiť
          </button>
          <ThemeToggle />
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.includes("✅") ? "alert-success" : "alert-danger"} mb-4`}>
          {msg}
        </div>
      )}

      <div className="row g-4">
        {persons.map((person) => (
          <div key={person.id} className="col-12 col-md-6 col-lg-4">
            {editId === person.id ? (
              // Edit mode card
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <form onSubmit={handleSave}>
                    <div className="text-center mb-3">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          loading="lazy"
                          className="rounded-circle mb-2 avatar-img-edit"
                        />
                      )}
                      <div>
                        <label className="btn btn-sm btn-outline-primary">
                          📸 Vybrať fotku
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label small text-muted">Meno *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label small text-muted">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="mb-3">
                      <span className="badge bg-secondary">
                        {person.is_guest ? "🎫 Guest" : "🏠 Home"}
                      </span>
                    </div>
                    
                    <div className="d-flex gap-2">
                      <button 
                        type="submit"
                        className="btn btn-success flex-fill"
                        disabled={loading}
                      >
                        💾 Uložiť
                      </button>
                      <button 
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-secondary flex-fill"
                        disabled={loading}
                      >
                        ❌ Zrušiť
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              // View mode card
              <div className="card shadow-sm h-100 hover-card" style={{ transition: "transform 0.2s" }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                   onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body text-center">
                  <div className="mb-3">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        loading="lazy"
                        className="rounded-circle avatar-img"
                      />
                    ) : (
                      <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center avatar-placeholder">
                        👤
                      </div>
                    )}
                  </div>
                  
                  <h5 className="card-title mb-2">{person.name}</h5>
                  
                  <p className="text-muted small mb-2">
                    {person.email || <span className="text-muted fst-italic">No email</span>}
                  </p>
                  
                  <div className="mb-3">
                    <span className={`badge ${person.is_guest ? "bg-warning text-dark" : "bg-primary"}`}>
                      {person.is_guest ? "🎫 Guest" : "🏠 Home"}
                    </span>
                  </div>
                  
                  <div className="d-flex gap-2 justify-content-center">
                    <button 
                      onClick={() => startEdit(person)}
                      className="btn btn-sm btn-outline-primary"
                      disabled={loading}
                    >
                      ✏️ Upraviť
                    </button>
                    <button 
                      onClick={() => handleDelete(person.id, person.name)}
                      className="btn btn-sm btn-outline-danger"
                      disabled={loading}
                    >
                      🗑️ Zmazať
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {persons.length === 0 && (
        <div className="text-center py-5">
          <div className="display-1 text-muted mb-3">👥</div>
          <h4 className="text-muted">Žiadni používatelia</h4>
        </div>
      )}
    </div>
  )
}
