import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchMissionsAgent, resolveStorageUrl } from '../api'
import type { MissionMenage, ProduitCatalogue } from '../types'
import { MissionDetailAgent } from './MissionDetailAgent'

interface MesMissionsSectionProps {
  catalogue: ProduitCatalogue[]
}

// Only the two statuts that need a clear, distinct callout in this list --
// a_faire/en_cours are the agent's normal current work and need no badge.
const STATUT_BADGES: Partial<Record<MissionMenage['statut'], { label: string; style: string }>> = {
  en_attente_validation: {
    label: 'En attente de validation du Manager',
    style: 'bg-purple-100 text-purple-800',
  },
  non_conforme: {
    label: 'Renvoyé par le Manager — à refaire',
    style: 'bg-red-100 text-red-800',
  },
}

export function MesMissionsSection({ catalogue }: MesMissionsSectionProps) {
  const { user } = useAuth()
  const [missions, setMissions] = useState<MissionMenage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null)

  const chargerMissions = () => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetchMissionsAgent(user.id)
      .then(setMissions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les missions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    chargerMissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!user) return null

  if (selectedMissionId != null) {
    return (
      <MissionDetailAgent
        missionId={selectedMissionId}
        catalogue={catalogue}
        onBack={() => {
          setSelectedMissionId(null)
          chargerMissions()
        }}
        onMissionTerminee={() => {
          // Stays on the detail view: MissionDetailAgent now shows a
          // confirmation message instead of silently disappearing --
          // refresh the underlying list in the background so it's already
          // up to date once the agent clicks "Retour à mes missions".
          chargerMissions()
        }}
      />
    )
  }

  return (
    <div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Mes missions du jour</h3>
        <p className="text-sm text-gray-500">{user.nom}</p>
      </div>

      {loading && <p className="mt-4 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !error && missions.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-5xl"
          >
            ✅
          </div>
          <p className="text-base text-gray-500">Aucune mission pour l'instant.</p>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {missions.map((mission) => {
          const appartement = mission.sejour?.appartement
          const badge = STATUT_BADGES[mission.statut]
          return (
            <li key={mission.id}>
              <button
                type="button"
                onClick={() => setSelectedMissionId(mission.id)}
                className="flex min-h-[96px] w-full items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 hover:shadow-md"
              >
                <div className="relative shrink-0">
                  {appartement?.photo_principale ? (
                    <img
                      data-testid={`appartement-photo-${mission.id}`}
                      src={resolveStorageUrl(appartement.photo_principale)}
                      alt=""
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-20 w-20 items-center justify-center rounded-xl bg-indigo-100 text-4xl"
                    >
                      🏠
                    </div>
                  )}
                  {!mission.vue && (
                    <span
                      data-testid={`mission-nouvelle-badge-${mission.id}`}
                      role="status"
                      aria-label="Nouvelle mission"
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full border-2 border-white bg-orange-500"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-gray-900">{appartement?.nom ?? `Appartement`}</p>
                  <p className="truncate text-sm text-gray-500">{appartement?.adresse}</p>
                  {badge && (
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.style}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
