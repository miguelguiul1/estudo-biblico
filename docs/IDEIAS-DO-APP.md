# Lectio · Enchei-vos — ideias atuais e futuras do aplicativo

> **Como usar este arquivo:** cole no Claude e peça, por exemplo: *"Leia este documento e me ajude a estruturar o produto: priorizar o que construir, decidir o que fica de fora, e desenhar como o aplicativo vai funcionar, passo a passo."* As perguntas em aberto estão na seção 12.

---

## 1. Visão em uma frase
Um aplicativo de **oração pessoal pela Lectio Divina**, no roteiro do livro *Enchei-vos* (Seminário de Vida no Espírito Santo, Comunidade Católica Shalom), em que a pessoa **fala em vez de escrever**, e o app organiza as ideias, guarda o histórico e mostra a evolução na caminhada da fé.

## 2. Problema que resolve
O dono da ideia reza com o *Enchei-vos*, mas **não tem tempo de escrever** as respostas de cada etapa e isso estava atrapalhando a oração. Ele consegue ler a passagem na Bíblia e falar ou meditar. Falta algo que **ouça, organize e guarde**.

## 3. Quem vai usar (em ordem de expansão)
1. O próprio criador (uso pessoal, hoje).
2. O grupo de oração dele.
3. Outro grupo de oração.
4. Todo o centro de evangelização.

Consequência: o app precisa funcionar bem para **uma pessoa sozinha** e depois escalar para **grupos**, sem perder a privacidade. Os usuários não são técnicos.

## 4. Princípios (decisões já tomadas)
- **Oração é dado sensível.** Cada pessoa vê só o que é dela. Nunca expor conteúdo de oração a outros.
- **Custo zero ou quase zero.** Usar serviços gratuitos. Cada usuário usa a **própria chave de IA gratuita**.
- **Funcionar sem internet** para ler e rezar. O ditado por voz do navegador precisa de internet.
- **Não copiar o livro.** O app guarda só a estrutura (títulos, referências bíblicas, páginas, resumos curtos escritos com palavras próprias). O texto do livro e das traduções da Bíblia não é copiado. O app mostra a **referência com um link** para a Bíblia do leitor. Texto bíblico completo só de tradução com licença clara.
- **A IA não é a voz de Deus.** Ela organiza o que a pessoa disse e, no futuro, sugere reflexões ligadas a **versículos reais**. Sempre como sugestão, nunca como resposta definitiva.
- **Visual que dá vontade de rezar:** calmo, humano, devocional. Evitar cara de template de IA.

## 5. O que já está construído (estado atual)
**Tecnologia:** site instalável (PWA) em HTML/CSS/JavaScript, empacotado em Next.js, publicado na Vercel. Repositório no GitHub: `miguelguiul1/estudo-biblico` (branch `main`).

**Conteúdo do Enchei-vos já cadastrado:** 7 semanas e 43 dias (títulos, referências, páginas, resumo de foco).
Faltam: da 7ª semana em diante (até a 17ª) e o **Projeto de Vida Pessoal** (pág. ~419).
Páginas ainda não enviadas: a lista de abreviaturas do Antigo Testamento (primeira página).

**Fluxo de oração:** escolher dia, abrir passagem, passar pelas 5 etapas:
Lectio (leitura) → Meditatio (meditação) → Oratio (oração) → Contemplatio (contemplação) → Actio (ação como resposta de amor).
Em cada etapa: pergunta-guia, **microfone** (ditado em português), texto editável.

**Organizar ideias:** botão que gera resumo (título, ideia central, pontos por etapa, compromisso). Com chave gratuita do Google Gemini usa IA. Sem chave, usa uma organização local simples (separa frases por etapa).

**Histórico:** por semana e dia, com **data opcional** por dia (como a linha de data do livro). Exportar tudo em texto.

**Gamificação (já feita):**
- **12 medalhas:** Primeiro passo, Lectio completa, Voz que reza, Três/Sete dias seguidos, Semana concluída, Laudes (rezar de manhã), Completas (rezar à noite), Dez dias, Vinte dias, Curioso da Palavra, Sabedoria.
- **Quiz** com 21 perguntas (semanas 1 a 6), por semana e geral, com explicação e referência. Perguntas escritas com palavras próprias.
- **XP e níveis:** Semente, Broto, Videira, Fonte, Luz, Estrela.
- **Missões do dia:** rezar um dia, preencher as 5 etapas, usar o microfone, fazer um quiz (+10 XP cada).

**Dados:** tudo fica **só no aparelho** (localStorage). Há **backup/restaurar** por arquivo e **apagar tudo** com confirmação. A chave de IA não entra no backup.

