import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCaTtc, type CaTtcParams, type CaTtcResult } from '@/lib/queries/ca-ttc'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CaTtcResult>>> {
  try {
    const body = await request.json() as CaTtcParams

    // Validation des paramètres obligatoires
    if (!body.date_debut || !body.date_fin) {
      return NextResponse.json({
        success: false,
        error: 'Les paramètres date_debut et date_fin sont obligatoires'
      }, { status: 400 })
    }

    // Validation du format des dates
    const dateDebut = new Date(body.date_debut)
    const dateFin = new Date(body.date_fin)
    
    if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Format de date invalide. Utilisez YYYY-MM-DD'
      }, { status: 400 })
    }

    if (dateDebut > dateFin) {
      return NextResponse.json({
        success: false,
        error: 'La date de début doit être antérieure à la date de fin'
      }, { status: 400 })
    }

    const result = await getCaTtc({ client: supabase }, body)

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