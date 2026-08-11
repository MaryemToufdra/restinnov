import { useEffect, useState } from 'react'
import { deleteUtilisateur, desactiverUtilisateur, fetchUtilisateurs, reactiverUtilisateur } from '../api'
import type { Agent } from '../types'

interface AgentsMenageListeSectionProps {
  onEditAgent: (agent: Agent) => void
  onAgentsChanged: () => void
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487a2.06 2.06 0 112.914 2.914L7.5 19.677l-4 1 1-4L16.862 4.487z"
      />
    </svg>
  )
}

function StatutBadge({ actif }: { actif: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {actif ? 'Actif' : 'Inactif'}
    </span>
  )
}

export function AgentsMenageListeSection({ onEditAgent, onAgentsChanged }: AgentsMenageListeSectionProps) {
  const [search, setSearch] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [busyAgentId, setBusyAgentId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchUtilisateurs({ role: 'menage', search: search || undefined, inclure_inactifs: true })
      .then((data) => {
        if (!cancelled) setAgents(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les agents.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // desactiver()/reactiver() return the bare utilisateur, without the
  // appartements_habituel_count/mission_menages_count aggregates that only
  // the index() listing computes -- merge in just the changed `actif` field
  // rather than replacing the row, or those counts would be wiped from the
  // table (and silently flip a "Désactiver" agent back to "Supprimer").
  const handleDesactiver = async (agent: Agent) => {
    setActionError(null)
    setBusyAgentId(agent.id)
    try {
      const updated = await desactiverUtilisateur(agent.id)
      setAgents((current) => current.map((a) => (a.id === agent.id ? { ...a, actif: updated.actif } : a)))
      onAgentsChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setBusyAgentId(null)
    }
  }

  const handleReactiver = async (agent: Agent) => {
    setActionError(null)
    setBusyAgentId(agent.id)
    try {
      const updated = await reactiverUtilisateur(agent.id)
      setAgents((current) => current.map((a) => (a.id === agent.id ? { ...a, actif: updated.actif } : a)))
      onAgentsChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setBusyAgentId(null)
    }
  }

  const handleDelete = async (agent: Agent) => {
    setActionError(null)
    setBusyAgentId(agent.id)
    try {
      await deleteUtilisateur(agent.id)
      setAgents((current) => current.filter((a) => a.id !== agent.id))
      setConfirmingDeleteId(null)
      onAgentsChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setBusyAgentId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Agents de ménage</h3>
        <p className="text-sm text-gray-500">{agents.length} agents trouvés</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label htmlFor="agents_search" className="block text-xs font-medium text-gray-500">
          Recherche
        </label>
        <input
          id="agents_search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom de l'agent"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {!loading && !error && agents.length === 0 && <p className="text-sm text-gray-500">Aucun agent trouvé.</p>}

      {!loading && !error && agents.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Adresse</th>
                <th className="px-4 py-2">Nb appartements</th>
                <th className="px-4 py-2">Nb missions</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => {
                const hasHistory = (agent.appartements_habituel_count ?? 0) > 0 || (agent.mission_menages_count ?? 0) > 0
                const busy = busyAgentId === agent.id

                return (
                  <tr key={agent.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{agent.nom}</td>
                    <td className="px-4 py-3 text-gray-700">{agent.telephone ?? 'Aucun'}</td>
                    <td className="px-4 py-3 text-gray-700">{agent.adresse ?? 'Aucune'}</td>
                    <td className="px-4 py-3 text-gray-700">{agent.appartements_habituel_count ?? 0}</td>
                    <td className="px-4 py-3 text-gray-700">{agent.mission_menages_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <StatutBadge actif={agent.actif ?? true} />
                    </td>
                    <td className="px-4 py-3">
                      {confirmingDeleteId === agent.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Supprimer définitivement ?</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(agent)}
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Oui, supprimer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={`Modifier l'agent ${agent.nom}`}
                            onClick={() => onEditAgent(agent)}
                            className="text-gray-500 hover:text-indigo-600"
                          >
                            <PencilIcon />
                          </button>
                          {hasHistory ? (
                            agent.actif ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDesactiver(agent)}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Désactiver
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleReactiver(agent)}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Réactiver
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(agent.id)}
                              className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
