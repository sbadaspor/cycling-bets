# 🚴 VeloApostas — Sistema de Apostas de Ciclismo

Sistema de apostas de ciclismo entre amigos. Gere previsões de Top-20, classificações especiais (camisolas) e calcula pontos automaticamente quando o resultado real é inserido.

---

## ✨ Funcionalidades

- **Dashboard** com leaderboard geral e histórico de apostas
- **Formulário de aposta** — 20 ciclistas ordenados + 3 camisolas
- **Painel Admin** — inserir resultados reais e calcular pontos automaticamente
- **Autenticação** com Supabase Auth (email + palavra-passe)
- **Leaderboard por prova** com critérios de desempate detalhados

---

## 🧮 Lógica de Pontuação

| Situação | Pontos |
|---|---|
| Ciclista apostado Top-10 → terminou Top-10 real | **3 pts** |
| Ciclista apostado Top-20 (11-20) → terminou Top-20 real (11-20) | **2 pts** |
| Ciclista apostado Top-20 (11-20) → terminou Top-10 real | **1 pt** |
| Ciclista apostado Top-10 → terminou Top-20 real (11-20) | **0 pts** |
| Camisola (Sprint / Montanha / Juventude) correta | **1 pt cada** |

### Critérios de Desempate (por ordem)
1. Maior número de posições exatas (total)
2. Maior número de posições exatas no Top-10
3. Maior número de posições exatas no Top-20
4. Maior número de camisolas certas

---

## 🗂️ Estrutura do Projeto

```
cycling-bets/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx              # Painel admin (protegido)
│   │   ├── apostas/
│   │   │   ├── page.tsx              # Redirect para prova aberta
│   │   │   └── [provaId]/page.tsx    # Formulário de aposta
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # Login
│   │   │   └── register/page.tsx     # Registo
│   │   ├── provas/
│   │   │   └── [provaId]/page.tsx    # Resultados de uma prova
│   │   ├── api/
│   │   │   ├── apostas/route.ts      # POST: submeter aposta
│   │   │   ├── resultados/route.ts   # POST: inserir resultado + calcular pontos
│   │   │   └── provas/route.ts       # POST/PATCH: gerir provas
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Homepage / Dashboard
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── LeaderboardTable.tsx
│   │   │   ├── ProvasList.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   └── UltimasApostas.tsx
│   │   ├── forms/
│   │   │   ├── AdminPanel.tsx
│   │   │   └── ApostaForm.tsx
│   │   └── ui/
│   │       └── Navbar.tsx
│   ├── lib/
│   │   ├── pontuacao.ts              # Motor de cálculo de pontos
│   │   ├── queries.ts                # Queries à base de dados
│   │   └── supabase/
│   │       ├── client.ts             # Cliente browser
│   │       └── server.ts             # Cliente server-side
│   └── types/
│       └── index.ts                  # Tipos TypeScript
├── supabase/
│   └── schema.sql                    # Schema SQL completo
├── .env.example
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Setup e Deploy

### 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd cycling-bets
npm install
```

### 2. Configurar Supabase

1. Cria um projeto em [supabase.com](https://supabase.com)
2. Vai a **SQL Editor** e executa todo o conteúdo de `supabase/schema.sql`
3. Em **Settings > API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
# Edita .env.local com as tuas credenciais do Supabase
```

### 4. Desenvolvimento local

```bash
npm run dev
# Abre http://localhost:3000
```

### 5. Deploy na Vercel

#### Via CLI:
```bash
npm install -g vercel
vercel
```

#### Via Dashboard:
1. Vai a [vercel.com](https://vercel.com) e importa o repositório
2. Em **Settings > Environment Variables**, adiciona:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Faz deploy — a Vercel deteta automaticamente o Next.js

---

## 👑 Configurar o Primeiro Admin

Depois de criares a tua conta através do formulário de registo, executa este SQL no Supabase:

```sql
UPDATE perfis
SET is_admin = TRUE
WHERE username = 'o_teu_username';
```

Ou diretamente pelo Table Editor do Supabase.

---

## 🔐 Segurança

- Row Level Security (RLS) ativo em todas as tabelas
- Cada utilizador só vê/edita as suas apostas
- Endpoints de admin verificam `is_admin` no servidor
- Chave de serviço nunca exposta no frontend

---

## 🛠️ Stack Técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 15 | Framework (App Router) |
| TypeScript | 5 | Tipagem |
| Tailwind CSS | 3 | Estilização |
| Supabase | 2 | Auth + PostgreSQL |
| Vercel | — | Hosting |

---

## 📋 Fluxo de Uso

```
1. Admin cria prova (status: aberta)
2. Participantes registam-se e submetem apostas
3. Admin fecha apostas (status: fechada) — opcional
4. Corrida acontece
5. Admin insere resultado real → pontos calculados automaticamente
6. Prova fica finalizada → leaderboard atualizado
```

---

## 🤝 Contribuir

Pull requests são bem-vindos. Para mudanças grandes, abre primeiro uma issue.
