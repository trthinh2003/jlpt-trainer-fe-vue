<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { pointDistance } from '../strokeGeometry'
import type { Point, Stroke } from '../types'

const props = defineProps<{
  strokes: readonly Stroke[]
  guide?: readonly Stroke[]
  disabled?: boolean
  label: string
  describedBy: string
}>()
const emit = defineEmits<{ stroke: [stroke: Stroke]; drawing: [active: boolean] }>()
const canvas = ref<HTMLCanvasElement>()
let context: CanvasRenderingContext2D | undefined
let observer: ResizeObserver | undefined
let pointerId: number | undefined
let currentStroke: Stroke = []
const maxStrokes = 30
const maxPointsPerStroke = 1024
const ink = '#273650'
const guideInk = '#287673'

function drawStroke(stroke: Stroke, color = ink, width = .018): void {
  if (!context || !stroke.length) return
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = width
  const first = stroke[0]
  context.beginPath()
  if (stroke.length === 1) {
    context.arc(first.x, first.y, width / 2, 0, Math.PI * 2)
    context.fill()
    return
  }
  context.moveTo(first.x, first.y)
  for (let index = 1; index < stroke.length; index++) context.lineTo(stroke[index].x, stroke[index].y)
  context.stroke()
}

function drawDirection(stroke: Stroke): void {
  if (!context) return
  const start = stroke[0]
  const end = stroke[stroke.length - 1]
  const approach = stroke.slice(0, -1).reverse().find(point => pointDistance(point, end) >= .015)
  context.fillStyle = guideInk
  context.beginPath()
  context.arc(start.x, start.y, .014, 0, Math.PI * 2)
  context.fill()
  if (!approach) return

  const angle = Math.atan2(end.y - approach.y, end.x - approach.x)
  const wing = Math.min(.027, pointDistance(approach, end) * .85)
  drawStroke([
    { x: end.x - wing * Math.cos(angle + .6), y: end.y - wing * Math.sin(angle + .6) },
    end,
    { x: end.x - wing * Math.cos(angle - .6), y: end.y - wing * Math.sin(angle - .6) },
  ], guideInk, .008)
}

function redraw(): void {
  if (!context) return
  context.clearRect(0, 0, 1, 1)
  const active = props.strokes.length
  props.guide?.forEach((stroke, index) => drawStroke(stroke, index === active ? guideInk : '#dddbd3', .014))
  const currentGuide = props.guide?.[active]
  if (currentGuide) drawDirection(currentGuide)
  for (const stroke of props.strokes) drawStroke(stroke)
  drawStroke(currentStroke)
}

function resize(): void {
  const element = canvas.value
  if (!element || !context) return
  const size = Math.max(1, Math.min(1600, Math.round(element.clientWidth * window.devicePixelRatio)))
  element.width = size
  element.height = size
  context.setTransform(size, 0, 0, size, 0, 0)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  redraw()
}

function readPoint(event: PointerEvent, bounds: DOMRect): Point {
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  }
}

function startStroke(event: PointerEvent): void {
  if (!canvas.value || props.disabled || pointerId !== undefined || event.button !== 0 || props.strokes.length >= maxStrokes) return
  pointerId = event.pointerId
  canvas.value.setPointerCapture(event.pointerId)
  currentStroke = [readPoint(event, canvas.value.getBoundingClientRect())]
  drawStroke(currentStroke)
  emit('drawing', true)
}

function extendStroke(event: PointerEvent, bounds: DOMRect): void {
  const previous = currentStroke[currentStroke.length - 1]
  if (!previous) return
  const point = readPoint(event, bounds)
  if (pointDistance(point, previous) < .002) return
  if (currentStroke.length >= maxPointsPerStroke) return
  currentStroke.push(point)
  drawStroke([previous, point])
}

function moveStroke(event: PointerEvent): void {
  if (!canvas.value || pointerId !== event.pointerId) return
  const bounds = canvas.value.getBoundingClientRect()
  const samples = event.getCoalescedEvents?.()
  for (const sample of samples?.length ? samples : [event]) extendStroke(sample, bounds)
}

function endStroke(event: PointerEvent): void {
  if (!canvas.value || pointerId !== event.pointerId) return
  extendStroke(event, canvas.value.getBoundingClientRect())
  const stroke = currentStroke
  pointerId = undefined
  currentStroke = []
  redraw()
  emit('stroke', stroke)
  emit('drawing', false)
}

function cancelStroke(event: PointerEvent): void {
  if (pointerId !== event.pointerId) return
  pointerId = undefined
  currentStroke = []
  redraw()
  emit('drawing', false)
}

watch([() => props.strokes, () => props.guide], redraw)
onMounted(() => {
  const element = canvas.value
  if (!element) return
  context = element.getContext('2d') ?? undefined
  resize()
  observer = new ResizeObserver(resize)
  observer.observe(element)
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <canvas ref="canvas" width="360" height="360" :aria-label="label" :aria-describedby="describedBy"
    :aria-disabled="disabled"
    @pointerdown="startStroke" @pointermove="moveStroke" @pointerup="endStroke"
    @pointercancel="cancelStroke" @lostpointercapture="cancelStroke">
    Sử dụng ô tìm kiếm Kanji nếu thiết bị không hỗ trợ vẽ.
  </canvas>
</template>

<style scoped>
canvas {
  display: block;
  width: 100%;
  max-width: 340px;
  aspect-ratio: 1;
  box-sizing: border-box;
  border: 1px solid #cfc3b3;
  border-radius: 10px;
  background:
    linear-gradient(#e5ddd0, #e5ddd0) center / 1px 100% no-repeat,
    linear-gradient(#e5ddd0, #e5ddd0) center / 100% 1px no-repeat,
    #fffdf8;
  touch-action: none;
  cursor: crosshair;
}
canvas[aria-disabled="true"] { cursor: default; touch-action: auto; }
</style>
