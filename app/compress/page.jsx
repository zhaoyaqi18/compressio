import CompressClient from './CompressClient';

export const metadata = {
  title: 'Free Image Compressor — Reduce JPEG PNG to Exact Size Online',
  description: 'Free online image compressor. Reduce JPEG, PNG, WebP to exactly 100KB, 200KB, 500KB, 1MB, or 2MB. 100% browser-based, no upload.',
};

export default function Page() {
  return <CompressClient />;
}
