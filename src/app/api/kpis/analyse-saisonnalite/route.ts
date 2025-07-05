import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAnalyseSaisonnalite, type AnalyseSaisonnaliteParams, type AnalyseSaisonnaliteResult } from '@/lib/queries/analyse-saisonnalite'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalyseSaisonnaliteResult>>> {
  try {
    const body = await request.json() as AnalyseSaisonnaliteParams

    // Validation des paramètres optionnels
    if (body.periode_historique_annees && (body.periode_historique_annees < 1 || body.periode_historique_annees > 10)) {
      return NextResponse.json({
        success: false,
        error: 'La période historique doit être entre 1 et 10 années'
      }, { status: 400 })
    }

    if (body.seuil_amplitude_forte && (body.seuil_amplitude_forte < 0.5 || body.seuil_amplitude_forte > 5.0)) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil d\'amplitude forte doit être entre 0.5 et 5.0'
      }, { status: 400 })
    }

    if (body.seuil_amplitude_moyenne && (body.seuil_amplitude_moyenne < 0.2 || body.seuil_amplitude_moyenne > 3.0)) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil d\'amplitude moyenne doit être entre 0.2 et 3.0'
      }, { status: 400 })
    }

    if (body.nb_mois_prevision && (body.nb_mois_prevision < 1 || body.nb_mois_prevision > 24)) {
      return NextResponse.json({
        success: false,
        error: 'Le nombre de mois de prévision doit être entre 1 et 24'
      }, { status: 400 })
    }

    // Vérification cohérence des seuils
    const seuilForte = body.seuil_amplitude_forte || 1.5
    const seuilMoyenne = body.seuil_amplitude_moyenne || 0.8

    if (seuilMoyenne >= seuilForte) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil amplitude moyenne doit être inférieur au seuil amplitude forte'
      }, { status: 400 })
    }

    const result = await getAnalyseSaisonnalite({ client: supabase }, body)

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