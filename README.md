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

## 📂 Arquitetura de Pastas e Rotas de Arquivos

Toda a lógica e os pilares de informações da plataforma estão organizados da seguinte maneira no diretório principal:

### 1. Motor Central (Servidor & Banco de Dados)
* **`server.js`**: O "cérebro" de todo o sistema. Nele roda o micro-serviço do Express, conexões com o PostgreSQL (`pg`), proteção de Rotas via Middleware e validações.
  * **Auto-Migrations:** No início do `server.js`, ele invoca blocos de `ALTER TABLE` automaticamente caso o banco recém-montado precise das tabelas. Portanto, ele se auto-corrige e não precisa de scripts ORM (como Prisma/Sequelize).
  * **Configurações de Ambiente:** Ele busca e exige as senhas pelas variáveis `.env` ou de hospedagem (Easypanel).

### 2. Lógica Visual de Tela (Frontend Scripts)
* **`script.js`**: O motor vital do lado do usuário que roda no navegador.
  * Captura do ID de Workspace via localStorage.
  * Disparos das famosas requisições HTTP (`fetch()`) mandando `Bearer Token` para buscar colunas e usuários.
  * Sistema completo de Drag-and-Drop (DND) dos cards da tabela.
  * Modais, menus esquerdo em tempo-real, edicao/exclusao direta de cards e persistencia de descricao, membros, etiquetas, checklist e comentarios no modal principal.

### 3. Interface Visual Nativa (Telas HTML)
Todas as telas compartilham a mesma tag de `style.css` com variáveis de Thema Escuro (Dark Mode).
* **`login.html`**: Recebe o Form de senha. Dispara a API `/api/login` e se tiver sucesso salva o Token no `localStorage` do navegador do cliente.
* **`index.html`**: Painel Kanban Mestre onde a operação acontece ("cards", "tags", "colunas") e onde o modal permite editar, apagar e manter a estrutura interna do card (descricao, membros, etiquetas, checklist e comentarios).
* **`mesa.html`**: A "Minha Mesa". Interface tipo Dashboard Pessoal que filtra apenas as tarefas de quem tá "logado" na tela.
* **`calendario.html`**: Painel Editorial. Puxa a "post_date" de todos os cards da agência e monta uma grade mensal.
* **`usuarios.html`**: O "RH Digital". Tela focada na aba de Gestão de Permissões. Traz a API para criar acessos, remover cargos e listar funcionários.
* **`gestao.html`**: Relatórios de entrega de cards em pizza/estatísticas.
* **`admin-settings.html`**: Espaço de configurações mestre operacionais, onde hoje os diretores podem Injetar Novos Workspaces (Novas filiais de igrejas) no banco de dados.

---

## 🗄️ Estrutura do Banco de Dados (PostgreSQL)

Para quem for dar engenharia ou manutenção ao SQL contido no `server.js`, existem as tabelas fundamentais e interligadas:

1. **Table `workspaces`**: IDs virtuais de agrupamento de clientes (Ex: `lagoinhaalphaville`). Tudo gravado no software pertence a um workspace.
2. **Table `users`**: O painel de RH com Roles (Permissões: `master`, `gestor`, `membro`). Protegidos via check na rota `/api/users`.
3. **Table `columns`**: A entidade coluna Kanban contendo arrays de posicionamento (Ordem 1, 2, 3), que recebem cards.
4. **Table `cards`**: O ticket operacional em si, armazenando `title`, `description`, tags coloridas (JSON array), `members`, `checklist`, `comments`, datas, plataformas e o foreign id do Workspace. 

---

## 🛡️ Configuração do Servidor e Váriaveis Ambientais (Deploy)

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
> **Nota de Manutenção:** Ao fazer o `Push` da `main` para o servidor GitHub, o Servidor do Easypanel detectará instantaneamente a nova versão, montará o Container do Docker em background e resetará os servidores node silenciosamente sem intervenção manual necessária. Caso precise rever os logs de deploy, acesse o painel de nuvem na aba *Deployments* do Templum-App.

---

## 🪪 Manual de Cargos e Operação de Vínculos 

Quem assumir este código notará que a plataforma utiliza o **"AuthGuard"** (Vide Função Middleware em `server.js` nas primeiras 50 linhas).
Ele valida a expiração do token e também amarra as Roles baseadas no `req.user.role`.
* A tag `Membro` concede acesso basico (apenas ver, mover card).
* As tags `Gestor` / `Master` abrem os acessos das áreas Admin Settings/Usuários, possibilitando registrar novas contas e destruir antigas.

Qualquer manutenção referente a bloquear acessos numa certa rota REST deve ser feita passando o AuthGuard dentro do `app.post('/api/...', authGuard(['master']))`.

---

## ⚠️ Política de Documentação Contínua

**ATENÇÃO DESENVOLVEDORES E EDITORES**: 
A sobrevivência técnica deste ecossistema depende da clareza das informações. **Sempre que você realizar uma alteração importante na arquitetura, adicionar uma nova variável, criar uma nova funcionalidade ou mudar lógicas de acesso, VOCÊ DEVE atualizar este arquivo `README.md`**.

Manter este documento sempre sincronizado com as regras do sistema garante que a próxima pessoa que assumir ou ler o código não fique cega.

---
*Este é o documento vivo do Ecossistema Interno Templum. Mantenha os estilos em `style.css` baseados em "CSS Variables" para preservar o Auto-Dark/Light Mode Premium criado no projeto.*
