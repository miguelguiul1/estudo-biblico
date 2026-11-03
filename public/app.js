"use strict";
// ---------- Estado e armazenamento (tudo local, no aparelho) ----------
const KEY = "lectio.v1";
const ICO = n => `<svg class="ico" aria-hidden="true"><use href="#${n}"/></svg>`;
const STEPS = [
  { id: "lectio", ic: "i-book", nome: "Lectio", sub: "Leitura", guia: "O que o texto diz? Releia e fale o que você percebe: personagens, ações, palavras que chamam atenção." },
  { id: "meditatio", ic: "i-heart", nome: "Meditatio", sub: "Meditação", guia: "O que o texto diz PARA MIM? Qual verdade do querigma toca a minha vida hoje?" },
  { id: "oratio", ic: "i-chat", nome: "Oratio", sub: "Oração", guia: "Fale com Deus: agradeça, peça perdão, louve, interceda a partir do que ouviu." },
  { id: "contemplatio", ic: "i-eye", nome: "Contemplatio", sub: "Contemplação", guia: "Silêncio e olhar de amor. Descreva o que ficou no coração, sem esforço." },
  { id: "actio", ic: "i-go", nome: "Actio", sub: "Compromisso", guia: "Que gesto concreto vou viver por causa desta Palavra?" }
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let db = Object.assign({ config: { geminiKey: "", model: "gemini-2.5-flash", theme: "auto" }, custom: [], estudos: {} }, load());
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
// Horas do dia: Laudes (manhã), Vésperas (tarde), Completas (noite)
const periodo = () => { const t = db.config.theme; if (t === "light") return "laudes"; if (t === "dark") return "completas"; const h = new Date().getHours(); return h >= 5 && h < 12 ? "laudes" : h >= 12 && h < 18 ? "vesperas" : "completas"; };
const HORA = { laudes: "Laudes · manhã", vesperas: "Vésperas · tarde", completas: "Completas · noite" };
const aplicaTema = () => { const p = periodo(), r = document.documentElement; r.setAttribute("data-hora", p); r.setAttribute("data-theme", p === "completas" ? "dark" : "light"); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p === "completas" ? "#0e1324" : p === "vesperas" ? "#f08a4b" : "#f0587b"); };
// Referência com link para a Bíblia do leitor (o app não copia o texto das traduções)
const linkBiblia = ref => ref ? `<a class="bible" target="_blank" rel="noopener" href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref.replace(/(\d),(\d)/g, "$1:$2").replace(/\s*\(.*?\)/g, ""))}">Abrir na Bíblia ↗</a>` : "";
aplicaTema();
// cada semana tem sua cor e ícone (ciclo de 7)
const WK = [["#b3264a","#f0803a","i-book"],["#e8702a","#f5b942","i-heart"],["#1f9d8b","#7ed6a8","i-leaf"],["#d6457a","#ff9bb5","i-heart"],["#6c4bc1","#ae92ec","i-scroll"],["#b01f3e","#e0604a","i-cross"],["#2f6fd1","#7fb8f5","i-dove"]];
const wkIdx = id => { const m = String(id).match(/\d+/); return m ? (+m[0] - 1) % 7 : 0; };
const wkStyle = id => { const [a, b] = WK[wkIdx(id)]; return `--w1:${a};--w2:${b}`; };
const wkIcon = id => WK[wkIdx(id)][2];
let livro = { semanas: [], aviso: "" };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); };
const setTop = (title, back) => { window.scrollTo(0, 0); $("#title").textContent = title; const b = $("#back"); b.hidden = !back; b.onclick = back || null; };
$("#cfg").onclick = () => telaAjustes();

