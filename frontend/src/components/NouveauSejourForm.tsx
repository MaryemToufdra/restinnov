import { useState, type FormEvent } from 'react'
import type { Appartement } from '../types'

interface NouveauSejourFormProps {
  appartements: Appartement[]
  onSubmit: (input: {
    appartement_id: number
    date_arrivee: string
    date_depart: string
    nom_voyageur: string
  }) => Promise<void>
}

export function NouveauSejourForm({ appartements, onSubmit }: NouveauSejourFormProps) {
  const [appartementId, setAppartementId] = useState('')
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [nomVoyageur, setNomVoyageur] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const id = Number(appartementId)
    if (!id) {
      setError('Veuillez choisir un appartement.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        appartement_id: id,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
        nom_voyageur: nomVoyageur,
      })
      setAppartementId('')
      setDateArrivee('')
      setDateDepart('')
      setNomVoyageur('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Nouveau séjour</h2>

      <div>
        <label htmlFor="appartement_id" className="block text-sm font-medium text-gray-700">
          Appartement
        </label>
        {appartements.length > 0 ? (
          <select
            id="appartement_id"
            value={appartementId}
            onChange={(e) => setAppartementId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un appartement</option>
            {appartements.map((appartement) => (
              <option key={appartement.id} value={appartement.id}>
                {appartement.nom}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="appartement_id"
            type="number"
            min="1"
            value={appartementId}
            onChange={(e) => setAppartementId(e.target.value)}
            placeholder="ID de l'appartement"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date_arrivee" className="block text-sm font-medium text-gray-700">
            Date d'arrivée
          </label>
          <input
            id="date_arrivee"
            type="date"
            required
            value={dateArrivee}
            onChange={(e) => setDateArrivee(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="date_depart" className="block text-sm font-medium text-gray-700">
            Date de départ
          </label>
          <input
            id="date_depart"
            type="date"
            required
            value={dateDepart}
            onChange={(e) => setDateDepart(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="nom_voyageur" className="block text-sm font-medium text-gray-700">
          Nom du voyageur
        </label>
        <input
          id="nom_voyageur"
          type="text"
          required
          value={nomVoyageur}
          onChange={(e) => setNomVoyageur(e.target.value)}
          placeholder="Jean Dupont"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? 'Création...' : 'Créer le séjour'}
      </button>
    </form>
  )
}
