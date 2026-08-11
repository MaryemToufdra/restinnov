import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentsMenageListeSection } from './AgentsMenageListeSection'
import type { Agent } from '../types'

function agentFixture(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 1,
    nom: 'Fatima Zahra',
    role: 'menage',
    telephone: '0611111111',
    adresse: '5 rue des Fleurs',
    actif: true,
    appartements_habituel_count: 0,
    mission_menages_count: 0,
    ...overrides,
  }
}

/** Fakes the backend's search/inclure_inactifs filtering and the mutation endpoints over an in-memory list. */
function mockFetchAgents(all: Agent[]) {
  let agents = [...all]

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'

    if (url.pathname === '/api/utilisateurs' && method === 'GET') {
      let result = agents

      const search = url.searchParams.get('search')
      if (search) {
        const needle = search.toLowerCase()
        result = result.filter((a) => a.nom.toLowerCase().includes(needle))
      }

      if (!url.searchParams.has('inclure_inactifs')) {
        result = result.filter((a) => a.actif !== false)
      }

      return new Response(JSON.stringify(result), { status: 200 })
    }

    // Mirrors the real backend: desactiver()/reactiver() return the bare
    // utilisateur (via ->fresh()), WITHOUT the appartements_habituel_count/
    // mission_menages_count aggregates that only index()'s withCount()
    // computes. A component that naively replaces the row with this
    // response would wipe those counts from the table.
    if (/^\/api\/utilisateurs\/\d+\/desactiver$/.test(url.pathname) && method === 'PATCH') {
      const id = Number(url.pathname.split('/')[3])
      agents = agents.map((a) => (a.id === id ? { ...a, actif: false } : a))
      const { id: agentId, nom, telephone, adresse, actif } = agents.find((a) => a.id === id)!
      return new Response(JSON.stringify({ id: agentId, nom, telephone, adresse, actif, role: 'menage' }), { status: 200 })
    }

    if (/^\/api\/utilisateurs\/\d+\/reactiver$/.test(url.pathname) && method === 'PATCH') {
      const id = Number(url.pathname.split('/')[3])
      agents = agents.map((a) => (a.id === id ? { ...a, actif: true } : a))
      const { id: agentId, nom, telephone, adresse, actif } = agents.find((a) => a.id === id)!
      return new Response(JSON.stringify({ id: agentId, nom, telephone, adresse, actif, role: 'menage' }), { status: 200 })
    }

    if (/^\/api\/utilisateurs\/\d+$/.test(url.pathname) && method === 'DELETE') {
      const id = Number(url.pathname.split('/').pop())
      const agent = agents.find((a) => a.id === id)
      if (agent && ((agent.appartements_habituel_count ?? 0) > 0 || (agent.mission_menages_count ?? 0) > 0)) {
        return new Response(
          JSON.stringify({ message: 'Cet agent a un historique (missions ou appartements assignés) et ne peut pas être supprimé. Désactivez-le à la place.' }),
          { status: 422 },
        )
      }
      agents = agents.filter((a) => a.id !== id)
      return new Response(null, { status: 204 })
    }

    throw new Error(`Unhandled request: ${method} ${url.pathname}`)
  })
}

