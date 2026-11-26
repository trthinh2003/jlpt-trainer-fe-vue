export interface Point {
  x: number
  y: number
}

export type Stroke = Point[]
export type KanjiTemplate = [character: string, strokeCount: number, coordinates: string]
