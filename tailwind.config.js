/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        primary: 'var(--primary)',
        danger: 'var(--danger)',
        border: 'var(--border)',
        trilling: 'var(--trilling)',
        geluid: 'var(--geluid)',
        beide: 'var(--beide)',
      },
    },
  },
  plugins: [],
};
