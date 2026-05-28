import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Percent,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  Shield,
  LogOut,
  Loader2,
  Banknote,
} from 'lucide-react'
import {
  useSettingsStore,
  useRateForYear,
  type AnnualRate,
} from '../store/useSettingsStore'
import { useDaysStore }    from '../store/useDaysStore'
import { useAuthStore }    from '../store/useAuthStore'
import { useProfileStore } from '../store/useProfileStore'
import { DEFAULT_REFERENCE_RATE_PERCENT } from '../lib/constants'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const THIS_YEAR = new Date().getFullYear()

// ============================================================
// SECTION COMPTE
// ============================================================

function AccountSection({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const { user, signOut }                      = useAuthStore()
  const { displayName, updateDisplayName }     = useProfileStore()

  // ── Édition pseudo ────────────────────────────────────────
  const [editingName,  setEditingName]  = useState(false)
  const [nameInput,    setNameInput]    = useState('')
  const [nameSaving,   setNameSaving]   = useState(false)
  const [nameError,    setNameError]    = useState<string | null>(null)

  // ── Confirmation déconnexion ──────────────────────────────
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut,    setLoggingOut]    = useState(false)

  // ── Valeurs affichées ────────────────────────────────────
  const email         = user?.email ?? ''
  const shownName     = displayName ?? 'Utilisateur'
  const avatarLetter  = (displayName ?? email ?? 'U')[0].toUpperCase()
  const memberSince   = user?.created_at
    ? format(parseISO(user.created_at), 'MMMM yyyy', { locale: fr })
    : null

  // ── Handlers pseudo ──────────────────────────────────────
  function startEditName() {
    setNameInput(displayName ?? '')
    setNameError(null)
    setEditingName(true)
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed)          { setNameError('Le pseudo ne peut pas être vide.'); return }
    if (trimmed.length > 30) { setNameError('30 caractères maximum.'); return }

    setNameSaving(true)
    const { error } = await updateDisplayName(user!.id, trimmed)
    setNameSaving(false)

    if (error) {
      setNameError(error)
    } else {
      setEditingName(false)
      onFeedback(`Pseudo mis à jour : ${trimmed}`)
    }
  }

  // ── Handler déconnexion ──────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    // App.tsx détecte user === null et vide tous les stores
  }

  // ── Rendu ────────────────────────────────────────────────
  return (
    <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-2xl overflow-hidden">

      {/* ── Carte identité ──────────────────────────────── */}
      <div className="px-4 py-4 bg-[#111e35] border-b border-[#1a2d4a] flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
          <span className="text-white text-xl font-black">{avatarLetter}</span>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base truncate">{shownName}</p>
          <p className="text-slate-400 text-xs truncate mt-0.5">{email}</p>
          {memberSince && (
            <p className="text-slate-600 text-[10px] mt-1 capitalize">
              Membre depuis {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* ── Modifier le pseudo ───────────────────────────── */}
      {editingName ? (
        <div className="px-4 py-4 border-b border-[#1a2d4a] space-y-3">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            Modifier le pseudo
          </p>
          <input
            type="text"
            value={nameInput}
            maxLength={30}
            placeholder="Votre pseudo"
            autoFocus
            onChange={(e) => { setNameInput(e.target.value); setNameError(null) }}
            className={`w-full bg-[#080d1a] text-white border rounded-xl px-4 py-3 text-sm focus:border-blue-500/70 focus:outline-none transition-colors placeholder:text-slate-700 ${
              nameError ? 'border-red-500/50' : 'border-[#1a2d4a]'
            }`}
          />
          {nameError && (
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <AlertCircle size={12} />{nameError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setEditingName(false); setNameError(null) }}
              className="flex-1 py-2.5 rounded-xl bg-[#162440] text-slate-300 text-sm font-medium border border-[#1a2d4a] active:opacity-70"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveName}
              disabled={nameSaving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 active:opacity-80"
            >
              {nameSaving
                ? <><Loader2 size={13} className="animate-spin" />Enregistrement…</>
                : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startEditName}
          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-[#1a2d4a] hover:bg-[#111e35] transition-colors active:opacity-70"
        >
          <div className="flex items-center gap-3">
            <div className="bg-[#162440] p-2 rounded-xl">
              <Pencil size={14} className="text-slate-400" />
            </div>
            <span className="text-white text-sm font-medium">Modifier le pseudo</span>
          </div>
          <Pencil size={13} className="text-slate-600" />
        </button>
      )}

      {/* ── Déconnexion ─────────────────────────────────── */}
      {confirmLogout ? (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-slate-300 text-sm">
              Se déconnecter de <span className="font-semibold text-white">{email}</span> ?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmLogout(false)}
              className="flex-1 py-2.5 rounded-xl bg-[#162440] text-slate-300 text-sm font-medium border border-[#1a2d4a] active:opacity-70"
            >
              Annuler
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 active:opacity-80"
            >
              {loggingOut
                ? <><Loader2 size={13} className="animate-spin" />Déconnexion…</>
                : 'Se déconnecter'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#111e35] transition-colors active:opacity-70"
        >
          <div className="bg-red-500/10 p-2 rounded-xl">
            <LogOut size={14} className="text-red-400" />
          </div>
          <span className="text-red-400 text-sm font-medium">Se déconnecter</span>
        </button>
      )}
    </div>
  )
}

// ============================================================
// TAUX ANNUELS — sous-composants (inchangés)
// ============================================================

interface RateRowProps {
  rate: AnnualRate
  isCurrentYear: boolean
  onEdit: (rate: AnnualRate) => void
  onDelete: (year: number) => void
}

function RateRow({ rate, isCurrentYear, onEdit, onDelete }: RateRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (confirmingDelete) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#1a2d4a]/60 last:border-0 gap-3">
        <p className="text-white text-sm flex-1">
          Supprimer le taux <span className="font-bold">{rate.year}</span> ?
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmingDelete(false)}
            className="px-3 py-1.5 rounded-lg bg-[#162440] text-slate-300 text-xs font-medium border border-[#1a2d4a] active:opacity-70"
          >
            Annuler
          </button>
          <button
            onClick={() => onDelete(rate.year)}
            className="px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-xs font-semibold active:opacity-70"
          >
            Supprimer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1a2d4a]/60 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${
          isCurrentYear
            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
            : 'bg-[#162440] text-slate-400 border border-[#1e3560]'
        }`}>
          {rate.year}
          {isCurrentYear && <span className="ml-1.5 text-blue-400/70 font-normal">•</span>}
        </div>
        <span className="text-white text-sm font-semibold tabular-nums">
          {rate.referenceRatePercent} %
        </span>
        {isCurrentYear && (
          <span className="text-slate-600 text-[10px]">en cours</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(rate)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
          aria-label="Modifier"
        >
          <Pencil size={13} />
        </button>
        {!isCurrentYear && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

interface RateFormProps {
  editingYear:   number | null
  initialRate:   number
  existingYears: number[]
  onSave:        (year: number, rate: number) => void
  onCancel:      () => void
}

function RateForm({ editingYear, initialRate, existingYears, onSave, onCancel }: RateFormProps) {
  const [year,   setYear]   = useState(editingYear !== null ? String(editingYear) : '')
  const [rate,   setRate]   = useState(String(initialRate))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    const y = parseInt(year, 10)
    const r = parseFloat(rate)
    if (!year || isNaN(y) || y < 2000 || y > 2100)
      errs.year = 'Année invalide (ex : 2025)'
    if (editingYear === null && existingYears.includes(y))
      errs.year = `Un taux existe déjà pour ${y}`
    if (!rate || isNaN(r) || r <= 0 || r >= 100)
      errs.rate = 'Le taux doit être entre 1 et 99 %'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave(parseInt(year, 10), parseFloat(rate))
  }

  const isEditing = editingYear !== null

  return (
    <div className="bg-[#111e35] border border-blue-500/25 rounded-2xl p-4 space-y-3">
      <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">
        {isEditing ? `Modifier le taux ${editingYear}` : 'Ajouter un taux annuel'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-500 text-xs block mb-1.5">Année</label>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            value={year} placeholder="2025" disabled={isEditing}
            onChange={(e) => { setYear(e.target.value.replace(/\D/g, '')); setErrors(p => ({...p, year: ''})) }}
            className={`w-full bg-[#080d1a] text-white border rounded-xl px-3 py-3 text-sm font-bold tabular-nums text-center focus:border-blue-500/60 focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${errors.year ? 'border-red-500/60' : 'border-[#1a2d4a]'}`}
          />
          {errors.year && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.year}</p>}
        </div>
        <div>
          <label className="text-slate-500 text-xs block mb-1.5">Taux de référence</label>
          <div className={`flex items-center bg-[#080d1a] border rounded-xl px-3 focus-within:border-blue-500/60 transition-colors ${errors.rate ? 'border-red-500/60' : 'border-[#1a2d4a]'}`}>
            <input
              type="text" inputMode="decimal" value={rate} placeholder="20"
              onChange={(e) => { setRate(e.target.value.replace(/[^0-9.]/g, '')); setErrors(p => ({...p, rate: ''})) }}
              className="flex-1 bg-transparent text-white py-3 text-sm font-bold tabular-nums text-center focus:outline-none"
            />
            <span className="text-slate-500 text-sm">%</span>
          </div>
          {errors.rate && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.rate}</p>}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-[#162440] text-slate-300 text-sm font-medium border border-[#1a2d4a] active:opacity-70 transition-opacity">
          Annuler
        </button>
        <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold active:opacity-80 transition-all">
          {isEditing ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

// ============================================================
// SECTION RÉMUNÉRATION
// ============================================================

function RemunerationSection({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const { hourlyRate, amplitudeBonus, setHourlyRate, setAmplitudeBonus } = useSettingsStore()

  const [editing,    setEditing]    = useState(false)
  const [rateInput,  setRateInput]  = useState(String(hourlyRate))
  const [bonusInput, setBonusInput] = useState(String(amplitudeBonus))
  const [rateErr,    setRateErr]    = useState<string | null>(null)
  const [bonusErr,   setBonusErr]   = useState<string | null>(null)

  function startEdit() {
    setRateInput(hourlyRate.toFixed(2))
    setBonusInput(String(Math.round(amplitudeBonus)))
    setRateErr(null)
    setBonusErr(null)
    setEditing(true)
  }

  function handleSave() {
    const r = parseFloat(rateInput)
    const b = parseFloat(bonusInput)
    if (isNaN(r) || r <= 0 || r > 9999)  { setRateErr('Valeur invalide (ex : 12.43)'); return }
    if (isNaN(b) || b < 0  || b > 99999) { setBonusErr('Valeur invalide (ex : 200)');  return }
    setHourlyRate(r)
    setAmplitudeBonus(b)
    setEditing(false)
    onFeedback('Rémunération mise à jour')
  }

  function handleCancel() {
    setRateErr(null)
    setBonusErr(null)
    setEditing(false)
  }

  return (
    <div className="space-y-3">

      {/* ── Carte récapitulatif — style identique à "Taux de référence" ── */}
      <div className="bg-blue-600/10 border border-blue-500/25 rounded-2xl px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/15 p-2.5 rounded-xl">
            <Banknote size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Rémunération</p>
            <p className="text-white text-lg font-black tabular-nums">{hourlyRate.toFixed(2)} €/h</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {Math.round(amplitudeBonus)} €
              <span className="text-slate-600 font-normal"> prime / mois</span>
            </p>
          </div>
        </div>

        {/* Bouton Modifier — à droite, discret */}
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-slate-400 hover:text-blue-300 px-2.5 py-1.5 rounded-xl hover:bg-blue-500/10 transition-colors active:opacity-70"
          >
            <Pencil size={13} />
            <span className="text-xs font-medium">Modifier</span>
          </button>
        )}
      </div>

      {/* ── Mode édition (s'affiche sous la carte) ── */}
      {editing && (
        <div className="bg-[#111e35] border border-blue-500/25 rounded-2xl p-4 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            {/* Taux horaire */}
            <div>
              <label className="text-slate-500 text-xs block mb-1.5">Taux horaire</label>
              <div className="relative w-full">
                <input
                  type="text"
                  inputMode="decimal"
                  value={rateInput}
                  placeholder="12.43"
                  autoFocus
                  onChange={(e) => { setRateInput(e.target.value.replace(/[^0-9.]/g, '')); setRateErr(null) }}
                  className={`w-full bg-[#080d1a] text-white border rounded-xl px-3 pr-10 py-3 text-sm font-bold tabular-nums text-center focus:border-blue-500/60 focus:outline-none transition-colors placeholder:text-slate-700 ${rateErr ? 'border-red-500/60' : 'border-[#1a2d4a]'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">€/h</span>
              </div>
              {rateErr && (
                <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} />{rateErr}
                </p>
              )}
            </div>

            {/* Prime d'amplitude */}
            <div>
              <label className="text-slate-500 text-xs block mb-1.5">Prime / mois</label>
              <div className="relative w-full">
                <input
                  type="text"
                  inputMode="decimal"
                  value={bonusInput}
                  placeholder="200"
                  onChange={(e) => { setBonusInput(e.target.value.replace(/[^0-9.]/g, '')); setBonusErr(null) }}
                  className={`w-full bg-[#080d1a] text-white border rounded-xl px-3 pr-8 py-3 text-sm font-bold tabular-nums text-center focus:border-blue-500/60 focus:outline-none transition-colors placeholder:text-slate-700 ${bonusErr ? 'border-red-500/60' : 'border-[#1a2d4a]'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">€</span>
              </div>
              {bonusErr && (
                <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                  <AlertCircle size={10} />{bonusErr}
                </p>
              )}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl bg-[#162440] text-slate-300 text-sm font-medium border border-[#1a2d4a] active:opacity-70 transition-opacity"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold active:opacity-80 transition-all"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="flex items-start gap-2 bg-[#080d1a] border border-[#1a2d4a] rounded-xl px-3 py-2.5">
        <Info size={12} className="text-slate-600 mt-0.5 shrink-0" />
        <p className="text-slate-600 text-[11px] leading-relaxed">
          Ces informations servent à estimer votre potentiel d'optimisation dans l'onglet Analyse.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Parametres() {
  const { annualRates, setRateForYear, removeRateForYear } = useSettingsStore()
  const { clearAll }   = useDaysStore()
  const currentRate    = useRateForYear(THIS_YEAR)

  const [formMode,     setFormMode]     = useState<null | 'add' | number>(null)
  const [feedback,     setFeedback]     = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleSave(year: number, rate: number) {
    setRateForYear(year, rate)
    setFormMode(null)
    showFeedback(formMode === 'add' ? `Taux ${year} ajouté (${rate} %)` : `Taux ${year} mis à jour (${rate} %)`)
  }

  function handleResetAll() {
    clearAll()
    setConfirmReset(false)
    showFeedback('Données locales réinitialisées')
  }

  const sortedRates  = [...annualRates].sort((a, b) => b.year - a.year)
  const existingYears = annualRates.map((r) => r.year)
  const editingRate   = typeof formMode === 'number'
    ? (annualRates.find((r) => r.year === formMode)?.referenceRatePercent ?? DEFAULT_REFERENCE_RATE_PERCENT)
    : DEFAULT_REFERENCE_RATE_PERCENT

  return (
    <div className="space-y-5">

      {/* ── Titre ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-white text-xl font-bold">Paramètres</h2>
        <p className="text-slate-500 text-sm mt-0.5">Configuration de MANITAUX</p>
      </div>

      {/* ── Feedback global ────────────────────────────────── */}
      {feedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm">{feedback}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION COMPTE — tout en haut, avant les taux
      ══════════════════════════════════════════════════════ */}
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3 px-1">
          Compte
        </p>
        <AccountSection onFeedback={showFeedback} />
      </div>

      {/* ── Carte résumé taux actuel ────────────────────────── */}
      <div className="bg-blue-600/10 border border-blue-500/25 rounded-2xl px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/15 p-2.5 rounded-xl">
            <Percent size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Taux de référence {THIS_YEAR}</p>
            <p className="text-white text-lg font-black tabular-nums">{currentRate} %</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-600 text-[10px] uppercase tracking-wide">Coefficient</p>
          <p className="text-slate-400 text-sm font-bold tabular-nums">
            ×{(100 / currentRate - 1).toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── Section taux annuels ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-medium">
            Taux annuels
          </p>
          {formMode === null && (
            <button
              onClick={() => setFormMode('add')}
              className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold hover:text-blue-300 transition-colors active:opacity-70"
            >
              <Plus size={13} />
              Ajouter
            </button>
          )}
        </div>

        <div className="flex items-start gap-2 bg-[#080d1a] border border-[#1a2d4a] rounded-xl px-3 py-2.5 mb-3">
          <Info size={12} className="text-slate-600 mt-0.5 shrink-0" />
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Chaque journée utilise le taux configuré pour son année.
            Si aucun taux n'est défini, la valeur par défaut ({DEFAULT_REFERENCE_RATE_PERCENT} %) s'applique.
          </p>
        </div>

        {formMode !== null && (
          <div className="mb-3">
            <RateForm
              editingYear={typeof formMode === 'number' ? formMode : null}
              initialRate={editingRate}
              existingYears={existingYears}
              onSave={handleSave}
              onCancel={() => setFormMode(null)}
            />
          </div>
        )}

        <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-2xl px-4">
          {sortedRates.length === 0 ? (
            <p className="text-slate-600 text-sm py-4 text-center">Aucun taux configuré.</p>
          ) : (
            sortedRates.map((r) => (
              <RateRow
                key={r.year}
                rate={r}
                isCurrentYear={r.year === THIS_YEAR}
                onEdit={(rate) => setFormMode(rate.year)}
                onDelete={(year) => { removeRateForYear(year); showFeedback(`Taux ${year} supprimé`) }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Section Rémunération ────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Banknote size={13} className="text-slate-500" />
          <p className="text-slate-500 text-xs uppercase tracking-widest font-medium">
            Rémunération
          </p>
        </div>
        <RemunerationSection onFeedback={showFeedback} />
      </div>

      {/* ── Section Application ─────────────────────────────── */}
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3 px-1">
          Application
        </p>
        <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-2xl px-4">

          <div className="flex items-center justify-between py-3.5 border-b border-[#1a2d4a]">
            <div className="flex items-center gap-3">
              <div className="bg-[#162440] p-2 rounded-xl">
                <Info size={14} className="text-slate-400" />
              </div>
              <span className="text-white text-sm font-medium">À propos de MANITAUX</span>
            </div>
            <span className="text-slate-500 text-xs">v0.9.0</span>
          </div>

          <div className="flex items-center justify-between py-3.5 border-b border-[#1a2d4a]">
            <div className="flex items-center gap-3">
              <div className="bg-[#162440] p-2 rounded-xl">
                <Shield size={14} className="text-slate-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Données synchronisées</p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Vos journées sont sauvegardées sur votre compte
                </p>
              </div>
            </div>
          </div>

          {/* Zone danger — réinitialiser les données locales */}
          <div className="py-3.5">
            {confirmReset ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-sm">
                    Réinitialiser les données de cet appareil ? Vos données enregistrées restent conservées sur votre compte.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#162440] text-slate-300 text-sm font-medium border border-[#1a2d4a] active:opacity-70">
                    Annuler
                  </button>
                  <button onClick={handleResetAll}
                    className="flex-1 py-2.5 rounded-xl bg-red-600/80 text-white text-sm font-semibold active:opacity-70">
                    Réinitialiser
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmReset(true)}
                className="w-full flex items-center gap-3 active:opacity-70 transition-opacity">
                <div className="bg-red-500/10 p-2 rounded-xl">
                  <X size={14} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-red-400 text-sm font-medium">Réinitialiser les données de cet appareil</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Vos données enregistrées restent conservées sur votre compte
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-slate-700 text-xs pb-2">
        MANITAUX — Suivi conducteur · v0.9.0
      </p>

    </div>
  )
}
