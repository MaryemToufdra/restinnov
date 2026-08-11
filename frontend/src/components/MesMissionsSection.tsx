import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchMissionsAgent } from '../api'
import type { MissionMenage, ProduitCatalogue } from '../types'
import { MissionDetailAgent } from './MissionDetailAgent'

interface MesMissionsSectionProps {
  catalogue: ProduitCatalogue[]
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
        <p className="mt-4 text-sm text-gray-500">Aucune mission pour l'instant.</p>
      )}

      <ul className="mt-4 space-y-3">
        {missions.map((mission) => (
          <li key={mission.id}>
            <button
              type="button"
              onClick={() => setSelectedMissionId(mission.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300 hover:shadow-md"
            >
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {mission.sejour?.appartement?.nom ?? `Appartement`}
                </p>
                <p className="text-sm text-gray-500">{mission.sejour?.appartement?.adresse}</p>
              </div>
              {!mission.vue && (
                <span
                  data-testid={`mission-nouvelle-badge-${mission.id}`}
                  className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  Nouveau
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
