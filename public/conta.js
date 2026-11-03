"use strict";
// ---------- Conta e sincronização (opcional) ----------
// O aparelho continua sendo a fonte dos dados: sem conta, tudo funciona só aqui.
// Com conta, o histórico é copiado para o Supabase, onde cada linha só é visível ao dono (RLS).
// Regras deste arquivo: nunca registrar conteúdo de oração em log e nunca mostrar mensagem de erro bruta.
const SUPA_URL = "https://dzmhpfzheojmljxlgigp.supabase.co";
const SUPA_KEY = "sb_publishable_5Dll1PKtVRfDAMf7jSEkAg_OSyl9dBU"; // chave pública por desenho; nunca coloque a chave de serviço aqui
const EXCLUIR_CONTA_ATIVA = false; // mude para true só depois do deploy da Edge Function "excluir-conta"
const AVISO_VERSAO = "provisorio-v0";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let sb = null, sessao = null, _perfilPronto = null, _perfilApelido = "";
let _syncTimer = null, _syncando = false, _syncDeNovo = false, _syncOk = false, _syncMsg = "";

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const dbVazio = cfg => ({ config: cfg, custom: [], estudos: {}, stats: { voz: 0, quizzes: 0, perfect: 0 }, medalhas: {}, atividade: {}, horas: {}, diario: {}, bonus: 0, nivelVisto: 1 });
const temConteudo = e => !!e && (Object.values(e.passos || {}).some(Boolean) || !!e.resumo || !!e.data);
const localTemDados = () => Object.values(db.estudos).some(temConteudo) || Object.keys(db.medalhas).length > 0 || Object.keys(db.atividade).length > 0 || db.custom.length > 0 || db.stats.voz > 0 || db.stats.quizzes > 0 || (db.bonus || 0) > 0;
const hhmm = d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function setSyncMsg(t) { _syncMsg = t; const el = document.getElementById("syncmsg"); if (el) el.textContent = t; }

// Mensagens fixas: nunca exibem o texto do erro nem dados da pessoa.
function erroAuth(err) {
  switch (err?.code) {
    case "invalid_credentials": return "E-mail ou senha incorretos.";
    case "email_not_confirmed": return "Confirme seu e-mail primeiro. Procure o link que enviamos.";
    case "user_already_exists": case "email_exists": return "Este e-mail já tem conta. Tente entrar.";
    case "weak_password": return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
    case "over_email_send_rate_limit": case "over_request_rate_limit": return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    case "signup_disabled": return "O cadastro está desativado no momento.";
    default: return !navigator.onLine || err?.name === "AuthRetryableFetchError" ? "Sem conexão. Tente de novo quando estiver online." : "Não foi possível agora. Tente de novo em instantes.";
  }
}

function iniciaSupabase() {
  if (sb) return sb;
  if (!window.supabase?.createClient) return null;
  sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "lectio.auth" } });
  sb.auth.onAuthStateChange((ev, s) => { sessao = s; setTimeout(() => aoMudarSessao(ev), 0); });
  return sb;
}

async function aoMudarSessao(ev) {
  if (ev === "SIGNED_OUT") { _perfilPronto = null; setSyncMsg(""); if (document.getElementById("conta-box")) telaAjustes(); return; }
  if (!sessao || ev === "TOKEN_REFRESHED" || ev === "USER_UPDATED") return;
  if (_perfilPronto === sessao.user.id) { agendaSync(0); return; }
  await entrarNaConta();
}

async function entrarNaConta() {
  if (!sessao) return;
  const uid = sessao.user.id;
  const { data, error } = await sb.from("profiles").select("apelido").eq("id", uid).maybeSingle();
  if (error) { setSyncMsg("Sem conexão com a conta. Tentamos de novo quando a internet voltar."); return; }
  _perfilApelido = data?.apelido || "";
  if (!_perfilApelido || !sessao.user.user_metadata?.aceite_privacidade) { telaPerfil(); return; }
  _perfilPronto = uid;
  await decideSync();
  if (_key === "Conta") telaInicio();
}

