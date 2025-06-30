// Theme script to prevent flash of unstyled content
export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('voice-diary-theme') || 'system';
        var resolvedTheme = 'light';
        
        if (theme === 'dark') {
          resolvedTheme = 'dark';
        } else if (theme === 'light') {
          resolvedTheme = 'light';
        } else if (theme === 'system') {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', resolvedTheme);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolvedTheme);
      } catch (e) {
        // Fallback to light theme
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('light');
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}