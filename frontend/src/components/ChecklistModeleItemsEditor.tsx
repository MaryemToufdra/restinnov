import { useState } from 'react'
import type { ChecklistModele } from '../types'

interface ChecklistModeleItemsEditorProps {
  checklistModele: ChecklistModele
  onAddItem: (checklistModeleId: number, libelle: string) => Promise<void>
  onDeplacerItem: (itemId: number, direction: 'haut' | 'bas') => Promise<void>
  onDeleteItem: (itemId: number) => Promise<void>
}

export function ChecklistModeleItemsEditor({
  checklistModele,
  onAddItem,
  onDeplacerItem,
  onDeleteItem,
}: ChecklistModeleItemsEditorProps) {
  const [libelle, setLibelle] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = checklistModele.items ?? []

  const handleAdd = async () => {
    if (!libelle.trim()) return
    setError(null)
    setAdding(true)
    try {
      await onAddItem(checklistModele.id, libelle.trim())
      setLibelle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500">
        Items de « {checklistModele.nom} » (générés automatiquement sur chaque nouvelle mission)
      </p>

      {items.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-sm shadow-sm"
            >
              <span className="text-gray-700">{item.libelle}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Monter "${item.libelle}"`}
                  disabled={index === 0}
                  onClick={() => onDeplacerItem(item.id, 'haut')}
                  className="rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Descendre "${item.libelle}"`}
                  disabled={index === items.length - 1}
                  onClick={() => onDeplacerItem(item.id, 'bas')}
                  className="rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Retirer "${item.libelle}"`}
                  onClick={() => onDeleteItem(item.id)}
                  className="rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-400">Aucun item pour l'instant.</p>
      )}

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder="ex. Passer l'aspirateur"
          aria-label={`Nouvel item pour ${checklistModele.nom}`}
          className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          + Ajouter
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
