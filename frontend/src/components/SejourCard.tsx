import { useState } from 'react'
import type { RefuserInput } from '../api'
import type { ProduitCatalogue, Sejour } from '../types'
import { FraisMaintenanceSection } from './FraisMaintenanceSection'
import { FraisMenageSection } from './FraisMenageSection'
import { MissionValidationDetail } from './MissionValidationDetail'
import { RefuserModal } from './RefuserModal'

const STATUT_LABELS: Record<Sejour['statut'], string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
}

const STATUT_STYLES: Record<Sejour['statut'], string> = {
  a_venir: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-amber-100 text-amber-800',
  termine: 'bg-green-100 text-green-800',
}

interface SejourCardProps {
  sejour: Sejour
  catalogue: ProduitCatalogue[]
  onCheckout: (id: number) => Promise<void>
  onValiderMission: (missionMenageId: number) => Promise<void>
  onRefuserMission: (missionMenageId: number, input: RefuserInput) => Promise<void>
  onUpdateMissionProduits: (missionMenageId: number, input: { frais_forfait: number; produit_ids: number[] }) => Promise<void>
  onSignalerProduit: (missionMenageId: number, input: { photo: File; note?: string | null }) => Promise<void>
  onAddFraisMaintenance: (sejourId: number, input: { description: string; prix: number }) => Promise<void>
  onDeleteFraisMaintenance: (id: number) => Promise<void>
}

export function SejourCard({
  sejour,
  catalogue,
  onCheckout,
  onValiderMission,
  onRefuserMission,
  onUpdateMissionProduits,
  onSignalerProduit,
  onAddFraisMaintenance,
  onDeleteFraisMaintenance,
}: SejourCardProps) {
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validerError, setValiderError] = useState<string | null>(null)
  const [showRefuserModal, setShowRefuserModal] = useState(false)

  const handleCheckout = async () => {
    setError(null)
    setCheckingOut(true)
    try {
      await onCheckout(sejour.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setCheckingOut(false)
    }
  }

  const handleValider = async () => {
    if (!sejour.mission_menage) return
    setValiderError(null)
    setValidating(true)
    try {
      await onValiderMission(sejour.mission_menage.id)
    } catch (err) {
      setValiderError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-400" data-testid="sejour-reference">
            {sejour.reference}
          </p>
          <p className="font-medium text-gray-900">{sejour.nom_voyageur}</p>
          <p className="text-sm text-gray-600">{sejour.appartement?.nom ?? `Appartement #${sejour.appartement_id}`}</p>
          <p className="text-sm text-gray-500">
            {sejour.date_arrivee} → {sejour.date_depart}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUT_STYLES[sejour.statut]}`}>
          {STATUT_LABELS[sejour.statut]}
        </span>
      </div>

      {sejour.mission_menage && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-gray-700">
            Mission de ménage créée
            {!sejour.mission_menage.vue && (
              <span
                data-testid="mission-nouvelle-badge"
                className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white"
              >
                Nouveau
              </span>
            )}
          </p>
          <p className="text-gray-600">
            Agent assigné :{' '}
            <span className="font-medium">
              {sejour.mission_menage.agent?.nom ?? 'non assigné'}
            </span>
          </p>

          {sejour.mission_menage.statut === 'en_attente_validation' && (
            <div className="mt-2">
              <p className="mb-2 font-medium text-purple-700">En attente de validation</p>
              <MissionValidationDetail mission={sejour.mission_menage} />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleValider}
                  disabled={validating}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {validating ? 'Validation...' : 'Valider'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefuserModal(true)}
                  disabled={validating}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
              {validerError && <p className="mt-1 text-sm text-red-600">{validerError}</p>}

              {showRefuserModal && (
                <RefuserModal
                  title={`Refuser la mission — ${sejour.appartement?.nom ?? `Appartement #${sejour.appartement_id}`}`}
                  onCancel={() => setShowRefuserModal(false)}
                  onConfirm={async ({ motif, motifAudio, motifPhoto }) => {
                    await onRefuserMission(sejour.mission_menage!.id, { motif, motifAudio, motifPhoto })
                    setShowRefuserModal(false)
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {sejour.statut !== 'termine' && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkingOut}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {checkingOut ? 'Confirmation...' : 'Confirmer le checkout'}
          </button>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {sejour.statut === 'termine' && sejour.mission_menage && (
        <>
          <FraisMenageSection
            missionMenage={sejour.mission_menage}
            catalogue={catalogue}
            onUpdateProduits={onUpdateMissionProduits}
            onSignalerProduit={onSignalerProduit}
          />
          <FraisMaintenanceSection
            sejourId={sejour.id}
            fraisMaintenance={sejour.frais_maintenance ?? []}
            onAdd={onAddFraisMaintenance}
            onDelete={onDeleteFraisMaintenance}
          />
        </>
      )}
    </li>
  )
}
