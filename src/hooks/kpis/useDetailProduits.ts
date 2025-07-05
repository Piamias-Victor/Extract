'use client'

import { useState } from 'react'
import type { DetailProduitsResult, DetailProduitsParams } from '@/lib/queries/detail-produits'
import type { ApiResponse } from '@/types/api'

interface UseDetailProduitsReturn {
  result: DetailProduitsResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  searchProduits: (params?: DetailProduitsParams) => Promise<void>
  loadAllProduits: () => Promise<void>
}

export function useDetailProduits(): UseDetailProduitsReturn {
  const [result, setResult] = useState<DetailProduitsResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const searchProduits = async (params: DetailProduitsParams = {}): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/detail-produits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<DetailProduitsResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors de la recherche des produits')
      }

      setResult(apiResult.data || null)
      setSql(apiResult.sql || null)
      setExecutionTime(apiResult.executionTime || null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const loadAllProduits = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/detail-produits', {
        method: 'GET'
      })

      const apiResult: ApiResponse<DetailProduitsResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors du chargement des produits')
      }

      setResult(apiResult.data || null)
      setSql(apiResult.sql || null)
      setExecutionTime(apiResult.executionTime || null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return {
    result,
    loading,
    error,
    sql,
    executionTime,
    searchProduits,
    loadAllProduits
  }
}