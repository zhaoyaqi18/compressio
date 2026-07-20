'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolShell from '@/components/ToolShell';
import Dropzone from '@/components/Dropzone';

function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }

const SHAPES = ['free', 'circle', 'square', 'triangle', 'pentagon', 'hexagon'];

function drawShapePath(ctx, cx, cy, r, sides) {
  ctx.beginPath();
  if (sides === 0) { ctx.arc(cx, cy, r, 0, Math.PI * 2); return; }
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function shapeSides(s) { return s === 'circle' ? 0 : s === 'square' ? 4 : s === 'triangle' ? 3 : s === 'pentagon' ? 5 : 6; }

export default function CropClient() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const [sel, setSel] = useState(null);
  const [shape, setShape] = useState('free');
  const [shapeSize, setShapeSize] = useState(70);
  const [shapeAngle, setShapeAngle] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [outputFmt, setOutputFmt] = useState('image/png');
  const shapePos = useRef({ x: 0.5, y: 0.5 });

  const onFiles = useCallback((files) => {
    const f = files[0]; if (!f || !f.type.startsWith('image/')) return;
    setFile(f); setResult(null); setSel(null); setShowPreview(false);
    shapePos.current = { x: 0.5, y: 0.5 }; setShapeAngle(0);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { imgRef.current = img; drawFrame(img); };
    img.src = url;
  }, []);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const startRef = useRef(null);
  const previewUrl = useRef(null);
  const animFrame = useRef(null);
  const moveStart = useRef(null);

  function getCanvasSize(img) {
    const parent = canvasRef.current?.parentElement;
    const cw = Math.min(img.naturalWidth, (parent?.clientWidth || 800) - 16);
    return { cw, ch: cw * (img.naturalHeight / img.naturalWidth) };
  }

  function drawFrame(img, selection, shp = shape, sSize = shapeSize, angle = shapeAngle) {
    const c = canvasRef.current; if (!c || !img) return;
    const { cw, ch } = getCanvasSize(img);
    c.width = cw; c.height = ch;
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);

    if (shp === 'free' && selection && selection.w > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, cw, selection.y);
      ctx.fillRect(0, selection.y + selection.h, cw, ch - selection.y - selection.h);
      ctx.fillRect(0, selection.y, selection.x, selection.h);
      ctx.fillRect(selection.x + selection.w, selection.y, cw - selection.x - selection.w, selection.h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -(performance.now() / 200);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.setLineDash([]);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
      const cs = 10;
      [[selection.x, selection.y, 1, 1], [selection.x + selection.w, selection.y, -1, 1],
       [selection.x, selection.y + selection.h, 1, -1], [selection.x + selection.w, selection.y + selection.h, -1, -1]]
        .forEach(([x, y, dx, dy]) => { ctx.beginPath(); ctx.moveTo(x, y + cs * dy); ctx.lineTo(x, y); ctx.lineTo(x + cs * dx, y); ctx.stroke(); });
    } else if (shp !== 'free') {
      const cx = cw * shapePos.current.x, cy = ch * shapePos.current.y;
      const r2 = (Math.min(cw, ch) / 2) * (sSize / 100);
      const sides = shapeSides(shp);
      // Dim overlay: draw image → dim overlay → clip & redraw inside shape
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      if (sides === 0) { ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.clip(); }
      else {
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + angle * Math.PI / 180;
          const x = cx + r2 * Math.cos(a), y = cy + r2 * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.clip();
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      ctx.restore();
      // Dashed border
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -(performance.now() / 200);
      if (sides === 0) { ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke(); }
      else {
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + angle * Math.PI / 180;
          const x = cx + r2 * Math.cos(a), y = cy + r2 * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();
    }
  }

  useEffect(() => {
    if (!imgRef.current || shape === 'free') return;
    let running = true;
    function tick() {
      if (running && imgRef.current) drawFrame(imgRef.current, null, shape, shapeSize, shapeAngle);
      animFrame.current = requestAnimationFrame(tick);
    }
    tick();
    return () => { running = false; cancelAnimationFrame(animFrame.current); };
  }, [shape, shapeSize, shapeAngle]);

  const isInShape = (mx, my) => {
    const c = canvasRef.current; if (!c || !imgRef.current) return false;
    const { cw, ch } = getCanvasSize(imgRef.current);
    const cx2 = cw * shapePos.current.x, cy2 = ch * shapePos.current.y;
    const r2 = (Math.min(cw, ch) / 2) * (shapeSize / 100);
    const dx = mx - cx2, dy = my - cy2;
    if (shape === 'circle') return dx * dx + dy * dy <= r2 * r2;
    const ctx = c.getContext('2d');
    const sides = shapeSides(shape);
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + shapeAngle * Math.PI / 180;
      const x = cx2 + r2 * Math.cos(a), y = cy2 + r2 * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    return ctx.isPointInPath(mx, my);
  };

  const handleCanvasDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (shape !== 'free') {
      if (isInShape(mx, my)) { setMoveMode(true); moveStart.current = { mx, my, sx: shapePos.current.x, sy: shapePos.current.y }; return; }
      return;
    }
    startRef.current = { x: mx, y: my };
    setDrag(true); setSel({ x: mx, y: my, w: 0, h: 0 });
  };

  const handleCanvasMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (moveMode && shape !== 'free') {
      const dx = (mx - moveStart.current.mx) / getCanvasSize(imgRef.current).cw;
      const dy = (my - moveStart.current.my) / getCanvasSize(imgRef.current).ch;
      shapePos.current = { x: Math.max(0, Math.min(1, moveStart.current.sx + dx)), y: Math.max(0, Math.min(1, moveStart.current.sy + dy)) };
      return;
    }
    if (!drag || shape !== 'free') return;
    const s = { x: Math.min(startRef.current.x, mx), y: Math.min(startRef.current.y, my), w: Math.abs(mx - startRef.current.x), h: Math.abs(my - startRef.current.y) };
    setSel(s);
    if (imgRef.current) drawFrame(imgRef.current, s, 'free');
  };

  const handleCanvasUp = () => { setDrag(false); setMoveMode(false); };

  const handleShapeChange = (s) => {
    const defaultAngle = s === 'square' ? 45 : 0;
    setShape(s); setShowPreview(false); shapePos.current = { x: 0.5, y: 0.5 }; setShapeAngle(defaultAngle);
    if (imgRef.current) drawFrame(imgRef.current, null, s, shapeSize, defaultAngle);
  };

  const handleCrop = () => {
    if (!imgRef.current) return;
    setBusy(true); setShowPreview(false);
    const img = imgRef.current;
    const c = canvasRef.current;
    const { cw, ch } = getCanvasSize(img);
    const oc = document.createElement('canvas');
    const octx = oc.getContext('2d');

    if (shape === 'free' && sel && sel.w > 5 && sel.h > 5) {
      const sx = sel.x / cw * img.naturalWidth, sy = sel.y / ch * img.naturalHeight;
      const sw = sel.w / cw * img.naturalWidth, sh = sel.h / ch * img.naturalHeight;
      oc.width = Math.round(sw); oc.height = Math.round(sh);
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, oc.width, oc.height);
    } else if (shape !== 'free') {
      const posX = shapePos.current.x * img.naturalWidth, posY = shapePos.current.y * img.naturalHeight;
      const r2 = (Math.min(img.naturalWidth, img.naturalHeight) / 2) * (shapeSize / 100);
      const d = r2 * 2;
      oc.width = Math.round(d); oc.height = Math.round(d);
      if (outputFmt !== 'image/png') { octx.fillStyle = '#fff'; octx.fillRect(0, 0, oc.width, oc.height); }
      const sides = shapeSides(shape);
      octx.save();
      if (sides === 0) { octx.beginPath(); octx.arc(d / 2, d / 2, r2, 0, Math.PI * 2); octx.clip(); }
      else {
        octx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + shapeAngle * Math.PI / 180;
          const x = d / 2 + r2 * Math.cos(a), y = d / 2 + r2 * Math.sin(a);
          i === 0 ? octx.moveTo(x, y) : octx.lineTo(x, y);
        }
        octx.closePath(); octx.clip();
      }
      octx.drawImage(img, posX - r2, posY - r2, d, d, 0, 0, oc.width, oc.height);
      octx.restore();
    } else return;

    const fmt = outputFmt === 'image/png' ? 'image/png' : 'image/jpeg';
    oc.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      previewUrl.current = url;
      setResult({ blob, size: blob.size, w: oc.width, h: oc.height, url, fmt: outputFmt });
      setShowPreview(true);
      setBusy(false);
    }, fmt, fmt === 'image/jpeg' ? 0.95 : undefined);
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url; a.download = 'cropped_image.' + (result.fmt === 'image/png' ? 'png' : 'jpg'); a.click();
  };

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">All-in-one image toolkit</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Image Cropper</h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">Crop any shape — free selection, circle, triangle, pentagon. Drag shapes to reposition. Preview before download.</p>
        </div>
      </section>

      <ToolShell>
        <div className="space-y-6">
          <Dropzone onFiles={onFiles} disabled={busy} title="Drop your image here" subtitle="or click to browse" />

          {file && (
            <>
              <div className="flex flex-col items-center">
                <canvas ref={canvasRef} className="rounded-xl max-w-full border border-gray-200" style={{ background: '#f8fafc', cursor: shape === 'free' ? 'crosshair' : 'default' }}
                  onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasUp} />
                {shape === 'free' && sel && sel.w > 0 && <p className="mt-2 text-xs text-gray-500">{Math.round(sel.w)} × {Math.round(sel.h)} px</p>}
                {shape !== 'free' && <p className="mt-2 text-xs text-gray-400">Drag the shape to reposition</p>}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {SHAPES.map(s => (
                    <button key={s} onClick={() => handleShapeChange(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${shape === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {s === 'free' ? '✧ Free' : s === 'circle' ? '○' : s === 'square' ? '□' : s === 'triangle' ? '△' : s === 'pentagon' ? '⬠' : '⬡'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {shape !== 'free' && (
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                      <button onClick={() => setOutputFmt('image/png')} className={`px-3 py-1.5 transition ${outputFmt === 'image/png' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>PNG</button>
                      <button onClick={() => setOutputFmt('image/jpeg')} className={`px-3 py-1.5 transition ${outputFmt === 'image/jpeg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>JPEG</button>
                    </div>
                  )}
                  <button onClick={handleCrop} disabled={busy}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                    {busy ? 'Cropping…' : 'Crop Image'}
                  </button>
                </div>
              </div>

              {shape !== 'free' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size ({shapeSize}%)</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[25, 50, 75, 100].map(a => (
                        <button key={a} onClick={() => { setShapeSize(a); setShowPreview(false); }}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${shapeSize === a ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{a}%</button>
                      ))}
                    </div>
                    <input type="range" min={20} max={100} value={shapeSize} onChange={e => { setShapeSize(Number(e.target.value)); setShowPreview(false); }} className="mt-1.5 w-full accent-blue-600" /></div>
                  <div><label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rotate ({shapeAngle}°)</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                        <button key={a} onClick={() => { setShapeAngle(a); setShowPreview(false); }}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${Math.abs(shapeAngle - a) < 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{a}°</button>
                      ))}
                    </div>
                    <input type="range" min={0} max={360} value={shapeAngle} onChange={e => { setShapeAngle(Number(e.target.value)); setShowPreview(false); }} className="mt-1.5 w-full accent-blue-600" /></div>
                </div>
              )}

              {showPreview && result && !busy && (
                <div className="rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-100">
                  <p className="text-sm font-semibold text-green-800 mb-3">Preview — {result.w}×{result.h} · {formatSize(result.size)}</p>
                  <img src={result.url} alt="Cropped preview" className="max-h-64 mx-auto rounded-xl shadow-sm" />
                  <div className="mt-4 flex gap-3 justify-center">
                    <button onClick={handleDownload} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Download</button>
                    <button onClick={() => setShowPreview(false)} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ToolShell>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why does the cropped image have white areas around the shape?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">When cropping to a shape (circle, triangle, etc.) with JPEG output, the background is filled white. Switch to PNG output for a transparent background, or use "Free" crop for a clean rectangle.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Can I crop to a custom size ratio?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Use "Free" mode to draw any rectangular selection. For exact pixel dimensions, use the Resize tool after cropping.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why isn't the shape positioned where I want it?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">You can drag any geometric shape (circle, triangle, etc.) to reposition it over your image. Use the Size slider to adjust how much of the image is included.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              What resolution will the cropped image be?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">The crop output matches the pixel dimensions of your selection. For free crop, it's exactly the selected area. For shapes, it's the bounding box of the shape.</p>
          </details>
        </div>
      </section>
    </>
  );
}
