'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolShell from '@/components/ToolShell';
import Dropzone from '@/components/Dropzone';

function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }

const PRESETS = [0, 15, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

export default function RotateClient() {
  const [file, setFile] = useState(null);
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [outputFmt, setOutputFmt] = useState('image/png');
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const onFiles = useCallback((files) => {
    const f = files[0]; if (!f || !f.type.startsWith('image/')) return;
    setFile(f); setResultUrl(null);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      renderAngle(img, 0);
    };
    img.src = URL.createObjectURL(f);
  }, []);

  function renderAngle(img, deg) {
    const c = canvasRef.current;
    if (!c || !img) return;
    const parent = c.parentElement;
    const maxW = (parent?.clientWidth || 800) - 16;
    const rad = deg * Math.PI / 180;
    const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const cw = Math.round(iw * cos + ih * sin);
    const ch = Math.round(iw * sin + ih * cos);
    // Scale to fit container while keeping aspect ratio
    const scale = Math.min(1, maxW / Math.max(cw, 1));
    const dw = Math.round(cw * scale), dh = Math.round(ch * scale);
    c.width = dw; c.height = dh;
    c.style.width = dw + 'px'; c.style.height = dh + 'px';
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, dw, dh);
    ctx.save();
    ctx.translate(dw / 2, dh / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -iw * scale / 2, -ih * scale / 2, iw * scale, ih * scale);
    ctx.restore();
  }

  useEffect(() => {
    if (!imgRef.current) return;
    renderAngle(imgRef.current, angle);
  }, [angle]);

  const handleAngleChange = (newAngle) => {
    setAngle(newAngle);
  };

  const handleDownload = () => {
    if (!imgRef.current) return;
    setBusy(true);
    const img = imgRef.current;
    const rad = angle * Math.PI / 180;
    const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
    c.height = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    c.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^.]+$/, '') + '_rotated.' + (outputFmt === 'image/png' ? 'png' : 'jpg');
      a.click();
      setBusy(false);
    }, outputFmt, outputFmt === 'image/jpeg' ? 0.95 : undefined);
  };

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">All-in-one image toolkit</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Rotate Images Free</h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">Rotate by any angle with real-time live preview. Adjust and download instantly.</p>
        </div>
      </section>
      <ToolShell>
        <div className="space-y-6">
          <Dropzone onFiles={onFiles} disabled={busy} title="Drop your image here" subtitle="or click to browse" />
          {file && (
            <>
              <div className="flex flex-col items-center">
                <canvas ref={canvasRef} className="rounded-xl max-w-full border border-gray-200" style={{ background: '#f8fafc' }} />
              </div>

              {/* Angle presets */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quick angle</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map(a => (
                    <button key={a} onClick={() => handleAngleChange(a)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${angle === a ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {a}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom slider */}
              <div>
                <label className="text-sm font-medium text-gray-700">Custom angle <span className="font-normal text-blue-600 ml-1">({Math.round(angle)}°)</span></label>
                <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(Number(e.target.value))} className="mt-2 w-full accent-blue-600" />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                  <button onClick={() => setOutputFmt('image/png')} className={`px-3 py-1.5 transition ${outputFmt === 'image/png' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>PNG</button>
                  <button onClick={() => setOutputFmt('image/jpeg')} className={`px-3 py-1.5 transition ${outputFmt === 'image/jpeg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>JPEG</button>
                </div>
                <button onClick={handleDownload} disabled={busy}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                  {busy ? 'Processing…' : 'Download Rotated Image'}
                </button>
              </div>
            </>
          )}
        </div>
      </ToolShell>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why are there empty areas around my rotated image?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">When rotating by non-90° angles, the image naturally has triangular gaps at the corners. These areas are transparent in PNG output. Switch between PNG and JPEG to choose transparent or white background.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Does rotating reduce image quality?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Each rotation causes a slight quality loss because the image is re-encoded. For frequent rotations, keep the original and only rotate at the final step. Use 90° increments for zero quality loss.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Can I flip the image horizontally or vertically?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">This tool supports rotation only. For mirroring/flipping, use image editing software. A 180° rotation gives the same result as flipping both horizontally and vertically.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why does the preview look different from the downloaded image?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">The preview renders at reduced resolution for performance. The downloaded image is always full resolution at the original pixel dimensions, just rotated.</p>
          </details>
        </div>
      </section>
    </>
  );
}
