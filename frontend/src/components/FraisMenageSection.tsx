import { useEffect, useState } from 'react'
import { resolveStorageUrl } from '../api'
import type { MissionMenage, ProduitCatalogue } from '../types'

interface FraisMenageSectionProps {
  missionMenage: MissionMenage
  catalogue: ProduitCatalogue[]
  onUpdateProduits: (missionMenageId: number, input: { frais_forfait: number; produit_ids: number[] }) => Promise<void>
  onSignalerProduit: (missionMenageId: number, input: { photo: File; note?: string | null }) => Promise<void>
}

export function FraisMenageSection({
  missionMenage,
  catalogue,
  onUpdateProduits,
  onSignalerProduit,
}: FraisMenageSectionProps) {
  const [forfait, setForfait] = useState(String(missionMenage.frais_forfait))
  const [checkedIds, setCheckedIds] = useState<number[]>(
    (missionMenage.produits ?? []).map((p) => p.id),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showSignalerForm, setShowSignalerForm] = useState(false)
  const [signalerPhoto, setSignalerPhoto] = useState<File | null>(null)
  const [signalerNote, setSignalerNote] = useState('')
  const [signalerSubmitting, setSignalerSubmitting] = useState(false)
  const [signalerError, setSignalerError] = useState<string | null>(null)
  const [signalerSuccess, setSignalerSuccess] = useState(false)

  const catalogueActif = catalogue.filter((p) => p.actif)

  // Keep up with products attached from elsewhere (e.g. a Manager validating a
  // signaled product auto-attaches it to this mission) without discarding any
  // unsaved local selection.
  const missionProduitIds = (missionMenage.produits ?? []).map((p) => p.id).join(',')
  useEffect(() => {
    const ids = missionMenage.produits ?? []
    if (ids.length === 0) return
    setCheckedIds((current) => Array.from(new Set([...current, ...ids.map((p) => p.id)])))
  }, [missionProduitIds])

  const toggleProduit = (id: number) => {
    setCheckedIds((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]))
  }

  const totalFraisMenage =
    (Number(forfait) || 0) +
    catalogueActif
      .filter((p) => checkedIds.includes(p.id))
      .reduce((sum, p) => sum + (Number(p.prix) || 0), 0)

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      await onUpdateProduits(missionMenage.id, {
        frais_forfait: Number(forfait) || 0,
        produit_ids: checkedIds,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignaler = async () => {
    setSignalerError(null)
    if (!signalerPhoto) {
      setSignalerError('Une photo est obligatoire.')
      return
    }

    setSignalerSubmitting(true)
    try {
      await onSignalerProduit(missionMenage.id, {
        photo: signalerPhoto,
        note: signalerNote.trim() ? signalerNote : null,
      })
      setSignalerPhoto(null)
      setSignalerNote('')
      setShowSignalerForm(false)
      setSignalerSuccess(true)
    } catch (err) {
      setSignalerError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSignalerSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-md border border-gray-200 p-3">
      <p className="text-sm font-semibold text-gray-700">Frais de ménage</p>

      <div className="mt-2">
        <label htmlFor={`forfait_${missionMenage.id}`} className="block text-sm font-medium text-gray-700">
          Forfait femme de ménage
        </label>
        <input
          id={`forfait_${missionMenage.id}`}
          type="number"
          min="0"
          step="0.01"
          value={forfait}
          onChange={(e) => setForfait(e.target.value)}
          className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {catalogueActif.length > 0 && (
        <div className="mt-3 space-y-1">
          {catalogueActif.map((produit) => (
            <label key={produit.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={checkedIds.includes(produit.id)}
                onChange={() => toggleProduit(produit.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {produit.photo_url && (
                <img
                  src={resolveStorageUrl(produit.photo_url)}
                  alt={`Photo de "${produit.nom}"`}
                  className="h-6 w-6 rounded object-cover"
                />
              )}
              {produit.nom}
              <span className="text-gray-500">({Number(produit.prix).toFixed(2)} MAD)</span>
            </label>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm font-medium text-gray-900" data-testid={`total-frais-menage-${missionMenage.id}`}>
        Total frais de ménage : {totalFraisMenage.toFixed(2)} MAD
      </p>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les frais de ménage'}
      </button>

      <div className="mt-3 border-t border-gray-100 pt-3">
        {!showSignalerForm ? (
          <button
            type="button"
            onClick={() => {
              setShowSignalerForm(true)
              setSignalerSuccess(false)
            }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Signaler un nouveau produit
          </button>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor={`signaler_photo_${missionMenage.id}`}
              className="block text-sm font-medium text-gray-700"
            >
              Photo du produit
            </label>
            <input
              id={`signaler_photo_${missionMenage.id}`}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setSignalerPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <label htmlFor={`signaler_note_${missionMenage.id}`} className="block text-sm font-medium text-gray-700">
              Note (optionnel)
            </label>
            <input
              id={`signaler_note_${missionMenage.id}`}
              type="text"
              value={signalerNote}
              onChange={(e) => setSignalerNote(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {signalerError && <p className="text-sm text-red-600">{signalerError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSignalerForm(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSignaler}
                disabled={signalerSubmitting}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {signalerSubmitting ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}
        {signalerSuccess && (
          <p className="mt-2 text-sm text-emerald-600">Produit signalé, en attente de validation par le Manager.</p>
        )}
      </div>
    </div>
  )
}
