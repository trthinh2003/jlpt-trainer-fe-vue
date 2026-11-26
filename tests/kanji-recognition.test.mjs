import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, recognition, templates, geometry, practice

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
  practice = await vite.ssrLoadModule('/src/features/kanji-drawing/practice.ts')
  geometry = await vite.ssrLoadModule('/src/features/kanji-drawing/strokeGeometry.ts')
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
    assert.equal(Buffer.from(coordinates, 'base64').length, strokeCount * geometry.pointsPerStroke * 2, character)
  }
})

test('keeps similar shapes in the first five with approximate handwriting', () => {
  const line = (...points) => points.map(([x, y]) => ({ x, y }))
  const vertical = line([.28, .17], [.29, .53], [.28, .84])
  const corner = line([.28, .21], [.72, .17], [.71, .42], [.72, .85])
  const bar = y => line([.29, y + .016], [.49, y], [.71, y - .013])
  const branch = (width, y) => line([.5 - width, y + .018], [.48, y + .007], [.5 + width, y])
  const tree = (top, middle) => [branch(top, .25), branch(middle, .45), ...wood.slice(1)]

  for (const [character, drawing] of [
    ['日', [vertical, corner, bar(.49), bar(.82)]],
    ['目', [vertical, corner, bar(.39), bar(.60), bar(.82)]],
    ['未', tree(.21, .36)],
    ['末', tree(.37, .23)],
  ]) assert.ok(recognition.findKanjiCandidates(drawing, templates).includes(character), character)
})

test('practice accepts a close trace and distinguishes backward, misplaced and incomplete strokes', () => {
  const [first, second] = practice.createStrokeGuide(templates.find(([character]) => character === '木'))
  const trace = first.map(point => ({ x: point.x + .018, y: point.y + .022 }))

  assert.equal(practice.checkPracticeStroke(trace, first), 'accepted')
  assert.equal(practice.checkPracticeStroke([...trace].reverse(), first), 'direction')
  assert.equal(practice.checkPracticeStroke(second, first), 'trace')
  assert.equal(practice.checkPracticeStroke(trace.slice(0, 3), first), 'trace')
  assert.equal(practice.checkPracticeStroke([trace[4]], first), 'trace')
})

test('each bundled practice guide stays inside the canvas and accepts tracing in canonical order', () => {
  for (const template of templates) {
    const guide = practice.createStrokeGuide(template)
    assert.equal(guide.length, template[1], template[0])
    for (const stroke of guide) {
      assert.ok(stroke.every(({ x, y }) => x > 0 && y > 0 && x < 1 && y < 1), template[0])
      assert.equal(practice.checkPracticeStroke(stroke, stroke), 'accepted', template[0])
    }
    assert.ok(practice.checkMemoryWriting(guide, guide), template[0])
  }
})

test('memory writing accepts a scaled and shifted character and rejects reversed and swapped strokes', () => {
  const guide = practice.createStrokeGuide(templates.find(([character]) => character === '木'))
  const drawing = guide.map((stroke, index) => stroke.map(({ x, y }, point) => ({
    x: .05 + x * .62 + .006 * Math.sin(index + point),
    y: .22 + y * .62 + .006 * Math.cos(index - point),
  })))
  const [first, second, ...remaining] = drawing

  assert.ok(practice.checkMemoryWriting(drawing, guide))
  assert.ok(!practice.checkMemoryWriting([[...first].reverse(), second, ...remaining], guide))
  assert.ok(!practice.checkMemoryWriting([second, first, ...remaining], guide))
  assert.ok(!practice.checkMemoryWriting(drawing.slice(0, 3), guide))
})

test('memory writing preserves the proportions that distinguish 未 and 末', () => {
  const [notYet, end] = ['未', '末'].map(glyph => practice.createStrokeGuide(templates.find(([character]) => character === glyph)))
  assert.ok(!practice.checkMemoryWriting(notYet, end))
  assert.ok(!practice.checkMemoryWriting(end, notYet))
})
