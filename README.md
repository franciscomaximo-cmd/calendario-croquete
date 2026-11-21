# Quando nos juntamos

Calendário partilhado para o grupo marcar, em cada dia da semana (segunda a domingo), se está **Livre**, **Talvez** ou **Ocupado**. No topo dá para escolher ver a semana toda ou só os fins de semana (sexta a domingo). Sem contas: cada pessoa escreve o nome e o browser lembra-se dela.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `index.html` | A página |
| `style.css` | Aspeto (claro/escuro automático) |
| `app.js` | Lógica, leitura/escrita no Supabase e tempo real |
| `config.js` | URL e chave pública do teu projeto Supabase |
| `supabase.sql` | Tabelas e permissões a criar no Supabase |
| `admin.html`, `admin.js` | Página de admin (login, mudar nomes, juntar e apagar pessoas) |
| `admin.sql` | Permissões do admin e função de juntar pessoas (correr depois do `supabase.sql`) |

## 1. Criar a base de dados (Supabase, grátis)

1. Cria conta em <https://supabase.com> → **New project** (região: Europe West).
2. **SQL Editor → New query**, cola o conteúdo de `supabase.sql` e carrega em **Run**.
3. **Project Settings → API**: copia o **Project URL** e a **anon public key** para `config.js`.

## 2. Testar no VS Code

Abre a pasta no VS Code, instala a extensão **Live Server** e faz clique direito em `index.html` → **Open with Live Server**. Abre a página em duas janelas e confirma que o que marcas numa aparece na outra.

## 3. Pôr online

**Render (Static Site)**
1. Põe a pasta num repositório GitHub.
2. Render → **New → Static Site** → escolhe o repositório.
3. Build command: vazio · Publish directory: `.`
4. Partilha o link `https://….onrender.com` com o grupo.

(Também funciona em GitHub Pages, Netlify ou Vercel sem alterações.)

## 4. Admin (opcional)

Para mudar nomes, juntar pessoas repetidas e apagar pessoas. Segue as instruções no topo de `admin.sql` (criar o teu utilizador, desligar registos, pôr o teu email) e corre-o no **SQL Editor**. Depois abre `/admin.html` e entra com o email e a password que criaste. Lá dentro podes mudar a password; no login há "Esqueci-me da password", que manda uma ligação para `https://calendario-croquete.onrender.com/admin.html`. Para isso funcionar, em **Authentication → URL Configuration** o Site URL tem de ser `https://calendario-croquete.onrender.com` e esse endereço do `admin.html` tem de estar nas **Redirect URLs**. A anon key do site continua sem poder apagar pessoas, e a página de admin usa só essa chave pública: o que o admin pode fazer decide-se no Supabase.

## Notas

- Quem tiver o link pode marcar e editar. Para um grupo de amigos chega; não partilhes o link publicamente.
- Se alguém mudar de telemóvel/browser, a página pergunta "Quem és tu?" com os nomes do grupo (ou usa "Já marcaste noutro dispositivo?" para voltar ao seu nome).
- As semanas passadas deixam de aparecer e os dias já passados da semana atual ficam esbatidos e sem botões; as marcações antigas ficam na tabela e podem ser apagadas no Supabase quando quiseres.