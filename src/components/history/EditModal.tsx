import { useState, useMemo, useEffect } from 'react'
import { X, Zap, AlertCircle, Clock, CalendarDays } from 'lucide-react'
import { calcDayStats, calcAmplitudeMins, hhmmToMinutes, minutesToReadable, type DayEntry } from '../../lib/calculations'
import { useDaysStore } from '../../store/useDaysStore'
import { useRateForYear } from '../../store/useSettingsStore'
import { txServiceTextColor } from '../../lib/colors'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function minsToH(mins: number): string {
  const h = Math.floor(mins / 60)
  return h > 0 ? String(h) : ''
}
function minsToM(mins: number): string {
  const m = mins % 60
  return m > 0 ? String(m) : ''
}

// ------------------------------------------------------------
// Classes partagées — identiques à Saisie.tsx
// ------------------------------------------------------------

const inputBase =
  'w-full min-w-0 box-border rounded-2xl border border-[#1a3a5c] bg-[#060b16] text-white text-center py-3 text-sm focus:border-blue-500/70 focus:outline-none transition-colors'

const inputError =
  'w-full min-w-0 box-border rounded-2xl border border-red-500/60 bg-[#060b16] text-white text-center py-3 text-sm focus:outline-none transition-colors'

// ------------------------------------------------------------
// Sous-composant : saisie d'une durée (heures + minutes)
// Structure identique à Saisie.tsx
// ------------------------------------------------------------

interface DurationInputProps {
  label: string
  hours: string
  minutes: string
  onHoursChange: (v: string) => void
  onMinutesChange: (v: string) => void
  error?: string
}

