// Clone the SVG with computed styles inlined so CSS variables survive standalone rendering.
export async function exportChartPng(svg: SVGSVGElement, background: string, scale = 2): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const src = svg.querySelectorAll<SVGElement>('*')
  const dst = clone.querySelectorAll<SVGElement>('*')
  const PROPS = ['stroke', 'fill', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'text-anchor'] as const
  src.forEach((el, i) => {
    const cs = getComputedStyle(el)
    for (const p of PROPS) dst[i].setAttribute(p, cs.getPropertyValue(p))
    dst[i].removeAttribute('class')
  })
  const rect = svg.getBoundingClientRect()
  clone.setAttribute('width', String(rect.width * scale))
  clone.setAttribute('height', String(rect.height * scale))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('render failed')); img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = rect.width * scale
    canvas.height = rect.height * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) throw new Error('png failed')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'smith-chart.png'
    a.click()
    URL.revokeObjectURL(a.href)
  } finally {
    URL.revokeObjectURL(url)
  }
}
