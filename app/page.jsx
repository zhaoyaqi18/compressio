const IconCompress = () => (
  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 5 17 10" />
    <line x1="12" y1="5" x2="12" y2="15" />
  </svg>
);

const IconConvert = () => (
  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 2 21 6 17 10" />
    <path d="M3 6h18" />
    <polyline points="7 14 3 18 7 22" />
    <path d="M21 18H3" />
  </svg>
);

const IconCrop = () => (
  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 13V6h7" />
    <path d="M18 11v7h-7" />
  </svg>
);

const IconResize = () => (
  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const IconRotate = () => (
  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);

const IconBatch = () => (
  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="8" height="8" rx="1.5" />
    <rect x="14" y="2" width="8" height="8" rx="1.5" />
    <rect x="2" y="14" width="8" height="8" rx="1.5" />
    <rect x="14" y="14" width="8" height="8" rx="1.5" />
  </svg>
);

const IconShield = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconLightning = () => (
  <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconLayers = () => (
  <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconImage = () => (
  <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconHeart = () => (
  <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

const tools = [
  { href: '/compress', icon: IconCompress, title: 'Image Compressor', desc: 'Reduce file size to exactly 100KB, 200KB, 500KB, 1MB, or 2MB with smart binary search.' },
  { href: '/convert', icon: IconConvert, title: 'Format Converter', desc: 'Convert between JPG, PNG, and WebP. Decodes HEIC and AVIF from iPhones and cameras.' },
  { href: '/crop', icon: IconCrop, title: 'Image Cropper', desc: 'Drag to select any area and crop. Precise pixel-level control with live preview.' },
  { href: '/resize', icon: IconResize, title: 'Image Resizer', desc: 'Change dimensions to any width and height. Maintain aspect ratio with one click.' },
  { href: '/rotate', icon: IconRotate, title: 'Image Rotator', desc: 'Rotate images by any angle with quick presets for 90°, 180°, and 270°. Custom slider for precise adjustments.' },
  { href: '/batch', icon: IconBatch, title: 'Batch Processor', desc: 'Process multiple images at once. Convert, resize for social media, and download as ZIP.' },
];

const features = [
  { icon: IconShield, title: '100% Private', desc: 'All processing happens in your browser. Images never leave your device.' },
  { icon: IconLayers, title: 'Batch Processing', desc: 'Upload multiple images at once, process them together, and download as ZIP.' },
  { icon: IconImage, title: 'All Formats', desc: 'Supports JPEG, PNG, WebP, HEIC, AVIF, GIF, BMP, TIFF.' },
  { icon: IconHeart, title: 'Free Forever', desc: 'No accounts, no watermarks, no hidden limits. Every tool is completely free.' },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-12 text-center sm:pt-16">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            All-in-one image toolkit
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Free Online Image Tools
          </h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            Compress images to any file size, convert between JPG/PNG/WebP, crop, resize, and rotate
            — all in your browser. No signup, no uploads, no limits.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-200">
            <IconShield />
            100% private — files never leave your device
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <a key={t.href} href={t.href} className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-200 transition hover:shadow-xl hover:ring-2 hover:ring-blue-200 hover:-translate-y-0.5">
                <div className="flex items-center gap-2.5">
                  <Icon />
                  <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
                </div>
                <p className="mt-3 text-sm text-gray-600">{t.desc}</p>
                <span className="mt-3 inline-block text-sm font-medium text-blue-600">Open tool →</span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <Icon />
                  <h3 className="text-sm font-medium text-gray-600">{f.title}</h3>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {[
            { q: 'Are my images uploaded to a server?', a: 'No. Every tool on CompressIO runs entirely in your browser using JavaScript and the Canvas API. Your files never leave your device.' },
            { q: 'Is CompressIO really free?', a: 'Yes. Every tool is free with no watermarks, no accounts, no daily limits. Just open the page and drop your images in.' },
            { q: 'Which formats can I convert?', a: 'The Format Converter can decode HEIC/HEIF (iPhone photos), AVIF, WebP, JPG, and PNG, and export as JPG, PNG, or WebP with adjustable quality.' },
            { q: 'What tools are included?', a: 'CompressIO includes six free tools: Image Compressor, Format Converter, Image Cropper, Image Resizer, Image Rotator, and Batch Processor.' },
          ].map(({ q, a }) => (
            <details key={q} className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-xl leading-none text-blue-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
