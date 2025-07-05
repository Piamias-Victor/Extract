import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAnalyseAbcXyz, type AnalyseAbcXyzParams, type AnalyseAbcXyzResult } from '@/lib/queries/analyse-abc-xyz'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalyseAbcXyzResult>>> {
  try {
    const body = await request.json() as AnalyseAbcXyzParams

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

    // Validation des seuils optionnels
    if (body.seuil_abc_a && (body.seuil_abc_a < 50 || body.seuil_abc_a > 95)) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil ABC A doit être entre 50 et 95%'
      }, { status: 400 })
    }

    if (body.seuil_abc_b && (body.seuil_abc_b < 85 || body.seuil_abc_b > 99)) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil ABC B doit être entre 85 et 99%'
      }, { status: 400 })
    }

    if (body.seuil_xyz_x && (body.seuil_xyz_x < 0.1 || body.seuil_xyz_x > 2.0)) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil XYZ X doit être entre 0.1 et 2.0'
      }, { status: 400 })
    }

    if (body.seuil_xyz_y && (body.seuil_xyz_y < 0.5 || body.seuil_xyz_y > 3.0)) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil XYZ Y doit être entre 0.5 et 3.0'
      }, { status: 400 })
    }

    const result = await getAnalyseAbcXyz({ client: supabase }, body)

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