// ---------- Biblioteca (Enchei-vos + passagens do usuário) ----------
function todasSemanas() {
  const semanas = JSON.parse(JSON.stringify(livro.semanas));
  for (const p of db.custom) {
    let s = semanas.find(x => x.id === p.semana);
    if (!s) { s = { id: p.semana, titulo: p.semana, tema: p.tema || "", dias: [] }; semanas.push(s); }
    s.dias.push(p);
  }
  return semanas;
}
const acharDia = id => todasSemanas().flatMap(s => s.dias.map(d => ({ ...d, semana: s }))).find(d => d.id === id);

// ---------- Telas ----------
function ordinal(t){return (t.split(" · ")[0]||"").replace(/\s+/g," ")}
function saudacao(){const h=new Date().getHours();return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite"}
function telaInicio() {
  setTop("Lectio", null);
  const semanas = todasSemanas();
  const dias = semanas.flatMap(s => s.dias.map(d => ({ ...d, semana: s })));
  const feitos = dias.filter(d => db.estudos[d.id]?.resumo).length;
  const prox = dias.find(d => !db.estudos[d.id]?.resumo) || dias[0];
  let h = `<section class="hero" style="${prox ? wkStyle(prox.semana.id) : ""}"><div class="rays"></div>
    <p class="greet">${saudacao()} · ${HORA[periodo()]}</p><svg class="flame" aria-hidden="true"><use href="#flame"/></svg>
    <h2>Enchei-vos</h2><p class="sub">Que a Palavra de hoje te encontre.</p>`;
  if (prox) h += `<button class="today" data-d="${esc(prox.id)}"><span class="play">${ICO("i-play")}</span><span><small>${feitos ? "Continuar de onde parou" : "Começar agora"}</small><strong>${esc(prox.titulo)}</strong></span></button>`;
  h += `</section><div class="stats"><div class="stat"><b>${feitos}</b><span>dias rezados</span></div><div class="stat"><b>${dias.length - feitos}</b><span>para rezar</span></div></div>`;
  h += `<h2 class="sec">As semanas</h2><div class="weeks">`;
  semanas.forEach((sm, i) => {
    const ok = sm.dias.filter(d => db.estudos[d.id]?.resumo).length, pct = sm.dias.length ? Math.round(100 * ok / sm.dias.length) : 0;
    h += `<button class="wk" style="${wkStyle(sm.id)};--i:${i}" data-w="${esc(sm.id)}"><span class="badge">${ICO(wkIcon(sm.id))}</span><span class="txt"><small>${esc(sm.titulo)}</small><strong>${esc(sm.tema)}</strong><div class="bar"><i style="width:${pct}%"></i></div><div class="cnt">${ok} de ${sm.dias.length} ${sm.dias.length === 1 ? "dia" : "dias"}</div></span></button>`;
  });
  h += `</div><div class="row"><button class="btn" id="add">+ Passagem</button><button class="btn ghost" id="exp">Exportar tudo</button></div>`;
  if (livro.aviso) h += `<p class="muted">${esc(livro.aviso)}</p>`;
  $("#view").innerHTML = h;
  document.querySelectorAll("[data-d]").forEach(el => el.onclick = () => telaSessao(el.dataset.d));
  document.querySelectorAll("[data-w]").forEach(el => el.onclick = () => telaSemana(el.dataset.w));
  $("#add").onclick = telaNova; $("#exp").onclick = exportar;
}

function telaSemana(id) {
  const sm = todasSemanas().find(x => x.id === id); if (!sm) return telaInicio();
  setTop(sm.titulo, telaInicio);
  const ok = sm.dias.filter(d => db.estudos[d.id]?.resumo).length;
  let h = `<section class="whead" style="${wkStyle(sm.id)}"><small>${esc(sm.titulo)}</small><h2>${esc(sm.tema)}</h2><div class="bar"><i style="width:${sm.dias.length ? 100 * ok / sm.dias.length : 0}%"></i></div></section><div class="daylist" style="${wkStyle(sm.id)}">`;
  sm.dias.forEach((d, i) => { const [n, ...r] = d.titulo.split(" · "); const f = !!db.estudos[d.id]?.resumo;
    h += `<button class="day ${f ? "done" : ""}" style="--i:${i}" data-d="${esc(d.id)}"><span class="num">${f ? "✓" : esc(n.replace(/\D+/g, "") || "•")}</span><span class="nm"><b>${esc(r.join(" · ") || n)}</b><span>${esc(d.ref)}</span></span><span class="go">${ICO("i-chev")}</span></button>`; });
  h += `</div>`;
  $("#view").innerHTML = h;
  document.querySelectorAll("[data-d]").forEach(el => el.onclick = () => telaSessao(el.dataset.d));
}

function telaNova() {
  setTop("Nova passagem", telaInicio);
  $("#view").innerHTML = `<label>Semana (ex.: Semana 2)</label><input id="n-s"><label>Tema da semana</label><input id="n-t">
  <label>Dia (ex.: Dia 3)</label><input id="n-d"><label>Referência bíblica (ex.: Lc 15,11-24)</label><input id="n-r">
  <label>Texto (opcional, para ler offline)</label><textarea id="n-x"></textarea><p><button class="btn" id="ok">Salvar</button></p>`;
  $("#ok").onclick = () => {
    const s = $("#n-s").value.trim(), d = $("#n-d").value.trim();
    if (!s || !d) return toast("Preencha semana e dia");
    db.custom.push({ id: "c" + Date.now(), semana: s, tema: $("#n-t").value.trim(), titulo: d, ref: $("#n-r").value.trim(), texto: $("#n-x").value.trim() });
    save(); telaInicio();
  };
}

function telaSessao(diaId, passo = 0) {
  const d = acharDia(diaId); if (!d) return telaInicio();
  const e = db.estudos[diaId] ||= { diaId, passos: {}, atualizado: Date.now() };
  setTop(d.titulo.split(" · ")[0], () => telaSemana(d.semana.id));
  const p = STEPS[passo];
  let h = `<div style="${wkStyle(d.semana.id)}"><div class="passage"><small>${esc(d.semana.titulo)} · ${esc(d.semana.tema)}</small><h3>${esc(d.titulo.split(" · ").slice(1).join(" · "))}</h3>
    <p class="ref">${esc(d.ref) || "Sem referência"}</p><br>${linkBiblia(d.ref)}` +
    (d.texto ? `<p style="font-style:italic;white-space:pre-wrap">${esc(d.texto)}</p>` : `<p>Leia na sua Bíblia / Enchei-vos${d.pagina ? " (pág. " + esc(d.pagina) + ")" : ""}.</p>`) +
    (d.foco ? `<p>${esc(d.foco)}</p>` : "") + `</div>`;
  h += `<div class="stepper">` + STEPS.map((s, i) => `<button class="step ${i === passo ? "on" : ""} ${e.passos[s.id] ? "done" : ""}" data-i="${i}">${ICO(s.ic)}${s.nome.slice(0,6)}${s.nome.length>6?".":""}</button>`).join("") + `</div>`;
  h += `<section class="stage"><h2>${p.nome}</h2><span class="sub">${p.sub}</span><p class="guide">${p.guia}</p>
  <div class="micwrap"><button class="mic" id="mic" aria-label="Gravar">${ICO("i-mic")}</button>
  <div class="wave" id="wave" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div><div class="status" id="st">Toque e fale com Deus</div></div>
  <textarea id="tx" placeholder="O que você falar aparece aqui. Pode editar.">${esc(e.passos[p.id] || "")}</textarea>
  <div class="row"><button class="btn ghost grow" id="prev" ${passo === 0 ? "disabled" : ""}>‹ Anterior</button>
  <button class="btn grow" id="next">${passo === STEPS.length - 1 ? "Concluir" : "Próxima ›"}</button></div></section>`;
  h += `<h2 class="sec">Resumo</h2>` + (e.resumo ? resumoHTML(e.resumo) : `<p class="muted">Ao terminar, organize suas ideias.</p>`) +
    `<div class="row"><button class="btn" id="org">✨ Organizar minhas ideias</button><button class="btn ghost" id="copy">Copiar</button></div></div>`;
  $("#view").innerHTML = h;
  const tx = $("#tx");
  const guardar = () => { e.passos[p.id] = tx.value.trim(); e.atualizado = Date.now(); save(); };
  tx.oninput = guardar;
  document.querySelectorAll(".step").forEach(b => b.onclick = () => { guardar(); telaSessao(diaId, +b.dataset.i); });
  $("#prev").onclick = () => { guardar(); telaSessao(diaId, passo - 1); };
  $("#next").onclick = () => { guardar(); passo === STEPS.length - 1 ? organizar(diaId) : telaSessao(diaId, passo + 1); };
  $("#org").onclick = () => { guardar(); organizar(diaId); };
  $("#copy").onclick = () => { navigator.clipboard?.writeText(textoExport(diaId)); toast("Copiado"); };
  ligarMicrofone($("#mic"), $("#st"), tx, guardar);
}

// ---------- Voz → texto (Web Speech API do navegador, gratuito) ----------
function ligarMicrofone(btn, st, tx, guardar) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { st.textContent = "Seu navegador não tem ditado. Use o microfone do teclado."; btn.disabled = true; return; }
  let rec = null, ativo = false;
  const wave = document.getElementById("wave");
  const parar = () => { ativo = false; rec?.stop(); btn.classList.remove("rec"); wave?.classList.remove("on"); st.textContent = "Toque e fale com Deus"; };
  btn.onclick = () => {
    if (ativo) return parar();
    rec = new SR(); rec.lang = "pt-BR"; rec.continuous = true; rec.interimResults = true;
    let base = tx.value ? tx.value.trimEnd() + " " : "";
    rec.onresult = ev => {
      let fin = "", par = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) (ev.results[i].isFinal ? (fin += ev.results[i][0].transcript) : (par += ev.results[i][0].transcript));
      base += fin; tx.value = base + par; guardar();
    };
    rec.onend = () => { if (ativo) { try { rec.start(); } catch {} } };  // mantém ouvindo em pausas
    rec.onerror = ev => { if (ev.error === "not-allowed") { toast("Permita o microfone"); parar(); } else if (ev.error === "network") { toast("Ditado precisa de internet"); parar(); } };
    ativo = true; btn.classList.add("rec"); wave?.classList.add("on"); st.textContent = "Ouvindo… toque para parar"; rec.start();
  };
}