// ---------- Primeira entrada: apelido, maioridade e aviso de privacidade ----------
function telaPerfil() {
  setTop("Seu perfil", null);
  $("#view").innerHTML = `<div class="card"><h2 class="titulo-tela">Bem-vindo</h2><p class="muted">Antes de começar, precisamos de poucas informações.</p>
    <form id="fp" novalidate><label for="ap-in">Apelido (até 40 letras)</label><input id="ap-in" maxlength="40" autocomplete="nickname" value="${esc(_perfilApelido)}" required>
    <div class="legal" tabindex="0" role="region" aria-label="Aviso de privacidade, texto provisório">
      <p><b>Aviso de privacidade (texto provisório)</b></p>
      <p><b>Quem cuida dos dados:</b> [nome do responsável pelo aplicativo], contato: [e-mail de contato].</p>
      <p><b>O que guardamos:</b> seu e-mail, seu apelido, o que você escreveu ou falou em cada dia de oração, os resumos, datas, medalhas e pontos. [conferir lista final].</p>
      <p><b>Quem vê:</b> somente você. [definir o que será compartilhado se houver grupos no futuro].</p>
      <p><b>Para que usamos:</b> guardar o seu histórico e levá-lo para os seus outros aparelhos. [..].</p>
      <p><b>Chave da IA:</b> fica só no seu aparelho e nunca é enviada.</p>
      <p><b>Seus direitos:</b> você pode apagar seus dados ou excluir a conta em Ajustes. [..base legal e prazos da LGPD..].</p>
      <p><b>Menores de 18 anos:</b> [..regra a definir..].</p>
    </div>
    <label class="check" for="c18"><input id="c18" type="checkbox"><span>Tenho 18 anos ou mais.</span></label>
    <label class="check" for="cav"><input id="cav" type="checkbox"><span>Li e aceito o aviso de privacidade.</span></label>
    <p id="pm" class="msg" role="alert"></p>
    <div class="row"><button class="btn grow" id="pgo" type="submit">Continuar</button></div>
    <div class="row"><button class="btn ghost grow" id="psair" type="button">Agora não, sair da conta</button></div></form></div>`;
  const msg = t => { $("#pm").textContent = t; };
  $("#psair").onclick = async () => { await sb.auth.signOut({ scope: "local" }); telaInicio(); };
  $("#fp").onsubmit = async ev => {
    ev.preventDefault(); msg("");
    const ap = $("#ap-in").value.trim();
    if (!ap) return msg("Escolha um apelido.");
    if (ap.length > 40) return msg("O apelido pode ter no máximo 40 letras.");
    if (!$("#c18").checked) return msg("É preciso ter 18 anos ou mais para criar uma conta.");
    if (!$("#cav").checked) return msg("Aceite o aviso de privacidade para continuar.");
    const btn = $("#pgo"); btn.disabled = true;
    const uid = sessao.user.id;
    const r1 = await sb.from("profiles").upsert({ id: uid, apelido: ap }, { onConflict: "id" });
    const r2 = r1.error ? r1 : await sb.auth.updateUser({ data: { maior_de_18: true, aceite_privacidade: AVISO_VERSAO, aceite_em: new Date().toISOString() } });
    btn.disabled = false;
    if (r2.error) return msg("Não foi possível salvar agora. Confira a conexão e tente de novo.");
    _perfilApelido = ap; _perfilPronto = uid;
    await decideSync();
    if (_key === "Seu perfil") telaInicio(); // se o app abriu outra pergunta (ex.: enviar dados), não cobrir
  };
}

// ---------- Decidir como sincronizar ----------
async function decideSync() {
  const uid = sessao.user.id; db.sync = db.sync || {};
  if (db.sync.uid === uid) { agendaSync(0); return; }
  if (db.sync.uid && db.sync.uid !== uid) { telaOutraConta(); return; }
  if (localTemDados()) { telaPrimeiraSync(); return; }
  db.sync = { uid, pausada: false }; salvaLocal(); agendaSync(0);
}

