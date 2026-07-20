'use client';
import { useState, useCallback } from 'react';
import ToolShell from '@/components/ToolShell';
import Dropzone from '@/components/Dropzone';

const FORMATS = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' };
const TARGETS = [
  { value: 0, label: 'None' },
  { value: 100 * 1024, label: '100 KB' },
  { value: 200 * 1024, label: '200 KB' },
  { value: 300 * 1024, label: '300 KB' },
  { value: 500 * 1024, label: '500 KB' },
  { value: 1 * 1048576, label: '1 MB' },
  { value: 2 * 1048576, label: '2 MB' },
];
const PRESET_SIZES = [
  { label: 'Instagram Square', w: 1080, h: 1080 },
  { label: 'Instagram Story', w: 1080, h: 1920 },
  { label: 'Facebook Post', w: 1200, h: 630 },
  { label: 'Twitter Post', w: 1600, h: 900 },
  { label: 'LinkedIn Post', w: 1200, h: 627 },
  { label: 'TikTok Cover', w: 1080, h: 1920 },
  { label: 'YouTube Thumbnail', w: 1280, h: 720 },
  { label: 'Pinterest Pin', w: 1000, h: 1500 },
];

function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }

function parseCustomSize(v) {
  const m = v.match(/^(\d+)\s*[×xX*]\s*(\d+)$/);
  return m ? { w: parseInt(m[1]), h: parseInt(m[2]) } : null;
}