// ---------- Organizar ideias ----------
const SYS = `Você ajuda um católico a organizar sua Lectio Divina (Enchei-vos, Comunidade Shalom). Receberá o que ele FALOU em cada etapa. NÃO escreva redação nem invente ideias: reorganize fielmente o que foi dito, em português, na primeira pessoa, frases curtas. Responda SOMENTE JSON: {"titulo":string,"ideia_central":string,"por_etapa":{"lectio":[string],"meditatio":[string],"oratio":[string],"contemplatio":[string],"actio":[string]},"versiculos_chave":[string],"compromisso":string}. Etapas vazias = lista vazia.`;

async function organizar(diaId) {
  const e = db.estudos[diaId], d = acharDia(diaId);
  if (!Object.values(e.passos).some(Boolean)) return toast("Fale algo antes de organizar");
  toast("Organizando…");
  let r = null;
  if (db.config.geminiKey && navigator.onLine) {
    try {
      const body = { systemInstruction: { parts: [{ text: SYS }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        contents: [{ parts: [{ text: `Passagem: ${d.ref}\n` + STEPS.map(s => `## ${s.nome}\n${e.passos[s.id] || "(vazio)"}`).join("\n") }] }] };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${db.config.model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": db.config.geminiKey }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(res.status);
      r = JSON.parse((await res.json()).candidates[0].content.parts[0].text);
    } catch (err) { toast("IA indisponível — usei organização local"); }
  }
  e.resumo = r || organizarLocal(e);
  e.atualizado = Date.now(); save(); telaSessao(diaId, 4);
}
// Plano B sem internet/IA: quebra em frases e agrupa por etapa.
function organizarLocal(e) {
  const frases = t => (t || "").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 3);
  const por = {}; for (const s of STEPS) por[s.id] = frases(e.passos[s.id]);
  const act = por.actio;
  return { titulo: "", ideia_central: (por.meditatio[0] || por.lectio[0] || ""), por_etapa: por, versiculos_chave: [], compromisso: act[act.length - 1] || "", local: true };
}
function resumoHTML(r) {
  let h = `<div class="card sum">${r.local ? `<span class="badge2">organização local</span>` : `<span class="badge2">IA</span>`}`;
  if (r.titulo) h += `<h3>${esc(r.titulo)}</h3>`;
  if (r.ideia_central) h += `<h3>Ideia central</h3><p>${esc(r.ideia_central)}</p>`;
  for (const s of STEPS) { const l = r.por_etapa?.[s.id] || []; if (l.length) h += `<h3>${s.nome}</h3><ul>${l.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; }
  if (r.versiculos_chave?.length) h += `<h3>Versículos-chave</h3><ul>${r.versiculos_chave.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  if (r.compromisso) h += `<h3>Compromisso</h3><p>${esc(r.compromisso)}</p>`;
  return h + `</div>`;
}

// ---------- Exportar / ajustes ----------
function textoExport(id) {
  const e = db.estudos[id], d = acharDia(id), r = e.resumo;
  let t = `${d.semana.titulo} · ${d.titulo} — ${d.ref}\n\n`;
  if (r) { t += `${r.titulo || ""}\nIdeia central: ${r.ideia_central}\n`; for (const s of STEPS) if (r.por_etapa?.[s.id]?.length) t += `\n${s.nome}\n- ${r.por_etapa[s.id].join("\n- ")}\n`; t += `\nCompromisso: ${r.compromisso}\n`; }
  else for (const s of STEPS) t += `\n${s.nome}\n${e.passos[s.id] || ""}\n`;
  return t;
}
function exportar() {
  const txt = Object.keys(db.estudos).map(textoExport).join("\n\n=========\n\n") || "Nenhum estudo ainda.";
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([txt], { type: "text/plain" })), download: "meus-estudos-lectio.txt" });
  a.click();
}
function telaAjustes() {
  setTop("Ajustes", telaInicio);
  $("#view").innerHTML = `<div class="card"><b>Aparência</b><p class="muted">Automático muda com a hora: manhã clara, tarde dourada, noite à luz de vela.</p><div class="seg" id="tema"><button data-t="auto" class="${(db.config.theme || "auto") === "auto" ? "on" : ""}">Auto</button><button data-t="light" class="${db.config.theme === "light" ? "on" : ""}">Claro</button><button data-t="dark" class="${db.config.theme === "dark" ? "on" : ""}">Noite</button></div></div>
  <div class="card"><b>IA gratuita (opcional)</b><p class="muted">Crie uma chave grátis em aistudio.google.com/apikey e cole aqui. Fica só neste aparelho. Sem chave, o app usa a organização local.</p>
  <label for="k">Chave Gemini</label><input id="k" type="password" value="${esc(db.config.geminiKey)}"><label for="m">Modelo</label><input id="m" value="${esc(db.config.model)}">
  <p><button class="btn" id="ok">Salvar</button></p></div>`;
  document.querySelectorAll("#tema button").forEach(b => b.onclick = () => { db.config.theme = b.dataset.t; save(); aplicaTema(); telaAjustes(); });
  $("#ok").onclick = () => { db.config.geminiKey = $("#k").value.trim(); db.config.model = $("#m").value.trim() || "gemini-2.5-flash"; save(); toast("Salvo"); telaInicio(); };
}

// ---------- Início ----------
fetch("data/encheivos.json").then(r => r.json()).then(j => { livro = j; }).catch(() => {}).finally(telaInicio);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
