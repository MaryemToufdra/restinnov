import type {
  Agent,
  Appartement,
  ChecklistItem,
  ChecklistModele,
  ChecklistModeleItem,
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
const TOKEN_STORAGE_KEY = 'auth_token'

export function resolveStorageUrl(path: string): string {
  return `${API_BASE_URL}/storage/${path}`
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

/**
 * Every request's headers, always Accept: application/json plus the bearer
 * token when logged in. `extra` merges in per-request headers (e.g.
 * Content-Type for a JSON body) without every call site repeating this.
 */
function authHeaders(extra?: Record<string, string>): HeadersInit {
  const token = getStoredToken()

  return {
    Accept: 'application/json',
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * A 401 means the stored token is gone/invalid/expired -- drop it and tell
 * the app to fall back to the login screen. AuthProvider listens for this
 * event; api.ts stays decoupled from React/router state.
 */
function handleUnauthorized(response: Response): void {
  if (response.status === 401) {
    setStoredToken(null)
    window.dispatchEvent(new Event('auth:unauthorized'))
  }
}

export type Role = 'manager' | 'menage' | 'maintenance'

export interface LoginInput {
  telephone: string
  password: string
}

export interface LoginResponse {
  token: string
  id: number
  nom: string
  role: Role
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

/**
 * Always drops the local token, even if the server call fails (e.g. the
 * token was already invalid) -- from the user's point of view they are
 * logged out locally either way.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/logout`, {
      method: 'POST',
      headers: authHeaders(),
    })
  } finally {
    setStoredToken(null)
  }
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

  handleUnauthorized(response)

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', data?.errors)
  }

  return data
}

export async function fetchAppartements(): Promise<Appartement[]> {
  const response = await fetch(`${API_BASE_URL}/api/appartements`, {
    headers: authHeaders(),
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
    headers: authHeaders(),
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
    headers: authHeaders(),
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
    headers: authHeaders(),
    body: formData,
  })

  return parseJsonOrThrow(response)
}

export async function fetchChecklistModeles(): Promise<ChecklistModele[]> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modeles`, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function createChecklistModele(nom: string): Promise<ChecklistModele> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modeles`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nom }),
  })

  return parseJsonOrThrow(response)
}

export async function createChecklistModeleItem(
  checklistModeleId: number,
  libelle: string,
): Promise<ChecklistModeleItem> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modeles/${checklistModeleId}/items`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ libelle }),
  })

  return parseJsonOrThrow(response)
}

export async function deplacerChecklistModeleItem(
  itemId: number,
  direction: 'haut' | 'bas',
): Promise<ChecklistModeleItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modele-items/${itemId}/deplacer`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ direction }),
  })

  return parseJsonOrThrow(response)
}

export async function deleteChecklistModeleItem(itemId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/checklist-modele-items/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  handleUnauthorized(response)

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', data?.errors)
  }
}

export async function fetchUtilisateurs(role?: string): Promise<Agent[]> {
  const url = new URL(`${API_BASE_URL}/api/utilisateurs`)
  if (role) url.searchParams.set('role', role)

  const response = await fetch(url, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function createUtilisateur(input: NewUtilisateurInput): Promise<Agent> {
  const response = await fetch(`${API_BASE_URL}/api/utilisateurs`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
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
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function fetchSejour(id: number): Promise<Sejour> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${id}`, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function createSejour(input: NewSejourInput): Promise<Sejour> {
  const response = await fetch(`${API_BASE_URL}/api/sejours`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function updateSejour(id: number, input: NewSejourInput): Promise<Sejour> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
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
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function fetchProduitsCatalogue(): Promise<ProduitCatalogue[]> {
  const response = await fetch(`${API_BASE_URL}/api/produits-catalogue`, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function createProduitCatalogue(input: NewProduitCatalogueInput): Promise<ProduitCatalogue> {
  const response = await fetch(`${API_BASE_URL}/api/produits-catalogue`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
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
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function marquerMissionMenageVue(missionMenageId: number): Promise<MissionMenage> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}/vue`, {
    method: 'PATCH',
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function fetchMissionsAgent(agentId: number): Promise<MissionMenage[]> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages?agent_id=${agentId}`, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function fetchMissionMenage(missionMenageId: number): Promise<MissionMenage> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}`, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function ouvrirMissionMenage(missionMenageId: number): Promise<MissionMenage> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}/ouvrir`, {
    method: 'PATCH',
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function terminerMissionMenage(missionMenageId: number): Promise<MissionMenage> {
  const response = await fetch(`${API_BASE_URL}/api/mission-menages/${missionMenageId}/terminer`, {
    method: 'PATCH',
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export interface ToggleChecklistItemInput {
  coche?: boolean
  photo?: File
}

export async function toggleChecklistItem(
  checklistItemId: number,
  input: ToggleChecklistItemInput,
): Promise<ChecklistItem> {
  const formData = new FormData()
  formData.append('_method', 'PATCH')
  if (input.coche !== undefined) formData.append('coche', String(input.coche))
  if (input.photo) formData.append('photo', input.photo)

  const response = await fetch(`${API_BASE_URL}/api/checklist-items/${checklistItemId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
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
    headers: authHeaders(),
    body: formData,
  })

  return parseJsonOrThrow(response)
}

export async function fetchProduitsSignales(statut?: string): Promise<ProduitMenageSignale[]> {
  const url = new URL(`${API_BASE_URL}/api/produits-signales`)
  if (statut) url.searchParams.set('statut', statut)

  const response = await fetch(url, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function validerProduitSignale(
  id: number,
  input: ValiderProduitSignaleInput,
): Promise<ProduitMenageSignale> {
  const response = await fetch(`${API_BASE_URL}/api/produits-signales/${id}/valider`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function rejeterProduitSignale(id: number): Promise<ProduitMenageSignale> {
  const response = await fetch(`${API_BASE_URL}/api/produits-signales/${id}/rejeter`, {
    method: 'PATCH',
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}

export async function createFraisMaintenance(
  sejourId: number,
  input: NewFraisMaintenanceInput,
): Promise<FraisMaintenance> {
  const response = await fetch(`${API_BASE_URL}/api/sejours/${sejourId}/frais-maintenance`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  })

  return parseJsonOrThrow(response)
}

export async function deleteFraisMaintenance(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/frais-maintenance/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  handleUnauthorized(response)

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', data?.errors)
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
    headers: authHeaders(),
  })

  return parseJsonOrThrow(response)
}
