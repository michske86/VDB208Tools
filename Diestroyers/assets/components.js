/* The Diestroyers - Component Library */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  const esc = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  function panel(title, body, extraClass=""){return `<section class="intel-panel ${extraClass}"><h2>${esc(title)}</h2>${body}</section>`;}
  function tile(title, value, subtitle=""){return `<div class="intel-tile"><h3>${esc(title)}</h3><div class="big">${esc(value)}</div>${subtitle?`<div class="small">${esc(subtitle)}</div>`:""}</div>`;}
  function table(headers, rows, className="driver-table"){
    return `<div class="tablewrap"><table class="${className}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function navCard(number, label, href){return `<a class="dossier-nav-card" href="${esc(href)}"><span>${esc(number)}</span><strong>${esc(label)}</strong></a>`;}
  function insight(text){return `<div class="insight">${esc(text)}</div>`;}
  function priorityItem(rank, title, meta, action="Open dossier", href=""){
    const titleHtml = href ? `<a class="mc-kpi-link priority-title" href="${esc(href)}">${esc(title)}</a>` : `<div class="priority-title">${esc(title)}</div>`;
    return `<div class="priority-item"><div class="priority-score">${esc(rank)}</div><div>${titleHtml}<div class="priority-meta">${esc(meta)}</div></div><div class="priority-action">${esc(action)}</div></div>`;
  }
  D.components = {esc, panel, tile, table, navCard, insight, priorityItem};
})(window);