describe('AgentsMenageListeSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le tableau avec les colonnes attendues', async () => {
    globalThis.fetch = mockFetchAgents([agentFixture()]) as typeof fetch

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={vi.fn()} />)

    expect(await screen.findByText('1 agents trouvés')).toBeInTheDocument()
    expect(screen.getByText('Fatima Zahra')).toBeInTheDocument()
    expect(screen.getByText('0611111111')).toBeInTheDocument()
    expect(screen.getByText('5 rue des Fleurs')).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
  })

  it('filtre par recherche sur le nom', async () => {
    globalThis.fetch = mockFetchAgents([
      agentFixture({ id: 1, nom: 'Fatima Zahra' }),
      agentFixture({ id: 2, nom: 'Karim Benali' }),
    ]) as typeof fetch
    const user = userEvent.setup()

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={vi.fn()} />)

    await screen.findByText('2 agents trouvés')
    await user.type(screen.getByLabelText(/recherche/i), 'Karim')

    expect(await screen.findByText('1 agents trouvés')).toBeInTheDocument()
    expect(screen.getByText('Karim Benali')).toBeInTheDocument()
    expect(screen.queryByText('Fatima Zahra')).not.toBeInTheDocument()
  })

  it('un agent sans historique affiche "Supprimer", qui exige une confirmation', async () => {
    const onAgentsChanged = vi.fn()
    globalThis.fetch = mockFetchAgents([
      agentFixture({ appartements_habituel_count: 0, mission_menages_count: 0 }),
    ]) as typeof fetch
    const user = userEvent.setup()

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={onAgentsChanged} />)

    await screen.findByText('Fatima Zahra')
    expect(screen.queryByRole('button', { name: /désactiver/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /supprimer/i }))
    expect(screen.getByText(/supprimer définitivement/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /annuler/i }))
    expect(screen.queryByText(/supprimer définitivement/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /supprimer/i }))
    await user.click(screen.getByRole('button', { name: /oui, supprimer/i }))

    await waitFor(() => expect(screen.queryByText('Fatima Zahra')).not.toBeInTheDocument())
    expect(onAgentsChanged).toHaveBeenCalledTimes(1)
  })

  it('un agent avec historique affiche "Désactiver" au lieu de "Supprimer"', async () => {
    globalThis.fetch = mockFetchAgents([
      agentFixture({ mission_menages_count: 3 }),
    ]) as typeof fetch

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={vi.fn()} />)

    await screen.findByText('Fatima Zahra')
    expect(screen.queryByRole('button', { name: /^supprimer$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /désactiver/i })).toBeInTheDocument()
  })

  it('désactiver puis réactiver un agent avec historique met à jour le statut affiché', async () => {
    const onAgentsChanged = vi.fn()
    globalThis.fetch = mockFetchAgents([
      agentFixture({ mission_menages_count: 3 }),
    ]) as typeof fetch
    const user = userEvent.setup()

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={onAgentsChanged} />)

    await screen.findByText('Fatima Zahra')
    expect(screen.getByText('Actif')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /désactiver/i }))

    await waitFor(() => expect(screen.getByText('Inactif')).toBeInTheDocument())
    expect(onAgentsChanged).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /réactiver/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /réactiver/i }))

    await waitFor(() => expect(screen.getByText('Actif')).toBeInTheDocument())
    expect(onAgentsChanged).toHaveBeenCalledTimes(2)
  })

  it('conserve le nb de missions (et donc "Désactiver") après un aller-retour désactiver/réactiver', async () => {
    // Regression test: desactiver()/reactiver() return the bare utilisateur
    // without the count aggregates -- the row must not lose them, or an
    // agent with history would wrongly flip to showing "Supprimer".
    globalThis.fetch = mockFetchAgents([agentFixture({ mission_menages_count: 3 })]) as typeof fetch
    const user = userEvent.setup()

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={vi.fn()} />)

    await screen.findByText('Fatima Zahra')
    await user.click(screen.getByRole('button', { name: /désactiver/i }))
    await waitFor(() => expect(screen.getByText('Inactif')).toBeInTheDocument())

    expect(screen.getByText('3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /réactiver/i }))
    await waitFor(() => expect(screen.getByText('Actif')).toBeInTheDocument())

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /désactiver/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^supprimer$/i })).not.toBeInTheDocument()
  })

  it('l\'icône crayon appelle onEditAgent avec l\'agent', async () => {
    const onEditAgent = vi.fn()
    globalThis.fetch = mockFetchAgents([agentFixture()]) as typeof fetch
    const user = userEvent.setup()

    render(<AgentsMenageListeSection onEditAgent={onEditAgent} onAgentsChanged={vi.fn()} />)

    await screen.findByText('Fatima Zahra')
    await user.click(screen.getByRole('button', { name: /modifier l'agent fatima zahra/i }))

    expect(onEditAgent).toHaveBeenCalledWith(expect.objectContaining({ id: 1, nom: 'Fatima Zahra' }))
  })

  it('affiche un message quand aucun agent ne correspond', async () => {
    globalThis.fetch = mockFetchAgents([]) as typeof fetch

    render(<AgentsMenageListeSection onEditAgent={vi.fn()} onAgentsChanged={vi.fn()} />)

    expect(await screen.findByText('Aucun agent trouvé.')).toBeInTheDocument()
  })
})
