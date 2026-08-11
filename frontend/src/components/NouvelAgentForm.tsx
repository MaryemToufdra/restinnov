import { useEffect, useState, type FormEvent } from 'react'
import type { NewUtilisateurInput } from '../api'
import type { Agent, Appartement } from '../types'

interface NouvelAgentFormProps {
  appartements: Appartement[]
  onSubmit: (input: NewUtilisateurInput) => Promise<void>
  onCancel?: () => void
  agentToEdit?: Agent | null
}

export function NouvelAgentForm({ appartements, onSubmit, onCancel, agentToEdit }: NouvelAgentFormProps) {
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [password, setPassword] = useState('')
  const [appartementIds, setAppartementIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setNom('')
    setTelephone('')
    setAdresse('')
    setPassword('')
    setAppartementIds([])
    setError(null)
  }

  useEffect(() => {
    if (agentToEdit) {
      setNom(agentToEdit.nom)
      setTelephone(agentToEdit.telephone ?? '')
      setAdresse(agentToEdit.adresse ?? '')
      setPassword('')
      setAppartementIds([])
      setError(null)
    } else {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentToEdit])

  const toggleAppartement = (id: number) => {
    setAppartementIds((current) =>
      current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        nom,
        role: 'menage',
        telephone: telephone.trim() ? telephone : null,
        adresse: adresse.trim() ? adresse : null,
        password: password.trim() ? password : null,
        appartement_ids: appartementIds,
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
        {agentToEdit ? "Modifier l'agent de ménage" : 'Nouvel agent de ménage'}
      </h2>

      <div>
        <label htmlFor="agent_nom" className="block text-sm font-medium text-gray-700">
          Nom
        </label>
        <input
          id="agent_nom"
          type="text"
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Fatima Zahra"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="agent_telephone" className="block text-sm font-medium text-gray-700">
          Téléphone
        </label>
        <input
          id="agent_telephone"
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Optionnel"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="agent_adresse" className="block text-sm font-medium text-gray-700">
          Adresse
        </label>
        <input
          id="agent_adresse"
          type="text"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Optionnel"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="agent_password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="agent_password"
          type="text"
          required={!agentToEdit}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={agentToEdit ? 'Laisser vide pour ne pas changer' : undefined}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          {agentToEdit
            ? "Laissez ce champ vide pour conserver le mot de passe actuel de l'agent"
            : 'Vous pourrez communiquer ce mot de passe à l\'agent'}
        </p>
      </div>

      {!agentToEdit && (
        <div>
          <span className="block text-sm font-medium text-gray-700">Appartements assignés</span>
          {appartements.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">Aucun appartement disponible pour le moment.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {appartements.map((appartement) => (
                <label key={appartement.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={appartementIds.includes(appartement.id)}
                    onChange={() => toggleAppartement(appartement.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {appartement.nom}
                  {appartement.agent_habituel && (
                    <span className="text-xs text-gray-500">
                      (actuellement : {appartement.agent_habituel.nom})
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

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
          {submitting ? 'Enregistrement...' : agentToEdit ? 'Enregistrer les modifications' : 'Créer le compte'}
        </button>
      </div>
    </form>
  )
}
