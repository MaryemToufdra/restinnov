import { useState } from 'react'
import type { FraisMaintenance } from '../types'

interface FraisMaintenanceSectionProps {
  sejourId: number
  fraisMaintenance: FraisMaintenance[]
  onAdd: (sejourId: number, input: { description: string; prix: number }) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function FraisMaintenanceSection({
  sejourId,
  fraisMaintenance,
  onAdd,
  onDelete,
}: FraisMaintenanceSectionProps) {
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const total = fraisMaintenance.reduce((sum, f) => sum + (Number(f.prix) || 0), 0)

  const handleAdd = async () => {
    setError(null)
    if (!description.trim() || !prix) {
      setError('La description et le prix sont obligatoires.')
      return
    }

    setSubmitting(true)
    try {
      await onAdd(sejourId, { description, prix: Number(prix) })
      setDescription('')
      setPrix('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mt-3 rounded-md border border-gray-200 p-3">
      <p className="text-sm font-semibold text-gray-700">Frais de maintenance</p>

      {fraisMaintenance.length > 0 && (
        <ul className="mt-2 space-y-1">
          {fraisMaintenance.map((frais) => (
            <li key={frais.id} className="flex items-center justify-between text-sm text-gray-700">
              <span>
                {frais.description} — {Number(frais.prix).toFixed(2)} MAD
              </span>
              <button
                type="button"
                onClick={() => handleDelete(frais.id)}
                disabled={deletingId === frais.id}
                aria-label={`Supprimer ${frais.description}`}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-sm font-medium text-gray-900" data-testid={`total-frais-maintenance-${sejourId}`}>
        Total frais de maintenance : {total.toFixed(2)} MAD
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          aria-label="Description"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          placeholder="Prix"
          aria-label="Prix"
          className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Ajout...' : '+ Ajouter'}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
