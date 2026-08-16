import { useEffect, useRef, useState } from 'react'
import { marquerTicketMaintenanceRefusVu, resoudreTicketMaintenance, resolveStorageUrl } from '../api'
import type { MonTicketMaintenance } from '../types'
import { URGENCE_LABELS, URGENCE_STYLES } from '../utils/urgence'

interface TicketDetailAgentProps {
  ticket: MonTicketMaintenance
  onBack: () => void
  onResolu: () => void
}

export function TicketDetailAgent({ ticket, onBack, onResolu }: TicketDetailAgentProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [coutReparation, setCoutReparation] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolu, setResolu] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ticket.statut === 'a_refaire' && ticket.refus.some((r) => !r.vu)) {
      void marquerTicketMaintenanceRefusVu(ticket.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id])

  const handlePhotoChange = (file: File | undefined | null) => {
    if (!file) return
    setPhoto(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!photo) {
      setError('Prenez une photo de la réparation.')
      return
    }
    if (!coutReparation.trim()) {
      setError('Indiquez le prix de la réparation.')
      return
    }

    setSubmitting(true)
    try {
      await resoudreTicketMaintenance(ticket.id, {
        photoApres: photo,
        coutReparation: Number(coutReparation),
        note: note.trim() ? note : null,
      })
      setResolu(true)
      onResolu()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        ← Retour à mes tickets
      </button>

      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {ticket.appartement?.nom ?? 'Appartement'}
              <span className="ml-2 text-xs font-normal text-gray-400">{ticket.reference}</span>
            </p>
            <p className="text-sm text-gray-500">{ticket.appartement?.adresse}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${URGENCE_STYLES[ticket.urgence]}`}
          >
            Urgence {URGENCE_LABELS[ticket.urgence]}
          </span>
        </div>

        {ticket.statut === 'a_refaire' && ticket.refus.length > 0 && (
          <div data-testid="refus-banner" className="mt-3 space-y-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            <p className="flex items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              Renvoyé par le Manager — à refaire
            </p>
            {ticket.refus[0].motif && <p className="font-normal">{ticket.refus[0].motif}</p>}
            {ticket.refus[0].motif_audio_url && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={resolveStorageUrl(ticket.refus[0].motif_audio_url)} className="w-full" />
            )}
            {ticket.refus[0].motif_photo_url && (
              <img
                src={resolveStorageUrl(ticket.refus[0].motif_photo_url)}
                alt="Photo du motif de refus"
                className="h-32 w-32 rounded-lg object-cover"
              />
            )}
          </div>
        )}

        {ticket.description_manager && (
          <p className="mt-3 text-sm text-gray-700">{ticket.description_manager}</p>
        )}

        {ticket.description_manager_audio_url && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            controls
            src={resolveStorageUrl(ticket.description_manager_audio_url)}
            className="mt-3 w-full"
          />
        )}

        {ticket.photo_url && (
          <img
            src={resolveStorageUrl(ticket.photo_url)}
            alt="Photo du problème signalé"
            className="mt-3 h-32 w-32 rounded-lg object-cover"
          />
        )}
      </div>

      {resolu ? (
        <div
          data-testid="resolution-confirmation"
          className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4"
        >
          <span aria-hidden="true" className="text-3xl">
            ✅
          </span>
          <p className="text-base font-medium text-emerald-800">Envoyé au Manager pour validation</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-gray-900">Marquer comme résolu</h4>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Prendre une photo"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-indigo-200 bg-indigo-50 text-4xl hover:bg-indigo-100"
            >
              📷
            </button>
            <span className="text-xs font-medium text-gray-500">Prendre une photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              capture="environment"
              className="hidden"
              aria-label="Photo de la réparation"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
            {photoPreviewUrl && (
              <img src={photoPreviewUrl} alt="Aperçu de la photo" className="mt-1 h-20 w-20 rounded-lg object-cover" />
            )}
          </div>

          <div>
            <label htmlFor="cout_reparation" className="block text-sm font-medium text-gray-700">
              Prix de la réparation (MAD)
            </label>
            <input
              id="cout_reparation"
              type="number"
              inputMode="decimal"
              value={coutReparation}
              onChange={(e) => setCoutReparation(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="note_resolution" className="block text-sm font-medium text-gray-700">
              Note (optionnel)
            </label>
            <textarea
              id="note_resolution"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <span aria-hidden="true">⚠️</span>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-xl">
              ✓
            </span>
            {submitting ? 'Envoi...' : 'Marquer résolu'}
          </button>
        </div>
      )}
    </div>
  )
}
