import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NouvelAgentForm } from './NouvelAgentForm'

describe('NouvelAgentForm', () => {
  it('propose Agent de ménage et Agent de maintenance, ménage par défaut', () => {
    render(<NouvelAgentForm onSubmit={vi.fn()} />)

    const select = screen.getByRole('combobox', { name: /rôle/i })
    expect(select).toHaveValue('menage')
    expect(screen.getByRole('option', { name: 'Agent de ménage' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Agent de maintenance' })).toBeInTheDocument()
  })

  it('soumet le formulaire avec le payload attendu', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.selectOptions(screen.getByRole('combobox', { name: /rôle/i }), 'maintenance')
    await user.type(screen.getByLabelText(/téléphone/i), '0611111111')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Fatima Zahra',
      role: 'maintenance',
      telephone: '0611111111',
    })
  })

  it('envoie telephone à null quand il est laissé vide', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Karim B.')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Karim B.',
      role: 'menage',
      telephone: null,
    })
  })

  it('exige un nom', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { container } = render(<NouvelAgentForm onSubmit={onSubmit} />)

    container.querySelector('#agent_nom')?.removeAttribute('required')

    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(await screen.findByText(/obligatoire/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('le bouton Annuler réinitialise le formulaire', async () => {
    const user = userEvent.setup()
    render(<NouvelAgentForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.selectOptions(screen.getByRole('combobox', { name: /rôle/i }), 'maintenance')

    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.getByLabelText('Nom')).toHaveValue('')
    expect(screen.getByRole('combobox', { name: /rôle/i })).toHaveValue('menage')
  })
})
