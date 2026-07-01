import { useEffect, useRef, useState } from 'react'

let pdfjsModule = null

async function loadPdfjs() {
  if (pdfjsModule) return pdfjsModule

  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url'),
  ])

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  pdfjsModule = pdfjs

  return pdfjsModule
}

export function SecurePdfPreview({ url }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current

    async function renderPdf() {
      if (!container || !url) return

      container.replaceChildren()
      setLoading(true)
      setError('')

      try {
        const pdfjs = await loadPdfjs()
        const pdf = await pdfjs.getDocument({ url }).promise
        const maxPageWidth = Math.max(320, Math.min(container.clientWidth - 32, 960))

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return

          const page = await pdf.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = maxPageWidth / baseViewport.width
          const viewport = page.getViewport({ scale })
          const pixelRatio = window.devicePixelRatio || 1
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          const pageShell = document.createElement('div')
          const pageLabel = document.createElement('div')

          canvas.width = Math.floor(viewport.width * pixelRatio)
          canvas.height = Math.floor(viewport.height * pixelRatio)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.className = 'rounded-2xl bg-white shadow-md'
          canvas.oncontextmenu = (event) => event.preventDefault()

          pageLabel.className = 'mb-2 text-xs font-bold uppercase tracking-widest text-slate-400'
          pageLabel.textContent = `Page ${pageNumber}`

          pageShell.className = 'mx-auto mb-5 w-fit select-none'
          pageShell.oncontextmenu = (event) => event.preventDefault()
          pageShell.append(pageLabel, canvas)
          container.append(pageShell)

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
          await page.render({ canvasContext: context, viewport }).promise
        }
      } catch {
        if (!cancelled) {
          setError('Preview PDF gagal dimuat. Coba tutup lalu buka preview lagi.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    renderPdf()

    return () => {
      cancelled = true
      if (container) container.replaceChildren()
    }
  }, [url])

  return (
    <div
      className="relative h-[60vh] w-full overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4 select-none"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={containerRef} />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">
          Memuat preview PDF...
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : null}
    </div>
  )
}
