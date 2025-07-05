'use client'

import { useState } from 'react'
import type { EvolutionsResult, EvolutionsParams } from '@/lib/queries/evolutions'
import type { ApiResponse } from '@/types/api'

interface UseEvolutionsReturn {
  result: EvolutionsResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  calculateEvolutions: (params: EvolutionsParams) => Promise<void>
}

export function useEvolutions(): UseEvolutionsReturn {
  const [result, setResult] = useState<EvolutionsResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const calculateEvolutions = async (params: EvolutionsParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/evolutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<EvolutionsResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors du calcul des évolutions')
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
    calculateEvolutions
  }
}