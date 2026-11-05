'use strict';
let items = [], releases = {}, registered = {}, category = 'Todas';
const cards = document.getElementById('cards');
const input = document.getElementById('search');
const loading = new Set();
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function action(label, className, handler, disabled = false) {
  const button = el('button', className, label);
  button.type = 'button';
  button.disabled = disabled;
  button.addEventListener('click', handler);
  return button;
}
function report(result) {
  if (result?.error) window.alert(result.error);
  if (result?.message) window.alert(result.message);
}
function render() {
  const q = input.value.trim().toLowerCase();
  const filtered = items.filter(x =>
    (category === 'Todas' || x.category === category) &&
    (x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q))
  );
  document.getElementById('count').textContent = filtered.length + ' aplicaciones';
  cards.replaceChildren();
  for (const item of filtered) {
    const rel = releases[item.id] || { status: 'loading' };
    const installed = Boolean(registered[item.id]);
    const busy = loading.has(item.id);
    const card = el('article', 'card');
    const top = el('div', 'top');
    top.append(el('div', 'logo', item.name.split(' ').map(word => word[0]).join('').slice(0, 2)), el('span', 'tag', item.category));
    card.append(top, el('h2', '', item.name), el('p', '', item.description));
    const availability = rel.status === 'available' ? 'Versión ' + rel.version : ({
      loading: 'Comprobando versiones...', pending: 'Pendiente de publicación',
      'no-release': 'Sin versiones publicadas', unsupported: 'Sin instalador compatible',
      error: 'No se pudo consultar GitHub', 'invalid-repo': 'Repositorio no válido'
    })[rel.status] || 'No disponible';
    card.append(el('div', 'meta', (installed ? '● Programa registrado · ' : '') + availability));
    const actions = el('div', 'actions');
    actions.append(
      action(installed ? 'Abrir' : 'Vincular', 'download', async () => {
        if (installed) report(await window.mau.launch(item.id));
        else { report(await window.mau.register(item.id)); registered = await window.mau.registered(); render(); }
      }),
      action(busy ? 'Descargando...' : 'Descargar', 'download', async () => {
        loading.add(item.id); render();
        try { report(await window.mau.install(item.id)); } catch (e) { report({ error: e.message }); }
        finally { loading.delete(item.id); render(); }
      }, busy || rel.status !== 'available'),
      action('GitHub', 'repo', () => window.mau.openRepo(item.id))
    );
    card.append(actions); cards.append(card);
  }
}
async function refresh() {
  const button = document.getElementById('refresh');
  button.disabled = true;
  button.textContent = 'Comprobando...';
  try {
    [releases, registered] = await Promise.all([window.mau.releases(), window.mau.registered()]);
    render();
  } catch(e) { window.alert('No se pudieron consultar las versiones: ' + e.message); }
  finally { button.disabled = false; button.textContent = '↻ Comprobar versiones'; }
}
document.querySelectorAll('nav button').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.cat;
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('selected', x === button));
  render();
}));
input.addEventListener('input', render);
document.getElementById('refresh').addEventListener('click', refresh);
window.mau.onDownloadProgress(data => {
  const percent = data.total ? Math.round(100 * data.received / data.total) + '%' : Math.round(data.received / 1024 / 1024) + ' MB';
  document.getElementById('count').textContent = 'Descargando: ' + percent;
});
(async () => { items = await window.mau.catalog(); render(); await refresh(); })();
