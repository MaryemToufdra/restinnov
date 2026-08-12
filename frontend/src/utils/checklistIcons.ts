// Best-effort keyword match from a free-text checklist label (set by the
// Manager) to a universally recognizable pictogram -- there is no icon field
// on the checklist item itself, so this is the only way to give an agent who
// cannot read a visual cue for what the task actually is.
const ICON_RULES: [RegExp, string][] = [
  [/lit|drap|oreiller|couette|couvertures?/i, '🛏️'],
  [/salle de bain|douche|baignoire|toilettes?|wc|sanitaires?/i, '🚿'],
  [/cuisine|vaisselle|assiette|four|frigo|r[ée]frig[ée]rateur|plaque/i, '🍽️'],
  [/poubelle|d[ée]chets?|ordures?/i, '🗑️'],
  [/fen[êe]tre|vitre|miroir|glace/i, '🪟'],
  [/linge|serviettes?|lessive/i, '🧺'],
  [/aspirateur|sol|balai|serpill/i, '🧹'],
  [/poussi[èe]re|meuble|[ée]tag[èe]re/i, '🪑'],
]

const DEFAULT_ICON = '✨'

export function checklistIcon(libelle: string): string {
  const rule = ICON_RULES.find(([pattern]) => pattern.test(libelle))
  return rule ? rule[1] : DEFAULT_ICON
}
