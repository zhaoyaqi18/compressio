import './globals.css';

export const metadata = {
  title: 'Free Online Image Tools — Compress, Convert, Crop, Resize, Rotate',
  description:
    'Compress images to any file size, convert HEIC/AVIF to JPG/PNG/WebP, crop, resize, and rotate — all in your browser. Free, no signup, 100% private.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <a className="flex shrink-0 items-center gap-2 text-lg font-bold text-gray-900" href="/">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                <span className="h-3 w-3 rounded-sm bg-white/90" />
              </span>
              CompressIO
            </a>
            <div className="flex items-center gap-1 overflow-x-auto text-sm font-medium text-gray-600 sm:gap-2">
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/">Home</a>
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/compress">Compress</a>
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/convert">Convert</a>
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/crop">Crop</a>
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/resize">Resize</a>
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/rotate">Rotate</a>
              <a className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-gray-100 hover:text-gray-900" href="/batch">Batch</a>
            </div>
            <a
              href="https://ko-fi.com/yugutou"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-orange-500 hover:to-orange-600"
            >
              ☕ Support
            </a>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
          <div className="mx-auto max-w-6xl px-4">
            <p>CompressIO — Free Online Image Tools. 100% browser-based, no upload required. <a href="https://tally.so/r/PdW5lx" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Feedback</a></p>
          </div>
        </footer>
        <script src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"></script>
        <script dangerouslySetInnerHTML={{
          __html: `kofiWidgetOverlay.draw('yugutou', {
            'type': 'floating-chat',
            'floating-chat.donateButton.text': 'Tip Me',
            'floating-chat.donateButton.text-color': '#fff',
            'floating-chat.donateButton.background-color': '#ff813f'
          });`
        }} />
      </body>
    </html>
  );
}
