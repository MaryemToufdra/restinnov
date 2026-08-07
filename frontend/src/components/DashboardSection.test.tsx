import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DashboardSection } from './DashboardSection'
import type { DashboardData } from '../types'

const data: DashboardData = {
  revenus_totaux: 1800,
  frais_menage_totaux: 100,
  frais_maintenance_totaux: 350,
  resultat_net: 1350,
  appartements: [
    { id: 1, nom: 'Loft Bastille', statut: 'disponible', sejours_count: 3, dernier_sejour: '2026-03-05' },
    { id: 2, nom: 'Zenith', statut: 'occupe', sejours_count: 0, dernier_sejour: null },
  ],
  sejours_par_statut: { a_venir: 2, en_cours: 1, termine: 3 },
  sejours_recents: [
    {
      id: 10,
      nom_voyageur: 'Jean Dupont',
      date_arrivee: '2026-08-01',
      statut: 'a_venir',
      appartement: { id: 1, nom: 'Loft Bastille' },
    },
    {
      id: 11,
      nom_voyageur: 'Marie Curie',
      date_arrivee: '2026-07-20',
      statut: 'termine',
      appartement: { id: 2, nom: 'Zenith' },
    },
  ],
}

describe('DashboardSection', () => {
  it('affiche un message de chargement', () => {
    render(<DashboardSection data={null} loading={true} error={null} />)

    expect(screen.getByText(/chargement du dashboard/i)).toBeInTheDocument()
  })

  it('affiche une erreur si le chargement échoue', () => {
    render(<DashboardSection data={null} loading={false} error="Impossible de charger le dashboard." />)

    expect(screen.getByText('Impossible de charger le dashboard.')).toBeInTheDocument()
  })

  it('affiche les agrégats financiers', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByTestId('dashboard-revenus-totaux')).toHaveTextContent('1800.00 MAD')
    expect(screen.getByTestId('dashboard-frais-menage-totaux')).toHaveTextContent('100.00 MAD')
    expect(screen.getByTestId('dashboard-frais-maintenance-totaux')).toHaveTextContent('350.00 MAD')
    expect(screen.getByTestId('dashboard-resultat-net')).toHaveTextContent('1350.00 MAD')
  })

  it('donne une couleur d\'accent distincte à chacune des 4 cartes de statistiques', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByTestId('dashboard-revenus-totaux').closest('div.rounded-lg')).toHaveClass('border-emerald-200')
    expect(screen.getByTestId('dashboard-frais-menage-totaux').closest('div.rounded-lg')).toHaveClass('border-orange-200')
    expect(screen.getByTestId('dashboard-frais-maintenance-totaux').closest('div.rounded-lg')).toHaveClass('border-red-200')
    expect(screen.getByTestId('dashboard-resultat-net').closest('div.rounded-lg')).toHaveClass('border-blue-200')
  })

  it('affiche un effet de survol sur les cartes de statistiques', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByTestId('dashboard-revenus-totaux').closest('div.rounded-lg')).toHaveClass('hover:shadow-md')
  })

  it('affiche le nombre de séjours par statut sous forme de mini-cartes cliquables', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByRole('button', { name: /2\s*à venir/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\s*en cours/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3\s*terminé/i })).toBeInTheDocument()
  })

  it('bascule vers la liste des séjours filtrée au clic sur une mini-carte de statut', async () => {
    const user = userEvent.setup()
    const onNavigateToSejoursListe = vi.fn()
    render(
      <DashboardSection
        data={data}
        loading={false}
        error={null}
        onNavigateToSejoursListe={onNavigateToSejoursListe}
      />,
    )

    await user.click(screen.getByRole('button', { name: /2\s*à venir/i }))

    expect(onNavigateToSejoursListe).toHaveBeenCalledWith('a_venir')
  })

  it('liste les appartements avec leur statut, nombre de séjours et dernier séjour', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByText('Loft Bastille')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(screen.getByText('05/03/2026')).toBeInTheDocument()
    expect(screen.getByText('Zenith')).toBeInTheDocument()
    expect(screen.getByText('occupe')).toBeInTheDocument()
    expect(screen.getByText('Aucun')).toBeInTheDocument()
  })

  it('précise que le résultat net n\'inclut pas la commission propriétaire', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByText(/commission propriétaire/i)).toBeInTheDocument()
  })

  it('bascule vers la section Appartements au clic sur une ligne du tableau', async () => {
    const user = userEvent.setup()
    const onNavigateToAppartements = vi.fn()
    render(
      <DashboardSection
        data={data}
        loading={false}
        error={null}
        onNavigateToAppartements={onNavigateToAppartements}
      />,
    )

    await user.click(screen.getByText('Loft Bastille'))

    expect(onNavigateToAppartements).toHaveBeenCalledTimes(1)
  })

  it('affiche un message quand il n\'y a aucun appartement', () => {
    render(
      <DashboardSection
        data={{ ...data, appartements: [] }}
        loading={false}
        error={null}
      />,
    )

    expect(screen.getByText(/aucun appartement pour le moment/i)).toBeInTheDocument()
  })

  it('affiche les séjours récents avec voyageur, appartement, date et statut', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByText('Séjours récents')).toBeInTheDocument()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText(/Loft Bastille · 01\/08\/2026/)).toBeInTheDocument()
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
    expect(screen.getByText(/Zenith · 20\/07\/2026/)).toBeInTheDocument()
  })

  it('affiche un message quand il n\'y a aucun séjour récent', () => {
    render(<DashboardSection data={{ ...data, sejours_recents: [] }} loading={false} error={null} />)

    expect(screen.getByText(/aucun séjour pour le moment/i)).toBeInTheDocument()
  })

  it('affiche le détail d\'un séjour au clic sur une ligne de "Séjours récents"', async () => {
    const user = userEvent.setup()
    const onNavigateToSejour = vi.fn()
    render(<DashboardSection data={data} loading={false} error={null} onNavigateToSejour={onNavigateToSejour} />)

    await user.click(screen.getByRole('button', { name: /jean dupont/i }))

    expect(onNavigateToSejour).toHaveBeenCalledWith(10)
  })

  it('bascule vers la liste complète des séjours au clic sur "Voir tous les séjours"', async () => {
    const user = userEvent.setup()
    const onNavigateToSejoursListe = vi.fn()
    render(
      <DashboardSection
        data={data}
        loading={false}
        error={null}
        onNavigateToSejoursListe={onNavigateToSejoursListe}
      />,
    )

    await user.click(screen.getByRole('button', { name: /voir tous les séjours/i }))

    expect(onNavigateToSejoursListe).toHaveBeenCalledWith()
  })

  it('affiche "Séjours récents" et "Appartements" côte à côte en grille à deux colonnes', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    const sejoursRecentsHeading = screen.getByText('Séjours récents')
    const appartementsHeading = screen.getByText('Appartements')
    const grid = sejoursRecentsHeading.closest('.grid')

    expect(grid).toHaveClass('lg:grid-cols-2')
    expect(grid).toContainElement(appartementsHeading)
  })
})
