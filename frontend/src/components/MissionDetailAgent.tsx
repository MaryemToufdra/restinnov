import { useEffect, useRef, useState } from 'react'
import {
  ouvrirMissionMenage,
  signalerProbleme,
  signalerProduit,
  terminerMissionMenage,
  toggleChecklistItem,
  updateMissionMenageProduits,
  type SignalerProblemeInput,
  type SignalerProduitInput,
  type UpdateMissionMenageProduitsInput,
} from '../api'
import type { ChecklistItem, MissionMenage, ProduitCatalogue } from '../types'
import { FraisMenageSection } from './FraisMenageSection'
import { SignalerProblemeSection } from './SignalerProblemeSection'

interface MissionDetailAgentProps {
  missionId: number
  catalogue: ProduitCatalogue[]
  onBack: () => void
  onMissionTerminee: () => void
}

function ChecklistItemRow({
  item,
  onToggle,
  onPhoto,
}: {
  item: ChecklistItem
  onToggle: (item: ChecklistItem) => void
  onPhoto: (item: ChecklistItem, file: File) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.coche}
        aria-label={item.libelle}
        onClick={() => onToggle(item)}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 text-lg font-bold ${
          item.coche
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-gray-300 bg-white text-transparent hover:border-indigo-400'
        }`}
      >
        ✓
      </button>

      <span className={`flex-1 text-base ${item.coche ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {item.libelle}
      </span>

      <button
        type="button"
        aria-label={`Ajouter une photo pour "${item.libelle}"`}
        onClick={() => fileInputRef.current?.click()}
        className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium ${
          item.photo_url
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
        }`}
      >
        📷
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        aria-label={`Photo pour "${item.libelle}"`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPhoto(item, file)
        }}
      />
    </li>
  )
}

export function MissionDetailAgent({ missionId, catalogue, onBack, onMissionTerminee }: MissionDetailAgentProps) {
  const [mission, setMission] = useState<MissionMenage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [terminating, setTerminating] = useState(false)
  const [terminerError, setTerminerError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ouvrirMissionMenage(missionId)
      .then((data) => {
        if (!cancelled) setMission(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la mission.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [missionId])

  const checklistItems = mission?.checklist_items ?? []
  const toutesCochees = checklistItems.every((item) => item.coche)

  const handleToggle = async (item: ChecklistItem) => {
    const updated = await toggleChecklistItem(item.id, { coche: !item.coche })
    setMission((current) =>
      current
        ? { ...current, checklist_items: (current.checklist_items ?? []).map((i) => (i.id === updated.id ? updated : i)) }
        : current,
    )
  }

  const handlePhoto = async (item: ChecklistItem, file: File) => {
    const updated = await toggleChecklistItem(item.id, { photo: file })
    setMission((current) =>
      current
        ? { ...current, checklist_items: (current.checklist_items ?? []).map((i) => (i.id === updated.id ? updated : i)) }
        : current,
    )
  }

  const handleUpdateMissionProduits = async (missionMenageId: number, input: UpdateMissionMenageProduitsInput) => {
    const updated = await updateMissionMenageProduits(missionMenageId, input)
    setMission((current) => (current ? { ...current, ...updated } : current))
  }

  const handleSignalerProduit = async (missionMenageId: number, input: SignalerProduitInput) => {
    await signalerProduit(missionMenageId, input)
  }

  const handleSignalerProbleme = async (missionMenageId: number, input: SignalerProblemeInput) => {
    await signalerProbleme(missionMenageId, input)
  }

  const handleTerminer = async () => {
    setTerminerError(null)
    setTerminating(true)
    try {
      const updated = await terminerMissionMenage(missionId)
      setMission(updated)
      onMissionTerminee()
    } catch (err) {
      setTerminerError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setTerminating(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
        ← Retour à mes missions
      </button>

      {loading && <p className="mt-4 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {mission && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{mission.sejour?.appartement?.nom ?? 'Appartement'}</h3>
            <p className="text-sm text-gray-500">{mission.sejour?.appartement?.adresse}</p>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-900">Checklist</h4>
            {checklistItems.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">Aucun item de checklist pour cet appartement.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {checklistItems.map((item) => (
                  <ChecklistItemRow key={item.id} item={item} onToggle={handleToggle} onPhoto={handlePhoto} />
                ))}
              </ul>
            )}
          </div>

          <FraisMenageSection
            missionMenage={mission}
            catalogue={catalogue}
            onUpdateProduits={handleUpdateMissionProduits}
            onSignalerProduit={handleSignalerProduit}
          />

          <SignalerProblemeSection missionMenageId={mission.id} onSignaler={handleSignalerProbleme} />

          {terminerError && <p className="text-sm text-red-600">{terminerError}</p>}

          {mission.statut === 'en_attente_validation' ? (
            <p className="w-full rounded-md bg-emerald-50 px-4 py-4 text-center text-base font-semibold text-emerald-700">
              ✓ Envoyé au Manager pour validation
            </p>
          ) : (
            <button
              type="button"
              disabled={!toutesCochees || terminating}
              onClick={handleTerminer}
              title={!toutesCochees ? 'Cochez tous les items de la checklist pour terminer la mission.' : undefined}
              className="w-full rounded-md bg-emerald-600 px-4 py-4 text-lg font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {terminating ? 'Enregistrement...' : '✓ Marquer terminé'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