function telaPrimeiraSync() {
  setTop("Dados deste aparelho", null);
  $("#view").innerHTML = `<div class="card"><h2 class="titulo-tela">Enviar para a sua conta?</h2>
    <p>Este aparelho já tem orações, medalhas ou pontos guardados. Se você enviar, eles passam a ficar também no servidor, visíveis só para você, e aparecem nos seus outros aparelhos.</p>
    <p class="muted">Se escolher "Agora não", a sincronização fica pausada e você pode ativar depois em Ajustes.</p>
    <div class="row"><button class="btn grow" id="s-sim">Enviar para minha conta</button></div><div class="row"><button class="btn ghost grow" id="s-nao">Agora não</button></div></div>`;
  const uid = sessao.user.id;
  $("#s-sim").onclick = async () => { db.sync = { uid, pausada: false }; migraCustomIds(); salvaLocal(); toast("Enviando…"); await sincroniza(); telaInicio(); };
  $("#s-nao").onclick = () => { db.sync = { uid, pausada: true }; salvaLocal(); telaInicio(); };
}

function telaOutraConta() {
  setTop("Outra conta neste aparelho", null);
  $("#view").innerHTML = `<div class="card"><h2 class="titulo-tela">Dados de outra conta</h2>
    <p>Este aparelho guarda dados de outra conta. Para entrar com esta, eles precisam ser removidos daqui. Se já foram sincronizados, continuam guardados na conta de origem.</p>
    <div class="row"><button class="btn grow" id="o-sim">Limpar este aparelho e entrar</button></div><div class="row"><button class="btn ghost grow" id="o-nao">Sair</button></div></div>`;
  $("#o-sim").onclick = async () => { const uid = sessao.user.id; db = dbVazio(db.config); db.sync = { uid, pausada: false }; salvaLocal(); toast("Aparelho limpo."); await sincroniza(); telaInicio(); };
  $("#o-nao").onclick = async () => { await sb.auth.signOut({ scope: "local" }); telaInicio(); };
}

// Passagens próprias precisam de um id no formato uuid (igual ao banco).
function migraCustomIds() {
  for (const p of db.custom) {
    if (UUID_RE.test(p.id)) continue;
    const novo = uuid();
    if (db.estudos[p.id]) { db.estudos[novo] = { ...db.estudos[p.id], diaId: novo }; delete db.estudos[p.id]; }
    p.id = novo;
  }
}

// ---------- Sincronização ----------
function podeSync() { return !!(sb && sessao && _perfilPronto === sessao.user.id && db.sync && db.sync.uid === sessao.user.id && !db.sync.pausada); }
function agendaSync(ms = 4000) { if (!podeSync()) return; clearTimeout(_syncTimer); _syncTimer = setTimeout(sincroniza, ms); }

