// Deterministic per-agent color so the same person always gets the same
// avatar color across screens/sessions -- important when names alone aren't
// a reliable identifier for someone who cannot read.
const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
]

export function avatarColorClass(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

export function avatarInitial(nom: string): string {
  return nom.trim().charAt(0).toUpperCase() || '?'
}
