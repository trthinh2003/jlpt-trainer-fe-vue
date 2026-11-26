import { normalizeStrokes } from './recognition'
import { pointDistance, pointsPerStroke, resampleStroke } from './strokeGeometry'
import type { KanjiTemplate, Stroke } from './types'

const guideInset = .12

function readStrokes(strokeCount: number, coordinateAt: (index: number) => number): Stroke[] {
  const readCoordinate = (index: number) => guideInset + coordinateAt(index) / 255 * (1 - 2 * guideInset)
  return Array.from({ length: strokeCount }, (_, strokeIndex) =>
    Array.from({ length: pointsPerStroke }, (_, pointIndex) => {
      const offset = (strokeIndex * pointsPerStroke + pointIndex) * 2
      return { x: readCoordinate(offset), y: readCoordinate(offset + 1) }
    }),
  )
}

export function createStrokeGuide([, strokeCount, coordinates]: KanjiTemplate): Stroke[] {
  const bytes = atob(coordinates)
  return readStrokes(strokeCount, index => bytes.charCodeAt(index))
}

function strokeLength(stroke: Stroke): number {
  let length = 0
  for (let index = 1; index < stroke.length; index++) length += pointDistance(stroke[index - 1], stroke[index])
  return length
}

export function checkPracticeStroke(stroke: Stroke, guide: Stroke): 'accepted' | 'direction' | 'trace' {
  if (!stroke.length) return 'trace'
  const pathLength = strokeLength(guide)
  if (pathLength > .05 && strokeLength(stroke) < pathLength * .5) return 'trace'
  const sample = resampleStroke(stroke)
  const reference = resampleStroke(guide)
  const last = pointsPerStroke - 1
  const span = pointDistance(reference[0], reference[last])
  const endpointTolerance = Math.min(.095, .032 + span * .18)
  const pathTolerance = Math.min(.073, .025 + pathLength * .12)

  function follows(expected: Stroke): boolean {
    if (pointDistance(sample[0], expected[0]) > endpointTolerance ||
        pointDistance(sample[last], expected[last]) > endpointTolerance) return false
    const squaredError = sample.reduce((sum, point, index) => sum + pointDistance(point, expected[index]) ** 2, 0)
    return Math.sqrt(squaredError / pointsPerStroke) <= pathTolerance
  }

  if (follows(reference)) return 'accepted'
  return follows(reference.reverse()) ? 'direction' : 'trace'
}

export function checkMemoryWriting(strokes: readonly Stroke[], guide: readonly Stroke[]): boolean {
  if (!strokes.length || strokes.length !== guide.length || strokes.some(stroke => !stroke.length)) return false
  const coordinates = normalizeStrokes(strokes)
  const normalized = readStrokes(strokes.length, index => coordinates[index])
  return normalized.every((stroke, index) => checkPracticeStroke(stroke, guide[index]) === 'accepted')
}
