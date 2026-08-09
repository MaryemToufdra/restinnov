import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MesMissionsSection } from './MesMissionsSection'
import type { Agent, MissionMenage } from '../types'

const agentsMenage: Agent[] = [
  { id: 1, nom: 'Fatima Z.', role: 'menage', telephone: null },
  { id: 2, nom: 'Karim B.', role: 'menage', telephone: null },
]

function missionFixture(overrides: Partial<MissionMenage> = {}): MissionMenage {
  return {
    id: 10,
    sejour_id: 1,
    agent_id: 1,
    statut: 'a_faire',
    agent: agentsMenage[0],
    frais_forfait: 0,
    vue: false,
    produits: [],
    checklist_items: [],
    sejour: { id: 1, appartement: { id: 1, nom: 'Loft Bastille', adresse: '12 rue de la Roquette', statut: 'occupe', photo_principale: null, checklist_modele_id: null, agent_habituel_id: null } },
    ...overrides,
  }
}

function mockFetch(missions: MissionMenage[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'

    if (url.pathname === '/api/mission-menages' && method === 'GET') {
      const agentId = Number(url.searchParams.get('agent_id'))
      return new Response(JSON.stringify(missions.filter((m) => m.agent_id === agentId)), { status: 200 })
    }

    throw new Error(`Unhandled request: ${method} ${url.pathname}`)
  })
}

describe('MesMissionsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le sélecteur d\'agent quand aucun agent n\'est sélectionné', () => {
    globalThis.fetch = mockFetch([]) as typeof fetch
    const onSelectAgent = vi.fn()

    render(
      <MesMissionsSection
        agentsMenage={agentsMenage}
        catalogue={[]}
        selectedAgentId={null}
        onSelectAgent={onSelectAgent}
        onChangerAgent={vi.fn()}
      />,
    )

    expect(screen.getByText('Se connecter en tant que')).toBeInTheDocument()
  })

  it('charge et affiche les missions a_faire/en_cours de l\'agent sélectionné', async () => {
    globalThis.fetch = mockFetch([
      missionFixture({ id: 10, vue: false }),
      missionFixture({ id: 11, agent_id: 2, vue: true }),
    ]) as typeof fetch

    render(
      <MesMissionsSection
        agentsMenage={agentsMenage}
        catalogue={[]}
        selectedAgentId={1}
        onSelectAgent={vi.fn()}
        onChangerAgent={vi.fn()}
      />,
    )

    expect(await screen.findByText('Loft Bastille')).toBeInTheDocument()
    expect(screen.getByText('12 rue de la Roquette')).toBeInTheDocument()
    expect(screen.getByTestId('mission-nouvelle-badge-10')).toBeInTheDocument()
  })

  it('n\'affiche pas le badge "Nouveau" pour une mission déjà vue', async () => {
    globalThis.fetch = mockFetch([missionFixture({ id: 10, vue: true })]) as typeof fetch

    render(
      <MesMissionsSection
        agentsMenage={agentsMenage}
        catalogue={[]}
        selectedAgentId={1}
        onSelectAgent={vi.fn()}
        onChangerAgent={vi.fn()}
      />,
    )

    await screen.findByText('Loft Bastille')
    expect(screen.queryByTestId('mission-nouvelle-badge-10')).not.toBeInTheDocument()
  })

  it('le bouton "Changer d\'agent" appelle onChangerAgent', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch([]) as typeof fetch
    const onChangerAgent = vi.fn()

    render(
      <MesMissionsSection
        agentsMenage={agentsMenage}
        catalogue={[]}
        selectedAgentId={1}
        onSelectAgent={vi.fn()}
        onChangerAgent={onChangerAgent}
      />,
    )

    await waitFor(() => expect(screen.queryByText('Chargement...')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /changer d'agent/i }))

    expect(onChangerAgent).toHaveBeenCalled()
  })

  it("affiche un message quand l'agent n'a aucune mission", async () => {
    globalThis.fetch = mockFetch([]) as typeof fetch

    render(
      <MesMissionsSection
        agentsMenage={agentsMenage}
        catalogue={[]}
        selectedAgentId={1}
        onSelectAgent={vi.fn()}
        onChangerAgent={vi.fn()}
      />,
    )

    expect(await screen.findByText(/aucune mission/i)).toBeInTheDocument()
  })
})
