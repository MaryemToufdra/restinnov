import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { DashboardData, Sejour } from './types'

const appartement = {
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
    ...overrides,
  }
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
    ...overrides,
  }
}

function mockFetch(handlers: {
  onCreate?: () => Sejour
  onCheckout?: () => { sejour: Sejour; mission_menage: Sejour['mission_menage'] }
  onCreateUtilisateur?: () => unknown
  sejours?: Sejour[]
  agentsMenage?: unknown[]
  dashboard?: DashboardData
}) {
  const sejours = handlers.sejours ?? []
  let agentsMenage = handlers.agentsMenage ?? []
  const dashboard = handlers.dashboard ?? dashboardFixture()

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/appartements') && method === 'GET') {
      return new Response(JSON.stringify([appartement]), { status: 200 })
    }

    if (url.endsWith('/api/checklist-modeles') && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url.includes('/api/utilisateurs') && method === 'GET') {
      return new Response(JSON.stringify(agentsMenage), { status: 200 })
    }

    if (url.endsWith('/api/utilisateurs') && method === 'POST') {
      const created =
        handlers.onCreateUtilisateur?.() ?? { id: 42, nom: 'Fatima Zahra', role: 'menage', telephone: null }
      agentsMenage = [...agentsMenage, created]
      return new Response(JSON.stringify(created), { status: 201 })
    }

    if (url.endsWith('/api/produits-catalogue') && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url.includes('/api/produits-signales') && method === 'GET') {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    if (url.endsWith('/api/dashboard') && method === 'GET') {
      return new Response(JSON.stringify(dashboard), { status: 200 })
    }

    if (url.endsWith('/api/sejours') && method === 'GET') {
      return new Response(JSON.stringify(sejours), { status: 200 })
    }

    if (url.endsWith('/api/sejours') && method === 'POST') {
      const created = handlers.onCreate?.() ?? sejourFixture()
      return new Response(JSON.stringify(created), { status: 201 })
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

function openSection(user: ReturnType<typeof userEvent.setup>, label: string) {
  return user.click(screen.getByRole('button', { name: label }))
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le menu latéral avec toutes les sections, Dashboard actif par défaut', async () => {
    globalThis.fetch = mockFetch({ sejours: [] }) as typeof fetch

    render(<App />)

    for (const label of ['Dashboard', 'Séjours', 'Appartements', 'Agent de ménage', 'Agent de maintenance', 'Catalogue ménage']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }

    expect(await screen.findByTestId('dashboard-revenus-totaux')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 2 })).toBeInTheDocument()
  })

  it('met en évidence la section active dans le menu', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [] }) as typeof fetch

    render(<App />)

    const dashboardButton = screen.getByRole('button', { name: 'Dashboard' })
    expect(dashboardButton.className).toMatch(/bg-indigo-50/)

    await openSection(user, 'Appartements')

    const appartementsButton = screen.getByRole('button', { name: 'Appartements' })
    expect(appartementsButton.className).toMatch(/bg-indigo-50/)
    expect(dashboardButton.className).not.toMatch(/bg-indigo-50/)
  })

  it('affiche la liste des séjours existants sous la section Séjours', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [sejourFixture()] }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    const list = await screen.findByRole('list', { name: /liste des séjours/i })
    const item = within(list).getByRole('listitem')
    expect(within(item).getByText('Jean Dupont')).toBeInTheDocument()
    expect(within(item).getByText('Loft Bastille')).toBeInTheDocument()
    expect(within(item).getByText('À venir')).toBeInTheDocument()
  })

  it('crée un séjour via le formulaire et l’ajoute à la liste', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreate: () => sejourFixture({ id: 2, nom_voyageur: 'Marie Curie' }),
    }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    const select = await screen.findByRole('combobox', { name: /Appartement/i })
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2))

    await user.selectOptions(select, '1')
    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')
    await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-05')
    await user.type(screen.getByLabelText('Nom'), 'Marie Curie')
    await user.click(screen.getByRole('button', { name: /enregistrer le séjour/i }))

    expect(await screen.findByText('Marie Curie')).toBeInTheDocument()
  })

  it('permet de basculer vers la section Appartements', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [] }) as typeof fetch

    render(<App />)
    await openSection(user, 'Appartements')

    expect(screen.getByLabelText(/nom d'appartement/i)).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('masque la liste des séjours quand une autre section que "Séjours" est active', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [sejourFixture()] }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    await screen.findByRole('list', { name: /liste des séjours/i })
    expect(screen.getByRole('heading', { name: 'Séjours', level: 2 })).toBeInTheDocument()

    await openSection(user, 'Appartements')
    expect(screen.queryByRole('heading', { name: 'Séjours', level: 2 })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /liste des séjours/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()

    await openSection(user, 'Agent de ménage')
    expect(screen.queryByRole('heading', { name: 'Séjours', level: 2 })).not.toBeInTheDocument()

    await openSection(user, 'Catalogue ménage')
    expect(screen.queryByRole('heading', { name: 'Séjours', level: 2 })).not.toBeInTheDocument()

    await openSection(user, 'Séjours')
    expect(await screen.findByRole('heading', { name: 'Séjours', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /liste des séjours/i })).toBeInTheDocument()
  })

  it('affiche le catalogue et les produits signalés en attente sous la section "Catalogue ménage"', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({ sejours: [] }) as ReturnType<typeof vi.fn>
    globalThis.fetch = fetchMock as typeof fetch

    render(<App />)
    await openSection(user, 'Catalogue ménage')

    expect(await screen.findByText(/catalogue de produits de ménage/i)).toBeInTheDocument()
    expect(screen.getByText(/produits signalés en attente/i)).toBeInTheDocument()
  })

  it('affiche la section "Frais de ménage" avec le forfait pré-rempli sur un séjour checkouté', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [
        sejourFixture({
          statut: 'termine',
          mission_menage: {
            id: 1,
            sejour_id: 1,
            agent_id: 1,
            statut: 'a_faire',
            agent: { id: 1, nom: 'Fatima Z.', role: 'menage', telephone: null },
            frais_forfait: 80,
            produits: [],
          },
        }),
      ],
    }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    expect(await screen.findByText('Frais de ménage')).toBeInTheDocument()
    expect(screen.getByLabelText(/forfait femme de ménage/i)).toHaveValue(80)
    expect(screen.getByTestId(/total-frais-menage-1/)).toHaveTextContent('80.00 MAD')
  })

  it('n\'affiche ni "Frais de ménage" ni "Frais de maintenance" tant que le checkout n\'est pas confirmé', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [sejourFixture({ statut: 'a_venir', mission_menage: null })],
    }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    await screen.findByRole('list', { name: /liste des séjours/i })
    expect(screen.queryByText('Frais de ménage')).not.toBeInTheDocument()
    expect(screen.queryByText('Frais de maintenance')).not.toBeInTheDocument()
  })

  it('affiche "Frais de maintenance" seulement une fois le checkout confirmé, comme "Frais de ménage"', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [
        sejourFixture({
          statut: 'termine',
          mission_menage: {
            id: 1,
            sejour_id: 1,
            agent_id: 1,
            statut: 'a_faire',
            agent: { id: 1, nom: 'Fatima Z.', role: 'menage', telephone: null },
            frais_forfait: 80,
            produits: [],
          },
        }),
      ],
    }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    expect(await screen.findByText('Frais de maintenance')).toBeInTheDocument()
    expect(screen.getByTestId(/total-frais-maintenance-1/)).toHaveTextContent('0.00 MAD')
  })

  it('un agent créé apparaît immédiatement dans la liste "agent habituel" sans recharger la page', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreateUtilisateur: () => ({ id: 42, nom: 'Fatima Zahra', role: 'menage', telephone: null }),
    }) as typeof fetch

    render(<App />)

    await openSection(user, 'Agent de ménage')
    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    await openSection(user, 'Appartements')

    const select = screen.getByRole('combobox', { name: /agent de ménage habituel/i })
    expect(await within(select).findByRole('option', { name: 'Fatima Zahra' })).toBeInTheDocument()
  })

  it('un appartement coché affiche immédiatement le nouvel agent comme agent habituel dans le formulaire agent', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreateUtilisateur: () => ({ id: 42, nom: 'Fatima Zahra', role: 'menage', telephone: null }),
    }) as typeof fetch

    render(<App />)

    await openSection(user, 'Agent de ménage')
    expect(await screen.findByRole('checkbox', { name: /Loft Bastille/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret123')
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    // switching sections and back re-mounts the form with the current appartements state
    await openSection(user, 'Appartements')
    await openSection(user, 'Agent de ménage')

    expect(await screen.findByText(/actuellement : Fatima Zahra/i)).toBeInTheDocument()
  })

  it('confirme le checkout et affiche la mission de ménage avec l’agent assigné', async () => {
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
    await openSection(user, 'Séjours')

    const button = await screen.findByRole('button', { name: /confirmer le checkout/i })
    await user.click(button)

    const missionBlock = await screen.findByText(/mission de ménage créée/i)
    expect(within(missionBlock.parentElement!).getByText('Fatima Z.')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirmer le checkout/i })).not.toBeInTheDocument()
  })

  it('affiche "non assigné" quand aucun agent n’est disponible', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [sejourFixture()],
      onCheckout: () => ({
        sejour: sejourFixture({ statut: 'termine' }),
        mission_menage: {
          id: 1,
          sejour_id: 1,
          agent_id: null,
          statut: 'a_faire',
          agent: null,
          frais_forfait: 80,
          produits: [],
        },
      }),
    }) as typeof fetch

    render(<App />)
    await openSection(user, 'Séjours')

    const button = await screen.findByRole('button', { name: /confirmer le checkout/i })
    await user.click(button)

    expect(await screen.findByText('non assigné')).toBeInTheDocument()
  })

  it('affiche les agrégats du dashboard dès le chargement (écran d\'accueil)', async () => {
    globalThis.fetch = mockFetch({
      sejours: [],
      dashboard: dashboardFixture(),
    }) as typeof fetch

    render(<App />)

    expect(await screen.findByTestId('dashboard-revenus-totaux')).toHaveTextContent('1800.00 MAD')
    expect(screen.getByTestId('dashboard-frais-menage-totaux')).toHaveTextContent('100.00 MAD')
    expect(screen.getByTestId('dashboard-frais-maintenance-totaux')).toHaveTextContent('350.00 MAD')
    expect(screen.getByTestId('dashboard-resultat-net')).toHaveTextContent('1350.00 MAD')
    expect(screen.getByText('Loft Bastille')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('bascule vers la section Appartements au clic sur une ligne du tableau du dashboard', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({ sejours: [], dashboard: dashboardFixture() }) as typeof fetch

    render(<App />)

    await screen.findByTestId('dashboard-revenus-totaux')
    await user.click(screen.getByText('Loft Bastille'))

    expect(await screen.findByLabelText(/nom d'appartement/i)).toBeInTheDocument()
  })

  it('permet de créer un agent de maintenance avec mot de passe, sans champ appartements assignés', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch({
      sejours: [],
      onCreateUtilisateur: () => ({ id: 7, nom: 'Karim Benali', role: 'maintenance', telephone: null }),
    }) as typeof fetch

    render(<App />)
    await openSection(user, 'Agent de maintenance')

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
})