**Design (direção escolhida: "Horas do dia"):**
- O visual muda com a hora: **Laudes** (manhã, claro), **Vésperas** (tarde, dourado), **Completas** (noite, azul profundo com luz de vela).
- Cada semana tem sua cor e ícone. Letras de pincel nos títulos, serifada para leitura.
- Revisado com crítica de design e acessibilidade (contraste, alvos de toque, microfone sem rolar, botão voltar do celular).

## 6. Como o app funciona hoje (fluxo)
1. Abre → vê a capa com a hora do dia, o botão **Continuar** e o nível/missões.
2. Escolhe o dia (pela capa ou pela semana).
3. Lê a passagem na Bíblia (link "Abrir na Bíblia") e no livro.
4. Em cada etapa, toca no microfone e fala. O texto aparece e pode ser editado.
5. No fim, **Organizar minhas ideias** gera o resumo. Ganha XP, medalhas e missões.
6. Pode jogar o quiz, ver conquistas, exportar ou fazer backup.

## 7. Próximo passo planejado: contas e privacidade (opção B, decidida)
- **Login e senha** (Supabase Auth). Cada pessoa tem sua conta.
- **Histórico guardado num banco** com **regra de privacidade por linha** (RLS): cada pessoa só lê e altera as próprias linhas.
- **Chave de API de IA fica só no aparelho** de cada pessoa. Nunca vai ao servidor.
- **Apagar meus dados** (botão), e aviso claro do que é guardado, em português simples (LGPD).
- **Tabelas previstas:** perfil (apelido, contadores), estudos (por dia: passos, resumo, data), passagens próprias, medalhas, atividade (dias).
- **Estado:** projeto `lectio-enchei-vos` criado no Supabase (região São Paulo). O **SQL está pronto** em `supabase/migrations/20261103_base_privada_lectio.sql`, mas **ainda não foi aplicado**: o Supabase pediu uma confirmação do dono que ficou sem resposta.
- **Depois de aplicar:** telas de cadastro/login, sincronização (o aparelho continua funcionando offline e sincroniza depois), e **teste com duas contas** provando que uma não enxerga a outra.

## 8. Ideias futuras — comunidade (a pensar com cuidado)
Desejos do criador: competições, grupos, amizades, missões em conjunto, XP, brincadeiras.

**Regras propostas para não ferir a privacidade nem o espírito da oração:**
- Grupo vê **só números** (dias rezados, medalhas, XP), **nunca** o que a pessoa falou ou escreveu.
- **Participar é opcional**, e cada um escolhe o que mostrar.
- **Missões em conjunto antes de ranking**, por exemplo: "o grupo todo reza 100 dias nesta semana". Ranking de "quem lê mais" pode virar pressão ou vaidade, então seria opcional e leve.
- **Grupos por convite** (código), para ninguém de fora entrar.
- Possíveis: placar de grupo por semana, tempo total de oração, "amigos de oração" (seguir alguém), desafios quinzenais, selos de grupo, pedidos de oração (com cuidado, por ser conteúdo sensível e sempre opt-in).
- Tabelas futuras: grupos, membros, eventos de pontos, convites, missões de grupo.
- **Pergunta ética aberta:** como medir "tempo" sem incentivar rezar rápido ou por pontuação?

## 9. Ideias futuras — oração e conteúdo
- **Comparar a evolução semana a semana:** resumo que mostra temas que se repetem, mudanças de sentimento, frutos. Sem dar nota nem julgar.
- **Reflexões ligadas a versículos reais:** a IA sugere **referências**, e o servidor busca o texto numa fonte confiável antes de mostrar (evitar citação inventada).
- **Fonte bíblica:** comparar *A Bíblia Digital API* e *Bolls Bible API*. Atenção: o livro cita Eclesiástico e Sabedoria, que muitas APIs gratuitas (protestantes) não trazem. Traduções católicas modernas (Ave-Maria, CNBB, Jerusalém) têm direitos autorais. Pe. Antônio Pereira de Figueiredo é domínio público, mas antigo.
- **MCP de texto bíblico verificado** (`bible-mcp.faith.tools`): avaliar antes de adicionar (traduções, licença, o que acessa).
- **Transcrição melhor** por Whisper numa função de servidor (chave só no servidor). Alternativa gratuita: ditado do navegador (precisa de internet).
- **Gravar o áudio** e apagar logo após transcrever (opção de privacidade).
- **Mais quizzes** conforme entrarem as semanas; quiz relâmpago no começo do dia.
- **Mais medalhas** (por semana temática, por livro).
- **Lembretes** nas horas do dia (Laudes/Vésperas/Completas), opcionais.
- **Outros livros e estudos bíblicos** além do Enchei-vos (o criador quer adicionar depois).
- **Projeto de Vida Pessoal** (parte final do livro), com formato diferente.
- **Guia para os irmãos:** passo a passo de como criar a própria chave gratuita de IA em 2 minutos.
- **Aplicativo nativo** (loja) como etapa posterior; antes, instalar o PWA na tela inicial.

