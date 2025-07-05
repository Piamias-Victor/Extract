export interface KpiOption {
  id: string
  label: string
  description: string
  endpoint: string
}

export interface KpiParameters {
  [key: string]: string | number | boolean | Date | null | undefined
}

export interface KpiResult<T = unknown> {
  data: T
  sql?: string | undefined
  executionTime?: number | undefined
  count?: number | undefined
}

export interface KpiResponse<T = unknown> {
  success: boolean
  result?: KpiResult<T>
  error?: string
}