async function sincroniza() {
  _syncOk = false;
  if (!podeSync()) return;
  if (!navigator.onLine) { setSyncMsg("Sem conexão. Sincronizamos quando a internet voltar."); return; }
  if (_syncando) { _syncDeNovo = true; return; }
  _syncando = true; setSyncMsg("Sincronizando…");
  try {
    migraCustomIds();
    const uid = sessao.user.id;
    const [rE, rM, rA, rC, rP] = await Promise.all([
      sb.from("estudos").select("dia_id,passos,resumo,data,atualizado"),
      sb.from("medalhas").select("medalha_id,ganha_em"),
      sb.from("atividade").select("dia"),
      sb.from("passagens_custom").select("id,semana,tema,titulo,ref,texto"),
      sb.from("profiles").select("stats,horas").eq("id", uid).maybeSingle()
    ]);
    if ([rE, rM, rA, rC, rP].some(r => r.error)) throw 0;

    // estudos: vence o mais recente por dia_id
    const srv = new Map((rE.data || []).map(r => [r.dia_id, r]));
    for (const r of rE.data || []) {
      const l = db.estudos[r.dia_id], st = Date.parse(r.atualizado) || 0;
      if (!l || !temConteudo(l) || st > (l.atualizado || 0)) db.estudos[r.dia_id] = { diaId: r.dia_id, passos: r.passos || {}, ...(r.resumo ? { resumo: r.resumo } : {}), data: r.data || "", atualizado: st };
    }
    const subirE = [];
    for (const [id, l] of Object.entries(db.estudos)) {
      if (!temConteudo(l)) continue;
      const s = srv.get(id);
      if (!s || (l.atualizado || 0) > (Date.parse(s.atualizado) || 0)) subirE.push({ user_id: uid, dia_id: id, passos: l.passos || {}, resumo: l.resumo || null, data: l.data || null, atualizado: new Date(l.atualizado || Date.now()).toISOString() });
    }

    // medalhas e atividade: união (medalha guarda a data mais antiga)
    const sM = new Set();
    for (const r of rM.data || []) { sM.add(r.medalha_id); if (!db.medalhas[r.medalha_id] || r.ganha_em < db.medalhas[r.medalha_id]) db.medalhas[r.medalha_id] = r.ganha_em; }
    const subirM = Object.entries(db.medalhas).filter(([id]) => !sM.has(id)).map(([id, d]) => ({ user_id: uid, medalha_id: id, ganha_em: d }));
    const sA = new Set();
    for (const r of rA.data || []) { sA.add(r.dia); db.atividade[r.dia] = true; }
    const subirA = Object.keys(db.atividade).filter(d => !sA.has(d)).map(d => ({ user_id: uid, dia: d }));

    // passagens próprias: união por id
    const sC = new Set();
    for (const r of rC.data || []) { sC.add(r.id); if (!db.custom.some(p => p.id === r.id)) db.custom.push({ id: r.id, semana: r.semana, tema: r.tema || "", titulo: r.titulo, ref: r.ref || "", texto: r.texto || "" }); }
    const subirC = db.custom.filter(p => UUID_RE.test(p.id) && !sC.has(p.id)).map(p => ({ id: p.id, user_id: uid, semana: p.semana, tema: p.tema || null, titulo: p.titulo, ref: p.ref || null, texto: p.texto || null }));

    // contadores e horas: o maior valor / "já aconteceu"
    const sS = rP.data?.stats || {}, sH = rP.data?.horas || {};
    const st = { ...sS, voz: Math.max(sS.voz || 0, db.stats.voz || 0), quizzes: Math.max(sS.quizzes || 0, db.stats.quizzes || 0), perfect: Math.max(sS.perfect || 0, db.stats.perfect || 0), bonus: Math.max(sS.bonus || 0, db.bonus || 0) };
    const hr = { ...sH, ...Object.fromEntries(Object.entries(db.horas || {}).filter(([, v]) => v)) };
    db.stats.voz = st.voz; db.stats.quizzes = st.quizzes; db.stats.perfect = st.perfect; db.bonus = st.bonus; db.horas = { ...db.horas, ...hr };
    const mudouP = JSON.stringify(st) !== JSON.stringify(sS) || JSON.stringify(hr) !== JSON.stringify(sH);

    const ops = [];
    if (subirE.length) ops.push(sb.from("estudos").upsert(subirE, { onConflict: "user_id,dia_id" }));
    if (subirM.length) ops.push(sb.from("medalhas").upsert(subirM, { onConflict: "user_id,medalha_id", ignoreDuplicates: true }));
    if (subirA.length) ops.push(sb.from("atividade").upsert(subirA, { onConflict: "user_id,dia", ignoreDuplicates: true }));
    if (subirC.length) ops.push(sb.from("passagens_custom").upsert(subirC, { onConflict: "id", ignoreDuplicates: true }));
    if (mudouP) ops.push(sb.from("profiles").update({ stats: st, horas: hr }).eq("id", uid));
    if ((await Promise.all(ops)).some(r => r.error)) throw 0;

    db.sync.ultimo = new Date().toISOString(); salvaLocal(); _syncOk = true;
    setSyncMsg("Sincronizado às " + hhmm(new Date()) + ".");
    if (_key === "Lectio") telaInicio();
  } catch {
    setSyncMsg("Não foi possível sincronizar agora. Tentamos de novo mais tarde.");
  } finally {
    _syncando = false;
    if (_syncDeNovo) { _syncDeNovo = false; agendaSync(500); }
  }
}