export default function BatchClient() {
  const [items, setItems] = useState([]);
  const [format, setFormat] = useState('original');
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [outputs, setOutputs] = useState([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [targetBytes, setTargetBytes] = useState(0);
  const [presetIds, setPresetIds] = useState({});
  const [customSize, setCustomSize] = useState('');
  const [customParsed, setCustomParsed] = useState(null);
  const [step, setStep] = useState(1);

  const onFiles = useCallback((files) => {
    const max = 50;
    const accepted = [];
    for (const f of files) {
      if (accepted.length >= max - items.length) break;
      if (f.type.startsWith('image/')) accepted.push(f);
    }
    setItems(prev => [...prev, ...accepted.map(f => ({ id: Math.random(), file: f, name: f.name, size: f.size, thumb: URL.createObjectURL(f), status: 'ready' }))]);
    setStep(2); setOutputs([]);
  }, [items.length]);

  const removeItem = (id) => { setItems(prev => prev.filter(x => x.id !== id)); if (items.length <= 1) setStep(1); };

  const loadImage = (file) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });

  const compressImage = (img, target) => new Promise((resolve) => {
    let low = 0.05, high = 1.0, bestBlob = null;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    let w = img.naturalWidth, h = img.naturalHeight;
    const MAX = 2048;
    if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
    c.width = w; c.height = h;
    (async () => {
      for (let i = 0; i < 20; i++) {
        const q = (low + high) / 2;
        ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
        if (!blob) { high = q; continue; }
        if (blob.size > target) high = q; else bestBlob = blob;
        if (bestBlob && Math.abs(blob.size - target) < target * 0.02) break;
      }
      if (!bestBlob) {
        w = Math.round(w * 0.75); h = Math.round(h * 0.75);
        c.width = w; c.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        bestBlob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.05));
      }
      resolve(bestBlob);
    })();
  });

  const runBatch = async () => {
    if (items.length === 0) return;
    const sizes = [];
    PRESET_SIZES.forEach((s, i) => { if (presetIds[i]) sizes.push(s); });
    if (customParsed) sizes.push(customParsed);
    if (targetBytes === 0 && sizes.length === 0) {
      // Just output as-is (format conversion only)
      if (typeof JSZip === 'undefined') {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      }
      setBusy(true); setOutputs([]); setDone(0); setTotal(items.length);
      const all = [];
      for (const it of items) {
        const img = await loadImage(it.file);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        const fmt = format === 'original' ? 'image/jpeg' : format;
        const blob = await new Promise(r => c.toBlob(r, fmt, quality / 100));
        const ext = fmt.split('/')[1].replace('jpeg', 'jpg');
        all.push({ blob, name: it.name.replace(/\.[^.]+$/, '') + '_output.' + ext });
        setDone(d => d + 1);
      }
      setOutputs(all); setBusy(false); setStep(3);
      return;
    }
    if (typeof JSZip === 'undefined') {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    }
    setBusy(true); setOutputs([]); setDone(0);
    const tasks = items.length * Math.max(sizes.length, targetBytes > 0 ? 1 : 0);
    setTotal(tasks);
    const all = [];
    for (const it of items) {
      const img = await loadImage(it.file);
      // Compress mode
      if (targetBytes > 0) {
        const blob = await compressImage(img, targetBytes);
        const ext = 'jpg';
        all.push({ blob, name: it.name.replace(/\.[^.]+$/, '') + `_compressed.${ext}` });
        setDone(d => d + 1);
      }
      // Size presets
      for (const s of sizes) {
        const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
        c.getContext('2d').drawImage(img, 0, 0, s.w, s.h);
        const fmt = format === 'original' ? 'image/jpeg' : format;
        const blob = await new Promise(r => c.toBlob(r, fmt, quality / 100));
        const ext = fmt.split('/')[1].replace('jpeg', 'jpg');
        all.push({ blob, name: it.name.replace(/\.[^.]+$/, '') + `_${s.w}x${s.h}.${ext}` });
        setDone(d => d + 1);
      }
    }
    setOutputs(all); setBusy(false); setStep(3);
  };

  const downloadAll = async () => {
    if (outputs.length === 1) { const a = document.createElement('a'); a.href = URL.createObjectURL(outputs[0].blob); a.download = outputs[0].name; a.click(); return; }
    const zip = new JSZip();
    outputs.forEach(o => zip.file(o.name, o.blob));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = 'compressio-batch.zip'; a.click();
  };

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">All-in-one image toolkit</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Batch Image Processor</h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">Compress, resize, or both — all at once. Process up to 50 images in one click.</p>
        </div>
      </section>

      <ToolShell>
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold">
            {[{ n: 1, l: 'Upload' }, { n: 2, l: 'Configure' }, { n: 3, l: 'Download' }].map(s => (
              <div key={s.n} className="flex items-center gap-1">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{s.n}</span>
                <span className={step >= s.n ? 'text-gray-900' : 'text-gray-400'}>{s.l}</span>
                {s.n < 3 && <span className="text-gray-300 mx-1">→</span>}
              </div>
            ))}
          </div>

          <Dropzone onFiles={onFiles} disabled={busy} title="Drop images here" subtitle="or click to browse — JPEG, PNG, WebP · Up to 50 files" />

          {items.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map(it => (
                <li key={it.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0"><img src={it.thumb} alt="" className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{it.name}</p><p className="text-xs text-gray-500">{formatSize(it.size)}</p></div>
                  {!busy && <button onClick={() => removeItem(it.id)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>}
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && step >= 2 && (
            <>
              {/* Format + Quality */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-gray-700">Output format</label>
                  <select value={format} onChange={e => setFormat(e.target.value)} disabled={busy}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="original">Original format</option>
                    {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="text-sm font-medium text-gray-700">Target size</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {TARGETS.map(t => (
                      <button key={t.value} onClick={() => setTargetBytes(t.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition ${targetBytes === t.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.label}</button>
                    ))}
                  </div></div>
              </div>

              {/* Preset sizes */}
              <div className="rounded-xl border border-gray-200 p-4">
                <label className="text-sm font-semibold text-gray-700">Resize to preset sizes <span className="font-normal text-gray-400">(optional)</span></label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PRESET_SIZES.map((s, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                      <input type="checkbox" checked={!!presetIds[i]} onChange={() => setPresetIds(p => ({ ...p, [i]: !p[i] }))} className="h-4 w-4 rounded accent-blue-600" />
                      <span className="flex-1">{s.label}</span>
                      <span className="text-xs text-gray-400">{s.w}×{s.h}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom size */}
              <div className="rounded-xl border border-gray-200 p-4">
                <label className="text-sm font-semibold text-gray-700">Custom size <span className="font-normal text-gray-400">(optional — e.g. 800×600)</span></label>
                <input value={customSize} onChange={e => { setCustomSize(e.target.value); setCustomParsed(parseCustomSize(e.target.value)); }}
                  placeholder="e.g. 800×600 or 1920x1080"
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                {customParsed && <p className="mt-1 text-xs text-green-600">Custom size: {customParsed.w}×{customParsed.h}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={runBatch} disabled={busy}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                  {busy ? `Processing ${done}/${total}…` : `Run Batch (${items.length} files)`}
                </button>
                <button onClick={() => { setItems([]); setStep(1); setOutputs([]); }} disabled={busy}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Clear</button>
              </div>

              {busy && <div><div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${total > 0 ? Math.round(done / total * 100) : 0}%` }} /></div><p className="mt-1 text-xs text-gray-500">{done} / {total}</p></div>}
            </>
          )}

          {outputs.length > 0 && !busy && step === 3 && (
            <div className="rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-100">
              <p className="text-sm font-semibold text-green-800">Done — {outputs.length} images ready</p>
              <p className="mt-1 text-xs text-green-600">{items.length} file(s) processed</p>
              <button onClick={downloadAll} className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                {outputs.length === 1 ? 'Download Image' : `Download ZIP (${outputs.length} files)`}
              </button>
            </div>
          )}
        </div>
      </ToolShell>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              How many images can I process at once?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Up to 50 images per batch. Each image can be processed into multiple sizes simultaneously — for example, 10 images × 4 preset sizes = 40 output files in one ZIP download.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why is my PNG file size not reduced in batch mode?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">PNG is a lossless format and cannot be compressed via quality adjustment. In batch mode, use "Target size" with JPEG or WebP format for actual compression. Leave it as "None" to simply resize or convert without compression.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              How are the output files named?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Each output file is named: original-name_size-label_dimensions.ext (e.g. "sunset_Instagram_Square_1080x1080.jpg"). All files are bundled into a single ZIP archive for easy download.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Do I need to select both a format and a size?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">No. You can just compress (select a target size), just resize (select preset or custom sizes), or both. If nothing is selected, the images are output at original size in the chosen format.</p>
          </details>
        </div>
      </section>
    </>
  );
}
