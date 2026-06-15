// ============================================================
// MANITO — Fichier central de calculs métier
// Toute logique de calcul doit rester ici.
// Aucun calcul complexe dans les composants React.
// ============================================================

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

/**
 * Données brutes saisies par le chauffeur pour une journée.
 * Ces valeurs proviennent directement du formulaire de saisie.
 */
export interface DayEntry {
  id?: string
  date: string          // ISO : "2026-04-27"
  drivingMins: number   // Temps de conduite en minutes
  workMins: number      // Temps de travail annexe en minutes
  startTime: string     // Heure de prise de service : "06:10"
  endTime: string       // Heure de fin de service   : "17:30"
}

/**
 * Statistiques calculées à partir d'une journée saisie.
 * Ces valeurs sont dérivées — jamais saisies manuellement.
 */
export interface DayStats {
  // --- Temps ---
  serviceMins: number             // Temps de service = conduite + annexe
  amplitudeMins: number | null    // Amplitude = fin - début (null si horaires invalides)

  // --- Taux ---
  serviceRatePercent: number      // TxService = workMins / serviceMins × 100
  amplitudeRatePercent: number | null  // TxAmp = serviceMins / amplitudeMins × 100

  // --- Écart journalier ---
  gapMins: number                 // Écart = drivingMins / coef - workMins
  gapSign: '+' | '-' | '='       // Signe de l'écart (pour l'affichage)
}

/**
 * Statistiques agrégées sur un mois (ou une semaine).
 * Calculées en passant un tableau de DayEntry.
 */
export interface MonthStats {
  daysCount: number
  totalDrivingMins: number
  totalWorkMins: number
  totalServiceMins: number
  totalAmplitudeMins: number      // Somme des amplitudes valides uniquement
  monthlyGapMins: number          // Écart mensuel cumulé
  avgServiceRatePercent: number   // Taux de service moyen sur la période
  avgAmplitudeRatePercent: number // TxAmp moyen sur la période
}

// ------------------------------------------------------------
// UTILITAIRES DE TEMPS
// ------------------------------------------------------------

/**
 * Convertit des minutes en format "HH:MM".
 * Gère les valeurs négatives avec un signe "-".
 *
 * minutesToHHMM(150)  → "02:30"
 * minutesToHHMM(-90)  → "-01:30"
 * minutesToHHMM(0)    → "00:00"
 */
export function minutesToHHMM(mins: number): string {
  const abs = Math.abs(mins)
  const h   = Math.floor(abs / 60)
  const m   = abs % 60
  const sign = mins < 0 ? '-' : ''
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Convertit des minutes en texte lisible : "2h30", "9h00", "-1h15".
 *
 * minutesToReadable(540)  → "9h00"
 * minutesToReadable(150)  → "2h30"
 * minutesToReadable(-75)  → "-1h15"
 */
export function minutesToReadable(mins: number): string {
  const abs  = Math.abs(mins)
  const h    = Math.floor(abs / 60)
  const m    = abs % 60
  const sign = mins < 0 ? '-' : ''
  return m === 0
    ? `${sign}${h}h`
    : `${sign}${h}h${String(m).padStart(2, '0')}`
}

/**
 * Convertit une chaîne "HH:MM" en minutes.
 * Retourne null si le format est invalide.
 *
 * hhmmToMinutes("07:15") → 435
 * hhmmToMinutes("00:00") → 0
 * hhmmToMinutes("abc")   → null
 */
export function hhmmToMinutes(hhmm: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null
  const parts = hhmm.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m) || m < 0 || m > 59 || h < 0) return null
  return h * 60 + m
}

// ------------------------------------------------------------
// 1. TEMPS DE SERVICE
// ------------------------------------------------------------

/**
 * Calcule le temps de service = conduite + annexe.
 *
 * calcServiceMins(420, 120) → 540  (soit 09h00)
 */
export function calcServiceMins(drivingMins: number, workMins: number): number {
  return drivingMins + workMins
}

// ------------------------------------------------------------
// 2. TAUX DE SERVICE (TxService)
// ------------------------------------------------------------

/**
 * Calcule le taux de service : part du temps annexe dans le temps de service.
 *   serviceRatePercent = workMins / serviceMins × 100
 *
 * Retourne 0 si serviceMins = 0 (jamais NaN ni Infinity).
 * Arrondi à 2 décimales.
 *
 * calcServiceRatePercent(120, 540) → 22.22
 * calcServiceRatePercent(0, 0)     → 0
 */
export function calcServiceRatePercent(workMins: number, serviceMins: number): number {
  if (serviceMins <= 0) return 0
  return Math.round((workMins / serviceMins) * 100 * 100) / 100
}

// ------------------------------------------------------------
// 3. AMPLITUDE
// ------------------------------------------------------------

