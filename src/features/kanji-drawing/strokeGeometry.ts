import type { Point, Stroke } from './types'

export const pointsPerStroke = 8

export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function resampleStroke(stroke: Stroke): Stroke {
  const distances = [0]
  for (let index = 1; index < stroke.length; index++) {
    distances.push(distances[index - 1] + pointDistance(stroke[index], stroke[index - 1]))
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
