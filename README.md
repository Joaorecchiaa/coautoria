# Dashboard de Coautorias

Dashboard que mostra todas as vendas com **COAUTORIA** feitas na Board Academy. Ele lê os
dados de uma planilha do Google Sheets ("Vendas Coautoria - Backlog") e, todo dia, busca
automaticamente no Pipedrive por novos negócios ganhos que tenham "COAUTORIA" no campo
**Nome Produto** ou **Bônus - Produto**, adicionando as linhas novas na planilha sozinho.

A planilha continua sendo a fonte de dados "crua" (o backlog) — vocês continuam preenchendo
manualmente as colunas **LIVRO**, **SIMONATO**, **TEMA LIVRO** e **OBS**. O app só adiciona
linha nova quando encontra uma venda nova; ele nunca mexe nas colunas que são preenchimento
manual do time, e sempre deixa `SIMONATO = "-"` numa linha nova (pendente), porque o double
-check de vocês é manual.

## O que você precisa fazer para colocar isso no ar

São 3 etapas: (1) criar uma conta de serviço no Google para o app conseguir escrever na
planilha, (2) pegar um token de API do Pipedrive, (3) subir o código no GitHub e conectar no
Vercel. Vou detalhar cada uma.

---

### Etapa 1 — Criar a conta de serviço do Google (passo a passo, do zero)

Isso é necessário porque o app precisa de uma "identidade" própria para conseguir ler e
escrever na planilha automaticamente, sem depender de você estar logado.

1. Acesse **https://console.cloud.google.com/** e faça login com a conta Google que é dona
   da planilha (`joaorocharecchia@gmail.com`).
2. Se for a primeira vez usando o Google Cloud, aceite os termos de uso.
3. No topo da página, clique no seletor de projeto (ao lado do logo "Google Cloud") →
   **"Novo Projeto"**. Dê um nome, por exemplo `coautoria-dashboard`, e clique em **Criar**.
   Espere alguns segundos até o projeto ser criado e selecione-o.
4. No menu lateral (ícone ☰), vá em **"APIs e serviços" → "Biblioteca"**.
5. Na busca, digite `Google Sheets API` e clique no resultado. Clique em **"Ativar"**.
6. Volte para **"APIs e serviços" → "Credenciais"**.
7. Clique em **"+ Criar credenciais"** → **"Conta de serviço"**.
8. Dê um nome, por exemplo `coautoria-sync`. Clique em **"Criar e continuar"**.
9. Nas próximas telas ("Conceder acesso" e "Conceder acesso do usuário"), não precisa
   preencher nada — clique em **"Continuar"** e depois **"Concluir"**.
10. Você verá a conta de serviço criada na lista, com um e-mail parecido com
    `coautoria-sync@coautoria-dashboard.iam.gserviceaccount.com`. **Copie esse e-mail**,
    você vai precisar dele daqui a pouco.
11. Clique na conta de serviço que você acabou de criar para abrir os detalhes dela.
12. Vá na aba **"Chaves"** → **"Adicionar chave"** → **"Criar nova chave"**.
13. Escolha o formato **JSON** e clique em **"Criar"**. Um arquivo `.json` vai ser baixado
    no seu computador automaticamente — **guarde esse arquivo, ele não pode ser baixado de
    novo depois**.

Agora você precisa compartilhar a planilha com essa conta de serviço:

14. Abra a planilha "Vendas Coautoria - Backlog" no Google Sheets:
    https://docs.google.com/spreadsheets/d/1yxQ3B9BTJPHHrcI6pkePV6PcyL0El11psv6WeS4xWA0/edit
15. Clique em **"Compartilhar"** (canto superior direito).
16. Cole o e-mail da conta de serviço (do passo 10) e defina a permissão como **"Editor"**.
    Clique em **"Enviar"** (pode desmarcar "Notificar pessoas", já que é uma conta de
    serviço, não uma pessoa).

Abra o arquivo `.json` que você baixou no passo 13 num editor de texto. Você vai usar dois
campos dele na Etapa 3:

- `client_email` → vai virar a variável `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → vai virar a variável `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (copie o valor
  inteiro, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)

⚠️ **Nunca suba esse arquivo `.json` para o GitHub.** Ele dá acesso de escrita à planilha.
Use-o só para configurar as variáveis de ambiente no Vercel (Etapa 3).

---

### Etapa 2 — Token de API do Pipedrive

