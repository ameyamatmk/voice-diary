/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'error': 'var(--error)',
        'recording': 'var(--recording)',
        'border': 'var(--border)',
      },
      fontFamily: {
        'sans': 'var(--font-sans)',
        'mono': 'var(--font-mono)',
        'japanese': 'var(--font-japanese)',
      },
      boxShadow: {
        'custom': '0 8px 25px var(--shadow)',
      },
      animation: {
        'recording-pulse': 'recording-pulse 2s ease-in-out infinite',
        'audio-level': 'audio-level 0.1s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}