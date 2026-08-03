import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Sejour } from './types'

const appartement = { id: 1, nom: 'Loft Bastille', adresse: '12 rue de la Roquette', statut: 'disponible' }

function sejourFixture(overrides: Partial<Sejour> = {}): Sejour {
  return {
    id: 1,
    appartement_id: 1,
    date_arrivee: '2026-08-01',
    date_depart: '2026-08-05',
    nom_voyageur: 'Jean Dupont',
    statut: 'a_venir',
    appartement,
    mission_menage: null,
    ...overrides,
  }
}

function mockFetch(handlers: {
  onCreate?: () => Sejour
  onCheckout?: () => { sejour: Sejour; mission_menage: Sejour['mission_menage'] }
  sejours?: Sejour[]
}) {
  const sejours = handlers.sejours ?? []

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/appartements') && method === 'GET') {
      return new Response(JSON.stringify([appartement]), { status: 200 })
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

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche la liste des séjours existants', async () => {
    globalThis.fetch = mockFetch({ sejours: [sejourFixture()] }) as typeof fetch

    render(<App />)

    const item = await screen.findByRole('listitem')
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

    const select = await screen.findByRole('combobox', { name: /Appartement/i })
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2))

    await user.selectOptions(select, '1')
    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')
    await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-05')
    await user.type(screen.getByLabelText(/Nom du voyageur/i), 'Marie Curie')
    await user.click(screen.getByRole('button', { name: /créer le séjour/i }))

    expect(await screen.findByText('Marie Curie')).toBeInTheDocument()
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
        },
      }),
    }) as typeof fetch

    render(<App />)

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
        },
      }),
    }) as typeof fetch

    render(<App />)

    const button = await screen.findByRole('button', { name: /confirmer le checkout/i })
    await user.click(button)

    expect(await screen.findByText('non assigné')).toBeInTheDocument()
  })
})
