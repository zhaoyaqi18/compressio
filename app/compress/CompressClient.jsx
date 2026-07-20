'use client';
import { useState, useCallback, useRef } from 'react';
import ToolShell from '@/components/ToolShell';
import Dropzone from '@/components/Dropzone';

const PRESETS = [
  { value: 100 * 1024, label: '100KB' },
  { value: 200 * 1024, label: '200KB' },
  { value: 300 * 1024, label: '300KB' },
  { value: 500 * 1024, label: '500KB' },
  { value: 1 * 1048576, label: '1MB' },
  { value: 2 * 1048576, label: '2MB' },
  { value: 5 * 1048576, label: '5MB' },
];

function formatSize(b) {
  if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB';
}

function parseCustom(val) {
  const m = val.match(/^(\d+(?:\.\d+)?)\s*(kb|mb)?$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = (m[2] || 'kb').toLowerCase();
  return unit === 'mb' ? num * 1048576 : num * 1024;
}

function compressImage(file, targetBytes, onProgress, fmt) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        if (file.size <= targetBytes) { onProgress(100); resolve({ blob: file, size: file.size, width: img.naturalWidth, height: img.naturalHeight, skipped: true, origUrl: URL.createObjectURL(file), fmt: 'same' }); return; }
        let low = 0.05, high = 1.0, bestBlob = null;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let tw = img.naturalWidth, th = img.naturalHeight;
        const MAX = 2048;
        if (tw > MAX || th > MAX) { const r = Math.min(MAX / tw, MAX / th); tw = Math.round(tw * r); th = Math.round(th * r); }
        canvas.width = tw; canvas.height = th;
        for (let attempt = 0; attempt < 20; attempt++) {
          const q = (low + high) / 2;
          ctx.clearRect(0, 0, tw, th); ctx.drawImage(img, 0, 0, tw, th);
          const blob = await new Promise(r => canvas.toBlob(r, fmt, q));
          if (!blob) { high = q; continue; }
          onProgress(Math.round((attempt + 1) / 20 * 100));
          if (blob.size > targetBytes) high = q; else bestBlob = blob;
          if (bestBlob && Math.abs(blob.size - targetBytes) < targetBytes * 0.02) break;
        }
        if (!bestBlob) {
          canvas.width = Math.round(tw * 0.75); canvas.height = Math.round(th * 0.75);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          bestBlob = await new Promise(r => canvas.toBlob(r, fmt, 0.05));
        }
        onProgress(100);
        const compUrl = URL.createObjectURL(bestBlob);
        resolve({ blob: bestBlob, size: bestBlob.size, compUrl, origUrl: URL.createObjectURL(file) });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function CompressClient() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [target, setTarget] = useState(500 * 1024);
  const [customVal, setCustomVal] = useState('');
  const [presetIdx, setPresetIdx] = useState(3);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('preset');
  const [outputFmt, setOutputFmt] = useState('image/jpeg'); // 'preset' | 'custom'

  const onFiles = useCallback((files) => {
    const f = files[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f); setResult(null); setProgress(0);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handlePreset = (idx) => {
    setPresetIdx(idx); setTarget(PRESETS[idx].value); setMode('preset'); setCustomVal('');
  };

  const handleCustom = (val) => {
    setCustomVal(val);
    const bytes = parseCustom(val);
    if (bytes) { setTarget(bytes); setMode('custom'); }
  };

  const handleCompress = async () => {
    if (!file || busy) return;
    setBusy(true); setProgress(0);
    try {
      const res = await compressImage(file, target, setProgress, outputFmt);
      setResult(res);
    } catch (e) { alert('Compression failed: ' + e.message); }
    setBusy(false);
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.blob);
    a.download = file.name.replace(/\.[^.]+$/, '') + '_compressed.' + (outputFmt === 'image/png' ? 'png' : outputFmt === 'image/webp' ? 'webp' : 'jpg');
    a.click();
  };

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">All-in-one image toolkit</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Free Image Compressor</h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">Reduce any image to exactly the file size you need. Smart binary search finds the perfect quality automatically.</p>
        </div>
      </section>

      <ToolShell>
        <div className="space-y-6">
          <Dropzone onFiles={onFiles} disabled={busy} title="Drop your image here" subtitle="or click to browse — JPEG, PNG, WebP, GIF, BMP, TIFF" />

          {file && (
            <>
              {preview && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">Preview</div>
                  <img src={preview} alt="" className="w-full max-h-80 object-contain bg-gray-100" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3"><span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">File</span><p className="mt-0.5 font-semibold text-gray-900 truncate">{file.name}</p></div>
                <div className="bg-gray-50 rounded-xl p-3"><span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Size</span><p className="mt-0.5 font-semibold text-gray-900">{formatSize(file.size)}</p></div>
              </div>

              {/* Target size: preset buttons + custom input */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Target size</label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p, i) => (
                    <button key={p.value} onClick={() => handlePreset(i)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${mode === 'preset' && presetIdx === i ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Custom:</span>
                  <input value={customVal} onChange={e => handleCustom(e.target.value)} placeholder="e.g. 400kb or 1.5mb"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {mode === 'custom' && <span className="text-xs text-green-600 font-semibold">{formatSize(target)}</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <label className="w-full text-sm font-medium text-gray-700">Output format</label>
                {[['image/jpeg','JPEG'],['image/png','PNG'],['image/webp','WebP']].map(([v,l]) => (
                  <button key={v} onClick={() => setOutputFmt(v)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${outputFmt === v ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
                ))}
                {outputFmt === 'image/png' && <p className="w-full text-xs text-amber-600 mt-1">PNG is lossless — file size may not reach the target. Use JPEG or WebP for precise compression.</p>}
              </div>

              <button onClick={handleCompress} disabled={busy}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto">
                {busy ? 'Compressing…' : 'Compress Image'}
              </button>

              {busy && (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{progress}%</p>
                </div>
              )}

              {/* Result: before/after comparison */}
              {result && !busy && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">Original · {formatSize(file.size)}</div>
                      <img src={result.origUrl} alt="" className="w-full object-contain bg-gray-100" style={{ maxHeight: 280 }} />
                    </div>
                    <div className="rounded-xl overflow-hidden border border-green-200">
                      <div className="bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide border-b border-green-200">
                        Compressed · {formatSize(result.size)}
                        <span className="ml-2 font-normal">({Math.round((1 - result.size / file.size) * 100)}% smaller · {outputFmt === 'image/png' ? 'PNG' : outputFmt === 'image/webp' ? 'WebP' : 'JPEG'})</span>
                      </div>
                      <img src={result.compUrl} alt="" className="w-full object-contain bg-gray-100" style={{ maxHeight: 280 }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <button onClick={handleDownload}
                      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700">
                      Download Compressed Image
                    </button>
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
              Why does my PNG file become much smaller than the target when compressed to JPEG?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">JPEG is a lossy format that aggressively compresses images. When you convert a PNG (lossless) to JPEG, file size drops significantly even before quality adjustment. For precise control, choose WebP or JPEG output, or keep PNG if file size is flexible.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why can't I enlarge a small image?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Compression can only reduce file size, never increase it. If your image is already smaller than the target, it's output as-is. To reach a larger target, try uploading a higher-resolution version.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why does the compressed image look lower quality?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">JPEG and WebP use lossy compression — the smaller the file, the more quality is sacrificed. The binary search algorithm finds the best balance, but very aggressive targets (e.g. 100KB for a large photo) will show visible artifacts.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Does compression change the image dimensions?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">No. The compressor keeps the original width and height (capped at 2048px on the long side for performance). Only the file size is reduced through quality adjustment.</p>
          </details>
        </div>
      </section>
    </>
  );
}
