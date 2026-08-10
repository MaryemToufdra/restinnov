import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MissionDetailAgent } from './MissionDetailAgent'
import type { ChecklistItem, MissionMenage } from '../types'

const appartement = {
  id: 1,
  nom: 'Loft Bastille',
  adresse: '12 rue de la Roquette',
  statut: 'occupe',
  photo_principale: null,
  checklist_modele_id: null,
  agent_habituel_id: null,
}

function checklistItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return { id: 1, mission_menage_id: 10, libelle: 'Passer l\'aspirateur', coche: false, photo_url: null, ordre: 0, ...overrides }
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
    checklist_items: [checklistItem()],
    sejour: { id: 1, appartement },
    ...overrides,
  }
}

function mockFetch(mission: MissionMenage) {
  let current = mission

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const path = url.pathname

    if (path === `/api/mission-menages/${mission.id}/ouvrir` && method === 'PATCH') {
      current = { ...current, vue: true, statut: current.statut === 'a_faire' ? 'en_cours' : current.statut }
      return new Response(JSON.stringify(current), { status: 200 })
    }

    if (path === `/api/mission-menages/${mission.id}/terminer` && method === 'PATCH') {
      const nonCoche = (current.checklist_items ?? []).some((i) => !i.coche)
      if (nonCoche) {
        return new Response(JSON.stringify({ message: 'Tous les éléments doivent être cochés.' }), { status: 422 })
      }
      current = { ...current, statut: 'conforme' }
      return new Response(JSON.stringify(current), { status: 200 })
    }

    const checklistMatch = path.match(/^\/api\/checklist-items\/(\d+)$/)
    if (checklistMatch && method === 'POST') {
      const itemId = Number(checklistMatch[1])
      const formData = init?.body as FormData
      const cocheRaw = formData.get('coche')
      const updatedItem = {
        ...(current.checklist_items ?? []).find((i) => i.id === itemId)!,
        coche: cocheRaw != null ? cocheRaw === 'true' : (current.checklist_items ?? []).find((i) => i.id === itemId)!.coche,
        photo_url: formData.get('photo') ? 'checklist-items/preuve.jpg' : (current.checklist_items ?? []).find((i) => i.id === itemId)!.photo_url,
      }
      current = {
        ...current,
        checklist_items: (current.checklist_items ?? []).map((i) => (i.id === itemId ? updatedItem : i)),
      }
      return new Response(JSON.stringify(updatedItem), { status: 200 })
    }

    throw new Error(`Unhandled request: ${method} ${path}`)
  })
}

describe('MissionDetailAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("ouvre la mission au montage (marque vue, passe a_faire à en_cours)", async () => {
    const fetchMock = mockFetch(missionFixture())
    globalThis.fetch = fetchMock as typeof fetch

    render(<MissionDetailAgent missionId={10} catalogue={[]} onBack={vi.fn()} onMissionTerminee={vi.fn()} />)

    await screen.findByText('Loft Bastille')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/mission-menages/10/ouvrir'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('affiche chaque item de checklist avec une case à cocher', async () => {
    globalThis.fetch = mockFetch(missionFixture()) as typeof fetch

    render(<MissionDetailAgent missionId={10} catalogue={[]} onBack={vi.fn()} onMissionTerminee={vi.fn()} />)

    expect(await screen.findByText("Passer l'aspirateur")).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: "Passer l'aspirateur" })).toHaveAttribute('aria-checked', 'false')
  })

  it('le bouton "Marquer terminé" est désactivé tant que tous les items ne sont pas cochés', async () => {
    globalThis.fetch = mockFetch(missionFixture()) as typeof fetch

    render(<MissionDetailAgent missionId={10} catalogue={[]} onBack={vi.fn()} onMissionTerminee={vi.fn()} />)

    await screen.findByText("Passer l'aspirateur")
    expect(screen.getByRole('button', { name: /marquer terminé/i })).toBeDisabled()
  })

  it('cocher le seul item active le bouton "Marquer terminé", puis le clic termine la mission', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch(missionFixture()) as typeof fetch
    const onMissionTerminee = vi.fn()

    render(<MissionDetailAgent missionId={10} catalogue={[]} onBack={vi.fn()} onMissionTerminee={onMissionTerminee} />)

    await screen.findByText("Passer l'aspirateur")
    await user.click(screen.getByRole('checkbox', { name: "Passer l'aspirateur" }))

    await waitFor(() => expect(screen.getByRole('button', { name: /marquer terminé/i })).toBeEnabled())

    await user.click(screen.getByRole('button', { name: /marquer terminé/i }))

    await waitFor(() => expect(onMissionTerminee).toHaveBeenCalled())
  })

  it('le bouton "Signaler un problème" reste désactivé avec "Bientôt disponible"', async () => {
    globalThis.fetch = mockFetch(missionFixture()) as typeof fetch

    render(<MissionDetailAgent missionId={10} catalogue={[]} onBack={vi.fn()} onMissionTerminee={vi.fn()} />)

    await screen.findByText('Loft Bastille')
    expect(screen.getByRole('button', { name: /signaler un problème/i })).toBeDisabled()
  })

  it('permet de marquer terminé une mission sans aucun item de checklist', async () => {
    const user = userEvent.setup()
    globalThis.fetch = mockFetch(missionFixture({ checklist_items: [] })) as typeof fetch
    const onMissionTerminee = vi.fn()

    render(<MissionDetailAgent missionId={10} catalogue={[]} onBack={vi.fn()} onMissionTerminee={onMissionTerminee} />)

    await screen.findByText('Loft Bastille')
    expect(screen.getByRole('button', { name: /marquer terminé/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /marquer terminé/i }))

    await waitFor(() => expect(onMissionTerminee).toHaveBeenCalled())
  })
})
