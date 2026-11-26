import type { KanjiTemplate, Stroke } from './types'

export const pointsPerStroke = 8
const bytesPerStroke = pointsPerStroke * 2
const coordinateScale = 255
const directionPenalty = .006
const orderPenalty = .018
const candidateLimit = 5
const maxCandidateDistance = .12

function resample(stroke: Stroke): Stroke {
  const distances = [0]
  for (let index = 1; index < stroke.length; index++) {
    distances.push(distances[index - 1] + Math.hypot(
      stroke[index].x - stroke[index - 1].x, stroke[index].y - stroke[index - 1].y,
    ))
  }
  const length = distances[distances.length - 1]
  if (length === 0) return Array.from({ length: pointsPerStroke }, () => stroke[0])

  let segmentEnd = 1
  return Array.from({ length: pointsPerStroke }, (_, index) => {
    const distance = length * index / (pointsPerStroke - 1)
    while (segmentEnd < distances.length - 1 && distances[segmentEnd] < distance) segmentEnd++
    const start = stroke[segmentEnd - 1]
    const end = stroke[segmentEnd]
    const span = distances[segmentEnd] - distances[segmentEnd - 1]
    const fraction = span > 0 ? (distance - distances[segmentEnd - 1]) / span : 0
    return { x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction }
  })
}

export function normalizeStrokes(strokes: readonly Stroke[]): Uint8Array {
  const nonempty = strokes.filter(stroke => stroke.length > 0)
  if (!nonempty.length) return new Uint8Array()

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of nonempty) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }
  const scale = Math.max(maxX - minX, maxY - minY) || 1
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const coordinates = nonempty.flatMap(stroke => resample(stroke).flatMap(point => [
    Math.round(((point.x - centerX) / scale + .5) * coordinateScale),
    Math.round(((point.y - centerY) / scale + .5) * coordinateScale),
  ]))
  return Uint8Array.from(coordinates)
}

function squaredDistance(a: Uint8Array, aOffset: number, b: Uint8Array, bOffset: number): number {
  let forward = 0
  let reverse = 0
  for (let point = 0; point < pointsPerStroke; point++) {
    const first = aOffset + point * 2
    const second = bOffset + point * 2
    const reversed = bOffset + (pointsPerStroke - 1 - point) * 2
    forward += (a[first] - b[second]) ** 2 + (a[first + 1] - b[second + 1]) ** 2
    reverse += (a[first] - b[reversed]) ** 2 + (a[first + 1] - b[reversed + 1]) ** 2
  }
  const divisor = pointsPerStroke * coordinateScale ** 2
  return Math.min(forward / divisor, reverse / divisor + directionPenalty)
}

function templateDistance(drawing: Uint8Array, template: Uint8Array, count: number): number {
  const matched = new Set<number>()
  let orderedCost = 0
  let flexibleCost = 0
  for (let index = 0; index < count; index++) {
    let bestIndex = -1
    let bestCost = Infinity
    for (let candidate = 0; candidate < count; candidate++) {
      const sameOrder = index === candidate
      if (!sameOrder && matched.has(candidate)) continue
      const distance = squaredDistance(drawing, index * bytesPerStroke, template, candidate * bytesPerStroke)
      if (sameOrder) orderedCost += distance
      const cost = distance + Math.abs(index - candidate) / count * orderPenalty
      if (!matched.has(candidate) && cost < bestCost) {
        bestCost = cost
        bestIndex = candidate
      }
    }
    matched.add(bestIndex)
    flexibleCost += bestCost
  }
  return Math.min(orderedCost, flexibleCost) / count
}

export function findKanjiCandidates(strokes: readonly Stroke[], templates: readonly KanjiTemplate[]): string[] {
  const drawing = normalizeStrokes(strokes)
  const count = drawing.length / bytesPerStroke
  if (count === 0) return []

  const scores: { character: string; distance: number }[] = []
  for (const [character, strokeCount, coordinates] of templates) {
    if (strokeCount !== count) continue
    const template = Uint8Array.from(atob(coordinates), symbol => symbol.charCodeAt(0))
    const distance = templateDistance(drawing, template, count)
    if (distance <= maxCandidateDistance) scores.push({ character, distance })
  }
  return scores.sort((a, b) => a.distance - b.distance).slice(0, candidateLimit).map(result => result.character)
}
