export type SejourStatut = 'a_venir' | 'en_cours' | 'termine'

export type MissionStatut = 'a_faire' | 'en_cours' | 'conforme' | 'non_conforme'

export type PlateformeOrigine = 'airbnb' | 'direct' | 'autre' | 'booking'

export type ProduitSignaleStatut = 'en_attente' | 'valide' | 'rejete'

export interface ChecklistModele {
  id: number
  nom: string
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
}

export interface Agent {
  id: number
  nom: string
  role: string
  telephone: string | null
  adresse?: string | null
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
  produits?: ProduitCatalogue[]
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
}

export interface DashboardAppartement {
  id: number
  nom: string
  statut: string
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
}
