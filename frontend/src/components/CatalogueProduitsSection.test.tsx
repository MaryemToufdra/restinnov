import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CatalogueProduitsSection } from './CatalogueProduitsSection'
import type { ProduitCatalogue } from '../types'

const catalogue: ProduitCatalogue[] = [
  { id: 1, nom: 'Javel', prix: '12.00', photo_url: null, actif: true },
  { id: 2, nom: 'Ancien produit', prix: '5.00', photo_url: 'produits-catalogue/ancien.jpg', actif: false },
]

describe('CatalogueProduitsSection', () => {
  it('affiche les produits existants avec leur statut actif/inactif', () => {
    render(<CatalogueProduitsSection catalogue={catalogue} onCreate={vi.fn()} />)

    expect(screen.getByText(/Javel/)).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('Inactif')).toBeInTheDocument()
  })

  it('affiche la photo du produit quand présente', () => {
    render(<CatalogueProduitsSection catalogue={catalogue} onCreate={vi.fn()} />)

    expect(screen.getByAltText('Photo de "Ancien produit"')).toBeInTheDocument()
    expect(screen.queryByAltText('Photo de "Javel"')).not.toBeInTheDocument()
  })

  it('soumet le formulaire d\'ajout rapide avec nom, prix et sans photo', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<CatalogueProduitsSection catalogue={catalogue} onCreate={onCreate} />)

    await user.type(screen.getByLabelText(/nom du produit/i), 'Désinfectant')
    await user.clear(screen.getByLabelText(/prix/i))
    await user.type(screen.getByLabelText(/prix/i), '20')
    await user.click(screen.getByRole('button', { name: /ajouter/i }))

    expect(onCreate).toHaveBeenCalledWith({ nom: 'Désinfectant', prix: 20, photo: null })
  })

  it('inclut la photo sélectionnée dans la soumission', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<CatalogueProduitsSection catalogue={catalogue} onCreate={onCreate} />)

    const photo = new File(['x'], 'produit.jpg', { type: 'image/jpeg' })
    await user.type(screen.getByLabelText(/nom du produit/i), 'Désinfectant')
    await user.upload(screen.getByLabelText(/^photo/i), photo)
    await user.click(screen.getByRole('button', { name: /ajouter/i }))

    expect(onCreate).toHaveBeenCalledWith({ nom: 'Désinfectant', prix: 0, photo })
  })

  it('exige un nom', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<CatalogueProduitsSection catalogue={catalogue} onCreate={onCreate} />)

    await user.click(screen.getByRole('button', { name: /ajouter/i }))

    expect(await screen.findByText(/obligatoire/i)).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
