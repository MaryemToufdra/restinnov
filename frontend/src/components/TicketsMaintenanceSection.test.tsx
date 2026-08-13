import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TicketsMaintenanceSection } from './TicketsMaintenanceSection'
import type { Agent, TicketMaintenance } from '../types'

function ticketFixture(overrides: Partial<TicketMaintenance> = {}): TicketMaintenance {
  return {
    id: 1,
    appartement_id: 1,
    mission_origine_id: 1,
    agent_id: null,
    description: 'Le robinet fuit.',
    photo_url: null,
    audio_url: null,
    urgence: 'normale',
    statut: 'ouvert',
    appartement: { id: 1, nom: 'Loft Bastille', adresse: '12 rue de la Roquette', statut: 'disponible', photo_principale: null, agent_habituel_id: null },
    mission_origine: {
      id: 1,
      sejour_id: 1,
      agent_id: 2,
      statut: 'en_cours',
      agent: null,
      frais_forfait: 0,
      vue: true,
      sejour: {
        id: 1,
        reference: 'SEJ-0001',
        appartement_id: 1,
        date_arrivee: '2026-08-01',
        date_depart: '2026-08-05',
        nom_voyageur: 'Jean Dupont',
        statut: 'en_cours',
        plateforme_origine: 'airbnb',
        montant_mad: 1000,
      },
    },
    ...overrides,
  }
}

function agentFixture(overrides: Partial<Agent> = {}): Agent {
  return { id: 5, nom: 'Karim B.', role: 'maintenance', telephone: null, ...overrides }
}

function mockFetch(tickets: TicketMaintenance[], agents: Agent[]) {
  let currentTickets = [...tickets]

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'

    if (url.pathname === '/api/tickets-maintenance' && method === 'GET') {
      const statut = url.searchParams.get('statut')
      const result = statut ? currentTickets.filter((t) => t.statut === statut) : currentTickets
      return new Response(JSON.stringify(result), { status: 200 })
    }

    if (url.pathname === '/api/utilisateurs' && method === 'GET') {
      return new Response(JSON.stringify(agents), { status: 200 })
    }

    const assignMatch = url.pathname.match(/^\/api\/tickets-maintenance\/(\d+)\/assigner$/)
    if (assignMatch && method === 'PATCH') {
      const id = Number(assignMatch[1])
      const body = JSON.parse(init!.body as string) as { agent_id: number }
      currentTickets = currentTickets.map((t) =>
        t.id === id ? { ...t, statut: 'assigne', agent_id: body.agent_id } : t,
      )
      return new Response(JSON.stringify(currentTickets.find((t) => t.id === id)), { status: 200 })
    }

    throw new Error(`Unhandled request: ${method} ${url.pathname}`)
  })
}

describe('TicketsMaintenanceSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche les tickets ouverts avec description, appartement et séjour', async () => {
    globalThis.fetch = mockFetch([ticketFixture()], []) as typeof fetch

    render(<TicketsMaintenanceSection />)

    expect(await screen.findByText('Le robinet fuit.')).toBeInTheDocument()
    expect(screen.getByText('Loft Bastille')).toBeInTheDocument()
    expect(screen.getByText(/SEJ-0001/)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('affiche la photo et le lecteur audio quand présents', async () => {
    globalThis.fetch = mockFetch(
      [ticketFixture({ photo_url: 'tickets-maintenance/photo.jpg', audio_url: 'tickets-maintenance/audio.webm' })],
      [],
    ) as typeof fetch

    render(<TicketsMaintenanceSection />)

    await screen.findByText('Le robinet fuit.')
    expect(screen.getByAltText(/photo du problème signalé/i)).toBeInTheDocument()
    expect(document.querySelector('audio')).toBeInTheDocument()
  })

  it('affiche un message quand aucun ticket n\'est ouvert', async () => {
    globalThis.fetch = mockFetch([], []) as typeof fetch

    render(<TicketsMaintenanceSection />)

    expect(await screen.findByText(/aucun ticket de maintenance ouvert/i)).toBeInTheDocument()
  })

  it('assigne un ticket à un agent de maintenance, qui disparaît ensuite de la liste', async () => {
    const user = userEvent.setup()
    const agent = agentFixture()
    const fetchMock = mockFetch([ticketFixture()], [agent])
    globalThis.fetch = fetchMock as typeof fetch

    render(<TicketsMaintenanceSection />)

    await screen.findByText('Le robinet fuit.')
    await user.selectOptions(screen.getByLabelText(/agent de maintenance/i), String(agent.id))
    await user.click(screen.getByRole('button', { name: /assigner/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/tickets-maintenance/1/assigner'),
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ agent_id: agent.id }) }),
      ),
    )
    await waitFor(() => expect(screen.queryByText('Le robinet fuit.')).not.toBeInTheDocument())
    expect(screen.getByText(/aucun ticket de maintenance ouvert/i)).toBeInTheDocument()
  })

  it('refuse d\'assigner sans agent sélectionné', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch([ticketFixture()], [agentFixture()]) as typeof fetch

    render(<TicketsMaintenanceSection />)

    await screen.findByText('Le robinet fuit.')
    await user.click(screen.getByRole('button', { name: /assigner/i }))

    expect(await screen.findByText(/choisissez un agent de maintenance/i)).toBeInTheDocument()
  })
})
