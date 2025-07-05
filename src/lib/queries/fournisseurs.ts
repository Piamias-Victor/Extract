import type { QueryConfig, QueryResponse } from './types'

export interface FournisseurWithPharmacie {
  id: number
  code_fournisseur: string
  nom_fournisseur: string
  email: string | null
  telephone: string | null
  statut: string | null
  pharmacie_id: number
  nom_pharmacie: string
  created_at: string | null
}

export async function getAllFournisseurs(
  config: QueryConfig
): Promise<QueryResponse<FournisseurWithPharmacie>> {
  const startTime = Date.now()
  
  const query = config.client
    .from('fournisseurs')
    .select(`
      id,
      code_fournisseur,
      nom_fournisseur,
      email,
      telephone,
      statut,
      pharmacie_id,
      created_at,
      pharmacies!inner(nom_pharmacie)
    `)
    .order('nom_fournisseur', { ascending: true })

  const { data, error } = await query

  const executionTime = Date.now() - startTime

  if (error) {
    return {
      data: [],
      metadata: {
        sql: query.toString(),
        executionTime,
        count: 0
      },
      error: error.message
    }
  }

  // Flatten la structure des données
  const formattedData = (data || []).map(item => ({
    id: item.id,
    code_fournisseur: item.code_fournisseur,
    nom_fournisseur: item.nom_fournisseur,
    email: item.email,
    telephone: item.telephone,
    statut: item.statut,
    pharmacie_id: item.pharmacie_id,
    nom_pharmacie: (item.pharmacies as any).nom_pharmacie,
    created_at: item.created_at
  }))

  return {
    data: formattedData,
    metadata: {
      sql: `
SELECT 
  f.id,
  f.code_fournisseur,
  f.nom_fournisseur,
  f.email,
  f.telephone,
  f.statut,
  f.pharmacie_id,
  f.created_at,
  p.nom_pharmacie
FROM fournisseurs f
INNER JOIN pharmacies p ON f.pharmacie_id = p.id
ORDER BY f.nom_fournisseur ASC
      `.trim(),
      executionTime,
      count: formattedData.length
    }
  }
}