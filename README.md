# Lectio · Enchei-vos

Aplicativo de **oração pessoal pela Lectio Divina**, seguindo o roteiro do livro *Enchei-vos* (Seminário de Vida no Espírito Santo, Comunidade Católica Shalom). A pessoa **fala em vez de escrever**. O app organiza as ideias, guarda o histórico e acompanha a caminhada com medalhas, XP, missões e quiz.

> Todo o plano, as ideias futuras e as perguntas em aberto estão em [`docs/IDEIAS-DO-APP.md`](docs/IDEIAS-DO-APP.md).

## O que ele faz hoje
- **Roteiro do Enchei-vos:** 7 semanas e 43 dias (títulos, referências bíblicas, página do livro, resumo do foco). As 5 etapas de cada dia: Lectio, Meditatio, Oratio, Contemplatio e Actio.
- **Oração por voz:** botão de microfone com ditado em português; o texto pode ser editado.
- **Organizar ideias:** resumo por etapa. Com chave gratuita do Google Gemini usa IA. Sem chave, usa uma organização local simples.
- **Histórico** por semana e dia, com **data opcional**, exportação em texto, **backup, restaurar e apagar tudo**.
- **Medalhas** (12), **quiz** (21 perguntas), **XP e níveis** e **missões do dia**.
- **Visual "Horas do dia":** o tema muda com a hora (Laudes de manhã, Vésperas à tarde, Completas à noite).
- **Funciona offline** depois do primeiro acesso (PWA) e pode ser instalado na tela inicial.

## Privacidade (hoje)
Tudo o que a pessoa fala e escreve fica **somente no aparelho** (localStorage). Não há conta, servidor nem envio de orações. A chave da IA fica no aparelho e não vai no backup. Quando existir login, o plano é manter a chave só no aparelho e guardar o histórico com acesso exclusivo do dono (veja a seção "Próximos passos").

## Sobre o conteúdo
O app **não reproduz** o texto do livro nem de traduções da Bíblia. Guarda a estrutura, as referências e resumos curtos escritos com palavras próprias, e mostra um link para abrir a passagem na Bíblia. As perguntas do quiz também são originais.

## Estrutura do projeto
```
public/               o aplicativo (HTML, CSS e JS puros) servido na raiz do site
  index.html          página e ícones (sprite SVG)
  styles.css          visual e temas das horas do dia
  app.js              telas, voz, IA, medalhas, quiz, XP, backup
  sw.js               modo offline (service worker)
  manifest.webmanifest
  data/encheivos.json estrutura do livro (semanas e dias)
  data/quiz.json      perguntas do quiz
app/                  casca mínima do Next.js (a raiz "/" abre o index.html)
supabase/migrations/  SQL do banco privado (ainda não aplicado)
docs/                 ideias e plano do aplicativo
vercel.json, next.config.mjs, package.json
```

## Rodar no computador
Precisa de Node 20 ou superior.
```bash
npm install
npm run dev        # abre em http://localhost:3000
npm run build      # confere se o site compila
```
Só ver o app, sem Next.js: `cd public && python3 -m http.server 8000`.

## Publicar
O projeto é ligado ao GitHub e à **Vercel**. Cada envio para a branch `main` publica automaticamente. Na Vercel: *Framework Preset: Next.js*, pasta raiz `./`. Mantenha o Next.js atualizado, porque a Vercel bloqueia versões com falhas de segurança.

## Adicionar conteúdo
- **Novos dias e semanas:** edite `public/data/encheivos.json` (cada dia tem `id`, `titulo`, `ref`, `foco`, `pagina`). O id das semanas segue `s1`, `s2`…
- **Novas perguntas:** edite `public/data/quiz.json` (campos `s` semana, `q` pergunta, `o` opções, `c` índice da certa, `e` explicação, `r` referência).
- Escreva sempre com palavras próprias. Não copie trechos do livro.

## Como usar a IA gratuita
1. Crie uma chave grátis em aistudio.google.com/apikey.
2. No app, abra **Ajustes** e cole a chave. Ela fica só neste aparelho.
3. Sem chave, o botão "Organizar minhas ideias" usa a organização local.

## Próximos passos
1. **Contas e privacidade:** login (Supabase), histórico com acesso só do dono (RLS), apagar meus dados, aviso de privacidade. O SQL está em `supabase/migrations/`, aguardando aprovação para aplicar no projeto `lectio-enchei-vos`.
2. **Mais conteúdo:** semanas 7 a 17 e o Projeto de Vida Pessoal.
3. **Evolução semanal** e **reflexões ligadas a versículos reais**, apresentadas como sugestão, nunca como resposta definitiva de Deus.
4. **Comunidade:** grupos por convite, missões em conjunto e placares opcionais, sempre mostrando só números e nunca o conteúdo das orações.

## Licença e direitos
O código é do autor do projeto. O *Enchei-vos* e as traduções da Bíblia pertencem aos seus detentores de direitos. O projeto foi pensado para uso pessoal e de grupos de oração, sem reproduzir esses textos.