// ---------- Telas de conta ----------
function telaConta(modo = "entrar") {
  if (!iniciaSupabase()) { toast("Conta indisponível agora. O app continua funcionando neste aparelho."); return; }
  setTop("Conta", telaAjustes);
  const novo = modo === "criar";
  $("#view").innerHTML = `<div class="card"><div class="seg" id="tabs"><button type="button" data-m="entrar" class="${novo ? "" : "on"}">Entrar</button><button type="button" data-m="criar" class="${novo ? "on" : ""}">Criar conta</button></div>
    <form id="fa" novalidate><label for="em">E-mail</label><input id="em" type="email" autocomplete="email" inputmode="email" required>
    <label for="pw">Senha</label><input id="pw" type="password" autocomplete="${novo ? "new-password" : "current-password"}" minlength="8" required>
    ${novo ? '<p class="muted">Use pelo menos 8 caracteres.</p>' : ""}<p id="am" class="msg" role="alert"></p>
    <div class="row"><button class="btn grow" id="go" type="submit">${novo ? "Criar conta" : "Entrar"}</button></div></form>
    <p class="muted">A conta é opcional. Sem ela, tudo continua só neste aparelho.</p></div>`;
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => telaConta(b.dataset.m));
  const msg = t => { $("#am").textContent = t; };
  $("#fa").onsubmit = async ev => {
    ev.preventDefault(); msg("");
    const email = $("#em").value.trim(), pw = $("#pw").value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return msg("Digite um e-mail válido.");
    if (pw.length < 8) return msg("A senha precisa ter pelo menos 8 caracteres.");
    const btn = $("#go"); btn.disabled = true;
    if (novo) {
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin } });
      btn.disabled = false;
      if (error) return msg(erroAuth(error));
      if (!data.session) telaConfirmeEmail(email);
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      btn.disabled = false;
      if (error) return msg(erroAuth(error));
      toast("Você entrou.");
    }
  };
}

function telaConfirmeEmail(email) {
  setTop("Conta", telaAjustes);
  $("#view").innerHTML = `<div class="card"><h2 class="titulo-tela">Confirme seu e-mail</h2><p>Enviamos um link de confirmação para <b>${esc(email)}</b>. Abra o e-mail, toque no link e depois volte aqui para entrar.</p>
    <p class="muted">Não achou? Olhe a caixa de spam.</p><div class="row"><button class="btn grow" id="ce">Já confirmei, entrar</button></div></div>`;
  $("#ce").onclick = () => telaConta("entrar");
}

function contaCardHTML() {
  if (!iniciaSupabase()) return `<div class="card" id="conta-box"><b>Conta</b><p class="muted">A conta não está disponível agora. O app continua funcionando só neste aparelho.</p></div>`;
  if (!sessao) return `<div class="card" id="conta-box"><b>Conta (opcional)</b><p class="muted">Sem conta, tudo fica só neste aparelho. Com conta, seu histórico acompanha você em outros celulares e só você consegue ver.</p><div class="row"><button class="btn" id="c-in">Entrar ou criar conta</button></div></div>`;
  const pausada = db.sync?.pausada;
  const msg = _syncMsg || (pausada ? "Sincronização pausada." : db.sync?.ultimo ? "Última sincronização às " + hhmm(new Date(db.sync.ultimo)) + "." : "");
  return `<div class="card" id="conta-box"><b>Conta</b><p>${esc(_perfilApelido || "Conectado")}<br><span class="muted">${esc(sessao.user.email || "")}</span></p><p class="muted" id="syncmsg" role="status">${esc(msg)}</p>
    <div class="row"><button class="btn ghost" id="c-sync">${pausada ? "Ativar sincronização" : "Sincronizar agora"}</button><button class="btn ghost" id="c-out">Sair</button></div><div id="c-extra"></div>
    <h3 class="cuidado">Seus dados</h3>
    <div class="row"><button class="btn ghost" id="c-del">Apagar meus dados</button></div><div id="c-delbox"></div>
    ${EXCLUIR_CONTA_ATIVA ? `<div class="row"><button class="btn ghost" id="c-conta">Excluir minha conta</button></div><div id="c-contabox"></div>` : `<p class="muted">Excluir a conta por completo ainda não está disponível. Enquanto isso, "Apagar meus dados" remove tudo o que você guardou.</p>`}</div>`;
}

