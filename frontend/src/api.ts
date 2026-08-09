import type {
  Agent,
  Appartement,
  ChecklistModele,
  DashboardData,
  FraisMaintenance,
  MissionMenage,
  PaginatedResponse,
  PlateformeOrigine,
  ProduitCatalogue,
  ProduitMenageSignale,
  Sejour,
  SejourStatut,
  Voyageur,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function resolveStorageUrl(path: string): string {
  return `${API_BASE_URL}/storage/${path}`
}

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

export interface NewUtilisateurInput {
  nom: string
  role: 'menage' | 'maintenance'
  telephone: string | null
  adresse?: string | null
  password?: string | null
  appartement_ids?: number[]
}

export interface NewProduitCatalogueInput {
  nom: string
  prix: number
}

export interface UpdateMissionMenageProduitsInput {
  frais_forfait: number
  produit_ids: number[]
}

export interface SignalerProduitInput {
  photo: File
  note?: string | null
}

export interface ValiderProduitSignaleInput {
  nom: string
  prix: number
}

export interface NewFraisMaintenanceInput {
  description: string
  prix: number
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

export interface FetchAppartementsListeParams {
  search?: string
  statut?: string
  sort_by?: 'nom'
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export async function fetchAppartementsListe(
  params: FetchAppartementsListeParams = {},
): Promise<PaginatedResponse<Appartement>> {
  const url = new URL(`${API_BASE_URL}/api/appartements`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  if (!url.searchParams.has('page')) url.searchParams.set('page', '1')

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function updateAppartement(id: number, input: NewAppartementInput): Promise<Appartement> {
  const formData = new FormData()
  formData.append('nom', input.nom)
  formData.append('adresse', input.adresse)
  if (input.photo) formData.append('photo', input.photo)
  if (input.checklist_modele_id) formData.append('checklist_modele_id', String(input.checklist_modele_id))
  if (input.agent_habituel_id) formData.append('agent_habituel_id', String(input.agent_habituel_id))
  formData.append('_method', 'PATCH')

  const response = await fetch(`${API_BASE_URL}/api/appartements/${id}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
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

export async function createUtilisateur(input: NewUtilisateurInput): Promise<Agent> {
  const response = await fetch(`${API_BASE_URL}/api/utilisateurs`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export interface FetchSejoursParams {
  search?: string
  statut?: SejourStatut
  appartement_id?: number
  date_debut?: string
  date_fin?: string
  sort_by?: 'date_arrivee' | 'date_depart'
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export async function fetchSejours(params: FetchSejoursParams = {}): Promise<PaginatedResponse<Sejour>> {
  const url = new URL(`${API_BASE_URL}/api/sejours`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function fetchSejour(id: number): Promise<Sejour> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${id}`, {
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

export async function updateSejour(id: number, input: NewSejourInput): Promise<Sejour> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${id}`, {
    method: 'PATCH',
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

export async function fetchProduitsCatalogue(): Promise<ProduitCatalogue[]> {
  const response = await fetch(`${API_BASE_URL}/api/produits-catalogue`, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function createProduitCatalogue(input: NewProduitCatalogueInput): Promise<ProduitCatalogue> {
  const response = await fetch(`${API_BASE_URL}/api/produits-catalogue`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function updateMissionMenageProduits(
  missionMenageId: number,
  input: UpdateMissionMenageProduitsInput,
): Promise<MissionMenage> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}/produits`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function marquerMissionMenageVue(missionMenageId: number): Promise<MissionMenage> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}/vue`, {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function signalerProduit(
  missionMenageId: number,
  input: SignalerProduitInput,
): Promise<ProduitMenageSignale> {
  const formData = new FormData()
  formData.append('photo', input.photo)
  if (input.note) formData.append('note', input.note)

  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}/produits-signales`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  })

  return parseJsonOrThrow(response)
}

export async function fetchProduitsSignales(statut?: string): Promise<ProduitMenageSignale[]> {
  const url = new URL(`${API_BASE_URL}/api/produits-signales`)
  if (statut) url.searchParams.set('statut', statut)

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function validerProduitSignale(
  id: number,
  input: ValiderProduitSignaleInput,
): Promise<ProduitMenageSignale> {
  const response = await fetch(`${API_BASE_URL}/api/produits-signales/${id}/valider`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function rejeterProduitSignale(id: number): Promise<ProduitMenageSignale> {
  const response = await fetch(`${API_BASE_URL}/api/produits-signales/${id}/rejeter`, {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}

export async function createFraisMaintenance(
  sejourId: number,
  input: NewFraisMaintenanceInput,
): Promise<FraisMaintenance> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${sejourId}/frais-maintenance`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function deleteFraisMaintenance(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/frais-maintenance/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', data?.errors)
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
    headers: { Accept: 'application/json' },
  })

  return parseJsonOrThrow(response)
}
