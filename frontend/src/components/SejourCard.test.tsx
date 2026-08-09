import { render, screen, waitFor } from '@testing-library/react'
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

function renderCard(sejour: Sejour, onMissionVue = noop) {
  return render(
    <SejourCard
      sejour={sejour}
      catalogue={[]}
      onCheckout={noop}
      onUpdateMissionProduits={noop}
      onSignalerProduit={noop}
      onAddFraisMaintenance={noop}
      onDeleteFraisMaintenance={noop}
      onMissionVue={onMissionVue}
    />,
  )
}

describe('SejourCard', () => {
  it('affiche la référence du séjour', () => {
    renderCard(sejourFixture({ reference: 'SEJ-0042' }))
    expect(screen.getByTestId('sejour-reference')).toHaveTextContent('SEJ-0042')
  })

  it('affiche le badge "Nouveau" quand la mission n\'a pas encore été vue', () => {
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

  it('marque la mission comme vue dès que la carte du séjour est affichée', async () => {
    const onMissionVue = vi.fn().mockResolvedValue(undefined)
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
      onMissionVue,
    )

    await waitFor(() => expect(onMissionVue).toHaveBeenCalledWith(10))
  })

  it('ne rappelle pas onMissionVue quand la mission est déjà vue', async () => {
    const onMissionVue = vi.fn().mockResolvedValue(undefined)
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
      onMissionVue,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onMissionVue).not.toHaveBeenCalled()
  })
})
