import type { Appartement, Sejour } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface NewSejourInput {
  appartement_id: number
  date_arrivee: string
  date_depart: string
  nom_voyageur: string
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
