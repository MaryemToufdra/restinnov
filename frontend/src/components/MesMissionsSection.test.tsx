import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import { MesMissionsSection } from './MesMissionsSection'
import type { MissionMenage, ProduitCatalogue } from '../types'

const CURRENT_AGENT = { id: 1, nom: 'Fatima Z.', role: 'menage' as const }

function seedLoggedInAgent() {
  localStorage.setItem('auth_token', 'fake-token')
  localStorage.setItem('auth_user', JSON.stringify(CURRENT_AGENT))
}

function missionFixture(overrides: Partial<MissionMenage> = {}): MissionMenage {
  return {
    id: 10,
    sejour_id: 1,
    agent_id: 1,
    statut: 'a_faire',
    agent: { id: 1, nom: 'Fatima Z.', role: 'menage', telephone: null },
    frais_forfait: 0,
    vue: false,
    produits: [],
    checklist_items: [],
    sejour: {
      id: 1,
      appartement: {
        id: 1,
        nom: 'Loft Bastille',
        adresse: '12 rue de la Roquette',
        statut: 'occupe',
        photo_principale: null,
        agent_habituel_id: null,
      },
    },
    ...overrides,
  }
}

function mockFetch(missions: MissionMenage[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))

    if (url.pathname === '/api/mission-menages') {
      const agentId = Number(url.searchParams.get('agent_id'))
      return new Response(JSON.stringify(missions.filter((m) => m.agent_id === agentId)), { status: 200 })
    }

    throw new Error(`Unhandled request: ${url.pathname}`)
  })
}

function renderWithAuth(catalogue: ProduitCatalogue[] = []) {
  return render(
    <AuthProvider>
      <MesMissionsSection catalogue={catalogue} />
    </AuthProvider>,
  )
}

describe('MesMissionsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("charge et affiche les missions a_faire/en_cours de l'agent connecté", async () => {
    seedLoggedInAgent()
    globalThis.fetch = mockFetch([
      missionFixture({ id: 10, vue: false }),
      missionFixture({ id: 11, agent_id: 2, vue: true }),
    ]) as typeof fetch

    renderWithAuth()

    expect(await screen.findByText('Loft Bastille')).toBeInTheDocument()
    expect(screen.getByText('12 rue de la Roquette')).toBeInTheDocument()
    expect(screen.getByTestId('mission-nouvelle-badge-10')).toBeInTheDocument()
    expect(screen.getByText('Fatima Z.')).toBeInTheDocument()
  })

  it('appelle /api/mission-menages avec l\'id de l\'agent connecté (pas de sélecteur)', async () => {
    seedLoggedInAgent()
    const fetchMock = mockFetch([missionFixture()])
    globalThis.fetch = fetchMock as typeof fetch

    renderWithAuth()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(String(fetchMock.mock.calls[0][0])).toContain('agent_id=1')
    expect(screen.queryByText('Se connecter en tant que')).not.toBeInTheDocument()
  })

  it('n\'affiche pas le badge "Nouveau" pour une mission déjà vue', async () => {
    seedLoggedInAgent()
    globalThis.fetch = mockFetch([missionFixture({ id: 10, vue: true })]) as typeof fetch

    renderWithAuth()

    await screen.findByText('Loft Bastille')
    expect(screen.queryByTestId('mission-nouvelle-badge-10')).not.toBeInTheDocument()
  })

  it("affiche un message quand l'agent n'a aucune mission", async () => {
    seedLoggedInAgent()
    globalThis.fetch = mockFetch([]) as typeof fetch

    renderWithAuth()

    expect(await screen.findByText(/aucune mission/i)).toBeInTheDocument()
  })

  it('le badge "Nouveau" est un indicateur visuel (rôle status), pas juste du texte à lire', async () => {
    seedLoggedInAgent()
    globalThis.fetch = mockFetch([missionFixture({ id: 10, vue: false })]) as typeof fetch

    renderWithAuth()

    await screen.findByText('Loft Bastille')
    expect(screen.getByRole('status', { name: /nouvelle mission/i })).toBeInTheDocument()
  })

  it("affiche une vignette photo de l'appartement quand une photo existe", async () => {
    seedLoggedInAgent()
    globalThis.fetch = mockFetch([
      missionFixture({
        sejour: {
          id: 1,
          appartement: {
            id: 1,
            nom: 'Loft Bastille',
            adresse: '12 rue de la Roquette',
            statut: 'occupe',
            photo_principale: 'appartements/loft.jpg',
            agent_habituel_id: null,
          },
        },
      }),
    ]) as typeof fetch

    renderWithAuth()

    const image = await screen.findByTestId('appartement-photo-10')
    expect(image).toHaveAttribute('src', expect.stringContaining('appartements/loft.jpg'))
  })

  it('reste sur le détail de la mission (au lieu de revenir à la liste) après "Marquer terminé"', async () => {
    seedLoggedInAgent()
    const user = userEvent.setup()
    let missionStatut = 'a_faire'

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'

      if (url.pathname === '/api/mission-menages' && method === 'GET') {
        const missions =
          missionStatut === 'a_faire' || missionStatut === 'en_cours'
            ? [missionFixture({ statut: missionStatut as 'a_faire' | 'en_cours' })]
            : []
        return new Response(JSON.stringify(missions), { status: 200 })
      }

      if (url.pathname === '/api/mission-menages/10/ouvrir' && method === 'PATCH') {
        missionStatut = 'en_cours'
        return new Response(JSON.stringify(missionFixture({ statut: 'en_cours', vue: true })), { status: 200 })
      }

      if (url.pathname === '/api/mission-menages/10/terminer' && method === 'PATCH') {
        missionStatut = 'en_attente_validation'
        return new Response(JSON.stringify(missionFixture({ statut: 'en_attente_validation' })), { status: 200 })
      }

      throw new Error(`Unhandled request: ${method} ${url.pathname}`)
    }) as typeof fetch

    renderWithAuth()

    await user.click(await screen.findByText('Loft Bastille'))
    await screen.findByText('Checklist')

    const boutonTerminer = await screen.findByRole('button', { name: /marquer terminé/i })
    await user.click(boutonTerminer)

    expect(await screen.findByText(/envoyé au manager pour validation/i)).toBeInTheDocument()
    // Still on the detail view -- "Retour à mes missions" only appears there.
    expect(screen.getByRole('button', { name: /retour à mes missions/i })).toBeInTheDocument()
  })
})
