import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { avatarPhotoUrl } from '../../lib/avatar'

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// Matches the backend's upload size limit.
const MAX_AVATAR_BYTES = 15 * 1024 * 1024

function avatarFileError(file) {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return 'Podporované sú len obrázky JPEG, PNG, WEBP a GIF.'
  if (file.size > MAX_AVATAR_BYTES) return 'Súbor je väčší než 15 MB.'
  return null
}

/** A browser URL previewing a picked file, revoked when the file changes or the form closes. */
function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return url
}

function AvatarPicker({ person, previewUrl, onFileChange }) {
  return (
    <div className="text-center mb-4">
      {previewUrl
        ? <img src={previewUrl} alt="Náhľad avatara" loading="lazy" className="avatar-img-edit" />
        : <Avatar person={person} size={100} />}
      <div className="mt-3">
        <label className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2">
          <Icon name="edit" size={14} /> Vybrať fotku
          <input type="file" accept="image/*" onChange={onFileChange} className="d-none" />
        </label>
      </div>
    </div>
  )
}

export function UserEditForm({ person, isSaving, onSave, onCancel, onError }) {
  const [name, setName] = useState(person.name)
  const [email, setEmail] = useState(person.email || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const previewUrl = useObjectUrl(avatarFile) ?? avatarPhotoUrl(person)

  const changeAvatar = (event) => {
    const file = event.target.files[0]
    if (!file) return
    const problem = avatarFileError(file)
    if (problem) onError(problem)
    else setAvatarFile(file)
  }

  const submit = (event) => {
    event.preventDefault()
    if (!name.trim()) onError('Meno je povinné.')
    else onSave({ name, email, avatarFile })
  }

  return (
    <div className="card h-100">
      <div className="card-body">
        <form onSubmit={submit}>
          <AvatarPicker person={person} previewUrl={previewUrl} onFileChange={changeAvatar} />

          <div className="mb-3">
            <label className="form-label" htmlFor={`name-${person.id}`}>Meno</label>
            <input
              id={`name-${person.id}`}
              type="text"
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor={`email-${person.id}`}>Email</label>
            <input
              id={`email-${person.id}`}
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="meno@example.com"
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary flex-fill" disabled={isSaving}>
              {isSaving ? 'Ukladám…' : 'Uložiť'}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-outline-secondary flex-fill" disabled={isSaving}>
              Zrušiť
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
