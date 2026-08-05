import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardSection } from './DashboardSection'
import type { DashboardData } from '../types'

const data: DashboardData = {
  revenus_totaux: 1800,
  frais_menage_totaux: 100,
  frais_maintenance_totaux: 350,
  resultat_net: 1350,
  appartements: [
    { id: 1, nom: 'Loft Bastille', statut: 'disponible' },
    { id: 2, nom: 'Zenith', statut: 'occupe' },
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

  it('liste les appartements avec leur statut', () => {
    render(<DashboardSection data={data} loading={false} error={null} />)

    expect(screen.getByText('Loft Bastille')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Zenith')).toBeInTheDocument()
    expect(screen.getByText('occupe')).toBeInTheDocument()
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
