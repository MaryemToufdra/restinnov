import { useEffect, useRef, useState } from 'react'
import {
  assignerTicketMaintenance,
  fetchTicketsMaintenance,
  fetchTicketsMaintenanceParAppartement,
  fetchUtilisateurs,
  refuserResolutionTicketMaintenance,
  resolveStorageUrl,
  validerResolutionTicketMaintenance,
  type RefuserInput,
} from '../api'
import type { Agent, Appartement, TicketMaintenance, TicketMaintenanceParAppartement, TicketMaintenanceStatut } from '../types'
import { STATUT_VALIDATION_STYLES } from '../utils/statutValidation'
import { URGENCE_LABELS, URGENCE_STYLES } from '../utils/urgence'
import { RefuserModal } from './RefuserModal'

type Vue = 'liste' | 'groupe'

type ExpressionMode = 'texte' | 'audio'

type RecordingState = 'idle' | 'recording' | 'recorded'

interface AssignerValues {
  agentId: number
  descriptionManager: string
  descriptionManagerAudio: File | null
  photoTransferee: boolean
}

const STATUT_LABELS: Record<TicketMaintenanceStatut, string> = {
  ouvert: 'Ouvert',
  assigne: 'Assigné',
  resolu_en_attente_validation: 'Résolu — en attente de validation',
  a_refaire: 'À refaire',
  resolu: 'Résolu',
}

