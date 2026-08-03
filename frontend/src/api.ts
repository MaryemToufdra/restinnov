import type { Agent, Appartement, ChecklistModele, PlateformeOrigine, Sejour, Voyageur } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface NewSejourInput {
  appartement_id: number
  date_arrivee: string
  date_depart: string
  plateforme_origine: PlateformeOrigine
  montant_mad: number
  voyageurs: Voyageur[]
}

export interface NewAppartementInput {
  nom: string
  adresse: string
  photo: File | null
  checklist_modele_id: number | null
  agent_habituel_id: number | null
}

export class ApiError extends Error {
  readonly errors?: Record<string, string[]>

  constructor(message: string, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.errors = errors
  }
}

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', data?.errors)
  }

  return data
}

export async function fetchAppartements(): Promise<Appartement[]> {
  const response = await fetch(`${API_BASE_URL}/api/appartements`, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function createAppartement(input: NewAppartementInput): Promise<Appartement> {
  const formData = new FormData()
  formData.append('nom', input.nom)
  formData.append('adresse', input.adresse)
  if (input.photo) formData.append('photo', input.photo)
  if (input.checklist_modele_id) formData.append('checklist_modele_id', String(input.checklist_modele_id))
  if (input.agent_habituel_id) formData.append('agent_habituel_id', String(input.agent_habituel_id))

  const response = await fetch(`${API_BASE_URL}/api/appartements`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  })

  return parseJsonOrThrow(response)
}

export async function fetchChecklistModeles(): Promise<ChecklistModele[]> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modeles`, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function createChecklistModele(nom: string): Promise<ChecklistModele> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modeles`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nom }),
  })

  return parseJsonOrThrow(response)
}

export async function fetchUtilisateurs(role?: string): Promise<Agent[]> {
  const url = new URL(`${API_BASE_URL}/api/utilisateurs`)
  if (role) url.searchParams.set('role', role)

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function fetchSejours(): Promise<Sejour[]> {
  const response = await fetch(`${API_BASE_URL}/api/sejours`, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function createSejour(input: NewSejourInput): Promise<Sejour> {
  const response = await fetch(`${API_BASE_URL}/api/sejours`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function checkoutSejour(id: number): Promise<{
  sejour: Sejour
  mission_menage: Sejour['mission_menage']
}> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${id}/checkout`, {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}
