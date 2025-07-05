'use client'

import { useState } from 'react'
import type { AnalyseStockResult, AnalyseStockParams } from '@/lib/queries/analyse-stock'
import type { ApiResponse } from '@/types/api'

interface UseAnalyseStockReturn {
  result: AnalyseStockResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  analyserStock: (params: AnalyseStockParams) => Promise<void>
}

export function useAnalyseStock(): UseAnalyseStockReturn {
  const [result, setResult] = useState<AnalyseStockResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const analyserStock = async (params: AnalyseStockParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/analyse-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<AnalyseStockResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors de l\'analyse des stocks')
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
    analyserStock
  }
}