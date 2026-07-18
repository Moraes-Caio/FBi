import { useRef, useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const OUT_W = 1080
const OUT_H = 1920
const FRAME_W = 234
const FRAME_H = Math.round((FRAME_W * OUT_H) / OUT_W) // 9:16 → 416
const MARGIN = 36 // borda escurecida ao redor da moldura
const BOX_W = FRAME_W + MARGIN * 2
const BOX_H = FRAME_H + MARGIN * 2
const FRAME_L = MARGIN
const FRAME_T = MARGIN

/** Recorte manual: moldura fixa no formato do celular (9:16); a imagem fica atrás e é arrastada para posicionar. */
export function ImageCropper({ file, onConfirm, onCancel, salvando }: {
  file: File
  onConfirm: (blob: Blob) => void
  onCancel: () => void
  salvando?: boolean
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const i = new Image()
    i.onload = () => {
      // escala mínima para a imagem cobrir a moldura
      const scale = Math.max(FRAME_W / i.naturalWidth, FRAME_H / i.naturalHeight)
      scaleRef.current = scale
      const dw = i.naturalWidth * scale
      const dh = i.naturalHeight * scale
      // centraliza a imagem na moldura
      setOffset({ x: FRAME_L + FRAME_W / 2 - dw / 2, y: FRAME_T + FRAME_H / 2 - dh / 2 })
      setImg(i)
    }
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const dispW = img ? img.naturalWidth * scaleRef.current : 0
  const dispH = img ? img.naturalHeight * scaleRef.current : 0

  // mantém a moldura sempre coberta pela imagem
  const clamp = useCallback((x: number, y: number) => {
    const minX = FRAME_L + FRAME_W - dispW
    const minY = FRAME_T + FRAME_H - dispH
    return { x: Math.min(FRAME_L, Math.max(minX, x)), y: Math.min(FRAME_T, Math.max(minY, y)) }
  }, [dispW, dispH])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setOffset(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy))
  }
  const onPointerUp = () => { dragRef.current = null }

  const confirmar = () => {
    if (!img) return
    const s = scaleRef.current
    const sx = (FRAME_L - offset.x) / s
    const sy = (FRAME_T - offset.y) / s
    const sw = FRAME_W / s
    const sh = FRAME_H / s
    const c = document.createElement('canvas')
    c.width = OUT_W
    c.height = OUT_H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, OUT_W, OUT_H)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H)
    c.toBlob((b) => { if (b) onConfirm(b) }, 'image/jpeg', 0.9)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader><DialogTitle>Ajuste a imagem</DialogTitle></DialogHeader>
        <p className="text-[12px] text-muted-foreground -mt-1">
          Arraste a imagem para posicionar. O que ficar <b>dentro da moldura</b> é o que aparece na tela do celular.
        </p>
        <div className="flex justify-center">
          <div
            className="relative overflow-hidden rounded-xl bg-neutral-900 touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: BOX_W, height: BOX_H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img && (
              <img
                src={img.src}
                alt=""
                draggable={false}
                style={{ position: 'absolute', left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: 'none' }}
              />
            )}
            {/* Moldura: escurece tudo em volta e deixa o miolo transparente */}
            <div
              className="pointer-events-none absolute rounded-md ring-2 ring-white/90"
              style={{
                left: FRAME_L, top: FRAME_T, width: FRAME_W, height: FRAME_H,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={salvando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !img}>{salvando ? 'Enviando…' : 'Usar imagem'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
