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
let db = Object.assign({ config: { geminiKey: "", model: "gemini-2.5-flash", theme: "auto" }, custom: [], estudos: {}, stats: { voz: 0, quizzes: 0, perfect: 0 }, medalhas: {}, atividade: {}, horas: {} }, load());
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
// Horas do dia: Laudes (manhã), Vésperas (tarde), Completas (noite)
const periodo = () => { const t = db.config.theme; if (t === "light") return "laudes"; if (t === "dark") return "completas"; const h = new Date().getHours(); return h >= 5 && h < 12 ? "laudes" : h >= 12 && h < 18 ? "vesperas" : "completas"; };
const HORA = { laudes: "Laudes · manhã", vesperas: "Vésperas · tarde", completas: "Completas · noite" };
const aplicaTema = () => { const p = periodo(), r = document.documentElement; r.setAttribute("data-hora", p); r.setAttribute("data-theme", p === "completas" ? "dark" : "light"); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p === "completas" ? "#0e1324" : p === "vesperas" ? "#f08a4b" : "#f0587b"); };
// Referência com link para a Bíblia do leitor (o app não copia o texto das traduções)
const linkBiblia = ref => ref ? `<a class="bible" target="_blank" rel="noopener" href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref.replace(/(\d),(\d)/g, "$1:$2").replace(/\s*\(.*?\)/g, ""))}">Abrir na Bíblia ↗</a>` : "";
aplicaTema();
// cada semana tem sua cor e ícone (ciclo de 7)
const WK = [["#9f1d3f","#c2441f","i-book"],["#b45309","#92400e","i-heart"],["#0f766e","#166534","i-leaf"],["#be185d","#9d174d","i-heart"],["#6d28d9","#4c1d95","i-scroll"],["#9f1239","#7f1d1d","i-cross"],["#1d4ed8","#1e3a8a","i-dove"]];
const wkIdx = id => { const m = String(id).match(/\d+/); return m ? (+m[0] - 1) % 7 : 0; };
const wkStyle = id => { const [a, b] = WK[wkIdx(id)]; return `--w1:${a};--w2:${b}`; };
const wkIcon = id => WK[wkIdx(id)][2];
let livro = { semanas: [], aviso: "" };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toast = (m, ms = 2200) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms); };
let _key = "", _back = null, _viaPop = false;
const setTop = (title, back) => {
  window.scrollTo(0, 0); $("#title").textContent = title; document.title = title === "Lectio" ? "Lectio – Enchei-vos" : title + " – Lectio";
  const b = $("#back"); b.hidden = !back; _back = back || null; b.onclick = back ? () => history.back() : null;
  if (back && title !== _key) { _viaPop ? history.replaceState({ n: 1 }, "") : history.pushState({ n: 1 }, ""); }
  _key = title; _viaPop = false;
};
window.addEventListener("popstate", () => { _viaPop = true; (_back || telaInicio)(); });
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
const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';
function ordinal(t){return (t.split(" · ")[0]||"").replace(/\s+/g," ")}
function saudacao(){const h=new Date().getHours();return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite"}
function telaInicio() {
  setTop("Lectio", null);
  const semanas = todasSemanas();
  const dias = semanas.flatMap(s => s.dias.map(d => ({ ...d, semana: s })));
  const feitos = dias.filter(d => db.estudos[d.id]?.resumo).length;
  const prox = dias.find(d => !db.estudos[d.id]?.resumo) || dias[0];
  let h = `<section class="hero"><svg class="flame" aria-hidden="true"><use href="#flame"/></svg>
    <h2>Enchei-vos</h2><p class="sub">${saudacao()}. Hora de ${HORA[periodo()].split(" · ")[0]}.</p>`;
  if (prox) h += `<button class="today" data-d="${esc(prox.id)}"><span class="play">${ICO("i-play")}</span><span><strong>${esc(prox.titulo)}</strong><span>${feitos ? "Continuar de onde parou" : "Começar agora"}</span></span></button>`;
  h += `</section><div class="progress"><p>${feitos} de ${dias.length} dias rezados</p><div class="bar"><i style="width:${dias.length ? 100 * feitos / dias.length : 0}%"></i></div></div>`;
  h += `<div class="pair"><button class="tile" id="goMed">${ICO("i-trophy")}<span><b>Conquistas</b><small>${Object.keys(db.medalhas).length} de ${MEDALHAS.length} medalhas</small></span></button><button class="tile" id="goQuiz">${ICO("i-quiz")}<span><b>Quiz</b><small>brincar e aprender</small></span></button></div>`;
  h += `<h2 class="sec">As semanas</h2><div class="weeks">`;
  semanas.forEach((sm, i) => {
    const ok = sm.dias.filter(d => db.estudos[d.id]?.resumo).length, pct = sm.dias.length ? Math.round(100 * ok / sm.dias.length) : 0;
    h += `<button class="wk" style="${wkStyle(sm.id)};--i:${i}" data-w="${esc(sm.id)}"><span class="badge">${ICO(wkIcon(sm.id))}</span><span class="txt"><strong>${esc(sm.tema)}</strong><div class="cnt">${esc(sm.titulo)} · ${ok} de ${sm.dias.length} ${sm.dias.length === 1 ? "dia" : "dias"}</div><div class="bar"><i style="width:${pct}%"></i></div></span></button>`;
  });
  h += `</div><div class="row"><button class="btn" id="add">+ Passagem</button><button class="btn ghost" id="exp">Exportar tudo</button></div>`;
  if (livro.aviso) h += `<p class="muted">${esc(livro.aviso)}</p>`;
  $("#view").innerHTML = h;
  document.querySelectorAll("[data-d]").forEach(el => el.onclick = () => telaSessao(el.dataset.d));
  document.querySelectorAll("[data-w]").forEach(el => el.onclick = () => telaSemana(el.dataset.w));
  $("#add").onclick = telaNova; $("#exp").onclick = exportar;
  $("#goMed").onclick = telaConquistas; $("#goQuiz").onclick = () => telaQuiz();
}

function telaSemana(id) {
  const sm = todasSemanas().find(x => x.id === id); if (!sm) return telaInicio();
  setTop(sm.titulo, telaInicio);
  const ok = sm.dias.filter(d => db.estudos[d.id]?.resumo).length;
  let h = `<section class="whead" style="${wkStyle(sm.id)}"><h2>${esc(sm.tema)}</h2><p>${esc(sm.titulo)} · ${ok} de ${sm.dias.length} ${sm.dias.length === 1 ? "dia" : "dias"}</p><div class="bar"><i style="width:${sm.dias.length ? 100 * ok / sm.dias.length : 0}%"></i></div></section><div class="daylist" style="${wkStyle(sm.id)}">`;
  sm.dias.forEach((d, i) => { const [n, ...r] = d.titulo.split(" · "); const f = !!db.estudos[d.id]?.resumo;
    h += `<button class="day ${f ? "done" : ""}" style="--i:${i}" data-d="${esc(d.id)}"><span class="num">${f ? ICO("i-check") : esc(n.replace(/\D+/g, "") || "•")}</span><span class="nm"><b>${esc(r.join(" · ") || n)}</b><span>${esc(d.ref)}${db.estudos[d.id]?.data ? " · " + fmtData(db.estudos[d.id].data) : ""}</span></span><span class="go">${ICO("i-chev")}</span></button>`; });
  h += `</div>` + (quiz.some(q => q.s === sm.id) ? `<div class="row"><button class="btn ghost" id="qs">Quiz desta semana</button></div>` : "");
  $("#view").innerHTML = h;
  document.querySelectorAll("[data-d]").forEach(el => el.onclick = () => telaSessao(el.dataset.d));
  $("#qs")?.addEventListener("click", () => telaQuiz(sm.id));
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
  setTop(d.titulo.split(" · ")[0] + " · " + d.semana.titulo, () => telaSemana(d.semana.id));
  const p = STEPS[passo], titulo = d.titulo.split(" · ").slice(1).join(" · ");
  let h = `<div style="${wkStyle(d.semana.id)}"><div class="passage"><h2>${esc(titulo)}</h2><p class="meta">${esc(d.semana.titulo)} · ${esc(d.semana.tema)}</p>
    <p class="ref">${esc(d.ref) || "Sem referência"}</p>${linkBiblia(d.ref)}` +
    (d.texto || d.foco ? `<details><summary>Sobre este dia</summary>${d.texto ? `<p style="font-style:italic;white-space:pre-wrap">${esc(d.texto)}</p>` : ""}${d.foco ? `<p>${esc(d.foco)}</p>` : ""}<p class="muted">Leia no seu Enchei-vos${d.pagina ? ", pág. " + esc(d.pagina) : ""}.</p></details>` : "") + `</div>`;
  h += `<div class="datebox"><label for="dt">Data (opcional)</label><div class="daterow"><input id="dt" type="date" value="${esc(e.data || "")}"><button class="btn ghost" id="hoje" type="button">Hoje</button></div></div>`;
  h += `<div class="stepper" role="group" aria-label="Etapas da Lectio Divina">` + STEPS.map((s, i) => `<button class="step ${i === passo ? "on" : ""} ${e.passos[s.id] ? "done" : ""}" data-i="${i}" aria-label="${s.nome}, ${s.sub}${e.passos[s.id] ? ", preenchida" : ""}" ${i === passo ? 'aria-current="step"' : ""}>${ICO(s.ic)}</button>`).join("") + `</div>`;
  h += `<section class="stage"><h2>${p.nome}<span>${p.sub}</span></h2><p class="guide">${p.guia}</p>
  <div class="micwrap"><button class="mic" id="mic" aria-label="Gravar" aria-pressed="false">${ICO("i-mic")}</button>
  <div class="wave" id="wave" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div><div class="status" id="st" aria-live="polite">Toque e fale com Deus</div></div>
  <textarea id="tx" aria-label="O que você falou em ${p.nome}" placeholder="O que você falar aparece aqui. Pode editar.">${esc(e.passos[p.id] || "")}</textarea>
  <div class="row"><button class="btn ghost grow" id="prev" ${passo === 0 ? "disabled" : ""}>Anterior</button>
  <button class="btn grow" id="next">${passo === STEPS.length - 1 ? "Concluir" : "Próxima"}</button></div></section>`;
  h += `<h2 class="sec">Resumo</h2>` + (e.resumo ? resumoHTML(e.resumo) : `<p class="muted">Ao terminar, organize suas ideias.</p>`) +
    `<div class="row"><button class="btn" id="org">Organizar minhas ideias</button><button class="btn ghost" id="copy">Copiar</button></div></div>`;
  $("#view").innerHTML = h;
  const tx = $("#tx");
  const guardar = () => { e.passos[p.id] = tx.value.trim(); e.atualizado = Date.now(); save(); if (tx.value.trim()) registra(); };
  tx.oninput = guardar;
  const dt = $("#dt"); dt.onchange = () => { e.data = dt.value || ""; e.atualizado = Date.now(); save(); };
  $("#hoje").onclick = () => { const n = new Date(); dt.value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; dt.onchange(); toast("Data marcada"); };
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
  const parar = () => { ativo = false; rec?.stop(); btn.classList.remove("rec"); btn.setAttribute("aria-pressed", "false"); wave?.classList.remove("on"); st.textContent = "Toque e fale com Deus"; };
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
    ativo = true; db.stats.voz = (db.stats.voz || 0) + 1; save(); checkMedalhas(); btn.classList.add("rec"); btn.setAttribute("aria-pressed", "true"); wave?.classList.add("on"); st.textContent = "Ouvindo… toque para parar"; rec.start();
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
  e.atualizado = Date.now(); save(); registra(); telaSessao(diaId, 4);
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
  let t = `${d.semana.titulo} · ${d.titulo} — ${d.ref}${e.data ? "\nData: " + fmtData(e.data) : ""}\n\n`;
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

// ---------- Medalhas e quiz ----------
let quiz = [];
const hojeISO = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };
const MEDALHAS = [
  { id: "primeiro", nome: "Primeiro passo", desc: "Reze o seu primeiro dia.", ic: "i-play", ok: s => s.dias >= 1 },
  { id: "cinco", nome: "Lectio completa", desc: "Preencha as 5 etapas de um dia.", ic: "i-book", ok: s => s.completo },
  { id: "voz", nome: "Voz que reza", desc: "Use o microfone 5 vezes.", ic: "i-mic", ok: () => db.stats.voz >= 5 },
  { id: "tres", nome: "Três dias seguidos", desc: "Reze 3 dias em sequência.", ic: "i-heart", ok: s => s.seq >= 3 },
  { id: "sete", nome: "Sete dias seguidos", desc: "Reze 7 dias em sequência.", ic: "i-sun", ok: s => s.seq >= 7 },
  { id: "semana", nome: "Semana concluída", desc: "Conclua todos os dias de uma semana.", ic: "i-scroll", ok: s => s.semana },
  { id: "laudes", nome: "Laudes", desc: "Reze de manhã, entre 5h e 12h.", ic: "i-leaf", ok: () => db.horas.laudes },
  { id: "completas", nome: "Completas", desc: "Reze à noite, depois das 18h.", ic: "i-moon", ok: () => db.horas.completas },
  { id: "dez", nome: "Dez dias", desc: "Conclua 10 dias.", ic: "i-cross", ok: s => s.dias >= 10 },
  { id: "vinte", nome: "Vinte dias", desc: "Conclua 20 dias.", ic: "i-dove", ok: s => s.dias >= 20 },
  { id: "quiz", nome: "Curioso da Palavra", desc: "Faça um quiz.", ic: "i-quiz", ok: () => db.stats.quizzes >= 1 },
  { id: "perfeito", nome: "Sabedoria", desc: "Acerte todas as perguntas de um quiz.", ic: "i-star", ok: () => db.stats.perfect >= 1 }
];
function estado() {
  const ests = Object.values(db.estudos);
  const dias = ests.filter(e => e.resumo).length;
  const completo = ests.some(e => STEPS.every(s => e.passos[s.id]));
  const semana = todasSemanas().some(sm => sm.dias.length && sm.dias.every(d => db.estudos[d.id]?.resumo));
  let seq = 0, cur = 0, prev = null;
  for (const d of Object.keys(db.atividade).sort()) { const t = Date.parse(d + "T00:00:00Z"); cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1; seq = Math.max(seq, cur); prev = t; }
  return { dias, completo, semana, seq };
}
function checkMedalhas() {
  const s = estado(); const novas = [];
  for (const m of MEDALHAS) if (!db.medalhas[m.id] && m.ok(s)) { db.medalhas[m.id] = hojeISO(); novas.push(m.nome); }
  if (novas.length) { save(); toast("Nova medalha: " + novas.join(", "), 3800); }
}
function registra() {
  const h = new Date().getHours();
  db.atividade[hojeISO()] = true;
  if (h >= 5 && h < 12) db.horas.laudes = true;
  if (h >= 18 || h < 5) db.horas.completas = true;
  save(); checkMedalhas();
}
function telaConquistas() {
  setTop("Conquistas", telaInicio);
  const n = Object.keys(db.medalhas).length;
  $("#view").innerHTML = `<p class="muted">${n} de ${MEDALHAS.length} medalhas. Cada uma conta um passo da sua caminhada.</p><div class="medals">` +
    MEDALHAS.map(m => { const got = db.medalhas[m.id]; return `<div class="medal ${got ? "got" : ""}"><span class="disc">${ICO(m.ic)}</span><b>${esc(m.nome)}</b><span class="muted">${got ? "Em " + fmtData(got) : esc(m.desc)}</span></div>`; }).join("") +
    `</div><div class="row"><button class="btn" id="q">Jogar um quiz</button></div>`;
  $("#q").onclick = () => telaQuiz();
}
const embaralha = arr => arr.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
function telaQuiz(semId) {
  const sm = semId ? todasSemanas().find(x => x.id === semId) : null;
  const base = semId ? quiz.filter(q => q.s === semId) : embaralha(quiz).slice(0, 6);
  if (!base.length) { toast("Ainda não há perguntas aqui."); return; }
  const lista = embaralha(base).map(q => ({ ...q, o: embaralha(q.o.map((t, k) => ({ t, ok: k === q.c }))) }));
  setTop("Quiz", () => (sm ? telaSemana(semId) : telaInicio()));
  let i = 0, acertos = 0;
  const pinta = sm ? wkStyle(sm.id) : "";
  const fim = () => {
    window.scrollTo(0, 0);
    db.stats.quizzes++; if (acertos === lista.length) db.stats.perfect++; save();
    const frase = acertos === lista.length ? "Perfeito! A Palavra ficou no coração." : acertos >= lista.length / 2 ? "Muito bem! Vale reler os dias das que errou." : "Bom começo. Releia os dias e tente de novo.";
    $("#view").innerHTML = `<div style="${pinta}"><div class="qcard"><h2>${acertos} de ${lista.length}</h2><p>${frase}</p><div class="row"><button class="btn" id="again">Jogar de novo</button><button class="btn ghost" id="med">Ver conquistas</button></div></div></div>`;
    $("#again").onclick = () => telaQuiz(semId); $("#med").onclick = telaConquistas;
    checkMedalhas();
  };
  const render = () => {
    if (i >= lista.length) return fim();
    window.scrollTo(0, 0);
    const q = lista[i];
    $("#view").innerHTML = `<div style="${pinta}"><p class="muted">${sm ? esc(sm.titulo) + " · " : ""}Pergunta ${i + 1} de ${lista.length}</p><div class="bar qbar"><i style="width:${100 * i / lista.length}%"></i></div>
      <div class="qcard"><h2>${esc(q.q)}</h2><div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join("")}</div><div id="fb" aria-live="polite"></div></div></div>`;
    document.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      const k = +b.dataset.k, certa = q.o[k].ok; if (certa) acertos++;
      document.querySelectorAll(".opt").forEach((x, j) => { x.disabled = true; if (q.o[j].ok) { x.classList.add("certa"); x.insertAdjacentHTML("beforeend", `<small>Resposta certa</small>`); } else if (j === k) { x.classList.add("errada"); x.insertAdjacentHTML("beforeend", `<small>Sua resposta</small>`); } });
      $("#fb").innerHTML = `<p class="fbk"><b>${certa ? "Certo!" : "Quase."}</b> ${esc(q.e)} <span class="muted">${esc(q.r || "")}</span></p><button class="btn" id="nx">${i + 1 < lista.length ? "Próxima" : "Ver resultado"}</button>`;
      $("#nx").onclick = () => { i++; render(); }; $("#nx").focus();
    });
  };
  render();
}

// ---------- Início ----------
Promise.all([fetch("data/encheivos.json").then(r => r.json()).then(j => { livro = j; }).catch(() => {}), fetch("data/quiz.json").then(r => r.json()).then(j => { quiz = j; }).catch(() => {})]).finally(telaInicio);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
