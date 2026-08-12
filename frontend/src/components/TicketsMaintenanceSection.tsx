import { useEffect, useState } from 'react'
import { assignerTicketMaintenance, fetchTicketsMaintenance, fetchUtilisateurs, resolveStorageUrl } from '../api'
import type { Agent, TicketMaintenance } from '../types'

const URGENCE_LABELS: Record<TicketMaintenance['urgence'], string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

const URGENCE_STYLES: Record<TicketMaintenance['urgence'], string> = {
  basse: 'bg-gray-100 text-gray-600',
  normale: 'bg-blue-100 text-blue-800',
  haute: 'bg-red-100 text-red-800',
}

function TicketMaintenanceCard({
  ticket,
  agents,
  onAssigner,
}: {
  ticket: TicketMaintenance
  agents: Agent[]
  onAssigner: (ticketId: number, agentId: number) => Promise<void>
}) {
  const [agentId, setAgentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAssigner = async () => {
    setError(null)
    if (!agentId) {
      setError('Choisissez un agent de maintenance.')
      return
    }

    setSubmitting(true)
    try {
      await onAssigner(ticket.id, Number(agentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li className="rounded-md border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">
            {ticket.appartement?.nom ?? `Appartement #${ticket.appartement_id}`}
          </p>
          <p className="text-sm text-gray-500">{ticket.appartement?.adresse}</p>
          {ticket.mission_origine?.sejour && (
            <p className="text-xs text-gray-400">
              Signalé pendant le séjour de {ticket.mission_origine.sejour.nom_voyageur} (
              {ticket.mission_origine.sejour.reference})
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${URGENCE_STYLES[ticket.urgence]}`}>
          Urgence {URGENCE_LABELS[ticket.urgence]}
        </span>
      </div>

      {ticket.description && <p className="mt-2 text-sm text-gray-700">{ticket.description}</p>}

      {ticket.photo_url && (
        <img
          src={resolveStorageUrl(ticket.photo_url)}
          alt="Photo du problème signalé"
          className="mt-2 h-32 w-32 rounded-md object-cover"
        />
      )}

      {ticket.audio_url && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={resolveStorageUrl(ticket.audio_url)} className="mt-2 w-full" />
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`ticket_agent_${ticket.id}`} className="block text-xs font-medium text-gray-600">
            Agent de maintenance
          </label>
          <select
            id={`ticket_agent_${ticket.id}`}
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.nom}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAssigner}
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Assignation...' : 'Assigner'}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </li>
  )
}

export function TicketsMaintenanceSection() {
  const [tickets, setTickets] = useState<TicketMaintenance[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchTicketsMaintenance('ouvert'), fetchUtilisateurs({ role: 'maintenance' })])
      .then(([ticketsData, agentsData]) => {
        setTickets(ticketsData)
        setAgents(agentsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les tickets.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAssigner = async (ticketId: number, agentId: number) => {
    await assignerTicketMaintenance(ticketId, agentId)
    // Assigning removes it from the "ouverts" list this screen shows --
    // the maintenance agent's own workspace (built separately) is where
    // it lives on from here.
    setTickets((current) => current.filter((t) => t.id !== ticketId))
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        Tickets de maintenance ouverts
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {tickets.length}
        </span>
      </h2>

      {loading && <p className="mt-2 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && tickets.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Aucun ticket de maintenance ouvert.</p>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className="mt-3 space-y-3">
          {tickets.map((ticket) => (
            <TicketMaintenanceCard key={ticket.id} ticket={ticket} agents={agents} onAssigner={handleAssigner} />
          ))}
        </ul>
      )}
    </div>
  )
}
