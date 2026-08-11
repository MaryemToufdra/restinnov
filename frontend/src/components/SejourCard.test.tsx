import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SejourCard } from './SejourCard'
import type { Sejour } from '../types'

const appartement = {
  id: 1,
  nom: 'Loft Bastille',
  adresse: 'A',
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
    statut: 'termine',
    plateforme_origine: 'airbnb',
    montant_mad: 1000,
    appartement,
    voyageurs: [],
    ...overrides,
  }
}

const noop = vi.fn().mockResolvedValue(undefined)

function renderCard(sejour: Sejour) {
  return render(
    <SejourCard
      sejour={sejour}
      catalogue={[]}
      onCheckout={noop}
      onValiderMission={noop}
      onUpdateMissionProduits={noop}
      onSignalerProduit={noop}
      onAddFraisMaintenance={noop}
      onDeleteFraisMaintenance={noop}
    />,
  )
}

describe('SejourCard', () => {
  it('affiche la référence du séjour', () => {
    renderCard(sejourFixture({ reference: 'SEJ-0042' }))
    expect(screen.getByTestId('sejour-reference')).toHaveTextContent('SEJ-0042')
  })

  it('affiche le badge "Nouveau" quand la mission n\'a pas encore été vue par l\'agent', () => {
    renderCard(
      sejourFixture({
        mission_menage: {
          id: 10,
          sejour_id: 1,
          agent_id: 5,
          statut: 'a_faire',
          agent: { id: 5, nom: 'Fatima Z.', role: 'menage', telephone: null },
          frais_forfait: 0,
          vue: false,
          produits: [],
        },
      }),
    )

    expect(screen.getByTestId('mission-nouvelle-badge')).toBeInTheDocument()
  })

  it('n\'affiche pas le badge quand la mission a déjà été vue', () => {
    renderCard(
      sejourFixture({
        mission_menage: {
          id: 10,
          sejour_id: 1,
          agent_id: 5,
          statut: 'a_faire',
          agent: { id: 5, nom: 'Fatima Z.', role: 'menage', telephone: null },
          frais_forfait: 0,
          vue: true,
          produits: [],
        },
      }),
    )

    expect(screen.queryByTestId('mission-nouvelle-badge')).not.toBeInTheDocument()
  })

  it('affiche "Valider" quand la mission est en_attente_validation, et l\'appelle au clic', async () => {
    const user = userEvent.setup()
    const onValiderMission = vi.fn().mockResolvedValue(undefined)

    render(
      <SejourCard
        sejour={sejourFixture({
          mission_menage: {
            id: 10,
            sejour_id: 1,
            agent_id: 5,
            statut: 'en_attente_validation',
            agent: { id: 5, nom: 'Fatima Z.', role: 'menage', telephone: null },
            frais_forfait: 0,
            vue: true,
            produits: [],
          },
        })}
        catalogue={[]}
        onCheckout={noop}
        onValiderMission={onValiderMission}
        onUpdateMissionProduits={noop}
        onSignalerProduit={noop}
        onAddFraisMaintenance={noop}
        onDeleteFraisMaintenance={noop}
      />,
    )

    expect(screen.getByText('En attente de validation')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /valider/i }))

    expect(onValiderMission).toHaveBeenCalledWith(10)
  })

  it('n\'affiche pas "Valider" quand la mission est a_faire', () => {
    renderCard(
      sejourFixture({
        mission_menage: {
          id: 10,
          sejour_id: 1,
          agent_id: 5,
          statut: 'a_faire',
          agent: { id: 5, nom: 'Fatima Z.', role: 'menage', telephone: null },
          frais_forfait: 0,
          vue: true,
          produits: [],
        },
      }),
    )

    expect(screen.queryByRole('button', { name: /^valider$/i })).not.toBeInTheDocument()
  })
})
