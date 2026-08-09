import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SejoursListeSection } from './SejoursListeSection'
import type { Appartement, Sejour } from '../types'

const appartementLoft: Appartement = {
  id: 1,
  nom: 'Loft Bastille',
  adresse: 'A',
  statut: 'disponible',
  photo_principale: null,
  checklist_modele_id: null,
  agent_habituel_id: null,
}

const appartementZenith: Appartement = {
  id: 2,
  nom: 'Zenith',
  adresse: 'B',
  statut: 'disponible',
  photo_principale: null,
  checklist_modele_id: null,
  agent_habituel_id: null,
}

function sejourFixture(overrides: Partial<Sejour> = {}): Sejour {
  return {
    id: 1,
    reference: 'SEJ-0001',
    appartement_id: 1,
    date_arrivee: '2026-08-01',
    date_depart: '2026-08-05',
    nom_voyageur: 'Jean Dupont',
    statut: 'a_venir',
    plateforme_origine: 'airbnb',
    montant_mad: 1000,
    appartement: appartementLoft,
    mission_menage: null,
    voyageurs: [{ nom: 'Jean Dupont', numero_passeport: null, est_principal: true, type: 'adulte' }],
    voyageurs_count: 1,
    ...overrides,
  }
}

/** Fakes the backend's filter/sort/pagination behaviour over an in-memory list of sejours. */
function mockFetchSejours(allSejours: Sejour[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))

    const showMatch = url.pathname.match(/^\/api\/sejours\/(\d+)$/)
    if (showMatch) {
      const id = Number(showMatch[1])
      const found = allSejours.find((s) => s.id === id)
      if (!found) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
      return new Response(JSON.stringify(found), { status: 200 })
    }

    let result = [...allSejours]

    const search = url.searchParams.get('search')
    if (search) {
      const needle = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.nom_voyageur.toLowerCase().includes(needle) ||
          (s.appartement?.nom ?? '').toLowerCase().includes(needle),
      )
    }

    const statut = url.searchParams.get('statut')
    if (statut) result = result.filter((s) => s.statut === statut)

    const appartementId = url.searchParams.get('appartement_id')
    if (appartementId) result = result.filter((s) => s.appartement_id === Number(appartementId))

    const dateDebut = url.searchParams.get('date_debut')
    if (dateDebut) result = result.filter((s) => s.date_arrivee >= dateDebut)

    const dateFin = url.searchParams.get('date_fin')
    if (dateFin) result = result.filter((s) => s.date_arrivee <= dateFin)

    const sortBy = (url.searchParams.get('sort_by') ?? 'date_arrivee') as 'date_arrivee' | 'date_depart'
    const sortDir = url.searchParams.get('sort_dir') ?? 'desc'
    result.sort((a, b) => {
      const cmp = a[sortBy].localeCompare(b[sortBy])
      return sortDir === 'asc' ? cmp : -cmp
    })

    const perPage = Number(url.searchParams.get('per_page') ?? 10)
    const page = Number(url.searchParams.get('page') ?? 1)
    const total = result.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const data = result.slice((page - 1) * perPage, page * perPage)

    return new Response(
      JSON.stringify({ data, current_page: page, last_page: lastPage, per_page: perPage, total }),
      { status: 200 },
    )
  })
}

