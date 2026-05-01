# 🏛️ Templum - Plataforma de Gestão de Projetos para Agência

**Templum** é um sistema completo "Software as a Service" (SaaS) no formato Kanban, construído sob medida para suportar o gerenciamento editorial, fluxos de trabalho e equipes de uma Agência, lidando com múltiplas subcontas (Workspaces como Igreja Principal, Juventude, Kids, etc).

---

## 🛠️ Stack Tecnológico

O projeto foi deliberadamente construído sem frameworks pesados no Frontend visando performance insana e peso levíssimo.

* **Frontend:** HTML5, CSS3 (Vanilla + Variáveis Nativas), JavaScript Puro (Vanilla JS).
* **Backend:** Node.js com motor Express.js.
* **Banco de Dados:** PostgreSQL (Relacional estruturado).
* **Deploy/Container:** Docker via Easypanel.
* **Segurança:** Autenticação por JSON Web Tokens (JWT) e senhas hasheadas utilizando o algoritmo `bcryptjs`.

---

## ✨ Novas Funcionalidades (Últimas Atualizações)

### 📊 Relatórios com Filtros
- Relatório por **Etiquetas** - filtra por tipo de etiqueta e conta
- Relatório por **Tipo de Demanda** - filtra por tipo (Carrossel, Reels, Story, etc) e conta
--visualização de quantas demandas de cada tipo foram feitas por conta

### 🎯 Tipos de Demanda
- Criação de tipos de demanda (Carrossel, Reels, Story, Post, Vídeo, etc)
- Gerenciamento na página de configurações do Master
- Seleção de tipo na criação e edição de demandas
- Exibição do tipo no card (badge colorido)

### 📸 Produção de Fotos (Novo Kanban)
- Board separado para demandas de foto
- Colunas: Pedidos de Foto → Pauta de Produção → Em Produção → Revisão → Finalizado
-_LINK com o board Editorial: solicitação de foto a partir de uma demanda

### 🎬 Produção de Vídeos (Novo Kanban)
- Board separado para demandas de vídeo
- Colunas: Pedidos de Vídeo → Pauta de Produção → Em Produção → Revisão → Finalizado
-_LINK com o board Editorial: solicitação de vídeo a partir de uma demanda

### 👤 Minha Mesa
- Exibe demandas atribuídas ao usuário (por email, nome ou membros)
- Exibe demandas criadas pelo usuário
- Clique no card abre o modal de edição/visualização

### 🔐 Login
- Logo personalizado carregado das configurações do sistema
- Suporte a logo claro (light mode)
- Design moderno com gradiente

---

## 📂 Arquitetura de Pastas e Rotas de Arquivos

Toda a lógica e os pilares de informações da plataforma estão organizados da seguinte maneira no diretório principal:

### 1. Motor Central (Servidor & Banco de Dados)
* **`server.js`**: O "cérebro" de todo o sistema. Nele roda o micro-serviço do Express, conexões com o PostgreSQL (`pg`), proteção de Rotas via Middleware e validações.
  * **Auto-Migrations:** No início do `server.js`, ele invoca blocos de `ALTER TABLE` automaticamente caso o banco recém-montado precise das tabelas. Portanto, ele se auto-corrige e não precisa de scripts ORM (como Prisma/Sequelize).
  * **Configurações de Ambiente:** Ele busca e exige as senhas pelas variáveis `.env` ou de hospedagem (Easypanel).

### 2. Módulos JavaScript (Frontend)
* **`js/state.js`**: Gerenciamento de estado global (workspaces ativos, categoria do board)
* **`js/utils.js`**: Funções utilitárias (formatação de datas, escape de HTML)
* **`js/api.js`**: Chamadas à API (sync de usuário, carregar sugestões de membros, labels)
* **`js/ui.js`**: Renderização de elementos de UI (seletor de workspaces)
* **`js/board.js`**: Renderização do Kanban, Drag-and-Drop, criação de cards
* **`js/modal.js`**: Modal de edição de cards, solicitação de design/foto/vídeo

### 3. Interface Visual Nativa (Telas HTML)
Todas as telas compartilham a mesma tag de `style.css` com variáveis de Thema Escuro (Dark Mode).
* **`login.html`**: Página de login com logo personalizado carregado das configurações
* **`index.html`**: Painel Kanban Master com suporte a múltiplas categorias (editorial, design, photo, video)
* **`mesa.html`**: "Minha Mesa" - tarefas atribuídas ao usuário logado
* **`calendario.html`**: Visualização mensal das postagens por workspace
* **`postados.html`**: Checklist de postagem - marcar demandas como publicadas
* **`captacoes.html`**: Agendamento de captações (filmagens)
* **`etiquetas.html`**: Gerenciamento de etiquetas padrão reutilizáveis
* **`usuarios.html`**: Gestão de usuários e permissões (RH Digital)
* **`gestao.html`**: Relatórios com filtros por etiquetas e tipos de demanda
* **`admin-settings.html`**: Configurações master - workspaces, etiquetas, tipos de demanda, logos
* **`minha-conta.html`**: Edição de perfil do usuário

---

