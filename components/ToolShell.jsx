// Wrapper around every interactive tool
export default function ToolShell({ children, hero = false }) {
  return (
    <section className={hero ? 'bg-gradient-to-b from-blue-50 via-white to-white' : ''}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <div className={`rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-200 sm:p-6 ${hero ? 'shadow-lg ring-2 ring-blue-100' : ''}`}>
          {children}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          100% private — your images never leave your device. All processing happens locally in your browser.
        </p>
      </div>
    </section>
  );
}
