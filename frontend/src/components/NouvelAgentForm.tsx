import { useState, type FormEvent } from 'react'
import type { NewUtilisateurInput } from '../api'

interface NouvelAgentFormProps {
  onSubmit: (input: NewUtilisateurInput) => Promise<void>
  onCancel?: () => void
}

export function NouvelAgentForm({ onSubmit, onCancel }: NouvelAgentFormProps) {
  const [nom, setNom] = useState('')
  const [role, setRole] = useState<'menage' | 'maintenance'>('menage')
  const [telephone, setTelephone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setNom('')
    setRole('menage')
    setTelephone('')
    setError(null)
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
        role,
        telephone: telephone.trim() ? telephone : null,
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
      <h2 className="text-lg font-semibold text-gray-900">Nouveau compte agent</h2>

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
        <label htmlFor="agent_role" className="block text-sm font-medium text-gray-700">
          Rôle
        </label>
        <select
          id="agent_role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'menage' | 'maintenance')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="menage">Agent de ménage</option>
          <option value="maintenance">Agent de maintenance</option>
        </select>
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
          {submitting ? 'Enregistrement...' : 'Créer le compte'}
        </button>
      </div>
    </form>
  )
}
