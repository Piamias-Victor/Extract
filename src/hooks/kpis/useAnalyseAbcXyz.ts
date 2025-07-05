'use client'

import { useState } from 'react'
import type { AnalyseAbcXyzResult, AnalyseAbcXyzParams } from '@/lib/queries/analyse-abc-xyz'
import type { ApiResponse } from '@/types/api'

interface UseAnalyseAbcXyzReturn {
  result: AnalyseAbcXyzResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  analyserAbcXyz: (params: AnalyseAbcXyzParams) => Promise<void>
}

export function useAnalyseAbcXyz(): UseAnalyseAbcXyzReturn {
  const [result, setResult] = useState<AnalyseAbcXyzResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const analyserAbcXyz = async (params: AnalyseAbcXyzParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/analyse-abc-xyz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<AnalyseAbcXyzResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors de l\'analyse ABC/XYZ')
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
    analyserAbcXyz
  }
}