## 10. Stack e serviços
- **Front:** HTML/CSS/JS puro (PWA offline) dentro de um projeto **Next.js 15.5**, publicado na **Vercel**.
- **Dados (futuro):** **Supabase** (Postgres + Auth + RLS).
- **IA gratuita:** **Google Gemini** com chave de cada usuário (organização das ideias). Fallback local sem IA.
- **Voz para texto:** ditado do navegador (hoje) → Whisper no servidor (futuro).
- **Ferramentas de trabalho com IA instaladas:** 283 agentes de design/UX/frontend, skills (frontend-design, ui-ux-pro-max, web-design-guidelines, vercel-react-best-practices, supabase-postgres-best-practices, context7, find-skills) e **Impeccable** (crítica de design).
- **Pendências de publicação:** o site está em `estudo-biblico-shalom.vercel.app`. A Vercel bloqueou uma versão antiga do Next.js, já atualizada. O v0 não estava puxando o GitHub, então a publicação foi feita pelo painel normal da Vercel.

## 11. Roadmap sugerido (para discutir)
| Fase | Objetivo | Principais entregas |
|---|---|---|
| **0 · Agora** | Uso pessoal sólido | Conteúdo até onde houver; testar ditado no celular; backup |
| **1 · Contas** | Privacidade e sincronização | Aplicar banco; login; sync; apagar meus dados; aviso LGPD |
| **2 · Grupo de oração** | Entregar aos irmãos | Guia da chave de IA; convite por código; missões em conjunto leves |
| **3 · Evolução** | Valor da IA | Comparação semanal; reflexões com versículos reais; Whisper |
| **4 · Comunidade** | Vários grupos | Grupos, placares opt-in, desafios, lembretes |
| **5 · Expansão** | Mais conteúdo e alcance | Semanas 8–17 e Projeto de Vida; outros livros; app nativo |

## 12. Perguntas em aberto (para o Claude me ajudar a decidir)
1. Como **priorizar** entre completar o conteúdo (semanas 7–17), contas/login e comunidade?
2. O que **significa evolução na fé** de forma respeitosa? Que sinais a IA pode resumir sem julgar nem dar "nota"?
3. Como desenhar **competição sem vaidade**? O que medir (dias, constância, tempo) e o que nunca medir?
4. **Grupos:** quem administra? Como entrar, sair, silenciar, apagar? Há papel de "líder do grupo"? O que o líder pode ver (só contagens?)?
5. **Privacidade:** onde fica o limite entre o que o grupo vê e o que é só da pessoa? Menores de idade? Consentimento e LGPD para um grupo de igreja?
6. **IA e chave própria:** a barreira de criar chave é alta para pessoas leigas. Existe um caminho melhor sem custo (por exemplo, o criador paga uma cota compartilhada com limites)?
7. **Direitos autorais:** o *Enchei-vos* e as traduções católicas têm direitos. Como o app pode ajudar sem reproduzir o livro? Vale pedir autorização à editora/Comunidade para uso do conteúdo e uma versão oficial?
8. **Quizzes:** quem cria e revisa as perguntas para o conteúdo ficar fiel à doutrina?
9. **Medir sucesso** no grupo de oração: o que significaria "deu certo" para passar ao próximo grupo?
10. Modelo de **manutenção**: quem cuida do app se crescer para o centro de evangelização inteiro?

## 13. Restrições e cuidados
- Não copiar trechos do livro nem de traduções com direitos autorais.
- Nunca guardar a chave de IA de ninguém no servidor.
- Nunca mostrar o conteúdo das orações a outras pessoas.
- A IA nunca afirma falar em nome de Deus.
- O criador usa o celular e muitas vezes não terá acesso ao computador: tudo precisa ser operável pelo celular.

## 14. Endereços e referências do projeto
- Repositório: `github.com/miguelguiul1/estudo-biblico` (branch `main`).
- Site: `estudo-biblico-shalom.vercel.app`.
- Supabase: projeto `lectio-enchei-vos` (região São Paulo; banco ainda sem tabelas).
- Arquivos úteis no repositório: `public/data/encheivos.json` (estrutura do conteúdo), `public/data/quiz.json` (perguntas), `supabase/migrations/` (SQL do banco), `docs/IDEIAS-DO-APP.md` (este arquivo).