const STATUT_STYLES: Record<TicketMaintenanceStatut, string> = {
  ouvert: 'bg-amber-100 text-amber-800',
  assigne: 'bg-indigo-100 text-indigo-800',
  resolu_en_attente_validation: STATUT_VALIDATION_STYLES.en_attente,
  a_refaire: STATUT_VALIDATION_STYLES.refuse,
  resolu: STATUT_VALIDATION_STYLES.valide,
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function AssignerForm({
  ticket,
  agents,
  onAssigner,
}: {
  ticket: TicketMaintenance
  agents: Agent[]
  onAssigner: (ticketId: number, values: AssignerValues) => Promise<void>
}) {
  const [agentId, setAgentId] = useState('')
  const [expressionMode, setExpressionMode] = useState<ExpressionMode>('texte')
  const [descriptionManager, setDescriptionManager] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [photoTransferee, setPhotoTransferee] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const micSupported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  const hasExpression = descriptionManager.trim() !== '' || audioFile !== null

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const file = new File([blob], 'instruction-manager.webm', { type: blob.type })
        setAudioFile(file)
        setAudioPreviewUrl(URL.createObjectURL(file))
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecordingState('recording')
    } catch {
      setError("Impossible d'accéder au micro.")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecordingState('recorded')
  }

  const resetAudio = () => {
    setAudioFile(null)
    setAudioPreviewUrl(null)
    setRecordingState('idle')
  }

  const handleAssigner = async () => {
    setError(null)
    if (!agentId) {
      setError('Choisissez un agent de maintenance.')
      return
    }
    if (!hasExpression) {
      setError('Écrivez une description ou enregistrez un message audio pour l\'agent.')
      return
    }

    setSubmitting(true)
    try {
      await onAssigner(ticket.id, {
        agentId: Number(agentId),
        descriptionManager,
        descriptionManagerAudio: audioFile,
        photoTransferee,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mt-3">
        <p className="block text-xs font-medium text-gray-600">Message pour l'agent de maintenance</p>
        <div className="mt-1 flex gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={expressionMode === 'texte'}
            onClick={() => setExpressionMode('texte')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              expressionMode === 'texte' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Écrire
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={expressionMode === 'audio'}
            onClick={() => setExpressionMode('audio')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              expressionMode === 'audio' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Enregistrer un audio
          </button>
        </div>

        {expressionMode === 'texte' ? (
          <textarea
            id={`ticket_description_manager_${ticket.id}`}
            aria-label="Instruction écrite pour l'agent"
            value={descriptionManager}
            onChange={(e) => setDescriptionManager(e.target.value)}
            rows={2}
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        ) : (
          <div className="mt-2">
            {!micSupported ? (
              <p className="text-xs text-gray-400">Enregistrement audio non disponible.</p>
            ) : recordingState === 'idle' ? (
              <button
                type="button"
                onClick={startRecording}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                🎤 Démarrer l'enregistrement
              </button>
            ) : recordingState === 'recording' ? (
              <button
                type="button"
                onClick={stopRecording}
                data-testid={`recording-indicator-${ticket.id}`}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                ⏹ Arrêter l'enregistrement
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {audioPreviewUrl && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={audioPreviewUrl} className="h-8" />
                )}
                <button
                  type="button"
                  onClick={resetAudio}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Recommencer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {ticket.photo_url && (
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={photoTransferee}
            onChange={(e) => setPhotoTransferee(e.target.checked)}
          />
          Transférer la photo du signalement à l'agent de maintenance
        </label>
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
          disabled={submitting || !hasExpression}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Assignation...' : 'Assigner'}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </>
  )
}

function RefusHistorique({ ticket }: { ticket: TicketMaintenance }) {
  if (!ticket.refus || ticket.refus.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium text-gray-600">Historique des refus</p>
      <ul className="mt-1 space-y-2">
        {ticket.refus.map((refus) => (
          <li key={refus.id} className="space-y-1 rounded-md bg-red-50 p-2 text-sm text-red-700">
            <p className="text-xs text-red-500">
              {formatDate(refus.created_at)}
              {refus.manager?.nom && ` · ${refus.manager.nom}`}
            </p>
            {refus.motif && <p>{refus.motif}</p>}
            {refus.motif_audio_url && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={resolveStorageUrl(refus.motif_audio_url)} className="w-full" />
            )}
            {refus.motif_photo_url && (
              <img
                src={resolveStorageUrl(refus.motif_photo_url)}
                alt="Photo du motif de refus"
                className="h-24 w-24 rounded object-cover"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ValiderRefuserActions({
  ticket,
  onValider,
  onRefuser,
}: {
  ticket: TicketMaintenance
  onValider: (ticketId: number) => Promise<void>
  onRefuser: (ticketId: number, input: RefuserInput) => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRefuserModal, setShowRefuserModal] = useState(false)

  const handleValider = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await onValider(ticket.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {ticket.photo_apres && (
        <img
          src={resolveStorageUrl(ticket.photo_apres)}
          alt="Photo après réparation"
          className="h-32 w-32 rounded-md object-cover"
        />
      )}
      {ticket.cout_reparation != null && (
        <p className="text-sm font-medium text-gray-900">Coût : {ticket.cout_reparation} MAD</p>
      )}
      {ticket.note_resolution && <p className="text-sm text-gray-700">{ticket.note_resolution}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleValider}
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Validation...' : 'Valider'}
        </button>
        <button
          type="button"
          onClick={() => setShowRefuserModal(true)}
          disabled={submitting}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Refuser
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showRefuserModal && (
        <RefuserModal
          title={`Refuser la résolution — ${ticket.appartement?.nom ?? `Appartement #${ticket.appartement_id}`}`}
          onCancel={() => setShowRefuserModal(false)}
          onConfirm={async ({ motif, motifAudio, motifPhoto }) => {
            await onRefuser(ticket.id, { motif, motifAudio, motifPhoto })
            setShowRefuserModal(false)
          }}
        />
      )}
    </div>
  )
}

function TicketMaintenanceCard({
  ticket,
  agents,
  onAssigner,
  onValider,
  onRefuser,
}: {
  ticket: TicketMaintenance
  agents: Agent[]
  onAssigner: (ticketId: number, values: AssignerValues) => Promise<void>
  onValider: (ticketId: number) => Promise<void>
  onRefuser: (ticketId: number, input: RefuserInput) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="rounded-md border border-gray-200">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-start justify-between gap-2 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-gray-900">
            <span className="truncate">{ticket.appartement?.nom ?? `Appartement #${ticket.appartement_id}`}</span>
            <span className="shrink-0 text-xs font-normal text-gray-400">{ticket.reference}</span>
          </p>
          <p className="truncate text-sm text-gray-700">{ticket.description || 'Aucune description.'}</p>
          <p className="text-xs text-gray-400">{formatDate(ticket.created_at)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCE_STYLES[ticket.urgence]}`}>
            Urgence {URGENCE_LABELS[ticket.urgence]}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLES[ticket.statut]}`}>
            {STATUT_LABELS[ticket.statut]}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 p-4 pt-3">
          {ticket.mission_origine?.sejour && (
            <p className="text-xs text-gray-400">
              Signalé pendant le séjour de {ticket.mission_origine.sejour.nom_voyageur} (
              {ticket.mission_origine.sejour.reference})
              {ticket.mission_origine.agent?.nom && ` · par ${ticket.mission_origine.agent.nom}`}
            </p>
          )}

          {ticket.photo_url && (
            <img
              src={resolveStorageUrl(ticket.photo_url)}
              alt="Photo du problème signalé"
              className="h-32 w-32 rounded-md object-cover"
            />
          )}

          {ticket.audio_url && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={resolveStorageUrl(ticket.audio_url)} className="w-full" />
          )}

          {ticket.statut === 'ouvert' && <AssignerForm ticket={ticket} agents={agents} onAssigner={onAssigner} />}

          {ticket.statut === 'resolu_en_attente_validation' && (
            <ValiderRefuserActions ticket={ticket} onValider={onValider} onRefuser={onRefuser} />
          )}

          {(ticket.statut === 'assigne' || ticket.statut === 'a_refaire' || ticket.statut === 'resolu') && (
            <div className="space-y-3">
              {ticket.description_manager && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Message pour l'agent : </span>
                  {ticket.description_manager}
                </p>
              )}
              {ticket.agent && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Agent assigné : </span>
                  {ticket.agent.nom}
                </p>
              )}
              {ticket.statut === 'resolu' && ticket.photo_apres && (
                <div>
                  <p className="text-xs font-medium text-gray-600">Photo après réparation</p>
                  <img
                    src={resolveStorageUrl(ticket.photo_apres)}
                    alt="Photo après réparation"
                    className="mt-1 h-32 w-32 rounded-md object-cover"
                  />
                </div>
              )}
              {ticket.statut === 'resolu' && ticket.cout_reparation != null && (
                <p className="text-sm font-medium text-gray-900">Coût : {ticket.cout_reparation} MAD</p>
              )}
              <RefusHistorique ticket={ticket} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function AppartementGroupeCard({
  groupe,
  agents,
  onAssigner,
  onValider,
  onRefuser,
}: {
  groupe: TicketMaintenanceParAppartement
  agents: Agent[]
  onAssigner: (ticketId: number, values: AssignerValues) => Promise<void>
  onValider: (ticketId: number) => Promise<void>
  onRefuser: (ticketId: number, input: RefuserInput) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="rounded-md border border-gray-200">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-start justify-between gap-2 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-gray-900">
            <span className="truncate">{groupe.appartement?.nom ?? 'Appartement inconnu'}</span>
            {groupe.recurrent && (
              <span
                data-testid={`recurrent-badge-${groupe.appartement?.id}`}
                className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
              >
                Récurrent
              </span>
            )}
          </p>
          <p className="truncate text-sm text-gray-500">{groupe.appartement?.adresse}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {groupe.tickets_count} ticket{groupe.tickets_count > 1 ? 's' : ''}
          </span>
          <span className="text-sm font-bold text-gray-900" data-testid={`cout-cumule-${groupe.appartement?.id}`}>
            {groupe.cout_cumule.toFixed(2)} MAD
          </span>
        </div>
      </button>

      {expanded && (
        <ul className="space-y-2 border-t border-gray-100 p-4 pt-3">
          {groupe.tickets.map((ticket) => (
            <TicketMaintenanceCard
              key={ticket.id}
              ticket={ticket}
              agents={agents}
              onAssigner={onAssigner}
              onValider={onValider}
              onRefuser={onRefuser}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export interface TicketsMaintenanceSectionProps {
  appartements: Appartement[]
  initialStatutFilter?: TicketMaintenanceStatut | ''
}

/**
 * The single "Tickets de maintenance" screen -- combines what used to be
 * three separate, overlapping Manager views (the actionable list, the
 * résolutions-à-valider queue, and the read-only historique) into one
 * filterable list where each ticket's expanded detail shows exactly the
 * one action relevant to its current statut (assigner / valider-refuser /
 * nothing to do yet).
 */
export function TicketsMaintenanceSection({ appartements, initialStatutFilter }: TicketsMaintenanceSectionProps) {
  const [vue, setVue] = useState<Vue>('liste')
  const [tickets, setTickets] = useState<TicketMaintenance[]>([])
  const [groupes, setGroupes] = useState<TicketMaintenanceParAppartement[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statutFilter, setStatutFilter] = useState<TicketMaintenanceStatut | ''>(initialStatutFilter ?? '')
  const [appartementFilter, setAppartementFilter] = useState('')
  const [urgenceFilter, setUrgenceFilter] = useState<TicketMaintenance['urgence'] | ''>('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    const filtres = {
      statut: statutFilter || undefined,
      appartementId: appartementFilter ? Number(appartementFilter) : undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      search: search || undefined,
    }
    Promise.all([
      vue === 'liste' ? fetchTicketsMaintenance(filtres) : fetchTicketsMaintenanceParAppartement(filtres),
      fetchUtilisateurs({ role: 'maintenance' }),
    ])
      .then(([data, agentsData]) => {
        if (vue === 'liste') {
          setTickets(data as TicketMaintenance[])
        } else {
          setGroupes(data as TicketMaintenanceParAppartement[])
        }
        setAgents(agentsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les tickets.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vue, statutFilter, appartementFilter, dateDebut, dateFin, search])

  useEffect(() => {
    if (initialStatutFilter) setStatutFilter(initialStatutFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatutFilter])

  const handleAssigner = async (ticketId: number, values: AssignerValues) => {
    await assignerTicketMaintenance(ticketId, {
      agentId: values.agentId,
      descriptionManager: values.descriptionManager.trim() ? values.descriptionManager : null,
      descriptionManagerAudio: values.descriptionManagerAudio,
      photoTransferee: values.photoTransferee,
    })
    load()
  }

  const handleValider = async (ticketId: number) => {
    await validerResolutionTicketMaintenance(ticketId)
    load()
  }

  const handleRefuser = async (ticketId: number, input: RefuserInput) => {
    await refuserResolutionTicketMaintenance(ticketId, input)
    load()
  }

  const visibleTickets = urgenceFilter ? tickets.filter((ticket) => ticket.urgence === urgenceFilter) : tickets

  // The urgence filter is client-side only (same as the flat list above),
  // so a grouped appartement's ticket_count/cout_cumule are recomputed from
  // its filtered tickets rather than the backend-reported (urgence-blind)
  // totals -- an appartement with no ticket left at that urgence disappears
  // entirely instead of showing an empty, misleadingly non-zero group.
  const visibleGroupes = groupes
    .map((groupe) => {
      const filteredTickets = urgenceFilter
        ? groupe.tickets.filter((ticket) => ticket.urgence === urgenceFilter)
        : groupe.tickets
      return {
        ...groupe,
        tickets: filteredTickets,
        tickets_count: filteredTickets.length,
        cout_cumule: filteredTickets.reduce((total, ticket) => total + (Number(ticket.cout_reparation) || 0), 0),
      }
    })
    .filter((groupe) => groupe.tickets.length > 0)

  const totalVisible = vue === 'liste' ? visibleTickets.length : visibleGroupes.reduce((total, g) => total + g.tickets_count, 0)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        Tickets de maintenance
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {totalVisible}
        </span>
      </h2>

      <div className="mt-3 flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Mode d'affichage de l'historique">
        <button
          type="button"
          role="tab"
          aria-selected={vue === 'liste'}
          onClick={() => setVue('liste')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            vue === 'liste' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vue chronologique
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vue === 'groupe'}
          onClick={() => setVue('groupe')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            vue === 'groupe' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Groupé par appartement
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label htmlFor="tickets_statut" className="block text-xs font-medium text-gray-500">
            Statut
          </label>
          <select
            id="tickets_statut"
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as TicketMaintenanceStatut | '')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="ouvert">Ouvert</option>
            <option value="assigne">Assigné</option>
            <option value="resolu_en_attente_validation">Résolu — en attente de validation</option>
            <option value="a_refaire">À refaire</option>
            <option value="resolu">Résolu</option>
          </select>
        </div>
        <div>
          <label htmlFor="tickets_urgence" className="block text-xs font-medium text-gray-500">
            Urgence
          </label>
          <select
            id="tickets_urgence"
            value={urgenceFilter}
            onChange={(e) => setUrgenceFilter(e.target.value as TicketMaintenance['urgence'] | '')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Toutes</option>
            <option value="haute">Haute</option>
            <option value="normale">Normale</option>
            <option value="basse">Basse</option>
          </select>
        </div>
        <div>
          <label htmlFor="tickets_appartement" className="block text-xs font-medium text-gray-500">
            Appartement
          </label>
          <select
            id="tickets_appartement"
            value={appartementFilter}
            onChange={(e) => setAppartementFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {appartements.map((appartement) => (
              <option key={appartement.id} value={appartement.id}>
                {appartement.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tickets_date_debut" className="block text-xs font-medium text-gray-500">
            Du
          </label>
          <input
            id="tickets_date_debut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="tickets_date_fin" className="block text-xs font-medium text-gray-500">
            Au
          </label>
          <input
            id="tickets_date_fin"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="tickets_recherche" className="block text-xs font-medium text-gray-500">
            Recherche
          </label>
          <input
            id="tickets_recherche"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Référence, appartement..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <p className="mt-2 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && vue === 'liste' && visibleTickets.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Aucun ticket de maintenance.</p>
      )}

      {!loading && !error && vue === 'liste' && visibleTickets.length > 0 && (
        <ul className="mt-3 space-y-3">
          {visibleTickets.map((ticket) => (
            <TicketMaintenanceCard
              key={ticket.id}
              ticket={ticket}
              agents={agents}
              onAssigner={handleAssigner}
              onValider={handleValider}
              onRefuser={handleRefuser}
            />
          ))}
        </ul>
      )}

      {!loading && !error && vue === 'groupe' && visibleGroupes.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Aucun ticket de maintenance.</p>
      )}

      {!loading && !error && vue === 'groupe' && visibleGroupes.length > 0 && (
        <ul className="mt-3 space-y-3">
          {visibleGroupes.map((groupe) => (
            <AppartementGroupeCard
              key={groupe.appartement?.id ?? 'inconnu'}
              groupe={groupe}
              agents={agents}
              onAssigner={handleAssigner}
              onValider={handleValider}
              onRefuser={handleRefuser}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