describe('SejoursListeSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le compteur et les colonnes attendues', async () => {
    globalThis.fetch = mockFetchSejours([sejourFixture()]) as typeof fetch

    render(
      <SejoursListeSection
        appartements={[appartementLoft, appartementZenith]}
        catalogue={[]}
        onNavigateToCreer={vi.fn()}
        onEditSejour={vi.fn()}
      />,
    )

    expect(await screen.findByText('1 séjours trouvés')).toBeInTheDocument()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('JD')).toBeInTheDocument()
    expect(screen.getAllByText('Loft Bastille').length).toBeGreaterThan(0)
    expect(screen.getByText('Airbnb')).toBeInTheDocument()
    expect(screen.getAllByText('À venir').length).toBeGreaterThan(0)
  })

  it('affiche "Checkout effectué" dans le filtre statut pour la valeur termine', async () => {
    globalThis.fetch = mockFetchSejours([]) as typeof fetch

    render(
      <SejoursListeSection appartements={[]} catalogue={[]} onNavigateToCreer={vi.fn()} onEditSejour={vi.fn()} />,
    )

    await screen.findByText('0 séjours trouvés')
    const select = screen.getByLabelText(/statut/i) as HTMLSelectElement
    expect(within(select).getByRole('option', { name: 'Checkout effectué' })).toHaveValue('termine')
  })

  it('filtre par recherche texte (voyageur ou appartement)', async () => {
    const fetchMock = mockFetchSejours([
      sejourFixture({ id: 1, nom_voyageur: 'Jean Dupont' }),
      sejourFixture({ id: 2, nom_voyageur: 'Marie Curie', appartement: appartementZenith, appartement_id: 2 }),
    ])
    globalThis.fetch = fetchMock as typeof fetch
    const user = userEvent.setup()

    render(
      <SejoursListeSection
        appartements={[appartementLoft, appartementZenith]}
        catalogue={[]}
        onNavigateToCreer={vi.fn()}
        onEditSejour={vi.fn()}
      />,
    )

    await screen.findByText('2 séjours trouvés')
    await user.type(screen.getByLabelText(/recherche/i), 'Curie')

    expect(await screen.findByText('1 séjours trouvés')).toBeInTheDocument()
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()
  })

  it('filtre par statut', async () => {
    globalThis.fetch = mockFetchSejours([
      sejourFixture({ id: 1, statut: 'a_venir' }),
      sejourFixture({ id: 2, statut: 'termine', nom_voyageur: 'Marie Curie' }),
    ]) as typeof fetch
    const user = userEvent.setup()

    render(
      <SejoursListeSection appartements={[]} catalogue={[]} onNavigateToCreer={vi.fn()} onEditSejour={vi.fn()} />,
    )

    await screen.findByText('2 séjours trouvés')
    await user.selectOptions(screen.getByLabelText(/statut/i), 'termine')

    expect(await screen.findByText('1 séjours trouvés')).toBeInTheDocument()
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
  })

  it('filtre par appartement', async () => {
    globalThis.fetch = mockFetchSejours([
      sejourFixture({ id: 1, appartement: appartementLoft, appartement_id: 1 }),
      sejourFixture({
        id: 2,
        nom_voyageur: 'Marie Curie',
        appartement: appartementZenith,
        appartement_id: 2,
      }),
    ]) as typeof fetch
    const user = userEvent.setup()

    render(
      <SejoursListeSection
        appartements={[appartementLoft, appartementZenith]}
        catalogue={[]}
        onNavigateToCreer={vi.fn()}
        onEditSejour={vi.fn()}
      />,
    )

    await screen.findByText('2 séjours trouvés')
    await user.selectOptions(screen.getByLabelText(/^appartement$/i), '2')

    expect(await screen.findByText('1 séjours trouvés')).toBeInTheDocument()
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
  })

  it('trie par date d\'arrivée puis inverse le sens au second clic', async () => {
    globalThis.fetch = mockFetchSejours([
      sejourFixture({ id: 1, nom_voyageur: 'Ancien', date_arrivee: '2026-01-01', date_depart: '2026-01-05' }),
      sejourFixture({ id: 2, nom_voyageur: 'Récent', date_arrivee: '2026-06-01', date_depart: '2026-06-05' }),
    ]) as typeof fetch
    const user = userEvent.setup()

    render(
      <SejoursListeSection appartements={[]} catalogue={[]} onNavigateToCreer={vi.fn()} onEditSejour={vi.fn()} />,
    )

    await screen.findByText('2 séjours trouvés')

    const rowsOrder = () => screen.getAllByRole('row').slice(1).map((r) => within(r).queryByText(/Ancien|Récent/)?.textContent)

    await user.click(screen.getByRole('button', { name: /arrivée/i }))
    await waitFor(() => expect(rowsOrder()).toEqual(['Ancien', 'Récent']))

    await user.click(screen.getByRole('button', { name: /arrivée/i }))
    await waitFor(() => expect(rowsOrder()).toEqual(['Récent', 'Ancien']))
  })

  it('affiche la pagination et change de page', async () => {
    const sejours = Array.from({ length: 12 }, (_, i) =>
      sejourFixture({ id: i + 1, nom_voyageur: `Voyageur ${i + 1}`, date_arrivee: `2026-01-${String(i + 1).padStart(2, '0')}` }),
    )
    globalThis.fetch = mockFetchSejours(sejours) as typeof fetch
    const user = userEvent.setup()

    render(
      <SejoursListeSection appartements={[]} catalogue={[]} onNavigateToCreer={vi.fn()} onEditSejour={vi.fn()} />,
    )

    expect(await screen.findByText('12 séjours trouvés')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    expect(screen.getAllByRole('row')).toHaveLength(11) // header + 10 rows

    await user.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)) // header + 2 remaining
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
  })

  it('le bouton "+ Nouveau séjour" appelle onNavigateToCreer', async () => {
    globalThis.fetch = mockFetchSejours([]) as typeof fetch
    const onNavigateToCreer = vi.fn()
    const user = userEvent.setup()

    render(
      <SejoursListeSection
        appartements={[]}
        catalogue={[]}
        onNavigateToCreer={onNavigateToCreer}
        onEditSejour={vi.fn()}
      />,
    )

    await screen.findByText('0 séjours trouvés')
    await user.click(screen.getByRole('button', { name: /nouveau séjour/i }))

    expect(onNavigateToCreer).toHaveBeenCalledTimes(1)
  })

  it('l\'icône crayon appelle onEditSejour avec le séjour, sauf si terminé (désactivée)', async () => {
    globalThis.fetch = mockFetchSejours([
      sejourFixture({ id: 1, statut: 'a_venir' }),
      sejourFixture({ id: 2, statut: 'termine', nom_voyageur: 'Marie Curie' }),
    ]) as typeof fetch
    const onEditSejour = vi.fn()
    const user = userEvent.setup()

    render(
      <SejoursListeSection appartements={[]} catalogue={[]} onNavigateToCreer={vi.fn()} onEditSejour={onEditSejour} />,
    )

    await screen.findByText('2 séjours trouvés')

    const editButtonAVenir = screen.getByRole('button', { name: /modifier le séjour de jean dupont/i })
    expect(editButtonAVenir).not.toBeDisabled()
    await user.click(editButtonAVenir)
    expect(onEditSejour).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))

    const editButtonTermine = screen.getByRole('button', { name: /modifier le séjour de marie curie/i })
    expect(editButtonTermine).toBeDisabled()
  })

  it('l\'icône œil affiche le détail du séjour, avec un bouton de retour', async () => {
    globalThis.fetch = mockFetchSejours([sejourFixture()]) as typeof fetch
    const user = userEvent.setup()

    render(
      <SejoursListeSection appartements={[]} catalogue={[]} onNavigateToCreer={vi.fn()} onEditSejour={vi.fn()} />,
    )

    await screen.findByText('1 séjours trouvés')
    await user.click(screen.getByRole('button', { name: /voir le détail du séjour de jean dupont/i }))

    expect(await screen.findByText(/confirmer le checkout/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour à la liste/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retour à la liste/i }))
    expect(await screen.findByText('1 séjours trouvés')).toBeInTheDocument()
  })

  it('applique initialStatutFilter dès le montage (venu du Dashboard)', async () => {
    globalThis.fetch = mockFetchSejours([
      sejourFixture({ id: 1, statut: 'a_venir' }),
      sejourFixture({ id: 2, statut: 'termine', nom_voyageur: 'Marie Curie' }),
    ]) as typeof fetch

    render(
      <SejoursListeSection
        appartements={[]}
        catalogue={[]}
        onNavigateToCreer={vi.fn()}
        onEditSejour={vi.fn()}
        initialStatutFilter="termine"
      />,
    )

    expect(await screen.findByText('1 séjours trouvés')).toBeInTheDocument()
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
    expect(screen.getByLabelText(/statut/i)).toHaveValue('termine')
  })

  it('affiche directement le détail via initialSejourId (venu du Dashboard), même hors de la page courante', async () => {
    const farAwaySejour = sejourFixture({ id: 42, nom_voyageur: 'Karim Benali' })
    globalThis.fetch = mockFetchSejours([sejourFixture({ id: 1 }), farAwaySejour]) as typeof fetch

    render(
      <SejoursListeSection
        appartements={[]}
        catalogue={[]}
        onNavigateToCreer={vi.fn()}
        onEditSejour={vi.fn()}
        initialSejourId={42}
      />,
    )

    expect(await screen.findByText(/confirmer le checkout/i)).toBeInTheDocument()
    expect(screen.getByText('Karim Benali')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retour à la liste/i })).toBeInTheDocument()
  })
})