function ligaConta() {
  const q = id => document.getElementById(id);
  q("c-in")?.addEventListener("click", () => telaConta("entrar"));
  q("c-sync")?.addEventListener("click", async () => {
    if (db.sync?.pausada) { db.sync.pausada = false; migraCustomIds(); salvaLocal(); }
    await sincroniza(); telaAjustes();
  });
  q("c-out")?.addEventListener("click", () => {
    q("c-extra").innerHTML = `<p class="muted">Escolha o que fazer com os dados deste aparelho. Dados que não foram enviados para a conta serão perdidos se você limpar.</p><div class="row"><button class="btn" id="o1">Sair e manter os dados aqui</button><button class="btn ghost" id="o2">Sair e limpar este aparelho</button><button class="btn ghost" id="o3">Cancelar</button></div>`;
    q("o3").onclick = telaAjustes;
    q("o1").onclick = async () => { await sb.auth.signOut({ scope: "local" }); toast("Você saiu."); telaInicio(); };
    q("o2").onclick = async () => {
      if (!db.sync?.pausada) { await sincroniza(); if (!_syncOk) { toast("Não foi possível guardar na conta antes de limpar. Conecte-se e tente de novo."); return; } }
      await sb.auth.signOut({ scope: "local" }); db = dbVazio(db.config); salvaLocal(); toast("Você saiu e o aparelho foi limpo."); telaInicio();
    };
  });
  q("c-del")?.addEventListener("click", () => {
    q("c-delbox").innerHTML = `<p class="muted">Isso apaga da sua conta e deste aparelho todos os estudos, medalhas, atividade e passagens. Não dá para desfazer.</p><div class="row"><button class="btn" id="d1">Sim, apagar meus dados</button><button class="btn ghost" id="d2">Cancelar</button></div>`;
    q("d2").onclick = telaAjustes;
    q("d1").onclick = async () => {
      const { error } = await sb.rpc("apagar_meus_dados");
      if (error) { toast("Não foi possível apagar agora. Confira a conexão e tente de novo."); return; }
      const sy = db.sync; db = dbVazio(db.config); db.sync = sy; salvaLocal(); toast("Seus dados foram apagados."); telaInicio();
    };
  });
  q("c-conta")?.addEventListener("click", () => {
    q("c-contabox").innerHTML = `<p class="muted">Isso exclui a conta e todos os dados dela, para sempre. Também limpa este aparelho.</p><div class="row"><button class="btn" id="x1">Sim, excluir minha conta</button><button class="btn ghost" id="x2">Cancelar</button></div>`;
    q("x2").onclick = telaAjustes;
    q("x1").onclick = async () => {
      const { error } = await sb.functions.invoke("excluir-conta", { method: "POST" });
      if (error) { toast("Não foi possível excluir agora. Tente de novo mais tarde."); return; }
      await sb.auth.signOut({ scope: "local" }); db = dbVazio(db.config); salvaLocal(); toast("Conta excluída."); telaInicio();
    };
  });
}

// ---------- Início ----------
iniciaSupabase();
window.addEventListener("online", () => { if (sessao && _perfilPronto !== sessao.user.id) entrarNaConta(); else agendaSync(0); });
