'use client';
import { useState, useCallback, useRef } from 'react';
import ToolShell from '@/components/ToolShell';
import Dropzone from '@/components/Dropzone';

function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }

const PRESETS = [
  { group: 'Instagram', w: 1080, h: 1080, label: 'Square Post' },
  { group: 'Instagram', w: 1080, h: 1350, label: 'Portrait Post' },
  { group: 'Instagram', w: 1080, h: 1920, label: 'Story / Reels' },
  { group: 'Instagram', w: 320, h: 320, label: 'Profile Photo' },
  { group: 'Facebook', w: 1200, h: 630, label: 'Feed Post' },
  { group: 'Facebook', w: 820, h: 312, label: 'Cover Photo' },
  { group: 'Twitter / X', w: 1600, h: 900, label: 'Post' },
  { group: 'Twitter / X', w: 1500, h: 500, label: 'Header' },
  { group: 'LinkedIn', w: 1200, h: 627, label: 'Post' },
  { group: 'TikTok', w: 1080, h: 1920, label: 'Video Cover' },
  { group: 'YouTube', w: 1280, h: 720, label: 'Thumbnail' },
  { group: 'Pinterest', w: 1000, h: 1500, label: 'Pin' },
];

export default function ResizeClient() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [w, setW] = useState(800);
  const [h, setH] = useState(600);
  const [lock, setLock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const imgRef = useRef(null);
  const lockRef = useRef(true);

  const onFiles = useCallback((files) => {
    const f = files[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f); setResult(null); setActivePreset(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => { imgRef.current = img; setW(img.naturalWidth); setH(img.naturalHeight); };
    img.src = url;
  }, []);

  const applyPreset = (p) => {
    setActivePreset(p);
    setW(p.w);
    if (imgRef.current) {
      const r = p.w / p.h;
      setH(Math.round(p.w / r));
    } else {
      setH(p.h);
    }
  };

  const handleResize = () => {
    if (!imgRef.current || busy) return;
    setBusy(true);
    const img = imgRef.current;
    const tw = Math.max(1, Math.min(w, 10000));
    const th = Math.max(1, Math.min(h, 10000));
    const iw = img.naturalWidth, ih = img.naturalHeight;

    // 1. Stretch fit (current behavior)
    const sCanvas = document.createElement('canvas');
    sCanvas.width = tw; sCanvas.height = th;
    sCanvas.getContext('2d').drawImage(img, 0, 0, tw, th);

    // 2. Cover crop (maintain aspect ratio, crop edges)
    const cCanvas = document.createElement('canvas');
    cCanvas.width = tw; cCanvas.height = th;
    const srcRatio = iw / ih, dstRatio = tw / th;
    let sx, sy, sw, sh;
    if (srcRatio > dstRatio) {
      // Source is wider: crop left/right
      sh = ih;
      sw = ih * dstRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      // Source is taller: crop top/bottom
      sw = iw;
      sh = iw / dstRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }
    cCanvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);

    let count = 0;
    const results = {};
    const done = () => { count++; if (count === 2) { setResult(results); setBusy(false); } };

    sCanvas.toBlob((blob) => {
      results.stretch = { blob, size: blob.size, url: URL.createObjectURL(blob) };
      done();
    }, 'image/jpeg', 0.92);

    cCanvas.toBlob((blob) => {
      results.cover = { blob, size: blob.size, url: URL.createObjectURL(blob) };
      done();
    }, 'image/jpeg', 0.92);
  };

  // Group presets
  const groups = {};
  PRESETS.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  const isActive = (p) => activePreset && activePreset.w === p.w && activePreset.h === p.h && activePreset.group === p.group;

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">All-in-one image toolkit</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Resize Images for Any Platform</h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">Change image dimensions to any size — custom or use presets for Instagram, Facebook, Twitter, TikTok, and more.</p>
        </div>
      </section>
      <ToolShell>
        <div className="space-y-6">
          <Dropzone onFiles={onFiles} disabled={busy} title="Drop your image here" subtitle="or click to browse" />
          {file && (
            <>
              {preview && <div className="rounded-xl overflow-hidden border border-gray-200"><div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">Preview</div><img src={preview} alt="" className="w-full max-h-80 object-contain bg-gray-100" /></div>}

              {/* Social media presets */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quick resize for</label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-y-auto">
                  {Object.entries(groups).map(([group, items]) => (
                    <fieldset key={group} className="rounded-xl border border-gray-200 p-3">
                      <legend className="px-1 text-sm font-semibold text-gray-800">{group}</legend>
                      {items.map((p, i) => (
                        <button key={i} onClick={() => applyPreset(p)}
                          className={`block w-full text-left px-2 py-1.5 rounded-lg text-sm transition ${isActive(p) ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                          <span>{p.label}</span>
                          <span className="ml-2 text-xs text-gray-400">{p.w}×{p.h}</span>
                        </button>
                      ))}
                    </fieldset>
                  ))}
                </div>
              </div>

              {/* Custom size */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700">Width (px)</label>
                  <input type="number" value={w} onChange={e => { const nv = Number(e.target.value); setW(nv); setActivePreset(null); if (lockRef.current && imgRef.current) setH(Math.round(nv * imgRef.current.naturalHeight / imgRef.current.naturalWidth)); }} min={1} max={10000}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                <div><label className="text-sm font-medium text-gray-700">Height (px)</label>
                  <input type="number" value={h} onChange={e => { const nv = Number(e.target.value); setH(nv); setActivePreset(null); if (lockRef.current && imgRef.current) setW(Math.round(nv * imgRef.current.naturalWidth / imgRef.current.naturalHeight)); }} min={1} max={10000}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={lock} onChange={e => { lockRef.current = e.target.checked; setLock(e.target.checked); }} className="h-4 w-4 rounded accent-blue-600" />
                Maintain aspect ratio
              </label>

              <button onClick={handleResize} disabled={busy}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Resizing…' : 'Resize Image'}
              </button>

              {result && !busy && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-orange-50 p-4 text-center ring-1 ring-orange-100">
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Stretch fill</p>
                      <img src={result.stretch.url} alt="" className="max-h-40 mx-auto rounded-lg shadow-sm object-contain bg-white" />
                      <p className="mt-2 text-xs text-orange-700">{w}×{h} · {formatSize(result.stretch.size)}</p>
                      <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(result.stretch.blob); a.download = file.name.replace(/\.[^.]+$/, '') + '_stretch.jpg'; a.click(); }}
                        className="mt-2 inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700">Download</button>
                    </div>
                    <div className="rounded-2xl bg-green-50 p-4 text-center ring-1 ring-green-100">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Cover crop ✦</p>
                      <img src={result.cover.url} alt="" className="max-h-40 mx-auto rounded-lg shadow-sm object-contain bg-white" />
                      <p className="mt-2 text-xs text-green-700">{w}×{h} · {formatSize(result.cover.size)}</p>
                      <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(result.cover.blob); a.download = file.name.replace(/\.[^.]+$/, '') + '_cover.jpg'; a.click(); }}
                        className="mt-2 inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700">Download</button>
                    </div>
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
              Why does my image look stretched after resizing?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">This happens when the target aspect ratio doesn\'t match the original. Two options are provided: "Stretch fill" fills the target exactly (may distort), and "Cover crop" maintains the original ratio by cropping edges. Compare both and pick the better one.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Will resizing make my image blurry?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Enlarging (upscaling) reduces sharpness because the browser fills in missing pixels. Shrinking (downscaling) usually looks fine. For best results, start with a high-resolution original.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              What are the preset sizes for?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Social media platforms have specific recommended image sizes. Instagram Square (1080×1080), YouTube Thumbnail (1280×720), etc. Select a preset to instantly set the correct dimensions for that platform.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Can I use my own custom size?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Yes. Uncheck "Maintain aspect ratio" or type your own width/height directly. Use the custom input box to enter dimensions like "800×600" or pick from the presets above.</p>
          </details>
        </div>
      </section>
    </>
  );
}
