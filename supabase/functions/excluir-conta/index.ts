// Edge Function "excluir-conta" (Supabase, Deno).
//
// O que faz: apaga a conta de QUEM CHAMA, e somente ela.
// Como garante isso:
//   1. O gateway do Supabase só deixa passar quem manda um JWT válido (verify_jwt, padrão ligado).
//   2. A função IGNORA o corpo da requisição. O id da conta vem sempre do JWT, nunca do que o cliente escreve.
//   3. A chave de serviço (SUPABASE_SERVICE_ROLE_KEY) fica só aqui no servidor, injetada pelo Supabase.
//      Ela nunca vai para o navegador nem para o repositório.
// Efeito: apagar o usuário em auth.users apaga em cascata profiles, estudos, passagens_custom,
// medalhas e atividade (todas têm "on delete cascade").
//
// Deploy (só depois de aprovado): supabase functions deploy excluir-conta --project-ref dzmhpfzheojmljxlgigp
// Variável opcional: SITE_ORIGINS="https://estudo-biblico-shalom.vercel.app,https://outro-endereco" (CORS).
import { createClient } from "npm:@supabase/supabase-js@2";

const origens = (Deno.env.get("SITE_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("Origin") ?? "";
  const permitido = origens.length === 0 ? "*" : origens.includes(o) ? o : origens[0];
  return {
    "Access-Control-Allow-Origin": permitido,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function resposta(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return resposta(req, { erro: "metodo_nao_permitido" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return resposta(req, { erro: "sem_token" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const chaveServico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chaveServico) return resposta(req, { erro: "servidor_mal_configurado" }, 500);

  const admin = createClient(url, chaveServico, { auth: { persistSession: false, autoRefreshToken: false } });

  // Quem é o dono deste token? O servidor confirma; não confiamos em nada que venha do corpo.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return resposta(req, { erro: "token_invalido" }, 401);

  // Os arquivos das fotos ficam no Storage e não somem em cascata: removemos a pasta do dono antes.
  const pasta = data.user.id;
  for (let i = 0; i < 20; i++) {
    const { data: arquivos } = await admin.storage.from("fotos").list(pasta, { limit: 100 });
    if (!arquivos?.length) break;
    await admin.storage.from("fotos").remove(arquivos.map((f) => `${pasta}/${f.name}`));
  }

  const { error: erroApagar } = await admin.auth.admin.deleteUser(data.user.id);
  if (erroApagar) return resposta(req, { erro: "falha_ao_excluir" }, 500); // nunca devolvemos detalhes

  return resposta(req, { ok: true });
});
