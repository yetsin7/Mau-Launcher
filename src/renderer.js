let items = [], releases = {}, category = 'Todas';
const cards = document.getElementById('cards');
const input = document.getElementById('search');
function el(tag, cls, text) { const n = document.createElement(tag); if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; }
function render() {
  const q = input.value.trim().toLowerCase();
  const filtered = items.filter(x => (category==='Todas'||x.category===category) && (x.name.toLowerCase().includes(q)||x.description.toLowerCase().includes(q)));
  document.getElementById('count').textContent = filtered.length + ' aplicaciones';
  cards.replaceChildren();
  for (const item of filtered) {
    const rel = releases[item.id] || {status:'loading'};
    const card = el('article','card'), top = el('div','top'), logo = el('div','logo',item.name.split(' ').map(x=>x[0]).join('').slice(0,2)), tag=el('span','tag',item.category);
    top.append(logo,tag);card.append(top,el('h2','',item.name),el('p','',item.description));
    const status = rel.status === 'available' ? 'Versión '+rel.version : ({loading:'Comprobando...',pending:'Pendiente de publicación', 'no-release':'Sin versiones publicadas',unsupported:'Sin instalador para este sistema',error:'No se pudo consultar GitHub'})[rel.status]||'No disponible';
    card.append(el('div','meta',status));
    const actions=el('div','actions'), down=el('button','download',rel.status==='available'?'Descargar':'No disponible');
    down.disabled=rel.status!=='available';down.addEventListener('click',async()=>{const r=await window.mau.install(item.id);if(r?.message)alert(r.message);if(r?.error)alert(r.error)});
    const repo=el('button','repo','GitHub');repo.addEventListener('click',()=>window.mau.openRepo(item.id));actions.append(down,repo);card.append(actions);cards.append(card);
  }
}
async function refresh() {const btn=document.getElementById('refresh');btn.disabled=true;btn.textContent='Comprobando...';releases=await window.mau.releases();render();btn.disabled=false;btn.textContent='↻ Comprobar versiones';}
document.querySelectorAll('nav button').forEach(btn=>btn.addEventListener('click',()=>{category=btn.dataset.cat;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('selected',x===btn));render()}));
input.addEventListener('input',render);document.getElementById('refresh').addEventListener('click',refresh);
(async()=>{items=await window.mau.catalog();render();await refresh()})();
