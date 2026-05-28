import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_REFERENCE_RATE_PERCENT } from '../lib/constants'
import { supabase, rowToAnnualRate } from '../lib/supabase'
import { useAuthStore } from './useAuthStore'

// ============================================================
// MANITO — Store des paramètres annuels
//
// Même stratégie que useDaysStore :
//   • localStorage = cache immédiat
//   • Supabase = source de vérité (si connecté)
// ============================================================

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type AnnualRate = {
  year:                 number
  referenceRatePercent: number
}

// Taux horaire de base (€/h) et prime d'amplitude fixe (€)
// Stockés uniquement en localStorage — chaque utilisateur les configure.
export const DEFAULT_HOURLY_RATE    = 12.43
export const DEFAULT_AMPLITUDE_BONUS = 200

interface SettingsStore {
  annualRates: AnnualRate[]

  /** Taux horaire de base (€/h). */
  hourlyRate: number
  /** Prime d'amplitude mensuelle fixe (€). */
  amplitudeBonus: number

  /** Ajoute ou met à jour le taux d'une année. */
  setRateForYear: (year: number, rate: number) => void

  /** Supprime la config d'une année (retombe sur DEFAULT). */
  removeRateForYear: (year: number) => void

  /** Met à jour le taux horaire. */
  setHourlyRate: (rate: number) => void

  /** Met à jour la prime d'amplitude. */
  setAmplitudeBonus: (bonus: number) => void

  /** Vide les taux (déconnexion). */
  clearAll: () => void

  /**
   * Charge les taux depuis Supabase après connexion.
   * Migration automatique si Supabase est vide.
   */
  loadSettingsFromSupabase: (userId: string) => Promise<void>
}

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------

function getCurrentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

// ------------------------------------------------------------
// Store
// ------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      annualRates: [
        {
          year:                 new Date().getFullYear(),
          referenceRatePercent: DEFAULT_REFERENCE_RATE_PERCENT,
        },
      ],

      hourlyRate:    DEFAULT_HOURLY_RATE,
      amplitudeBonus: DEFAULT_AMPLITUDE_BONUS,

      // ── Rémunération ───────────────────────────────────────
      setHourlyRate:    (rate)  => set({ hourlyRate: rate }),
      setAmplitudeBonus: (bonus) => set({ amplitudeBonus: bonus }),

      // ── Ajout / mise à jour ────────────────────────────────
      setRateForYear: (year, rate) => {
        // 1. Local
        set((s) => {
          const exists = s.annualRates.some((r) => r.year === year)
          if (exists) {
            return {
              annualRates: s.annualRates.map((r) =>
                r.year === year ? { ...r, referenceRatePercent: rate } : r
              ),
            }
          }
          return {
            annualRates: [...s.annualRates, { year, referenceRatePercent: rate }],
          }
        })

        // 2. Supabase
        const userId = getCurrentUserId()
        if (!userId) return

        void (async () => {
          await supabase
            .from('annual_settings')
            .upsert(
              { user_id: userId, year, reference_rate: rate },
              { onConflict: 'user_id,year' }
            )
        })()
      },

      // ── Suppression ────────────────────────────────────────
      removeRateForYear: (year) => {
        // 1. Local
        set((s) => ({
          annualRates: s.annualRates.filter((r) => r.year !== year),
        }))

        // 2. Supabase
        const userId = getCurrentUserId()
        if (!userId) return

        void (async () => {
          await supabase
            .from('annual_settings')
            .delete()
            .eq('user_id', userId)
            .eq('year', year)
        })()
      },

      // ── Vider (déconnexion) ────────────────────────────────
      clearAll: () => set({ annualRates: [] }),

      // ── Chargement depuis Supabase après connexion ─────────
      loadSettingsFromSupabase: async (userId) => {
        const localRates = get().annualRates

        // ── Migration douce ───────────────────────────────────
        const { count } = await supabase
          .from('annual_settings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)

        if (count === 0 && localRates.length > 0) {
          await supabase
            .from('annual_settings')
            .upsert(
              localRates.map((r) => ({
                user_id:        userId,
                year:           r.year,
                reference_rate: r.referenceRatePercent,
              })),
              { onConflict: 'user_id,year' }
            )
        }

        // ── Chargement ────────────────────────────────────────
        const { data, error } = await supabase
          .from('annual_settings')
          .select('*')
          .eq('user_id', userId)
          .order('year', { ascending: false })

        if (!error && data && data.length > 0) {
          set({ annualRates: data.map(rowToAnnualRate) })
        }
      },
    }),
    { name: 'manito-settings' }
  )
)

// ------------------------------------------------------------
// Fonctions utilitaires exportées
// ------------------------------------------------------------

export function getRateForYear(annualRates: AnnualRate[], year: number): number {
  return (
    annualRates.find((r) => r.year === year)?.referenceRatePercent ??
    DEFAULT_REFERENCE_RATE_PERCENT
  )
}

export function useRateForYear(year: number): number {
  return useSettingsStore((s) => getRateForYear(s.annualRates, year))
}
