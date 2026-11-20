import type { PromptDecoration, Register } from 'claude-code'

// Le mot-clé en mot entier, toute casse, accents tolérés (UlTrAtEuBé compris).
const KEYWORD_SOURCE = '(?<![\\p{L}\\p{N}])ultrateub[eé](?![\\p{L}\\p{N}])'

// Les sept teintes de l'arc-en-ciel d'ultrathink, une par lettre, en boucle.
const RAINBOW = [
  'rgb(235,95,87)',
  'rgb(245,139,87)',
  'rgb(250,195,95)',
  'rgb(145,200,130)',
  'rgb(130,170,220)',
  'rgb(155,130,200)',
  'rgb(200,130,180)',
]

const MODEL_NOTE =
  '[teube] The user typed the ultrateube keyword: this turn runs at effort low. ' +
  'Answer simply and briefly, e.g. rephrase the previous text in plain words.'

export const hasKeyword = (text: string): boolean => new RegExp(KEYWORD_SOURCE, 'iu').test(text)

// Une décoration par lettre de chaque occurrence du mot-clé dans le brouillon.
export const rainbowRuns = (text: string): PromptDecoration[] =>
  [...text.matchAll(new RegExp(KEYWORD_SOURCE, 'giu'))].flatMap(match =>
    [...match[0]].map((_, offset) => ({
      start: match.index + offset,
      end: match.index + offset + 1,
      color: RAINBOW[offset % RAINBOW.length],
    })),
  )

export const register: Register = on => {
  // Tour principal à faire tourner en low ; une variable de module suffit,
  // un rechargement en cours de tour ne fait que rendre ce tour normal.
  let lowTurnId: string | undefined

  // Frappe au clavier : l'arc-en-ciel voyage avec la réponse de l'édition.
  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    const runs = rainbowRuns(box.text)

    return runs.length === 0 ? box : { ...box, decorations: [...(box.decorations ?? []), ...runs] }
  })

  // Collage, historique, annulation : aucune édition ne porte le texte, on repeint.
  on('prompt.change', async ($, e, next) => {
    const result = await next(e)
    const runs = rainbowRuns(e.text)
    if (runs.length > 0) {
      await $.prompt.paint({ text: e.text, decorations: runs })
    }

    return result
  })

  on('prompt.submit', ($, e, next) => {
    if (e.command !== undefined || !hasKeyword(e.text)) {
      return next(e)
    }

    // Prévient le modèle : la note d'effort d'autres mods dirait l'inverse.
    return next({ ...e, context: [...(e.context ?? []), MODEL_NOTE] })
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }

    lowTurnId = hasKeyword(e.text) ? e.turnId : undefined
    $.ui.status(lowTurnId === undefined ? undefined : 'teubé · effort low')

    return next(e)
  })

  // Un remplacement d'effort ne vaut que pour un appel : on le pose à chaque
  // étape du tour marqué, boucle principale seulement.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && e.turnId === lowTurnId) {
      return yield* next({ ...e, effort: 'low' })
    }

    return yield* next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined && e.turnId === lowTurnId) {
      lowTurnId = undefined
      $.ui.status(undefined)
    }

    return next(e)
  })
}
