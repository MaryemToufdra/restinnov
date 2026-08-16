import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { fetchMesTicketsMaintenance } from './api'
import { HistoriqueTicketsAgentSection } from './components/HistoriqueTicketsAgentSection'
import { MesTicketsSection } from './components/MesTicketsSection'
import { usePwaIdentity } from './pwa/usePwaIdentity'
import type { MonTicketMaintenance } from './types'

type Onglet = 'mes-tickets' | 'en-attente' | 'refuses' | 'valides'

const ONGLETS: { id: Onglet; label: string; icon: string }[] = [
  { id: 'mes-tickets', label: 'Mes tickets', icon: '🔧' },
  { id: 'en-attente', label: 'En attente', icon: '⏳' },
  { id: 'refuses', label: 'Refusés', icon: '⚠️' },
  { id: 'valides', label: 'Validés', icon: '🗂️' },
]

export function MaintenanceWorkspace() {
  usePwaIdentity('maintenance')
  const { user, logout } = useAuth()
  const [onglet, setOnglet] = useState<Onglet>('mes-tickets')
  const [tickets, setTickets] = useState<MonTicketMaintenance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chargerTickets = () => {
    setLoading(true)
    setError(null)
    fetchMesTicketsMaintenance()
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les tickets.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    chargerTickets()
  }, [])

  const actifs = tickets.filter((t) => t.statut === 'assigne')
  const enAttente = tickets.filter((t) => t.statut === 'resolu_en_attente_validation')
  const refuses = tickets.filter((t) => t.statut === 'a_refaire')
  const refusesNonVus = refuses.some((t) => t.refus.some((r) => !r.vu))

  const counts: Partial<Record<Onglet, number>> = {
    'mes-tickets': actifs.length,
    'en-attente': enAttente.length,
    refuses: refuses.length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RestInnov" className="h-8 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Maintenance</h1>
            {user && <p className="text-xs text-gray-500">{user.nom}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout()
          }}
          className="flex min-h-14 items-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          <span aria-hidden="true" className="text-xl">
            🚪
          </span>
          Déconnexion
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={`relative flex min-h-12 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-sm font-semibold ${
              onglet === o.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span aria-hidden="true" className="text-lg">
              {o.icon}
            </span>
            {o.label}
            {counts[o.id] !== undefined && <span className="text-xs font-normal">({counts[o.id]})</span>}
            {o.id === 'refuses' && refusesNonVus && (
              <span
                data-testid="refuses-dot"
                role="status"
                aria-label="Nouveau refus"
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-500"
              />
            )}
          </button>
        ))}
      </nav>

      <main className="px-4 py-6">
        {onglet === 'mes-tickets' && (
          <MesTicketsSection
            tickets={actifs}
            loading={loading}
            error={error}
            heading="Mes tickets"
            emptyIcon="✅"
            emptyMessage="Aucun ticket pour l'instant."
            onRefresh={chargerTickets}
          />
        )}
        {onglet === 'en-attente' && (
          <MesTicketsSection
            tickets={enAttente}
            loading={loading}
            error={error}
            emptyIcon="⏳"
            emptyMessage="Aucun ticket en attente de validation."
            onRefresh={chargerTickets}
          />
        )}
        {onglet === 'refuses' && (
          <MesTicketsSection
            tickets={refuses}
            loading={loading}
            error={error}
            emptyIcon="🎉"
            emptyMessage="Aucun ticket refusé."
            onRefresh={chargerTickets}
          />
        )}
        {onglet === 'valides' && <HistoriqueTicketsAgentSection />}
      </main>
    </div>
  )
}
