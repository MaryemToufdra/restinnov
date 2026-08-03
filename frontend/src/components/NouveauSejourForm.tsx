import { useState, type FormEvent } from 'react'
import type { NewSejourInput } from '../api'
import type { Appartement, PlateformeOrigine, Voyageur } from '../types'
import { VoyageurFieldset } from './VoyageurFieldset'

interface NouveauSejourFormProps {
  appartements: Appartement[]
  onSubmit: (input: NewSejourInput) => Promise<void>
  onCancel?: () => void
}

const PLATEFORMES: { value: PlateformeOrigine; label: string }[] = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking', label: 'Booking' },
  { value: 'direct', label: 'Direct' },
  { value: 'autre', label: 'Autre' },
]

function computeNombreNuits(dateArrivee: string, dateDepart: string): number | null {
  if (!dateArrivee || !dateDepart) return null
  const start = new Date(dateArrivee)
  const end = new Date(dateDepart)
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return nights > 0 ? nights : null
}

function defaultVoyageurs(): Voyageur[] {
  return [{ nom: '', numero_passeport: '', est_principal: true }]
}

export function NouveauSejourForm({ appartements, onSubmit, onCancel }: NouveauSejourFormProps) {
  const [appartementId, setAppartementId] = useState('')
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [plateformeOrigine, setPlateformeOrigine] = useState<PlateformeOrigine>('airbnb')
  const [montantMad, setMontantMad] = useState('0')
  const [voyageurs, setVoyageurs] = useState<Voyageur[]>(defaultVoyageurs())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setAppartementId('')
    setDateArrivee('')
    setDateDepart('')
    setPlateformeOrigine('airbnb')
    setMontantMad('0')
    setVoyageurs(defaultVoyageurs())
    setError(null)
  }

  const updateVoyageur = (index: number, patch: Partial<Voyageur>) => {
    setVoyageurs((current) => current.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  const setPrincipal = (index: number) => {
    setVoyageurs((current) => current.map((v, i) => ({ ...v, est_principal: i === index })))
  }

  const addVoyageur = () => {
    setVoyageurs((current) => [...current, { nom: '', numero_passeport: '', est_principal: false }])
  }

  const removeVoyageur = (index: number) => {
    setVoyageurs((current) => {
      if (current.length <= 1) return current
      const removed = current[index]
      const next = current.filter((_, i) => i !== index)
      if (removed.est_principal && next.length > 0) {
        next[0] = { ...next[0], est_principal: true }
      }
      return next
    })
  }

  const nombreNuits = computeNombreNuits(dateArrivee, dateDepart)
  const montantParNuit = nombreNuits ? (Number(montantMad) || 0) / nombreNuits : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const id = Number(appartementId)
    if (!id) {
      setError('Veuillez choisir un appartement.')
      return
    }

    if (dateArrivee && dateDepart && dateDepart <= dateArrivee) {
      setError("La date de départ doit être strictement après la date d'arrivée.")
      return
    }

    if (voyageurs.some((v) => !v.nom.trim())) {
      setError('Le nom est obligatoire pour chaque voyageur.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        appartement_id: id,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
        plateforme_origine: plateformeOrigine,
        montant_mad: Number(montantMad) || 0,
        voyageurs: voyageurs.map((v) => ({
          nom: v.nom,
          numero_passeport: v.numero_passeport?.trim() ? v.numero_passeport : null,
          est_principal: v.est_principal,
        })),
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

      {nombreNuits !== null && (
        <p className="text-sm text-gray-600" data-testid="nombre-nuits">
          {nombreNuits} {nombreNuits > 1 ? 'nuits' : 'nuit'}
        </p>
      )}

      <div>
        <span className="block text-sm font-medium text-gray-700">Nombre de voyageurs</span>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => removeVoyageur(voyageurs.length - 1)}
            disabled={voyageurs.length <= 1}
            aria-label="Diminuer le nombre de voyageurs"
            className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-medium" data-testid="nombre-voyageurs">
            {voyageurs.length}
          </span>
          <button
            type="button"
            onClick={addVoyageur}
            aria-label="Augmenter le nombre de voyageurs"
            className="h-8 w-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Plateforme d'origine</span>
        <div className="mt-1 flex gap-2" role="group" aria-label="Plateforme d'origine">
          {PLATEFORMES.map((plateforme) => (
            <button
              key={plateforme.value}
              type="button"
              aria-pressed={plateformeOrigine === plateforme.value}
              onClick={() => setPlateformeOrigine(plateforme.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                plateformeOrigine === plateforme.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {plateforme.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="montant_mad" className="block text-sm font-medium text-gray-700">
          Montant du séjour (MAD)
        </label>
        <input
          id="montant_mad"
          type="number"
          min="0"
          step="0.01"
          value={montantMad}
          onChange={(e) => setMontantMad(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {montantParNuit !== null && (
          <p className="mt-1 text-sm text-gray-600" data-testid="montant-par-nuit">
            Soit {montantParNuit.toFixed(2)} MAD / nuit
          </p>
        )}
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Voyageurs</span>
        <div className="mt-2 space-y-3">
          {voyageurs.map((voyageur, index) => (
            <VoyageurFieldset
              key={index}
              voyageur={voyageur}
              index={index}
              canRemove={voyageurs.length > 1}
              onChange={(patch) => updateVoyageur(index, patch)}
              onSetPrincipal={() => setPrincipal(index)}
              onRemove={() => removeVoyageur(index)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addVoyageur}
          className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          + Ajouter un voyageur
        </button>
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
          {submitting ? 'Enregistrement...' : 'Enregistrer le séjour'}
        </button>
      </div>
    </form>
  )
}
