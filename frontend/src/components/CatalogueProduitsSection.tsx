import { useRef, useState } from 'react'
import { resolveStorageUrl } from '../api'
import type { ProduitCatalogue } from '../types'

interface CatalogueProduitsSectionProps {
  catalogue: ProduitCatalogue[]
  onCreate: (input: { nom: string; prix: number; photo?: File | null }) => Promise<void>
}

export function CatalogueProduitsSection({ catalogue, onCreate }: CatalogueProduitsSectionProps) {
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('0')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    setError(null)
    if (!nom.trim()) {
      setError('Le nom est obligatoire.')
      return
    }

    setSubmitting(true)
    try {
      await onCreate({ nom, prix: Number(prix) || 0, photo })
      setNom('')
      setPrix('0')
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Catalogue de produits de ménage</h2>

      <ul className="mt-3 space-y-1">
        {catalogue.map((produit) => (
          <li key={produit.id} className="flex items-center justify-between text-sm text-gray-700">
            <span className="flex items-center gap-2">
              {produit.photo_url && (
                <img
                  src={resolveStorageUrl(produit.photo_url)}
                  alt={`Photo de "${produit.nom}"`}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              {produit.nom} — {Number(produit.prix).toFixed(2)} MAD
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                produit.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {produit.actif ? 'Actif' : 'Inactif'}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="nouveau_produit_nom" className="block text-sm font-medium text-gray-700">
            Nom du produit
          </label>
          <input
            id="nouveau_produit_nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-28">
          <label htmlFor="nouveau_produit_prix" className="block text-sm font-medium text-gray-700">
            Prix (MAD)
          </label>
          <input
            id="nouveau_produit_prix"
            type="number"
            min="0"
            step="0.01"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="nouveau_produit_photo" className="block text-sm font-medium text-gray-700">
            Photo (optionnel)
          </label>
          <input
            ref={fileInputRef}
            id="nouveau_produit_photo"
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="mt-1 block text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Ajout...' : '+ Ajouter'}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