/**
 * Calcule l'amplitude en minutes à partir de deux horaires "HH:MM".
 *   amplitudeMins = endTime - startTime
 *
 * Supporte les journées de nuit (fin le lendemain) :
 *   si endTime < startTime → on ajoute 24h (1440 min)
 *
 * Retourne null si :
 *   - l'un des formats est invalide
 *   - amplitude = 0 (même heure début/fin)
 *
 * calcAmplitudeMins("06:10", "17:30") → 680   (11h20, même jour)
 * calcAmplitudeMins("22:00", "13:00") → 900   (15h00, fin J+1)
 * calcAmplitudeMins("23:30", "04:30") → 300   (5h00,  fin J+1)
 * calcAmplitudeMins("abc",   "17:30") → null
 */
export function calcAmplitudeMins(startTime: string, endTime: string): number | null {
  const start = hhmmToMinutes(startTime)
  const end   = hhmmToMinutes(endTime)
  if (start === null || end === null) return null
  let amplitude = end - start
  if (amplitude < 0) amplitude += 24 * 60   // fin le lendemain (journée de nuit)
  if (amplitude === 0) return null            // même heure = invalide
  return amplitude
}

// ------------------------------------------------------------
// 4. TXAMP — Taux d'amplitude
// ------------------------------------------------------------

/**
 * Calcule le TxAmp : part du temps de service dans l'amplitude.
 *   amplitudeRatePercent = serviceMins / amplitudeMins × 100
 *
 * ATTENTION : c'est serviceMins / amplitudeMins, PAS workMins / amplitudeMins.
 *
 * Retourne null si amplitudeMins est null ou ≤ 0.
 * Arrondi à 2 décimales.
 *
 * calcAmplitudeRatePercent(540, 680) → 79.41
 * calcAmplitudeRatePercent(540, null) → null
 */
export function calcAmplitudeRatePercent(
  serviceMins: number,
  amplitudeMins: number | null
): number | null {
  if (amplitudeMins === null || amplitudeMins <= 0) return null
  return Math.round((serviceMins / amplitudeMins) * 100 * 100) / 100
}

// ------------------------------------------------------------
// 5. COEFFICIENT DE RÉFÉRENCE
// ------------------------------------------------------------

/**
 * Calcule le coefficient à partir du taux de référence annuel.
 *   coefficient = 100 / referenceRatePercent - 1
 *
 * Ce coefficient est utilisé dans le calcul de l'écart journalier.
 *
 * calcReferenceCoefficient(20) → 4.0
 * calcReferenceCoefficient(23) → 3.3478...
 *
 * Retourne null si referenceRatePercent ≤ 0 (division impossible).
 */
export function calcReferenceCoefficient(referenceRatePercent: number): number | null {
  if (referenceRatePercent <= 0) return null
  return 100 / referenceRatePercent - 1
}

// ------------------------------------------------------------
// 6. ÉCART JOURNALIER AU TAUX
// ------------------------------------------------------------

/**
 * Calcule l'écart journalier en minutes par rapport au taux de référence.
 *   gapMins = drivingMins / coefficient - workMins
 *
 * Interprétation :
 *   > 0  → minutes disponibles (on est en avance sur le taux)
 *   < 0  → minutes de retard  (on a trop de temps annexe)
 *   = 0  → parfaitement dans le taux
 *
 * Retourne null si referenceRatePercent ≤ 0.
 * Arrondi à l'entier le plus proche (minutes entières).
 *
 * calcGapMins(420, 90, 20)
 *   coef = 4  →  420 / 4 - 90  =  15  → "+00h15 disponibles"
 *
 * calcGapMins(420, 120, 20)
 *   coef = 4  →  420 / 4 - 120 = -15  → "-00h15 de retard"
 */
export function calcGapMins(
  drivingMins: number,
  workMins: number,
  referenceRatePercent: number
): number | null {
  const coef = calcReferenceCoefficient(referenceRatePercent)
  if (coef === null || coef === 0) return null
  return Math.round(drivingMins / coef - workMins)
}

// ------------------------------------------------------------
// 7. ÉCART MENSUEL CUMULÉ
// ------------------------------------------------------------

/**
 * Calcule l'écart cumulé sur un mois entier (même logique, données agrégées).
 *   monthlyGapMins = totalDrivingMins / coefficient - totalWorkMins
 *
 * calcMonthlyGapMins(8400, 1800, 20)
 *   coef = 4  →  8400 / 4 - 1800  =  300  → "+05h00"
 */
export function calcMonthlyGapMins(
  totalDrivingMins: number,
  totalWorkMins: number,
  referenceRatePercent: number
): number | null {
  return calcGapMins(totalDrivingMins, totalWorkMins, referenceRatePercent)
}

