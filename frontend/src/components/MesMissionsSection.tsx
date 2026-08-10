import { useEffect, useState } from 'react'
import { fetchMissionsAgent } from '../api'
import type { Agent, MissionMenage, ProduitCatalogue } from '../types'
import { AgentSelector } from './AgentSelector'
import { MissionDetailAgent } from './MissionDetailAgent'

interface MesMissionsSectionProps {
  agentsMenage: Agent[]
  catalogue: ProduitCatalogue[]
  selectedAgentId: number | null
  onSelectAgent: (agentId: number) => void
  onChangerAgent: () => void
}

export function MesMissionsSection({
  agentsMenage,
  catalogue,
  selectedAgentId,
  onSelectAgent,
  onChangerAgent,
}: MesMissionsSectionProps) {
  const [missions, setMissions] = useState<MissionMenage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null)

  const agent = agentsMenage.find((a) => a.id === selectedAgentId) ?? null

  const chargerMissions = (agentId: number) => {
    setLoading(true)
    setError(null)
    fetchMissionsAgent(agentId)
      .then(setMissions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les missions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (selectedAgentId == null) return
    chargerMissions(selectedAgentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId])

  if (selectedAgentId == null || !agent) {
    return <AgentSelector agentsMenage={agentsMenage} onSelect={onSelectAgent} />
  }

  if (selectedMissionId != null) {
    return (
      <MissionDetailAgent
        missionId={selectedMissionId}
        catalogue={catalogue}
        onBack={() => {
          setSelectedMissionId(null)
          chargerMissions(selectedAgentId)
        }}
        onMissionTerminee={() => {
          setSelectedMissionId(null)
          chargerMissions(selectedAgentId)
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Mes missions du jour</h3>
          <p className="text-sm text-gray-500">{agent.nom}</p>
        </div>
        <button
          type="button"
          onClick={onChangerAgent}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Changer d'agent
        </button>
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
