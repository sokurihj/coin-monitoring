export interface ZoneBox {
  top: number
  bottom: number
  startTs: number  // Unix seconds (lightweight-charts 기준)
  color: string
  alpha: number
  label: string
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ISeriesPrimitive 구현 — zone 생성 시점부터 차트 오른쪽 끝까지 반투명 박스 렌더링
export class ZoneBoxesPrimitive {
  private _zones: ZoneBox[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _chart: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _series: any = null
  private _requestUpdate: (() => void) | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attached(param: any) {
    this._chart = param.chart
    this._series = param.series
    this._requestUpdate = param.requestUpdate
  }

  detached() {
    this._chart = null
    this._series = null
    this._requestUpdate = null
  }

  updateAllViews() {}

  updateZones(zones: ZoneBox[]) {
    this._zones = zones
    this._requestUpdate?.()
  }

  paneViews() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return [
      {
        renderer() {
          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            draw(target: any) {
              if (!self._chart || !self._series || !self._zones.length) return

              const timeScale = self._chart.timeScale()

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              target.useBitmapCoordinateSpace((scope: any) => {
                const ctx = scope.context as CanvasRenderingContext2D
                const hpr: number = scope.horizontalPixelRatio
                const vpr: number = scope.verticalPixelRatio
                const canvasWidth: number = scope.bitmapSize.width

                for (const zone of self._zones) {
                  const x1 = timeScale.timeToCoordinate(zone.startTs)
                  if (x1 == null) continue

                  const y1 = self._series.priceToCoordinate(zone.top)
                  const y2 = self._series.priceToCoordinate(zone.bottom)
                  if (y1 == null || y2 == null) continue

                  const left = Math.max(0, Math.round(x1 * hpr))
                  const right = canvasWidth
                  const top = Math.round(Math.min(y1, y2) * vpr)
                  const height = Math.round(Math.abs(y2 - y1) * vpr)
                  const width = right - left

                  if (width <= 0 || height <= 0) continue

                  // 반투명 배경
                  ctx.fillStyle = hexToRgba(zone.color, zone.alpha)
                  ctx.fillRect(left, top, width, height)

                  // 테두리 (상단, 하단, 좌측 수직선)
                  ctx.strokeStyle = zone.color
                  ctx.lineWidth = hpr
                  ctx.beginPath()
                  ctx.moveTo(left, top)
                  ctx.lineTo(right, top)
                  ctx.moveTo(left, top + height)
                  ctx.lineTo(right, top + height)
                  ctx.moveTo(left, top)
                  ctx.lineTo(left, top + height)
                  ctx.stroke()

                  // 레이블 — 박스 우측 상단
                  const fontSize = Math.round(9 * vpr)
                  ctx.fillStyle = zone.color
                  ctx.font = `${fontSize}px monospace`
                  ctx.textAlign = 'right'
                  ctx.fillText(zone.label, right - Math.round(4 * hpr), top + fontSize + Math.round(2 * vpr))
                }
              })
            },
          }
        },
        zOrder() {
          return 'bottom' as const
        },
      },
    ]
  }
}
