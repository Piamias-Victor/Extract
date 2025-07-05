export interface Database {
  public: {
    Tables: {
      pharmacies: {
        Row: {
          id: number
          nom_pharmacie: string
          code_interne: string
          adresse: string | null
          telephone: string | null
          email: string | null
          statut: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          nom_pharmacie: string
          code_interne: string
          adresse?: string | null
          telephone?: string | null
          email?: string | null
          statut?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          nom_pharmacie?: string
          code_interne?: string
          adresse?: string | null
          telephone?: string | null
          email?: string | null
          statut?: string | null
          created_at?: string | null
        }
      }
      familles: {
        Row: {
          id: number
          nom_famille: string
          parent_id: number | null
          niveau: number | null
          code_famille: string | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          nom_famille: string
          parent_id?: number | null
          niveau?: number | null
          code_famille?: string | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          nom_famille?: string
          parent_id?: number | null
          niveau?: number | null
          code_famille?: string | null
          description?: string | null
          created_at?: string | null
        }
      }
      fournisseurs: {
        Row: {
          id: number
          code_fournisseur: string
          nom_fournisseur: string
          email: string | null
          telephone: string | null
          statut: string | null
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          code_fournisseur: string
          nom_fournisseur: string
          email?: string | null
          telephone?: string | null
          statut?: string | null
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          code_fournisseur?: string
          nom_fournisseur?: string
          email?: string | null
          telephone?: string | null
          statut?: string | null
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      produits: {
        Row: {
          id: number
          ean13_principal: string
          designation: string
          tva: number | null
          famille_id: number | null
          statut: string | null
          pharmacie_id: number
          date_creation: string | null
          date_modification: string | null
        }
        Insert: {
          id?: number
          ean13_principal: string
          designation: string
          tva?: number | null
          famille_id?: number | null
          statut?: string | null
          pharmacie_id: number
          date_creation?: string | null
          date_modification?: string | null
        }
        Update: {
          id?: number
          ean13_principal?: string
          designation?: string
          tva?: number | null
          famille_id?: number | null
          statut?: string | null
          pharmacie_id?: number
          date_creation?: string | null
          date_modification?: string | null
        }
      }
      codes_ean13: {
        Row: {
          id: number
          produit_id: number | null
          ean13: string
          is_principal: boolean | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          ean13: string
          is_principal?: boolean | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          ean13?: string
          is_principal?: boolean | null
          description?: string | null
          created_at?: string | null
        }
      }
      prix_achats: {
        Row: {
          id: number
          produit_id: number | null
          fournisseur_id: number | null
          prix_achat_ht: number
          remise_ligne: number | null
          prix_net_ht: number | null
          date_import: string
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          fournisseur_id?: number | null
          prix_achat_ht: number
          remise_ligne?: number | null
          prix_net_ht?: number | null
          date_import: string
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          fournisseur_id?: number | null
          prix_achat_ht?: number
          remise_ligne?: number | null
          prix_net_ht?: number | null
          date_import?: string
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      stocks: {
        Row: {
          id: number
          produit_id: number | null
          quantite_rayon: number | null
          quantite_reserve: number | null
          stock_mini_rayon: number | null
          stock_maxi_rayon: number | null
          date_extraction: string
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          quantite_rayon?: number | null
          quantite_reserve?: number | null
          stock_mini_rayon?: number | null
          stock_maxi_rayon?: number | null
          date_extraction: string
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          quantite_rayon?: number | null
          quantite_reserve?: number | null
          stock_mini_rayon?: number | null
          stock_maxi_rayon?: number | null
          date_extraction?: string
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      prix_vente: {
        Row: {
          id: number
          produit_id: number | null
          prix_vente_ttc: number
          prix_promo_ttc: number | null
          date_debut_promo: string | null
          date_fin_promo: string | null
          date_extraction: string
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          prix_vente_ttc: number
          prix_promo_ttc?: number | null
          date_debut_promo?: string | null
          date_fin_promo?: string | null
          date_extraction: string
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          prix_vente_ttc?: number
          prix_promo_ttc?: number | null
          date_debut_promo?: string | null
          date_fin_promo?: string | null
          date_extraction?: string
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      ventes_mensuelles: {
        Row: {
          id: number
          produit_id: number | null
          annee: number
          mois: number
          quantite_vendue: number | null
          date_import: string
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          annee: number
          mois: number
          quantite_vendue?: number | null
          date_import: string
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          annee?: number
          mois?: number
          quantite_vendue?: number | null
          date_import?: string
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      produits_perimes: {
        Row: {
          id: number
          produit_id: number | null
          quantite_perimee: number
          prix_achat_unitaire: number | null
          valorisation: number | null
          date_constat: string | null
          statut: string | null
          photo_url: string | null
          commentaire: string | null
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          quantite_perimee: number
          prix_achat_unitaire?: number | null
          valorisation?: number | null
          date_constat?: string | null
          statut?: string | null
          photo_url?: string | null
          commentaire?: string | null
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          quantite_perimee?: number
          prix_achat_unitaire?: number | null
          valorisation?: number | null
          date_constat?: string | null
          statut?: string | null
          photo_url?: string | null
          commentaire?: string | null
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      saisonnalite: {
        Row: {
          id: number
          produit_id: number | null
          mois: number
          coefficient: number | null
          annee_reference: number | null
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          produit_id?: number | null
          mois: number
          coefficient?: number | null
          annee_reference?: number | null
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          produit_id?: number | null
          mois?: number
          coefficient?: number | null
          annee_reference?: number | null
          pharmacie_id?: number
          created_at?: string | null
        }
      }
      sync_logs: {
        Row: {
          id: number
          type_sync: string
          statut: string
          nb_records_traites: number | null
          message: string | null
          date_debut: string
          date_fin: string | null
          pharmacie_id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          type_sync: string
          statut: string
          nb_records_traites?: number | null
          message?: string | null
          date_debut: string
          date_fin?: string | null
          pharmacie_id: number
          created_at?: string | null
        }
        Update: {
          id?: number
          type_sync?: string
          statut?: string
          nb_records_traites?: number | null
          message?: string | null
          date_debut?: string
          date_fin?: string | null
          pharmacie_id?: number
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}