export type SejourStatut = 'a_venir' | 'en_cours' | 'termine'

export type MissionStatut = 'a_faire' | 'en_cours' | 'en_attente_validation' | 'conforme' | 'non_conforme'

export type PlateformeOrigine = 'airbnb' | 'direct' | 'autre' | 'booking'

export type ProduitSignaleStatut = 'en_attente' | 'valide' | 'rejete'

export type TicketMaintenanceUrgence = 'basse' | 'normale' | 'haute'

export type TicketMaintenanceStatut = 'ouvert' | 'assigne' | 'resolu'

export interface ChecklistModeleItem {
  id: number
  checklist_modele_id: number
  libelle: string
  ordre: number
}

export interface ChecklistModele {
  id: number
  nom: string
  items?: ChecklistModeleItem[]
}

export interface ChecklistItem {
  id: number
  mission_menage_id: number
  libelle: string
  coche: boolean
  photo_url: string | null
  ordre: number
}

export interface Appartement {
  id: number
  nom: string
  adresse: string
  statut: string
  photo_principale: string | null
  checklist_modele_id: number | null
  agent_habituel_id: number | null
  checklist_modele?: ChecklistModele | null
  agent_habituel?: Agent | null
  sejours_count?: number
  dernier_sejour?: string | null
}

export interface Agent {
  id: number
  nom: string
  role: string
  telephone: string | null
  adresse?: string | null
  actif?: boolean
  appartements_habituel_count?: number
  mission_menages_count?: number
}

export interface ProduitCatalogue {
  id: number
  nom: string
  prix: string | number
  actif: boolean
}

export interface ProduitMenageSignale {
  id: number
  mission_menage_id: number
  photo_url: string
  note: string | null
  statut: ProduitSignaleStatut
  produit_catalogue_id: number | null
  produit_catalogue?: ProduitCatalogue | null
  mission_menage?: MissionMenage & { sejour?: Sejour }
}

export interface MissionMenage {
  id: number
  sejour_id: number
  agent_id: number | null
  statut: MissionStatut
  agent: Agent | null
  frais_forfait: string | number
  vue: boolean
  produits?: ProduitCatalogue[]
  checklist_items?: ChecklistItem[]
  sejour?: { id: number; appartement: Appartement | null } | null
}

export interface TicketMaintenance {
  id: number
  appartement_id: number
  mission_origine_id: number | null
  agent_id: number | null
  description: string | null
  photo_url: string | null
  audio_url: string | null
  urgence: TicketMaintenanceUrgence
  statut: TicketMaintenanceStatut
  appartement?: Appartement | null
  agent?: Agent | null
  mission_origine?: (Omit<MissionMenage, 'sejour'> & { sejour?: Sejour | null }) | null
}

export type VoyageurType = 'adulte' | 'enfant'

export interface Voyageur {
  id?: number
  nom: string
  numero_passeport: string | null
  est_principal: boolean
  type: VoyageurType
}

export interface FraisMaintenance {
  id: number
  sejour_id: number
  description: string
  prix: string | number
}

export interface Sejour {
  id: number
  reference: string
  appartement_id: number
  date_arrivee: string
  date_depart: string
  nom_voyageur: string
  statut: SejourStatut
  plateforme_origine: PlateformeOrigine
  montant_mad: string | number | null
  appartement?: Appartement
  mission_menage?: MissionMenage | null
  voyageurs?: Voyageur[]
  frais_maintenance?: FraisMaintenance[]
  voyageurs_count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface DashboardAppartement {
  id: number
  nom: string
  statut: string
  sejours_count: number
  dernier_sejour: string | null
}

export interface DashboardSejourRecent {
  id: number
  nom_voyageur: string
  date_arrivee: string
  statut: SejourStatut
  appartement: { id: number; nom: string } | null
}

export interface DashboardData {
  revenus_totaux: number
  frais_menage_totaux: number
  frais_maintenance_totaux: number
  resultat_net: number
  appartements: DashboardAppartement[]
  sejours_par_statut: {
    a_venir: number
    en_cours: number
    termine: number
  }
  sejours_recents: DashboardSejourRecent[]
}
