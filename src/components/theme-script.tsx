// Aplica el tema guardado antes de hidratar para evitar el flash.
export function ThemeScript() {
  const code = `
    try {
      var t = localStorage.getItem('gymia-theme') || 'dark';
      var html = document.documentElement;
      html.classList.toggle('dark', t === 'dark');
      html.classList.toggle('light', t === 'light');
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
