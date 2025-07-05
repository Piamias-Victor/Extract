import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAnalyseStock, type AnalyseStockParams, type AnalyseStockResult } from '@/lib/queries/analyse-stock'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalyseStockResult>>> {
  try {
    const body = await request.json() as AnalyseStockParams

    // Validation des paramètres obligatoires
    if (typeof body.seuil_mois_stock !== 'number' || !body.mode) {
      return NextResponse.json({
        success: false,
        error: 'Les paramètres seuil_mois_stock (number) et mode ("dessous"|"dessus") sont obligatoires'
      }, { status: 400 })
    }

    // Validation du seuil de stock
    if (body.seuil_mois_stock < 0 || body.seuil_mois_stock > 120) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil de stock doit être entre 0 et 120 mois'
      }, { status: 400 })
    }

    // Validation du mode
    if (body.mode !== 'dessous' && body.mode !== 'dessus') {
      return NextResponse.json({
        success: false,
        error: 'Le mode doit être "dessous" ou "dessus"'
      }, { status: 400 })
    }

    const result = await getAnalyseStock({ client: supabase }, body)

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data[0] || null,
      sql: result.metadata.sql,
      executionTime: result.metadata.executionTime,
      count: result.metadata.count
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}