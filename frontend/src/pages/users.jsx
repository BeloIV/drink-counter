import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { PageHeader } from "../components/PageHeader"
import { Icon } from "../components/Icon"
import { Avatar } from "../components/Avatar"
import { EmptyState } from "../components/EmptyState"
import { Skeleton } from "../components/Skeleton"
import { useDialog } from "../lib/dialogContext"

export default function Users() {
  const dialog = useDialog()

  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [persons, setPersons] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)   // { tone: 'ok' | 'error', text }

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", avatar: null })
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    api.adminCheck()
      .then(() => { setAuthed(true); loadPersons() })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const loadPersons = async () => {
    setLoadingList(true)
    try {
      setPersons(await api.persons())
    } finally {
      setLoadingList(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setPinError("")
    try {
      await api.csrf()
      await api.login(pin)
      setAuthed(true)
      loadPersons()
    } catch {
      setPinError("Nesprávny PIN. Skús to znova.")
      setPin("")
    }
  }

  const handleLogout = async () => {
    await api.logout()
    setAuthed(false)
  }

  const startEdit = (person) => {
    setEditId(person.id)
    setEditForm({ name: person.name, email: person.email || "", avatar: null })
    setPreviewUrl(person.avatar?.startsWith('/media/') ? person.avatar : null)
    setMsg(null)
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ name: "", email: "", avatar: null })
    setPreviewUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null })
    setMsg(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setMsg({ tone: 'error', text: "Podporované sú len obrázky JPEG, PNG, WEBP a GIF." })
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setMsg({ tone: 'error', text: "Súbor je väčší než 15 MB." })
      return
    }
    setEditForm({ ...editForm, avatar: file })
    const url = URL.createObjectURL(file)
    setPreviewUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return url })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim()) {
      setMsg({ tone: 'error', text: "Meno je povinné." })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const formData = new FormData()
      formData.append("name", editForm.name)
      formData.append("email", editForm.email)
      if (editForm.avatar) formData.append("avatar", editForm.avatar)

      await api.updatePerson(editId, formData)
      setMsg({ tone: 'ok', text: "Zmeny sú uložené." })
      loadPersons()
      cancelEdit()
    } catch (err) {
      console.error(err)
      setMsg({ tone: 'error', text: "Zmeny sa nepodarilo uložiť." })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    const ok = await dialog.confirm({
      title: `Odstrániť ${name}?`,
      text: "Osoba zmizne zo zoznamu. Túto akciu nie je možné vrátiť späť.",
      confirmLabel: "Odstrániť",
      tone: "danger",
    })
    if (!ok) return

    setLoading(true)
    try {
      await api.deletePerson(id)
      setMsg({ tone: 'ok', text: `${name} bol odstránený.` })
      loadPersons()
    } catch (err) {
      console.error(err)
      setMsg({ tone: 'error', text: "Odstránenie sa nepodarilo." })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="container py-3">
        <PageHeader title="Používatelia" icon="users" />
        <div className="row g-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="col-12 col-md-6 col-lg-4" key={i}>
              <Skeleton h={220} r="var(--radius-lg)" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="container">
        <div className="row justify-content-center align-items-center" style={{ minHeight: "90dvh" }}>
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <span className="page-header-icon mx-auto mb-3"><Icon name="admin" size={22} /></span>
                  <h1 style={{ fontSize: 'var(--fs-lg)' }}>Správa používateľov</h1>
                  <p className="text-muted mb-0" style={{ fontSize: 'var(--fs-sm)' }}>
                    Táto sekcia je chránená PIN kódom.
                  </p>
                </div>
                <form onSubmit={handleLogin} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="pin">PIN</label>
                    <input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      className={`form-control form-control-lg num ${pinError ? 'is-invalid' : ''}`}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value); setPinError("") }}
                      aria-describedby={pinError ? "pin-error" : undefined}
                      autoFocus
                    />
                    {pinError && (
                      <div id="pin-error" className="mt-2" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
                        {pinError}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" disabled={!pin}>
                    Prihlásiť
                  </button>
                  <Link to="/admin" className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2">
                    <Icon name="back" size={16} /> Späť na Admin
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
    <div className="container py-3">
      <PageHeader title="Používatelia" icon="users">
        <button onClick={handleLogout} className="btn btn-sm btn-outline-secondary">Odhlásiť</button>
      </PageHeader>

      {msg && (
        <div className={`alert ${msg.tone === 'ok' ? 'alert-success' : 'alert-danger'} mb-4`} role="status">
          {msg.text}
        </div>
      )}

      {loadingList && persons.length === 0 ? (
        <div className="row g-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="col-12 col-md-6 col-lg-4" key={i}>
              <Skeleton h={220} r="var(--radius-lg)" />
            </div>
          ))}
        </div>
      ) : persons.length === 0 ? (
        <EmptyState
          icon="users"
          title="Žiadni používatelia"
          text="Osoby pribudnú, keď si ich pridáš na domovskej obrazovke alebo v Admine."
        />
      ) : (
        <div className="row g-4">
          {persons.map((person) => (
            <div key={person.id} className="col-12 col-md-6 col-lg-4">
              {editId === person.id ? (
                <div className="card h-100">
                  <div className="card-body">
                    <form onSubmit={handleSave}>
                      <div className="text-center mb-4">
                        {previewUrl
                          ? <img src={previewUrl} alt="Náhľad avatara" loading="lazy" className="avatar-img-edit" />
                          : <Avatar person={person} size={100} />}
                        <div className="mt-3">
                          <label className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2">
                            <Icon name="edit" size={14} /> Vybrať fotku
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                          </label>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label" htmlFor={`name-${person.id}`}>Meno</label>
                        <input
                          id={`name-${person.id}`}
                          type="text"
                          className="form-control"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="form-label" htmlFor={`email-${person.id}`}>Email</label>
                        <input
                          id={`email-${person.id}`}
                          type="email"
                          className="form-control"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="meno@example.com"
                        />
                      </div>

                      <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-primary flex-fill" disabled={loading}>
                          {loading ? 'Ukladám…' : 'Uložiť'}
                        </button>
                        <button type="button" onClick={cancelEdit} className="btn btn-outline-secondary flex-fill" disabled={loading}>
                          Zrušiť
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="card h-100">
                  <div className="card-body text-center">
                    <div className="mb-3 d-flex justify-content-center">
                      <Avatar person={person} size={92} />
                    </div>

                    <h2 className="mb-1" style={{ fontSize: 'var(--fs-md)' }}>{person.name}</h2>

                    <p className="text-muted mb-3" style={{ fontSize: 'var(--fs-sm)' }}>
                      {person.email || <span className="fst-italic">bez emailu</span>}
                    </p>

                    <div className="mb-3">
                      <span
                        className="badge"
                        style={person.is_guest
                          ? { background: 'var(--warn-soft)', color: 'var(--warn)' }
                          : { background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        {person.is_guest ? "Hosť" : "Domáci"}
                      </span>
                    </div>

                    <div className="d-flex gap-2 justify-content-center">
                      <button
                        onClick={() => startEdit(person)}
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                        disabled={loading}
                      >
                        <Icon name="edit" size={14} /> Upraviť
                      </button>
                      <button
                        onClick={() => handleDelete(person.id, person.name)}
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-2"
                        disabled={loading}
                      >
                        <Icon name="trash" size={14} /> Zmazať
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
