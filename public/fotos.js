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
      lb.querySelector("#lb-s").onclick = async () => { try { await apagaFotoBlob(id); } catch {} e.fotos = (e.fotos || []).filter(x => x !== id); save(); fecha(); desenha(); toast("Foto removida."); };
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
