import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Appartement, DashboardData, PaginatedResponse, Sejour } from './types'

const appartement: Appartement = {
  id: 1,
  nom: 'Loft Bastille',
  adresse: '12 rue de la Roquette',
  statut: 'disponible',
  photo_principale: null,
  checklist_modele_id: null,
  agent_habituel_id: null,
}

function sejourFixture(overrides: Partial<Sejour> = {}): Sejour {
  return {
    id: 1,
    appartement_id: 1,
    date_arrivee: '2026-08-01',
    date_depart: '2026-08-05',
    nom_voyageur: 'Jean Dupont',
    statut: 'a_venir',
    plateforme_origine: 'airbnb',
    montant_mad: 0,
    appartement,
    mission_menage: null,
    voyageurs: [{ nom: 'Jean Dupont', numero_passeport: null, est_principal: true, type: 'adulte' }],
    voyageurs_count: 1,
    ...overrides,
  }
}

function paginate<T>(data: T[]): PaginatedResponse<T> {
  return { data, current_page: 1, last_page: 1, per_page: 10, total: data.length }
}

function dashboardFixture(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    revenus_totaux: 1800,
    frais_menage_totaux: 100,
    frais_maintenance_totaux: 350,
    resultat_net: 1350,
    appartements: [
      { id: 1, nom: 'Loft Bastille', statut: 'disponible', sejours_count: 2, dernier_sejour: '2026-03-05' },
    ],
    sejours_par_statut: { a_venir: 1, en_cours: 0, termine: 2 },
    sejours_recents: [
      { id: 1, nom_voyageur: 'Jean Dupont', date_arrivee: '2026-08-01', statut: 'a_venir', appartement: { id: 1, nom: 'Loft Bastille' } },
    ],
    ...overrides,
  }
}

function mockFetch(handlers: {
  onCreateSejour?: () => Sejour
  onUpdateSejour?: () => Sejour
  onCheckout?: () => { sejour: Sejour; mission_menage: Sejour['mission_menage'] }
  onCreateUtilisateur?: () => unknown
  onUpdateAppartement?: () => Appartement
  sejours?: Sejour[]
  appartements?: Appartement[]
  agentsMenage?: unknown[]
  dashboard?: DashboardData
}) {
  const sejours = handlers.sejours ?? []
  let appartements = handlers.appartements ?? [appartement]
  let agentsMenage = handlers.agentsMenage ?? []
  const dashboard = handlers.dashboard ?? dashboardFixture()

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlObj = new URL(String(input))
    const url = urlObj.pathname
    const method = init?.method ?? 'GET'

    if (url === '/api/appartements' && method === 'GET') {
      if (urlObj.searchParams.has('page') || urlObj.searchParams.has('per_page')) {
        return new Response(JSON.stringify(paginate(appartements)), { status: 200 })
      }
      return new Response(JSON.stringify(appartements), { status: 200 })
    }

    if (url === '/api/appartements' && method === 'POST') {
      const created = { id: 99, nom: 'Nouvel appartement', adresse: 'A', statut: 'disponible' } as Appartement
      appartements = [...appartements, created]
      return new Response(JSON.stringify(created), { status: 201 })
    }

    if (/^\/api\/appartements\/\d+$/.test(url) && (method === 'PATCH' || method === 'POST')) {
      const id = Number(url.split('/').pop())
      const updated =
        handlers.onUpdateAppartement?.() ?? { ...appartement, id, nom: 'Loft Bastille modifié' }
      appartements = appartements.map((a) => (a.id === id ? updated : a))
      return new Response(JSON.stringify(updated), { status: 200 })
    }

    if (url === '/api/checklist-modeles' && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url === '/api/utilisateurs' && method === 'GET') {
      return new Response(JSON.stringify(agentsMenage), { status: 200 })
    }

    if (url === '/api/utilisateurs' && method === 'POST') {
      const created =
        handlers.onCreateUtilisateur?.() ?? { id: 42, nom: 'Fatima Zahra', role: 'menage', telephone: null }
      agentsMenage = [...agentsMenage, created]
      return new Response(JSON.stringify(created), { status: 201 })
    }

    if (url === '/api/produits-catalogue' && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url === '/api/produits-signales' && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url === '/api/dashboard' && method === 'GET') {
      return new Response(JSON.stringify(dashboard), { status: 200 })
    }

    if (url === '/api/sejours' && method === 'GET') {
      return new Response(JSON.stringify(paginate(sejours)), { status: 200 })
    }

    if (url === '/api/sejours' && method === 'POST') {
      const created = handlers.onCreateSejour?.() ?? sejourFixture()
      return new Response(JSON.stringify(created), { status: 201 })
    }

    if (/^\/api\/sejours\/\d+$/.test(url) && method === 'PATCH') {
      const updated = handlers.onUpdateSejour?.() ?? sejourFixture({ date_arrivee: '2026-09-01' })
      return new Response(JSON.stringify(updated), { status: 200 })
    }

    if (/^\/api\/sejours\/\d+$/.test(url) && method === 'GET') {
      const id = Number(url.split('/').pop())
      const found = sejours.find((s) => s.id === id) ?? sejourFixture({ id })
      return new Response(JSON.stringify(found), { status: 200 })
    }

    if (url.includes('/checkout') && method === 'PATCH') {
      const result = handlers.onCheckout?.() ?? {
        sejour: sejourFixture({ statut: 'termine' }),
        mission_menage: null,
      }
      return new Response(JSON.stringify(result), { status: 200 })
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  })
}

