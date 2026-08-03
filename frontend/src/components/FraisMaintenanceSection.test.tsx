import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FraisMaintenanceSection } from './FraisMaintenanceSection'
import type { FraisMaintenance } from '../types'

const fraisMaintenance: FraisMaintenance[] = [
  { id: 1, sejour_id: 1, description: 'Réparation robinet', prix: '250.00' },
  { id: 2, sejour_id: 1, description: 'Changement ampoule', prix: '30.00' },
]

describe('FraisMaintenanceSection', () => {
  it('affiche la liste et le total en temps réel', () => {
    render(
      <FraisMaintenanceSection
        sejourId={1}
        fraisMaintenance={fraisMaintenance}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText(/Réparation robinet/)).toBeInTheDocument()
    expect(screen.getByText(/Changement ampoule/)).toBeInTheDocument()
    expect(screen.getByTestId('total-frais-maintenance-1')).toHaveTextContent('280.00 MAD')
  })

  it('ajoute un frais de maintenance', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(<FraisMaintenanceSection sejourId={1} fraisMaintenance={[]} onAdd={onAdd} onDelete={vi.fn()} />)

    await user.type(screen.getByLabelText('Description'), 'Peinture mur')
    await user.type(screen.getByLabelText('Prix'), '400')
    await user.click(screen.getByRole('button', { name: /ajouter/i }))

    expect(onAdd).toHaveBeenCalledWith(1, { description: 'Peinture mur', prix: 400 })
  })

  it('exige une description et un prix', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<FraisMaintenanceSection sejourId={1} fraisMaintenance={[]} onAdd={onAdd} onDelete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ajouter/i }))

    expect(await screen.findByText(/obligatoires/i)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('supprime un frais de maintenance', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <FraisMaintenanceSection
        sejourId={1}
        fraisMaintenance={fraisMaintenance}
        onAdd={vi.fn()}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByLabelText(/Supprimer Réparation robinet/i))

    expect(onDelete).toHaveBeenCalledWith(1)
  })
})
