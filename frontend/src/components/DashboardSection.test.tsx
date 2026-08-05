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

  it('affiche le nombre de séjours par statut', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByText('À venir')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
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
})
