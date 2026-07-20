'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolShell from '@/components/ToolShell';
import Dropzone from '@/components/Dropzone';

function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }
const FORMATS = { 'image/jpeg': 'JPEG / JPG', 'image/png': 'PNG', 'image/webp': 'WebP' };

export default function ConvertClient() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fmt, setFmt] = useState('image/jpeg');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const imgRef = useRef(null);

  const onFiles = useCallback(async (files) => {
    let f = files[0]; if (!f) return;
    // HEIC detection
    if (/\.heic$/i.test(f.name) || /\.heif$/i.test(f.name)) {
      if (typeof heic2any === 'undefined') {
        try { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); } catch { alert('Failed to load HEIC decoder'); return; }
      }
      try {
        const r = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.92 });
        const blob = Array.isArray(r) ? r[0] : r;
        f = new File([blob], f.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch { alert('Failed to decode HEIC file'); return; }
    }
    if (!f.type.startsWith('image/')) return;
    setFile(f); setResult(null);
    const url = URL.createObjectURL(f); setPreview(url);
    const img = new Image(); img.onload = () => { imgRef.current = img; }; img.src = url;
  }, []);

  const handleConvert = () => {
    if (!imgRef.current || busy) return;
    setBusy(true);
    const img = imgRef.current;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const q = fmt === 'image/png' ? undefined : 0.92;
    c.toBlob((blob) => {
      setResult({ blob, size: blob.size });
      setBusy(false);
    }, fmt, q);
  };

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">All-in-one image toolkit</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Image Format Converter</h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">Convert between JPG, PNG, and WebP. Also decodes HEIC and AVIF from iPhones and modern cameras.</p>
        </div>
      </section>
      <ToolShell>
        <div className="space-y-6">
          <Dropzone onFiles={onFiles} disabled={busy} title="Drop your image here" subtitle="or click to browse — HEIC, AVIF, JPEG, PNG, WebP" />
          {file && (
            <>
              {preview && <div className="rounded-xl overflow-hidden border border-gray-200"><div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">Preview</div><img src={preview} alt="" className="w-full max-h-80 object-contain bg-gray-100" /></div>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3"><span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">File</span><p className="mt-0.5 font-semibold text-gray-900 truncate">{file.name}</p></div>
                <div className="bg-gray-50 rounded-xl p-3"><span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Size</span><p className="mt-0.5 font-semibold text-gray-900">{formatSize(file.size)}</p></div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-40"><label className="text-sm font-medium text-gray-700">Output format</label>
                  <select value={fmt} onChange={e => setFmt(e.target.value)} disabled={busy} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <button onClick={handleConvert} disabled={busy} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">{busy ? 'Converting…' : 'Convert'}</button>
              </div>
              {result && !busy && (
                <div className="rounded-2xl bg-green-50 p-5 text-center ring-1 ring-green-100">
                  <p className="text-sm font-semibold text-green-800">Converted · {formatSize(result.size)}</p>
                  <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(result.blob); const ext = fmt.split('/')[1].replace('jpeg', 'jpg'); a.download = file.name.replace(/\.[^.]+$/, '') + '.' + ext; a.click(); }} className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Download</button>
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
              What is HEIC and why do I need to convert it?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">HEIC is Apple's default photo format on iPhones. It saves space but isn't widely supported outside Apple devices. CompressIO automatically detects and decodes HEIC files, letting you export as standard JPG, PNG, or WebP.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Why does PNG to JPEG conversion make the file much smaller?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">PNG is a lossless format (preserves every pixel), while JPEG uses lossy compression. Converting a PNG to JPEG drops a lot of redundant data, resulting in a much smaller file — even at high quality settings.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              Can I convert back and forth without losing quality?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">No. Every time you save as JPEG or WebP, quality is permanently lost. Always keep the original file if you might need it later. PNG to JPEG is one-way.</p>
          </details>
          <details className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              What's the difference between JPEG, PNG, and WebP?
              <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">JPEG: best for photos, small file size, no transparency. PNG: best for graphics/text, supports transparency, larger file. WebP: modern format, smaller than JPEG with similar quality, supports transparency.</p>
          </details>
        </div>
      </section>
    </>
  );
}