// ------------------------------------------------------------
// FONCTIONS COMPOSÉES
// ------------------------------------------------------------

/**
 * Calcule l'intégralité des statistiques d'une journée depuis les données brutes.
 * Fonction principale à appeler dans les composants React.
 *
 * Exemple :
 *   calcDayStats({ drivingMins: 420, workMins: 120, startTime: "06:10", endTime: "17:30" }, 20)
 *   → {
 *       serviceMins:            540,
 *       amplitudeMins:          680,
 *       serviceRatePercent:     22.22,
 *       amplitudeRatePercent:   79.41,
 *       gapMins:               -15,
 *       gapSign:               '-',
 *     }
 */
export function calcDayStats(
  entry: Pick<DayEntry, 'drivingMins' | 'workMins' | 'startTime' | 'endTime'>,
  referenceRatePercent: number
): DayStats {
  const serviceMins            = calcServiceMins(entry.drivingMins, entry.workMins)
  const amplitudeMins          = calcAmplitudeMins(entry.startTime, entry.endTime)
  const serviceRatePercent     = calcServiceRatePercent(entry.workMins, serviceMins)
  const amplitudeRatePercent   = calcAmplitudeRatePercent(serviceMins, amplitudeMins)
  const gapMinsRaw             = calcGapMins(entry.drivingMins, entry.workMins, referenceRatePercent)
  const gapMins                = gapMinsRaw ?? 0

  const gapSign: DayStats['gapSign'] =
    gapMins > 0 ? '+' :
    gapMins < 0 ? '-' : '='

  return {
    serviceMins,
    amplitudeMins,
    serviceRatePercent,
    amplitudeRatePercent,
    gapMins,
    gapSign,
  }
}

/**
 * Calcule les statistiques agrégées d'un ensemble de journées (mois ou semaine).
 * Ignore les journées dont l'amplitude est invalide (null) pour les moyennes.
 */
export function calcMonthStats(
  entries: DayEntry[],
  referenceRatePercent: number
): MonthStats {
  if (entries.length === 0) {
    return {
      daysCount: 0,
      totalDrivingMins: 0,
      totalWorkMins: 0,
      totalServiceMins: 0,
      totalAmplitudeMins: 0,
      monthlyGapMins: 0,
      avgServiceRatePercent: 0,
      avgAmplitudeRatePercent: 0,
    }
  }

  const stats = entries.map(e => ({
    entry: e,
    day: calcDayStats(e, referenceRatePercent),
  }))

  const totalDrivingMins  = entries.reduce((a, e) => a + e.drivingMins, 0)
  const totalWorkMins     = entries.reduce((a, e) => a + e.workMins, 0)
  const totalServiceMins  = stats.reduce((a, s) => a + s.day.serviceMins, 0)

  // Amplitude : on n'additionne que les journées où elle est valide
  const validAmplitudes   = stats.filter(s => s.day.amplitudeMins !== null)
  const totalAmplitudeMins = validAmplitudes.reduce(
    (a, s) => a + (s.day.amplitudeMins as number), 0
  )

  const monthlyGapMinsRaw = calcMonthlyGapMins(totalDrivingMins, totalWorkMins, referenceRatePercent)
  const monthlyGapMins    = monthlyGapMinsRaw ?? 0

  // Moyennes : calculées sur l'ensemble des journées valides
  const avgServiceRatePercent =
    totalServiceMins > 0
      ? Math.round((totalWorkMins / totalServiceMins) * 100 * 100) / 100
      : 0

  const avgAmplitudeRatePercent =
    totalAmplitudeMins > 0
      ? Math.round((totalServiceMins / totalAmplitudeMins) * 100 * 100) / 100
      : 0

  return {
    daysCount: entries.length,
    totalDrivingMins,
    totalWorkMins,
    totalServiceMins,
    totalAmplitudeMins,
    monthlyGapMins,
    avgServiceRatePercent,
    avgAmplitudeRatePercent,
  }
}

// ------------------------------------------------------------
// MODULE D'OPTIMISATION FINANCIÈRE
// ------------------------------------------------------------

/**
 * Paliers de majoration horaire selon les heures de service mensuel.
 *   ≤ 152 h → ×1.00 (taux de base)
 *   > 152 h et ≤ 186 h → ×1.25
 *   > 186 h → ×1.50
 */
export function getHourlyMultiplier(monthlyServiceHours: number): number {
  if (monthlyServiceHours > 186) return 1.50
  if (monthlyServiceHours > 152) return 1.25
  return 1.00
}

/**
 * Calcule le nombre de jours ouvrés (lundi–vendredi) restants dans le mois
 * à partir du lendemain de la date courante jusqu'à la fin du mois indiqué.
 *
 * calcRemainingBusinessDays("2026-05") → nombre de jours lun-ven restants
 */
