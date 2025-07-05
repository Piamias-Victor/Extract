'use client'

import { useState } from 'react'
import type { AnalyseMargeResult, AnalyseMargeParams } from '@/lib/queries/analyse-marge'
import type { ApiResponse } from '@/types/api'

interface UseAnalyseMargeReturn {
  result: AnalyseMargeResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  analyserMarge: (params: AnalyseMargeParams) => Promise<void>
}

export function useAnalyseMarge(): UseAnalyseMargeReturn {
  const [result, setResult] = useState<AnalyseMargeResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const analyserMarge = async (params: AnalyseMargeParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/analyse-marge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<AnalyseMargeResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors de l\'analyse des marges')
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
    analyserMarge
  }
}