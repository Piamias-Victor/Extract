import type { NextRequest } from 'next/server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T | null | undefined
  error?: string | undefined
  sql?: string | undefined
  executionTime?: number | undefined
  count?: number | undefined
}

export interface KpiRequest extends NextRequest {
  json(): Promise<Record<string, unknown>>
}

export interface QueryResult<T = unknown> {
  data: T[]
  count: number | null
  error: Error | null
}

export interface DatabaseError {
  code: string
  message: string
  details: string
  hint: string
}