function openGroup(user: ReturnType<typeof userEvent.setup>, groupLabel: string) {
  return user.click(screen.getByRole('button', { name: groupLabel }))
}

function openSubItem(user: ReturnType<typeof userEvent.setup>, label: string) {
  return user.click(screen.getByRole('button', { name: label }))
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche Dashboard comme écran par défaut avec les 4 groupes de menu repliés', async () => {
    globalThis.fetch = mockFetch({ sejours: [] }) as typeof fetch

    render(<App />)

    expect(await screen.findByTestId('dashboard-revenus-totaux')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 2 })).toBeInTheDocument()

    for (const label of ['Séjours', 'Appartements', 'Ménage', 'Maintenance']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Créer un séjour' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter un agent ménage' })).not.toBeInTheDocument()
  })

  it('déplie le sous-menu Séjours et navigue vers Liste des séjours par défaut', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [sejourFixture()] }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Séjours')

    expect(screen.getByRole('button', { name: 'Créer un séjour' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Liste des séjours' })).toBeInTheDocument()
    expect(await screen.findByText('Jean Dupont')).toBeInTheDocument()
  })

  it('replie le sous-menu Séjours au second clic sur le groupe', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [] }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Séjours')
    expect(screen.getByRole('button', { name: 'Créer un séjour' })).toBeInTheDocument()

    await openGroup(user, 'Séjours')
    expect(screen.queryByRole('button', { name: 'Créer un séjour' })).not.toBeInTheDocument()
  })

  it('crée un séjour via "Créer un séjour" puis bascule vers la liste', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreateSejour: () => sejourFixture({ id: 2, nom_voyageur: 'Marie Curie' }),
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Séjours')
    await openSubItem(user, 'Créer un séjour')

    const select = await screen.findByRole('combobox', { name: /Appartement/i })
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2))

    await user.selectOptions(select, '1')
    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')
    await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-05')
    await user.type(screen.getByLabelText('Nom'), 'Marie Curie')
    await user.click(screen.getByRole('button', { name: /enregistrer le séjour/i }))

    expect(await screen.findByRole('button', { name: 'Liste des séjours' })).toHaveClass(/bg-indigo-50/)
  })

  it('modifie un séjour à venir via l\'icône crayon, préremplit le formulaire', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [sejourFixture({ statut: 'a_venir' })],
      onUpdateSejour: () => sejourFixture({ date_arrivee: '2026-09-01' }),
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Séjours')

    const editButton = await screen.findByRole('button', { name: /modifier le séjour de jean dupont/i })
    await user.click(editButton)

    expect(await screen.findByRole('heading', { name: 'Modifier le séjour' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Date d'arrivée/i)).toHaveValue('2026-08-01')
    expect(screen.getByRole('button', { name: /enregistrer les modifications/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sejours/1'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })

  it('désactive l\'icône crayon pour un séjour déjà terminé', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [sejourFixture({ statut: 'termine' })],
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Séjours')

    const editButton = await screen.findByRole('button', { name: /modifier le séjour de jean dupont/i })
    expect(editButton).toBeDisabled()
  })

  it('déplie le sous-menu Appartements et crée un appartement', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [], appartements: [] }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Appartements')

    expect(screen.getByRole('button', { name: 'Créer un appartement' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Liste des appartements' })).toBeInTheDocument()

    await openSubItem(user, 'Créer un appartement')
    expect(screen.getByLabelText(/nom d'appartement/i)).toBeInTheDocument()
  })

  it('affiche la liste des appartements avec compteur, puis modifie un appartement via le crayon', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      appartements: [appartement],
      onUpdateAppartement: () => ({ ...appartement, nom: 'Loft Bastille rénové' }),
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Appartements')
    await openSubItem(user, 'Liste des appartements')

    expect(await screen.findByText('1 appartements trouvés')).toBeInTheDocument()
    expect(screen.getByText('Loft Bastille')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /modifier l'appartement loft bastille/i }))

    expect(await screen.findByRole('heading', { name: "Modifier l'appartement" })).toBeInTheDocument()
    expect(screen.getByLabelText(/nom d'appartement/i)).toHaveValue('Loft Bastille')

    await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/appartements/1'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('bascule vers "Liste des appartements" au clic sur une ligne du tableau du dashboard', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [], appartements: [appartement], dashboard: dashboardFixture() }) as typeof fetch

    render(<App />)

    await screen.findByTestId('dashboard-revenus-totaux')
    await user.click(screen.getByText('Loft Bastille'))

    expect(await screen.findByText(/appartements trouvés/i)).toBeInTheDocument()
  })

  it('affiche directement le détail d\'un séjour au clic sur une ligne de "Séjours récents"', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [], dashboard: dashboardFixture() }) as typeof fetch

    render(<App />)

    await screen.findByTestId('dashboard-revenus-totaux')
    await user.click(screen.getByRole('button', { name: /jean dupont/i }))

    expect(await screen.findByText(/confirmer le checkout/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Liste des séjours' })).toHaveClass(/bg-indigo-50/)
  })

  it('bascule vers la liste des séjours filtrée au clic sur une mini-carte de statut du dashboard', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [
        sejourFixture({ id: 1, statut: 'a_venir', nom_voyageur: 'Jean Dupont' }),
        sejourFixture({ id: 2, statut: 'termine', nom_voyageur: 'Marie Curie' }),
      ],
      dashboard: dashboardFixture(),
    }) as typeof fetch

    render(<App />)

    await screen.findByTestId('dashboard-revenus-totaux')
    await user.click(screen.getByRole('button', { name: /1\s*à venir/i }))

    expect(await screen.findByRole('button', { name: 'Liste des séjours' })).toHaveClass(/bg-indigo-50/)
    expect(screen.getByLabelText(/^statut$/i)).toHaveValue('a_venir')
  })

  it('regroupe "Ajouter un agent ménage" et "Catalogue ménage" sous le groupe Ménage', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [] }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Ménage')

    expect(screen.getByRole('button', { name: 'Ajouter un agent ménage' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Catalogue ménage' })).toBeInTheDocument()

    await openSubItem(user, 'Ajouter un agent ménage')
    expect(screen.getByRole('heading', { name: 'Nouvel agent de ménage' })).toBeInTheDocument()

    await openSubItem(user, 'Catalogue ménage')
    expect(await screen.findByText(/catalogue de produits de ménage/i)).toBeInTheDocument()
    expect(screen.getByText(/produits signalés en attente/i)).toBeInTheDocument()
  })

  it('regroupe "Ajouter un agent maintenance" sous le groupe Maintenance', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreateUtilisateur: () => ({ id: 7, nom: 'Karim Benali', role: 'maintenance', telephone: null }),
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Maintenance')
    await openSubItem(user, 'Ajouter un agent maintenance')

    expect(screen.getByRole('heading', { name: 'Nouvel agent de maintenance' })).toBeInTheDocument()
    expect(screen.queryByText(/appartements assignés/i)).not.toBeInTheDocument()

    const passwordInput = screen.getByLabelText(/mot de passe/i)
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.type(screen.getByLabelText('Nom'), 'Karim Benali')
    await user.type(passwordInput, 'motdepasse123')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/utilisateurs'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"role":"maintenance"'),
        }),
      ),
    )
  })

  it('crée un agent de ménage avec mot de passe en clair', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreateUtilisateur: () => ({ id: 42, nom: 'Fatima Zahra', role: 'menage', telephone: null }),
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Ménage')
    await openSubItem(user, 'Ajouter un agent ménage')

    const passwordInput = screen.getByLabelText(/mot de passe/i)
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.type(passwordInput, 'secret123')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/utilisateurs'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('confirme le checkout depuis le détail d\'un séjour et affiche la mission de ménage', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [sejourFixture()],
      onCheckout: () => ({
        sejour: sejourFixture({ statut: 'termine' }),
        mission_menage: {
          id: 1,
          sejour_id: 1,
          agent_id: 5,
          statut: 'a_faire',
          agent: { id: 5, nom: 'Fatima Z.', role: 'menage', telephone: null },
          frais_forfait: 80,
          produits: [],
        },
      }),
    }) as typeof fetch

    render(<App />)
    await openGroup(user, 'Séjours')

    const viewButton = await screen.findByRole('button', { name: /voir le détail du séjour de jean dupont/i })
    await user.click(viewButton)

    const checkoutButton = await screen.findByRole('button', { name: /confirmer le checkout/i })
    await user.click(checkoutButton)

    const missionBlock = await screen.findByText(/mission de ménage créée/i)
    expect(within(missionBlock.parentElement!).getByText('Fatima Z.')).toBeInTheDocument()
  })
})
