import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import type { NewAppartementInput } from '../api'
import type { Agent, Appartement, ChecklistModele } from '../types'

interface NouvelAppartementFormProps {
  checklistModeles: ChecklistModele[]
  agentsMenage: Agent[]
  onSubmit: (input: NewAppartementInput) => Promise<void>
  onCreateChecklistModele: (nom: string) => Promise<ChecklistModele>
  onCancel?: () => void
  appartementToEdit?: Appartement | null
}

const STATUT_LABELS: Record<string, string> = {
  disponible: 'Disponible',
}

export function NouvelAppartementForm({
  checklistModeles,
  agentsMenage,
  onSubmit,
  onCreateChecklistModele,
  onCancel,
  appartementToEdit,
}: NouvelAppartementFormProps) {
  const [nom, setNom] = useState('')
  const [adresse, setAdresse] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [checklistModeleId, setChecklistModeleId] = useState('')
  const [agentHabituelId, setAgentHabituelId] = useState('')
  const [showNewChecklistInput, setShowNewChecklistInput] = useState(false)
  const [newChecklistNom, setNewChecklistNom] = useState('')
  const [creatingChecklist, setCreatingChecklist] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setNom('')
    setAdresse('')
    setPhoto(null)
    setChecklistModeleId('')
    setAgentHabituelId('')
    setShowNewChecklistInput(false)
    setNewChecklistNom('')
    setError(null)
  }

  useEffect(() => {
    if (appartementToEdit) {
      setNom(appartementToEdit.nom)
      setAdresse(appartementToEdit.adresse)
      setPhoto(null)
      setChecklistModeleId(appartementToEdit.checklist_modele_id ? String(appartementToEdit.checklist_modele_id) : '')
      setAgentHabituelId(appartementToEdit.agent_habituel_id ? String(appartementToEdit.agent_habituel_id) : '')
      setError(null)
    } else {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appartementToEdit])

  const acceptFile = (file: File | undefined | null) => {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Seuls les fichiers JPG ou PNG sont acceptés.')
      return
    }
    setError(null)
    setPhoto(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    acceptFile(event.dataTransfer.files[0])
  }

  const handleCreateChecklistModele = async () => {
    if (!newChecklistNom.trim()) return
    setCreatingChecklist(true)
    try {
      const created = await onCreateChecklistModele(newChecklistNom.trim())
      setChecklistModeleId(String(created.id))
      setShowNewChecklistInput(false)
      setNewChecklistNom('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer ce modèle.')
    } finally {
      setCreatingChecklist(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!nom.trim() || !adresse.trim()) {
      setError('Le nom et l’adresse sont obligatoires.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        nom,
        adresse,
        photo,
        checklist_modele_id: checklistModeleId ? Number(checklistModeleId) : null,
        agent_habituel_id: agentHabituelId ? Number(agentHabituelId) : null,
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        {appartementToEdit ? "Modifier l'appartement" : 'Nouvel appartement'}
      </h2>

      <div>
        <label htmlFor="appartement_nom" className="block text-sm font-medium text-gray-700">
          Nom d'appartement
        </label>
        <input
          id="appartement_nom"
          type="text"
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="ex. Zenith 3ème étage"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="appartement_adresse" className="block text-sm font-medium text-gray-700">
          Adresse complète
        </label>
        <input
          id="appartement_adresse"
          type="text"
          required
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Photo principale</span>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-center text-sm ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 text-gray-500'
          }`}
        >
          {photo ? (
            <p className="font-medium text-gray-700">{photo.name}</p>
          ) : (
            <p>Glissez-déposez une image ici, ou cliquez pour choisir un fichier (JPG, PNG)</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            aria-label="Photo principale"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div>
        <label htmlFor="checklist_modele_id" className="block text-sm font-medium text-gray-700">
          Checklist de ménage
        </label>
        <select
          id="checklist_modele_id"
          value={checklistModeleId}
          onChange={(e) => setChecklistModeleId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Aucune checklist</option>
          {checklistModeles.map((modele) => (
            <option key={modele.id} value={modele.id}>
              {modele.nom}
            </option>
          ))}
        </select>

        {showNewChecklistInput ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newChecklistNom}
              onChange={(e) => setNewChecklistNom(e.target.value)}
              placeholder="Nom du nouveau modèle"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateChecklistModele}
              disabled={creatingChecklist}
              className="shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewChecklistInput(true)}
            className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Créer un nouveau modèle
          </button>
        )}
      </div>

      <div>
        <label htmlFor="agent_habituel_id" className="block text-sm font-medium text-gray-700">
          Agent de ménage habituel (optionnel)
        </label>
        <select
          id="agent_habituel_id"
          value={agentHabituelId}
          onChange={(e) => setAgentHabituelId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Aucun agent habituel</option>
          {agentsMenage.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.nom}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Statut</span>
        <div className="mt-1">
          <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            {STATUT_LABELS[appartementToEdit?.statut ?? 'disponible'] ?? appartementToEdit?.statut}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Ce champ est géré automatiquement et ne peut pas être modifié manuellement.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            resetForm()
            onCancel?.()
          }}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting
            ? 'Enregistrement...'
            : appartementToEdit
              ? 'Enregistrer les modifications'
              : "Enregistrer l'appartement"}
        </button>
      </div>
    </form>
  )
}
