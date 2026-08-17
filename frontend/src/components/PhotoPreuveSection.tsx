import { useRef, useState } from 'react'
import type { AjouterPhotosPreuveInput } from '../api'

interface PhotoPreuveSectionProps {
  missionMenageId: number
  onAjouter: (missionMenageId: number, input: AjouterPhotosPreuveInput) => Promise<void>
  /** Emphasized presentation: shown auto-expanded and highlighted, for a mission just sent back by the Manager. */
  misEnAvant?: boolean
}

interface PhotoEntry {
  file: File
  previewUrl: string
}

export function PhotoPreuveSection({ missionMenageId, onAjouter, misEnAvant = false }: PhotoPreuveSectionProps) {
  const [expanded, setExpanded] = useState(misEnAvant)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setPhotos([])
    setNote('')
    setError(null)
  }

  const handlePhotosChange = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const entries = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setPhotos((current) => [...current, ...entries])
  }

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)

    if (photos.length === 0) {
      setError('Ajoutez au moins une photo.')
      return
    }

    setSubmitting(true)
    try {
      await onAjouter(missionMenageId, {
        photos: photos.map((p) => p.file),
        note: note.trim() ? note : null,
      })
      resetForm()
      setExpanded(false)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <div
        className={`rounded-xl border-2 p-4 shadow-sm ${
          misEnAvant ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
        }`}
      >
        {misEnAvant && (
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
            <span aria-hidden="true" className="text-lg">
              💡
            </span>
            Mission refusée : montrez au Manager le travail corrigé.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setExpanded(true)
            setSent(false)
          }}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white hover:bg-blue-700"
        >
          <span aria-hidden="true" className="text-2xl">
            📸
          </span>
          Ajouter une photo de mon travail
        </button>
        {sent && (
          <p
            className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700"
            data-testid="photo-preuve-confirmation"
          >
            <span aria-hidden="true" className="text-lg">
              ✅
            </span>
            Photo(s) envoyée(s) au Manager
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900">Ajouter une photo de mon travail</h4>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Ouvrir l'appareil photo"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-200 bg-blue-50 text-4xl hover:bg-blue-100"
        >
          📷
        </button>
        <span className="text-xs font-medium text-gray-500">Photo(s)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          multiple
          className="hidden"
          aria-label="Photos de preuve de travail"
          onChange={(e) => {
            handlePhotosChange(e.target.files)
            e.target.value = ''
          }}
        />

        {photos.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {photos.map((photo, index) => (
              <div key={photo.previewUrl} className="relative">
                <img
                  src={photo.previewUrl}
                  alt={`Aperçu photo de preuve ${index + 1}`}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label={`Retirer la photo ${index + 1}`}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`photo_preuve_note_${missionMenageId}`} className="block text-sm font-medium text-gray-700">
          Note (optionnel)
        </label>
        <textarea
          id={`photo_preuve_note_${missionMenageId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            resetForm()
            setExpanded(false)
          }}
          className="min-h-14 flex-1 rounded-xl border-2 border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-xl">
            ✓
          </span>
          {submitting ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}