1. No Pipedrive, clique no seu avatar (canto superior direito) → **"Configurações
   pessoais"**.
2. Vá em **"API"** no menu lateral.
3. Copie o **"Seu token de API pessoal"**. Isso vai virar a variável
   `PIPEDRIVE_API_TOKEN` na Etapa 3.

---

### Etapa 3 — Subir no GitHub e publicar no Vercel

1. Crie um repositório novo no GitHub (pode ser privado) e suba todos os arquivos desta
   pasta para ele (exceto `node_modules`, que não deve ir).
2. Acesse **https://vercel.com**, faça login (dá pra usar sua conta do GitHub) e clique em
   **"Add New..." → "Project"**.
3. Selecione o repositório que você acabou de criar e clique em **"Import"**.
4. Antes de clicar em "Deploy", abra a seção **"Environment Variables"** e adicione, uma por
   uma (veja `.env.example` para o formato de cada uma):

   | Nome | Valor |
   |---|---|
   | `PIPEDRIVE_API_TOKEN` | o token que você copiou na Etapa 2 |
   | `PIPEDRIVE_DOMAIN` | `boardacademy` |
   | `GOOGLE_SHEET_ID` | `1yxQ3B9BTJPHHrcI6pkePV6PcyL0El11psv6WeS4xWA0` |
   | `GOOGLE_SHEET_TAB` | `Planilha1` |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | o `client_email` do JSON (Etapa 1) |
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | o `private_key` do JSON, valor completo entre aspas |
   | `CRON_SECRET` | qualquer texto aleatório (ex: gere em https://generate-secret.vercel.app/32) |

   Dica para a `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: cole o valor exatamente como está no
   JSON (com as sequências `\n` no meio do texto) — o código já sabe converter isso para
   quebras de linha de verdade.

5. Clique em **"Deploy"**. Depois de alguns minutos o Vercel te dá uma URL (algo como
   `coautoria-dashboard.vercel.app`) — esse é o link do dashboard que você pode compartilhar
   com o time.

O arquivo `vercel.json` já configura o Vercel Cron para rodar a sincronização todo dia às
9h (horário de Brasília). O Vercel automaticamente protege essa chamada com o valor de
`CRON_SECRET` que você configurou — não precisa fazer mais nada.

### Testar a sincronização manualmente

Depois do deploy, você pode forçar uma sincronização manual (sem esperar o cron) acessando,
num navegador ou via `curl`:

```
https://SEU-PROJETO.vercel.app/api/sync
```

com o cabeçalho `Authorization: Bearer SEU_CRON_SECRET`. Por exemplo:

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-PROJETO.vercel.app/api/sync
```

A resposta mostra quantos candidatos foram encontrados no Pipedrive, quantos já existiam na
planilha e quantos foram adicionados.

---

## Estrutura do projeto

```
app/
  page.tsx            → dashboard (lê a planilha e mostra os gráficos/tabela)
  api/sync/route.ts    → rota chamada pelo cron diário, busca no Pipedrive e escreve no Sheets
  layout.tsx, globals.css
components/
  StatCard.tsx          → cartões de KPI (total de vendas, valor total, pendências)
  RankingChart.tsx       → gráfico de barras (por closer / por squad)
  TimelineChart.tsx       → evolução mensal
  DealsTable.tsx           → tabela completa, com busca e filtro de pendentes
lib/
  pipedrive.ts             → chamadas à API do Pipedrive
  sheets.ts                  → leitura/escrita no Google Sheets
  metrics.ts                  → cálculo dos números do dashboard
```

## Regras de negócio implementadas

- Um negócio ganho ("won") entra na planilha se tiver "COAUTORIA" no campo **Nome Produto**
  ou no campo **Bônus - Produto**.
- A coluna **F (Entregáveis)** sempre recebe o texto exato do campo **Nome Produto** —
  mesmo quando "COAUTORIA" só apareceu no Bônus - Produto.
- Negócios já presentes na planilha (identificados pelo link na coluna **H**) não são
  duplicados.
- Linhas novas sempre entram com `SIMONATO = "-"` (pendente) e `LIVRO`, `TEMA LIVRO`, `OBS`
  em branco — esses campos continuam sendo preenchidos manualmente pelo time como parte do
  double-check.
- **SQUAD** = nome do funil (pipeline) do negócio no Pipedrive.
- **CLOSER** = nome do dono (`owner_id`) do negócio.
