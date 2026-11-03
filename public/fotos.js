"use strict";
// ---------- Fotos do caderno (ficam só neste aparelho) ----------
// As imagens são reduzidas e guardadas no IndexedDB do navegador. Não vão para o servidor,
// não entram no backup e são apagadas junto com "Apagar tudo" / "Apagar meus dados".
const FOTOS_MAX = 8;
const abreFotosDB = () => new Promise((ok, erro) => {
  const r = indexedDB.open("lectio-fotos", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("fotos");
  r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
});
const tx = async (modo, fn) => { const d = await abreFotosDB(); return new Promise((ok, erro) => { const t = d.transaction("fotos", modo), s = t.objectStore("fotos"); const r = fn(s); t.oncomplete = () => { d.close(); ok(r?.result); }; t.onerror = t.onabort = () => { d.close(); erro(t.error); }; }); };
const lerFoto = id => tx("readonly", s => s.get(id));
const gravaFoto = (id, blob) => tx("readwrite", s => s.put(blob, id));
const apagaFotoBlob = id => tx("readwrite", s => s.delete(id));
async function apagaTodasFotos() { try { await tx("readwrite", s => s.clear()); } catch {} }

async function reduzImagem(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return new Promise((ok, erro) => c.toBlob(b => (b ? ok(b) : erro(new Error("blob"))), "image/jpeg", 0.82));
}

function ligaFotos(diaId, e) {
  const box = document.getElementById("fotos"), inp = document.getElementById("ff"), btn = document.getElementById("addfoto");
  if (!box || !inp || !btn) return;
  const urls = [];
  const desenha = async () => {
    urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const ids = e.fotos || [];
    box.innerHTML = ids.length ? "" : `<p class="muted">Nenhuma foto ainda.</p>`;
    btn.disabled = ids.length >= FOTOS_MAX;
    for (const [i, id] of ids.entries()) {
      let blob = null; try { blob = await lerFoto(id); } catch {}
      if (!blob) continue;
      const u = URL.createObjectURL(blob); urls.push(u);
      const b = document.createElement("button"); b.type = "button"; b.className = "thumb"; b.setAttribute("aria-label", `Abrir foto ${i + 1} do caderno`);
      b.innerHTML = `<img alt="Foto ${i + 1} do caderno" src="${u}">`;
      b.onclick = () => abreFoto(u, id, i + 1);
      box.appendChild(b);
    }
  };
  const abreFoto = (u, id, n) => {
    const lb = document.createElement("div"); lb.id = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", `Foto ${n} do caderno`);
    lb.innerHTML = `<img alt="Foto ${n} do caderno" src="${u}"><div class="lbrow"><button class="btn" id="lb-x" type="button">Fechar</button><button class="btn ghost" id="lb-d" type="button">Remover foto</button></div><p class="muted lbmsg" id="lb-m"></p>`;
    document.body.appendChild(lb);
    const fecha = () => lb.remove();
    lb.querySelector("#lb-x").onclick = fecha; lb.querySelector("#lb-x").focus();
    lb.onkeydown = ev => { if (ev.key === "Escape") fecha(); };
    lb.querySelector("#lb-d").onclick = () => {
      lb.querySelector(".lbrow").innerHTML = `<button class="btn" id="lb-s" type="button">Sim, remover</button><button class="btn ghost" id="lb-n" type="button">Cancelar</button>`;
      lb.querySelector("#lb-m").textContent = "Esta foto será apagada deste aparelho.";
      lb.querySelector("#lb-n").onclick = () => { fecha(); abreFoto(u, id, n); };
      lb.querySelector("#lb-s").onclick = async () => { try { await apagaFotoBlob(id); } catch {} e.fotos = (e.fotos || []).filter(x => x !== id); marcaFotoApagada(id); save(); fecha(); desenha(); toast("Foto removida."); };
    };
  };
  btn.onclick = () => inp.click();
  inp.onchange = async () => {
    const arquivos = [...inp.files].slice(0, FOTOS_MAX - (e.fotos || []).length); inp.value = "";
    let n = 0;
    for (const f of arquivos) {
      try { const blob = await reduzImagem(f), id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()); await gravaFoto(id, blob); (e.fotos ||= []).push(id); n++; }
      catch { toast("Não consegui guardar essa foto neste navegador."); }
    }
    if (n) { save(); registra(); toast(n === 1 ? "Foto guardada neste aparelho." : n + " fotos guardadas neste aparelho."); }
    desenha();
  };
  desenha();
}

