"use strict";
// ---------- Estado e armazenamento (tudo local, no aparelho) ----------
const KEY = "lectio.v1";
const STEPS = [
  { id: "lectio", nome: "Lectio", sub: "Leitura", guia: "O que o texto diz? Releia e fale o que você percebe: personagens, ações, palavras que chamam atenção." },
  { id: "meditatio", nome: "Meditatio", sub: "Meditação", guia: "O que o texto diz PARA MIM? Qual verdade do querigma toca a minha vida hoje?" },
  { id: "oratio", nome: "Oratio", sub: "Oração", guia: "Fale com Deus: agradeça, peça perdão, louve, interceda a partir do que ouviu." },
  { id: "contemplatio", nome: "Contemplatio", sub: "Contemplação", guia: "Silêncio e olhar de amor. Descreva o que ficou no coração, sem esforço." },
  { id: "actio", nome: "Actio", sub: "Compromisso", guia: "Que gesto concreto vou viver por causa desta Palavra?" }
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let db = Object.assign({ config: { geminiKey: "", model: "gemini-2.5-flash" }, custom: [], estudos: {} }, load());
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
let livro = { semanas: [], aviso: "" };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); };
const setTop = (title, back) => { $("#title").textContent = title; const b = $("#back"); b.hidden = !back; b.onclick = back || null; };
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
function telaInicio() {
  setTop("Lectio · Enchei-vos");
  const recentes = Object.values(db.estudos).sort((a, b) => b.atualizado - a.atualizado).slice(0, 5);
  let h = `<p class="muted">Reze com a Bíblia na mão. Fale — o app escuta e organiza.</p>`;
  if (recentes.length) {
    h += `<h2>Continuar</h2>`;
    for (const e of recentes) { const d = acharDia(e.diaId); if (d) h += `<div class="card tap" data-d="${esc(d.id)}"><b>${esc(d.semana.titulo)} · ${esc(d.titulo)}</b><div class="muted">${esc(d.ref)}</div></div>`; }
  }
  h += `<h2>Semanas</h2>`;
  for (const s of todasSemanas()) {
    h += `<div class="card"><b>${esc(s.titulo)}</b> <span class="muted">${esc(s.tema)}</span><div class="row" style="margin-top:10px">`;
    for (const d of s.dias) h += `<button class="btn ghost" data-d="${esc(d.id)}">${esc(d.titulo)}${db.estudos[d.id]?.resumo ? " ✓" : ""}</button>`;
    h += `</div></div>`;
  }
  h += `<button class="btn" id="add">+ Passagem</button> <button class="btn ghost" id="exp">Exportar tudo</button>`;
  if (livro.aviso) h += `<p class="muted">${esc(livro.aviso)}</p>`;
  $("#view").innerHTML = h;
  document.querySelectorAll("[data-d]").forEach(el => el.onclick = () => telaSessao(el.dataset.d));
  $("#add").onclick = telaNova; $("#exp").onclick = exportar;
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
  setTop(`${d.semana.titulo} · ${d.titulo}`, telaInicio);
  const p = STEPS[passo];
  let h = `<div class="card"><div class="muted">${esc(d.ref) || "Sem referência"}</div>` +
    (d.texto ? `<p class="passage">${esc(d.texto)}</p>` : `<p class="muted">Leia a passagem na sua Bíblia / Enchei-vos.</p>`) + `</div>`;
  h += `<div class="steps">` + STEPS.map((s, i) => `<button class="step ${i === passo ? "on" : ""} ${e.passos[s.id] ? "done" : ""}" data-i="${i}">${s.nome}</button>`).join("") + `</div>`;
  h += `<h2>${p.nome} <span class="muted">· ${p.sub}</span></h2><p class="guide">${p.guia}</p>
  <button class="mic" id="mic" aria-label="Gravar">🎙</button><div class="status muted" id="st">Toque para falar</div>
  <textarea id="tx" placeholder="O que você falar aparece aqui. Pode editar.">${esc(e.passos[p.id] || "")}</textarea>
  <div class="row" style="margin-top:12px"><button class="btn ghost grow" id="prev" ${passo === 0 ? "disabled" : ""}>‹ Anterior</button>
  <button class="btn grow" id="next">${passo === STEPS.length - 1 ? "Concluir" : "Próxima ›"}</button></div>`;
  h += `<h2>Resumo</h2>` + (e.resumo ? resumoHTML(e.resumo) : `<p class="muted">Ao terminar, organize suas ideias.</p>`) +
    `<button class="btn" id="org">✨ Organizar minhas ideias</button> <button class="btn ghost" id="copy">Copiar</button>`;
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
  const parar = () => { ativo = false; rec?.stop(); btn.classList.remove("rec"); st.textContent = "Toque para falar"; };
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
    ativo = true; btn.classList.add("rec"); st.textContent = "Ouvindo… toque para parar"; rec.start();
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
  let h = `<div class="card sum">${r.local ? `<span class="badge">organização local</span>` : `<span class="badge">IA</span>`}`;
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
  $("#view").innerHTML = `<div class="card"><b>IA gratuita (opcional)</b><p class="muted">Crie uma chave grátis em aistudio.google.com/apikey e cole aqui. Fica só neste aparelho. Sem chave, o app usa a organização local.</p>
  <label>Chave Gemini</label><input id="k" type="password" value="${esc(db.config.geminiKey)}"><label>Modelo</label><input id="m" value="${esc(db.config.model)}">
  <p><button class="btn" id="ok">Salvar</button></p></div>`;
  $("#ok").onclick = () => { db.config.geminiKey = $("#k").value.trim(); db.config.model = $("#m").value.trim() || "gemini-2.5-flash"; save(); toast("Salvo"); telaInicio(); };
}

// ---------- Início ----------
fetch("data/encheivos.json").then(r => r.json()).then(j => { livro = j; }).catch(() => {}).finally(telaInicio);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
