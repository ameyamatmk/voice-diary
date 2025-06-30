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
        // 背景色
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        
        // テキスト色
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        
        // アクセント色
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        'accent-subtle': 'var(--accent-subtle)',
        
        // システム色
        'success': 'var(--success)',
        'success-light': 'var(--success-light)',
        'warning': 'var(--warning)',
        'warning-light': 'var(--warning-light)',
        'error': 'var(--error)',
        'error-light': 'var(--error-light)',
        'info': 'var(--info)',
        'info-light': 'var(--info-light)',
        
        // 特殊色
        'recording': 'var(--recording)',
        'recording-light': 'var(--recording-light)',
        
        // ボーダー
        'border': 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
      },
      fontFamily: {
        'sans': 'var(--font-sans)',
        'mono': 'var(--font-mono)',
        'japanese': 'var(--font-japanese)',
      },
      boxShadow: {
        'custom': '0 8px 25px var(--shadow)',
        'custom-lg': '0 16px 40px var(--shadow-lg)',
        'custom-xl': '0 24px 60px var(--shadow-xl)',
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