## 🗄️ Estrutura do Banco de Dados (PostgreSQL)

### Tabelas Principais:

1. **`workspaces`**: IDs virtuais de agrupamento de clientes (Ex: `lagoinhaalphaville`). Tudo gravado no software pertence a um workspace e cada conta possui `priority` para ordenar sua exibição no sistema.

2. **`users`**: O painel de RH com Roles (Permissões: `master`, `gestor`, `membro`). Campos: `id`, `name`, `email`, `password_hash`, `role`.

3. **`columns`**: Entidade coluna Kanban contendo arrays de posicionamento (`col_order`), que recebem cards. Campo `category` define o tipo de board (editorial, design, photo, video).

4. **`cards`**: O ticket operacional em si, armazenando:
   - `title`, `description`
   - `labels` (JSON array de etiquetas)
   - `members` (JSON array de membros)
   - `checklist` (JSON array de itens)
   - `comments` (JSON array)
   - `images`, `files` (JSON arrays)
   - `visible_workspaces`
   - `post_date`, `post_time`
   - `platform` (instagram, tiktok, youtube, facebook)
   - `assignee` (atribuído para)
   - `demand_type` (tipo de demanda: Carrossel, Reels, etc)
   - `created_by` (quem criou)
   - `design_column_id` (link para board de design)
   - `photo_column_id` (link para board de fotos)
   - `video_column_id` (link para board de vídeos)

5. **`label_presets`**: Etiquetas padrão reutilizáveis (id, name, color)

6. **`demand_types`**: Tipos de demanda (id, name, icon, color)

7. **`system_settings`**: Configurações globais (primary_color, logo_light, logo_dark, tv_access_code)

---

## 🛡️ Configuração do Servidor e Variáveis Ambientais (Deploy)

Para operar o Templum localmente ou rodar em serviços de Hospedagem (AWS, Easypanel, Heroku, Render), o `Node.js` exige no sistema três informações simples (Variáveis `.env` ocultas).

```env
DATABASE_URL="postgres://usuario:senha@ip_do_banco:5432/nomebank"
JWT_SECRET="chave_super_oculta_da_agencia_cripto"
PORT=3000   // (A porta onde ele rodará; ou 80 nos containers)
```

**Como Iniciar via Terminal:**
1. Instale as pastas e pacotes baixando com: `npm install`
2. Ative o Motor do Servidor de Node e espere ele compilar: `node server.js`
3. Entre em sua máquina em `http://localhost:3000` ou no seu domínio do Easypanel. Se o banco pingar sucesso, o terminal retornará *"[TEMPLUM] Database schema e tabelas conectadas!"*.

---

## 🚀 Fluxo de Publicação (Git Push & Easypanel)

O ciclo de vida do servidor de produção é **totalmente automatizado**. A plataforma Templum está hospedada e vigiada pela esteira CI/CD conectada ao repositório central. Então, para subir modificações ou correções de código:

1. **Testou e Funcionou?** Abra o terminal dentro da pasta `templum`.
2. Adicione os arquivos mexidos na fila:
   ```bash
   git add .
   ```
3. Assine as mudanças com uma mensagem clara:
   ```bash
   git commit -m "feat: descreva as melhorias aqui"
   ```
4. **Envie para a Nuvem de Produção:**
   ```bash
   git push origin main
   ```
> **Nota de Manutenção:** Ao fazer o `Push` da `main` para o servidor GitHub, o Servidor do Easypanel detectará instantaneamente a nova versão, montará o Container do Docker em background e resetará os servidores node silenciosamente sem intervenção manual necessária. Caso precise rever os logs de deploy, acesso o painel de nuvem na aba *Deployments* do Templum-App.

---

## 🪪 Manual de Cargos e Operação de Vínculos 

Quem assumir este código notará que a plataforma utiliza o **"AuthGuard"** (Vide Função Middleware em `server.js` nas primeiras 50 linhas).
Ele valida a expiração do token e também amarra as Roles baseadas no `req.user.role`.
* A tag `Membro` concede acesso básico (apenas ver, mover card).
* As tags `Gestor` / `Master` abrem os acessos das áreas Admin Settings/Usuários, possibilitando registrar novas contas e destruir antigas.

Qualquer manutenção referente a bloquear acessos numa certa rota REST deve ser feita passando o AuthGuard dentro do `app.post('/api/...', authGuard(['master']))`.

---

## ⚠️ Política de Documentação Contínua

**ATENÇÃO DESENVOLVEDORES E EDITORES**: 
A sobrevivência técnica deste ecossistema depende da clareza das informações. **Sempre que você realizar uma alteração importante na arquitetura, adicionar uma nova variável, criar uma nova funcionalidade ou mudar lógicas de acesso, VOCÊ DEVE atualizar este arquivo `README.md`**.

Manter este documento sempre sincronizado com as regras do sistema garante que a próxima pessoa que assumir ou ler o código não fique cega.

---

*Este é o documento vivo do Ecossistema Interno Templum. Mantenha os estilos em `style.css` baseados em "CSS Variables" para preservar o Auto-Dark/Light Mode Premium criado no projeto.*