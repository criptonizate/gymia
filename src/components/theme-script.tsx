// Aplica el tema guardado antes de hidratar para evitar el flash.
export function ThemeScript() {
  const code = `
    try {
      var t = localStorage.getItem('gymia-theme') || 'auto';
      var resolved = t === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      var html = document.documentElement;
      html.classList.toggle('dark', resolved === 'dark');
      html.classList.toggle('light', resolved === 'light');
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