// ---------- Fotos na conta (espaço privado do Supabase) ----------
// Se a foto já tinha subido, guardamos o id para apagá-la também no servidor (mesmo que a pessoa esteja offline agora).
function marcaFotoApagada(id) {
  const s = db.sync; if (!s || !s.uid) return;
  const sinc = s.fotosSinc || [];
  if (sinc.includes(id)) { s.fotosApagar = [...new Set([...(s.fotosApagar || []), id])]; s.fotosSinc = sinc.filter(x => x !== id); }
}

async function sincronizaFotos(uid, linhas) {
  const sync = db.sync, sinc = new Set(sync.fotosSinc || []), apagar = new Set(sync.fotosApagar || []);
  const srv = new Map(linhas.map(r => [r.id, r])), bucket = sb.storage.from("fotos");
  let falhou = false;
  // 1) remoções feitas neste aparelho
  for (const id of [...apagar]) {
    const r = srv.get(id);
    if (!r) { apagar.delete(id); continue; }
    const a = await bucket.remove([r.caminho]);
    const b = a.error ? a : await sb.from("fotos").delete().eq("id", id);
    if (b.error) { falhou = true; continue; }
    apagar.delete(id); srv.delete(id);
  }
  const locais = new Map();
  for (const [dia, e] of Object.entries(db.estudos)) for (const id of e.fotos || []) locais.set(id, dia);
  // 2) servidor -> este aparelho
  for (const [id, r] of srv) {
    if (locais.has(id) || apagar.has(id)) continue;
    const { data, error } = await bucket.download(r.caminho);
    if (error || !data) { falhou = true; continue; }
    try { await gravaFoto(id, data); } catch { falhou = true; continue; }
    const e = (db.estudos[r.dia_id] ||= { diaId: r.dia_id, passos: {}, atualizado: 0 });
    (e.fotos ||= []).push(id); locais.set(id, r.dia_id); sinc.add(id);
  }
  // 3) este aparelho -> servidor (ou remover aqui o que foi apagado em outro aparelho)
  for (const [id, dia] of locais) {
    if (srv.has(id)) { sinc.add(id); continue; }
    if (sinc.has(id)) {
      try { await apagaFotoBlob(id); } catch {}
      const e = db.estudos[dia]; if (e) e.fotos = (e.fotos || []).filter(x => x !== id);
      sinc.delete(id); continue;
    }
    let blob = null; try { blob = await lerFoto(id); } catch {}
    if (!blob) continue;
    const caminho = `${uid}/${id}.jpg`;
    const up = await bucket.upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
    if (up.error && String(up.error.statusCode || up.error.status) !== "409") { falhou = true; continue; }
    const ins = await sb.from("fotos").upsert({ id, user_id: uid, dia_id: dia, caminho }, { onConflict: "id", ignoreDuplicates: true });
    if (ins.error) { falhou = true; continue; }
    sinc.add(id);
  }
  sync.fotosSinc = [...sinc]; sync.fotosApagar = [...apagar];
  return !falhou;
}

// Usado por "Apagar meus dados": remove os arquivos das fotos na conta (a função do banco apaga as linhas).
async function apagaFotosDaConta() {
  const { data, error } = await sb.from("fotos").select("caminho");
  if (error) return error.code === "PGRST205" || error.code === "42P01"; // tabela ainda não existe: não há fotos na conta
  const caminhos = (data || []).map(r => r.caminho);
  for (let i = 0; i < caminhos.length; i += 100) { const r = await sb.storage.from("fotos").remove(caminhos.slice(i, i + 100)); if (r.error) return false; }
  if (db.sync) { db.sync.fotosSinc = []; db.sync.fotosApagar = []; }
  return true;
}