function DurationInput({ label, hours, minutes, onHoursChange, onMinutesChange, error }: DurationInputProps) {
  function handleHours(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '' || parseInt(digits, 10) <= 23) onHoursChange(digits)
  }
  function handleMinutes(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '' || parseInt(digits, 10) <= 59) onMinutesChange(digits)
  }

  return (
    <div className={`w-full overflow-hidden bg-[#0e1628] border rounded-2xl pt-4 pb-4 px-4 ${
      error ? 'border-red-500/50' : 'border-[#1a2d4a]'
    }`}>
      {/* Label centré */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Clock size={14} className="text-slate-500 shrink-0" />
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider truncate">{label}</p>
      </div>

      {/* px-5 sans overflow-hidden → bordures entièrement visibles */}
      <div className="w-full px-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full">

          {/* Heures */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div className="w-full min-w-0 box-border bg-[#060b16] border border-[#1a3a5c] rounded-2xl flex items-center justify-center px-2 py-3 focus-within:border-blue-500/70 transition-colors">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={hours}
                placeholder="00"
                onChange={(e) => handleHours(e.target.value)}
                className="w-full min-w-0 bg-transparent text-white text-2xl font-bold text-center focus:outline-none placeholder:text-slate-700"
              />
            </div>
            <span className="text-slate-600 text-xs">heures</span>
          </div>

          {/* Séparateur */}
          <span className="text-slate-600 text-xl font-light select-none">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div className="w-full min-w-0 box-border bg-[#060b16] border border-[#1a3a5c] rounded-2xl flex items-center justify-center px-2 py-3 focus-within:border-blue-500/70 transition-colors">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={minutes}
                placeholder="00"
                onChange={(e) => handleMinutes(e.target.value)}
                className="w-full min-w-0 bg-transparent text-white text-2xl font-bold text-center focus:outline-none placeholder:text-slate-700"
              />
            </div>
            <span className="text-slate-600 text-xs">minutes</span>
          </div>

        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-red-400 text-xs mt-2.5 px-5">
          <AlertCircle size={12} />{error}
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------
// Sous-composant : ligne de résultat live
// ------------------------------------------------------------

function ResultLine({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a2d4a]/70 last:border-0 gap-2">
      <span className="text-slate-400 text-sm min-w-0 truncate">{label}</span>
      <span className={`text-sm font-bold tabular-nums shrink-0 ${color}`}>{value}</span>
    </div>
  )
}

// ------------------------------------------------------------
// Props du modal
// ------------------------------------------------------------

interface EditModalProps {
  entry: DayEntry
  onClose: () => void
}

// ------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------

export default function EditModal({ entry, onClose }: EditModalProps) {
  const { updateDay } = useDaysStore()

  // ── État du formulaire (pré-rempli depuis l'entrée) ────────
  const [date,       setDate]       = useState(entry.date)
  const dateYear = parseInt(date.slice(0, 4), 10) || new Date().getFullYear()
  const referenceRatePercent = useRateForYear(dateYear)
  const [startTime,  setStartTime]  = useState(entry.startTime)
  const [endTime,    setEndTime]    = useState(entry.endTime)
  const [drivingH,   setDrivingH]   = useState(minsToH(entry.drivingMins))
  const [drivingM,   setDrivingM]   = useState(minsToM(entry.drivingMins))
  const [workH,      setWorkH]      = useState(minsToH(entry.workMins))
  const [workM,      setWorkM]      = useState(minsToM(entry.workMins))
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  // Bloquer le scroll du body pendant que le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Valeurs dérivées ──────────────────────────────────────
  const drivingMins = (parseInt(drivingH, 10) || 0) * 60 + (parseInt(drivingM, 10) || 0)
  const workMins    = (parseInt(workH, 10) || 0) * 60 + (parseInt(workM, 10) || 0)

  // ── Calcul live ───────────────────────────────────────────
  const stats = useMemo(() => {
    if (!startTime || !endTime || drivingMins <= 0) return null
    return calcDayStats({ drivingMins, workMins, startTime, endTime }, referenceRatePercent)
  }, [drivingMins, workMins, startTime, endTime])

  // ── Indicateur journée de nuit (fin < début) ──────────────
  const isOvernight = useMemo(() => {
    if (!startTime || !endTime) return false
    const s = hhmmToMinutes(startTime)
    const e = hhmmToMinutes(endTime)
    if (s === null || e === null) return false
    return e < s
  }, [startTime, endTime])

  // ── Validation ────────────────────────────────────────────
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!date)      errs.date        = 'Date requise'
    if (!startTime) errs.startTime   = 'Heure de début requise'
    if (!endTime)   errs.endTime     = 'Heure de fin requise'
    if (startTime && endTime) {
      const ampMins = calcAmplitudeMins(startTime, endTime)
      if (ampMins === null)        errs.endTime = 'Horaires invalides'
      else if (ampMins > 15 * 60) errs.endTime = 'L\'amplitude ne peut pas dépasser 15h'
    }
    if (drivingMins <= 0) errs.drivingMins = 'Conduite > 0 requis'
    return errs
  }

  // ── Sauvegarde ────────────────────────────────────────────
  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    updateDay(entry.id!, { date, startTime, endTime, drivingMins, workMins })
    onClose()
  }

  // ── Couleurs ──────────────────────────────────────────────
  const txServiceColor = stats ? txServiceTextColor(stats.serviceRatePercent) : 'text-slate-400'
  const gapColor   = stats ? (stats.gapMins >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'
  const gapDisplay = stats
    ? `${stats.gapMins >= 0 ? '+' : ''}${minutesToReadable(stats.gapMins)}`
    : '—'

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Overlay sombre */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel bas — même largeur max que le contenu principal */}
      <div className="relative bg-[#0e1628] rounded-t-3xl border-t border-[#1a2d4a] max-h-[92vh] overflow-y-auto scrollbar-hide max-w-md mx-auto w-full">

        {/* Poignée */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#1a2d4a] rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-2 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-white text-lg font-bold">Modifier la journée</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-[#162440] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Date ─────────────────────────────────────── */}
          <div className={`w-full overflow-hidden bg-[#0e1628] border rounded-2xl pt-4 pb-4 px-4 ${
            errors.date ? 'border-red-500/50' : 'border-[#1a2d4a]'
          }`}>
            <div className="flex items-center gap-2 mb-2.5">
              <CalendarDays size={14} className="text-slate-500 shrink-0" />
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Date</label>
            </div>

            {/* px-5 sans overflow-hidden → arrondi droit visible */}
            <div className="w-full px-5">
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => { setDate(e.target.value); setErrors(p => ({ ...p, date: '' })) }}
                className={errors.date ? inputError : inputBase}
              />
            </div>

            {errors.date && (
              <p className="flex items-center gap-1.5 text-red-400 text-xs mt-2 px-5">
                <AlertCircle size={12} />{errors.date}
              </p>
            )}
          </div>

          {/* ── Horaires ─────────────────────────────────── */}
          <div className={`w-full overflow-hidden bg-[#0e1628] border rounded-2xl pt-4 pb-4 px-4 ${
            (errors.startTime || errors.endTime) ? 'border-red-500/50' : 'border-[#1a2d4a]'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-slate-500 shrink-0" />
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Horaires de service</p>
            </div>

            {/* px-5 sans overflow-hidden → bordures complètes des deux inputs */}
            <div className="w-full px-5">
              <div className="grid grid-cols-2 gap-4 w-full">

                {/* Prise de service */}
                <div className="min-w-0">
                  <label className="text-slate-500 text-xs block mb-1.5">Prise de service</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => { setStartTime(e.target.value); setErrors(p => ({ ...p, startTime: '' })) }}
                    className={errors.startTime ? inputError : inputBase}
                  />
                  {errors.startTime && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />{errors.startTime}
                    </p>
                  )}
                </div>

                {/* Fin de service */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-500 text-xs">Fin de service</label>
                    {isOvernight && (
                      <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-md">J+1</span>
                    )}
                  </div>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => { setEndTime(e.target.value); setErrors(p => ({ ...p, endTime: '' })) }}
                    className={errors.endTime ? inputError : inputBase}
                  />
                  {errors.endTime && (
                    <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />{errors.endTime}
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* ── Durées ───────────────────────────────────── */}
          <DurationInput
            label="Conduite"
            hours={drivingH} minutes={drivingM}
            onHoursChange={(v) => { setDrivingH(v); setErrors(p => ({ ...p, drivingMins: '' })) }}
            onMinutesChange={setDrivingM}
            error={errors.drivingMins}
          />
          <DurationInput
            label="Travail annexe"
            hours={workH} minutes={workM}
            onHoursChange={setWorkH}
            onMinutesChange={setWorkM}
          />

          {/* ── Calcul live ──────────────────────────────── */}
          {stats ? (
            <div className="w-full overflow-hidden bg-blue-600/10 border border-blue-500/25 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={13} className="text-blue-400 shrink-0" />
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Calcul en direct</p>
              </div>
              <p className="text-slate-500 text-[11px] mb-3">Taux de référence : {referenceRatePercent} %</p>
              <ResultLine label="Temps de service" value={minutesToReadable(stats.serviceMins)} />
              <ResultLine
                label="Amplitude"
                value={stats.amplitudeMins !== null ? minutesToReadable(stats.amplitudeMins) : '—'}
              />
              <ResultLine
                label="Taux du jour"
                value={`${stats.serviceRatePercent.toFixed(2)} %`}
                color={txServiceColor}
              />
              <ResultLine
                label="TxAmp"
                value={stats.amplitudeRatePercent !== null ? `${stats.amplitudeRatePercent.toFixed(2)} %` : '—'}
              />
              <ResultLine label="Écart" value={gapDisplay} color={gapColor} />
            </div>
          ) : (
            <div className="w-full overflow-hidden bg-[#0e1628] border border-[#1a2d4a] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={13} className="text-slate-600 shrink-0" />
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Calcul en direct</p>
              </div>
              <p className="text-slate-600 text-sm">
                Renseignez les horaires et la conduite pour voir le calcul.
              </p>
            </div>
          )}

          {/* ── Actions ──────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-[#162440] text-slate-300 font-medium text-sm border border-[#1a2d4a] active:opacity-70 transition-opacity"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm active:opacity-80 transition-opacity"
            >
              Enregistrer
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
