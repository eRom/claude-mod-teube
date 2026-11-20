import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type {
  On,
  PromptChangeInput,
  PromptChangeResult,
  PromptEditInput,
  PromptEditResult,
} from 'claude-code'

// Le kit de test lève prompt.edit et prompt.change à l'exécution, mais ses
// types ne les déclarent pas encore (2.1.328) : on les type ici.
type PromptEvents = {
  prompt: {
    edit: (e: PromptEditInput) => Promise<PromptEditResult>
    change: (e: PromptChangeInput) => Promise<PromptChangeResult>
  }
}
const raise = ($: Engine) => $ as unknown as PromptEvents

type Sent = Array<string | number | undefined>

// Le bas de la chaîne que la session fournirait : il note l'effort reçu.
const installEngine = (on: On, sent: Sent) => {
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.status', () => ({ value: undefined }))
  on('turn.step', async function* (_, e) {
    sent.push(e.effort)
    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn' as const,
      usage: null,
    }
  })
}

// Rejoue une étape de tour et rend l'effort qui serait parti à l'API.
const sentEffort = async (
  $: Engine,
  sent: Sent,
  step: { turnId: string; index: number; agentId?: string },
) => {
  const stream = $.turn.step({
    ...step,
    model: 'claude-opus-5-5',
    effort: 'xhigh',
    messageCount: 3,
  })
  for await (const _ of stream) {
    // Le bas de chaîne du test ne produit aucun morceau.
  }
  return sent.at(-1)
}

test('ultrateube turns every main step of that turn to low, then lets go', async ($, on) => {
  const sent: Sent = []
  installEngine(on, sent)

  await $.turn.start({ text: 'ultrateube reformule ça', turnId: 't1' })
  expect(await sentEffort($, sent, { turnId: 't1', index: 0 })).toBe('low')
  expect(await sentEffort($, sent, { turnId: 't1', index: 1 })).toBe('low')

  await $.turn.start({ text: 'question normale', turnId: 't2' })
  expect(await sentEffort($, sent, { turnId: 't2', index: 0 })).toBe('xhigh')
})

test('a subagent step inside a teubé turn keeps its own effort', async ($, on) => {
  const sent: Sent = []
  installEngine(on, sent)

  await $.turn.start({ text: 'Ultrateubé, plus simple stp', turnId: 't1' })
  expect(await sentEffort($, sent, { turnId: 't1', index: 0, agentId: 'a1' })).toBe('xhigh')
})

test('the keyword inside another word does not trigger', async ($, on) => {
  const sent: Sent = []
  installEngine(on, sent)

  await $.turn.start({ text: 'superultrateube2000', turnId: 't1' })
  expect(await sentEffort($, sent, { turnId: 't1', index: 0 })).toBe('xhigh')
})

test('typing the keyword in any case paints one color per letter', async ($, on) => {
  on('prompt.edit', (_, e) => ({
    text: e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end),
    cursor: e.start + e.inputText.length,
  }))

  const box = await raise($).prompt.edit({
    origin: { kind: 'composer' },
    text: 'ok UlTrAtEuB',
    cursor: 12,
    start: 12,
    end: 12,
    inputText: 'É',
  })

  const runs = box.decorations ?? []
  expect(runs.map(run => run.start)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  expect(new Set(runs.map(run => run.color)).size).toBe(7)
  expect(runs[0]?.color).toBe(runs[7]?.color)
})

test('a draft without the keyword gets no paint', async ($, on) => {
  on('prompt.edit', (_, e) => ({ text: e.text + e.inputText, cursor: e.cursor + 1 }))

  const box = await raise($).prompt.edit({
    origin: { kind: 'composer' },
    text: 'ultrathink',
    cursor: 10,
    start: 10,
    end: 10,
    inputText: '!',
  })
  expect(box.decorations).toBeUndefined()
})

test('a draft recalled from history is painted too', async ($, on) => {
  const painted: number[] = []
  on('prompt.change', (_, e) => ({ text: e.text }))
  on('prompt.paint', (_, e) => {
    painted.push(e.decorations.length)
    return { value: { isPainted: true, text: e.text ?? '', cursor: 0 } }
  })

  await raise($).prompt.change({ text: 'ULTRATEUBE stp', cursor: 0, origin: { kind: 'history' } })
  expect(painted).toEqual([10])
})

test('the keyword attaches a note for the model, a plain prompt none', async ($, on) => {
  const contexts: Array<readonly string[] | undefined> = []
  on('prompt.submit', (_, e) => {
    contexts.push(e.context)
    return { text: e.text }
  })

  await $.prompt.submit({ text: 'ultrateube', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: 'bonjour', wait: false, origin: { kind: 'composer' } })
  expect(contexts[0]?.some(note => note.startsWith('[teube]'))).toBe(true)
  expect(contexts[1]).toBeUndefined()
})
