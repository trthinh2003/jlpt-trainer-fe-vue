import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, recognition, templates

const wood = [
  [[.18, .34], [.51, .32], [.84, .31]],
  [[.53, .14], [.51, .53], [.5, .88]],
  [[.5, .37], [.34, .59], [.16, .76]],
  [[.53, .39], [.70, .62], [.85, .76]],
].map(stroke => stroke.map(([x, y]) => ({ x, y })))

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  recognition = await vite.ssrLoadModule('/src/features/kanji-drawing/recognition.ts')
  templates = (await vite.ssrLoadModule('/src/features/kanji-drawing/data/templates.ts')).default
})

after(async () => { await vite?.close() })

test('recognizes a hand-drawn 木 after scaling and translation', () => {
  const offset = wood.map(stroke => stroke.map(({ x, y }) => ({ x: 40 + x * 125, y: 90 + y * 125 })))
  assert.equal(recognition.findKanjiCandidates(wood, templates)[0], '木')
  assert.equal(recognition.findKanjiCandidates(offset, templates)[0], '木')
})

test('keeps the character among suggestions for small stroke order and direction changes', () => {
  const altered = [wood[1], wood[0], [...wood[2]].reverse(), wood[3]]
  const candidates = recognition.findKanjiCandidates(altered, templates)
  assert.ok(candidates.includes('木'))
  assert.ok(candidates.length <= 5)
})

test('ignores blank drawings and recognizes a single horizontal stroke', () => {
  assert.deepEqual(recognition.findKanjiCandidates([], templates), [])
  assert.equal(recognition.findKanjiCandidates([[{ x: .1, y: .5 }, { x: .9, y: .51 }]], templates)[0], '一')
})

test('bundled templates have unique characters and the expected coordinates per stroke', () => {
  assert.ok(templates.length >= 600)
  assert.equal(new Set(templates.map(([character]) => character)).size, templates.length)
  for (const [character, strokeCount, coordinates] of templates) {
    assert.match(character, /^\p{Script=Han}$/u)
    assert.equal(Buffer.from(coordinates, 'base64').length, strokeCount * recognition.pointsPerStroke * 2, character)
  }
})
