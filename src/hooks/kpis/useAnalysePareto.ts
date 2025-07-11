'use client'

import { useState } from 'react'
import type { AnalyseParetoResult, AnalyseParetoParams } from '@/lib/queries/analyse-pareto'
import type { ApiResponse } from '@/types/api'

interface UseAnalyseParetoReturn {
  result: AnalyseParetoResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  analyserPareto: (params: AnalyseParetoParams) => Promise<void>
}

export function useAnalysePareto(): UseAnalyseParetoReturn {
  const [result, setResult] = useState<AnalyseParetoResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const analyserPareto = async (params: AnalyseParetoParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/analyse-pareto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<AnalyseParetoResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors de l\'analyse Pareto')
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
    analyserPareto
  }
}