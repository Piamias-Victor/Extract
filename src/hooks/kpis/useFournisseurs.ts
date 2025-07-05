'use client'

import { useState, useEffect, useMemo } from 'react'
import type { FournisseurWithPharmacie } from '@/lib/queries/fournisseurs'
import type { ApiResponse } from '@/types/api'
import { normalizeForSearch } from '@/lib/utils'

interface UseFournisseursReturn {
  fournisseurs: FournisseurWithPharmacie[]
  filteredFournisseurs: FournisseurWithPharmacie[]
  loading: boolean
  error: string | null
  search: string
  setSearch: (search: string) => void
  sql: string | null
  executionTime: number | null
  count: number
}

export function useFournisseurs(): UseFournisseursReturn {
  const [fournisseurs, setFournisseurs] = useState<FournisseurWithPharmacie[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  // Fetch initial des fournisseurs
  useEffect(() => {
    const fetchFournisseurs = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/kpis/fournisseurs')
        const result: ApiResponse<FournisseurWithPharmacie[]> = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Erreur lors du chargement')
        }

        setFournisseurs(result.data || [])
        setSql(result.sql || null)
        setExecutionTime(result.executionTime || null)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchFournisseurs()
  }, [])

  // Filtrage en temps réel côté client
  const filteredFournisseurs = useMemo(() => {
    if (!search.trim()) {
      return fournisseurs
    }

    const searchNormalized = normalizeForSearch(search)
    
    return fournisseurs.filter(fournisseur => {
      return (
        normalizeForSearch(fournisseur.nom_fournisseur).includes(searchNormalized) ||
        normalizeForSearch(fournisseur.code_fournisseur).includes(searchNormalized) ||
        normalizeForSearch(fournisseur.nom_pharmacie).includes(searchNormalized)
      )
    })
  }, [fournisseurs, search])

  return {
    fournisseurs,
    filteredFournisseurs,
    loading,
    error,
    search,
    setSearch,
    sql,
    executionTime,
    count: filteredFournisseurs.length
  }
}