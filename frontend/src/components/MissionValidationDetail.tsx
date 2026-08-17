import { useState } from 'react'
import { resolveStorageUrl } from '../api'
import type { MissionMenage } from '../types'
import { ProduitSignaleCard } from './ProduitsSignalesSection'

const PRODUIT_STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
}

const PRODUIT_STATUT_STYLES: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-800',
  valide: 'bg-green-100 text-green-800',
  rejete: 'bg-red-100 text-red-800',
}

interface MissionValidationDetailProps {
  mission: MissionMenage
  onValiderProduitSignale?: (id: number, input: { nom: string; prix: number }) => Promise<void>
  onRejeterProduitSignale?: (id: number) => Promise<void>
}

/**
 * The Manager-facing detail behind "Valider": the full checklist (coché or
 * not, with its proof photo when the agent attached one), every photo the
 * agent attached as work proof, and every product the agent signaled during
 * the mission -- so validating is an informed decision, not a blind click.
 * Products still "en_attente" can be validated (nom+prix) or rejected right
 * here, without leaving this screen for the separate catalogue tab.
 */
export function MissionValidationDetail({
  mission,
  onValiderProduitSignale,
  onRejeterProduitSignale,
}: MissionValidationDetailProps) {
  const [expanded, setExpanded] = useState(false)
  const checklistItems = mission.checklist_items ?? []
  const produitsSignales = mission.produits_signales ?? []
  const photosPreuve = mission.photos_preuve ?? []

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        {expanded ? 'Masquer le détail' : 'Voir le détail'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-4 rounded-md border border-gray-200 bg-white p-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Checklist</p>
            {checklistItems.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">Aucun item de checklist.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {checklistItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <span
                      aria-label={item.coche ? 'Coché' : 'Non coché'}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.coche ? 'bg-emerald-600 text-white' : 'border border-gray-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={item.coche ? 'text-gray-700' : 'text-gray-500'}>{item.libelle}</span>
                    {item.photo_url && (
                      <img
                        src={resolveStorageUrl(item.photo_url)}
                        alt={`Photo de "${item.libelle}"`}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {photosPreuve.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photos de preuve du travail</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {photosPreuve.map((photo) => (
                  <li key={photo.id}>
                    <img
                      src={resolveStorageUrl(photo.photo_url)}
                      alt="Photo de preuve du travail"
                      className="h-16 w-16 rounded object-cover"
                    />
                    {photo.note && <p className="mt-1 max-w-[4rem] truncate text-xs text-gray-600">{photo.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Produits signalés</p>
            {produitsSignales.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">Aucun produit signalé.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {produitsSignales.map((produit) =>
                  produit.statut === 'en_attente' && onValiderProduitSignale && onRejeterProduitSignale ? (
                    <ProduitSignaleCard
                      key={produit.id}
                      produitSignale={produit}
                      onValider={onValiderProduitSignale}
                      onRejeter={onRejeterProduitSignale}
                    />
                  ) : (
                    <li key={produit.id} className="flex items-center gap-3 text-sm">
                      <img
                        src={resolveStorageUrl(produit.photo_url)}
                        alt="Photo du produit signalé"
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0">
                        {produit.note && <p className="truncate text-gray-700">{produit.note}</p>}
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            PRODUIT_STATUT_STYLES[produit.statut] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {PRODUIT_STATUT_LABELS[produit.statut] ?? produit.statut}
                        </span>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
