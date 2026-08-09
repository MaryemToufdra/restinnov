import { useState } from 'react'
import type { Agent } from '../types'

interface AgentSelectorProps {
  agentsMenage: Agent[]
  onSelect: (agentId: number) => void
}

export function AgentSelector({ agentsMenage, onSelect }: AgentSelectorProps) {
  const [selectedId, setSelectedId] = useState('')

  return (
    <div className="max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Se connecter en tant que</h3>
      <p className="mt-1 text-sm text-gray-500">Choisissez votre nom pour voir vos missions du jour.</p>

      <label htmlFor="agent_menage_select" className="sr-only">
        Agent de ménage
      </label>
      <select
        id="agent_menage_select"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="mt-4 block w-full rounded-md border border-gray-300 px-3 py-3 text-base"
      >
        <option value="">Choisissez votre nom</option>
        {agentsMenage.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.nom}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => onSelect(Number(selectedId))}
        className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Continuer
      </button>
    </div>
  )
}