export function calcRemainingBusinessDays(monthKey: string): number {
  const today   = new Date()
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth   = new Date(year, month, 0).getDate()

  let count = 0
  for (let d = today.getDate() + 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay() // 0=dim, 6=sam
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

/**
 * Calcule la valeur financière potentielle du solde de minutes disponibles.
 *   potential (€) = (gapMins / 60) × hourlyRate × multiplier
 *
 * Retourne 0 si le solde est négatif (on ne peut rien récupérer).
 */
export function calcFinancialPotential(
  monthlyGapMins: number,
  hourlyRate: number,
  multiplier: number
): number {
  if (monthlyGapMins <= 0) return 0
  return (monthlyGapMins / 60) * hourlyRate * multiplier
}

/**
 * Calcule combien d'heures de travail annexe équivalent à la prime d'amplitude.
 *   bonusEquivHours = amplitudeBonus / (hourlyRate × multiplier)
 */
export function calcBonusEquivalentHours(
  amplitudeBonus: number,
  hourlyRate: number,
  multiplier: number
): number {
  const effectiveRate = hourlyRate * multiplier
  if (effectiveRate <= 0) return 0
  return amplitudeBonus / effectiveRate
}

/** Statut de l'optimisation : vert / orange / rouge */
export type OptimizationStatus = 'green' | 'orange' | 'red'

/**
 * Détermine le statut de l'optimisation :
 *   - green  : potentiel ≥ prime d'amplitude (objectif atteignable)
 *   - orange : 0 < potentiel < prime (récupération partielle)
 *   - red    : solde négatif ou nul (aucune marge)
 */
export function calcOptimizationStatus(
  monthlyGapMins: number,
  amplitudeBonus: number,
  hourlyRate: number,
  multiplier: number
): OptimizationStatus {
  if (monthlyGapMins <= 0) return 'red'
  const potential = calcFinancialPotential(monthlyGapMins, hourlyRate, multiplier)
  if (potential >= amplitudeBonus) return 'green'
  return 'orange'
}

// ------------------------------------------------------------
// PROJECTION DE FIN DE MOIS
// ------------------------------------------------------------

/** Résultat d'une projection de fin de mois */
export interface ProjectionResult {
  projectedDrivingMins: number
  projectedWorkMins: number
  projectedServiceMins: number
  projectedServiceRatePercent: number
  projectedGapMins: number | null
  /** Jours ouvrés (lun–ven) restants jusqu'à la fin du mois */
  daysRemaining: number
  daysWorked: number
}

/**
 * Projette les statistiques en fin de mois en extrapolant le rythme actuel.
 *
 * Formule :
 *   projection = total déjà saisi + moyenne journalière × jours ouvrés restants
 *
 * "Jours ouvrés" = lundi à vendredi uniquement (sam/dim exclus).
 *
 * Retourne null si :
 *   - aucune journée saisie
 *   - le mois n'est pas le mois courant (projection hors-sens)
 *
 * @param entries    journées saisies du mois
 * @param monthKey   format "yyyy-MM" (ex: "2026-04")
 */
export function calcMonthProjection(
  entries: DayEntry[],
  monthKey: string,
  referenceRatePercent: number
): ProjectionResult | null {
  const daysWorked = entries.length
  if (daysWorked === 0) return null

  // Seulement pour le mois courant
  const today      = new Date()
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (monthKey !== currentKey) return null

  // Jours ouvrés restants (lun–ven, à partir du lendemain)
  const daysRemaining = calcRemainingBusinessDays(monthKey)

  const totalDriving = entries.reduce((a, e) => a + e.drivingMins, 0)
  const totalWork    = entries.reduce((a, e) => a + e.workMins, 0)

  const avgDriving = totalDriving / daysWorked
  const avgWork    = totalWork    / daysWorked

  // Formule correcte : total saisi + moyenne × jours ouvrés restants
  const projectedDrivingMins = Math.round(totalDriving + avgDriving * daysRemaining)
  const projectedWorkMins    = Math.round(totalWork    + avgWork    * daysRemaining)
  const projectedServiceMins = calcServiceMins(projectedDrivingMins, projectedWorkMins)

  const projectedServiceRatePercent = calcServiceRatePercent(projectedWorkMins, projectedServiceMins)
  const projectedGapMins            = calcMonthlyGapMins(projectedDrivingMins, projectedWorkMins, referenceRatePercent)

  return {
    projectedDrivingMins,
    projectedWorkMins,
    projectedServiceMins,
    projectedServiceRatePercent,
    projectedGapMins,
    daysRemaining,
    daysWorked,
  }
}
