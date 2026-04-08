-- Tabela de Usuários para Login e Segurança
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'membro'
);

-- Criar tabela de colunas
CREATE TABLE IF NOT EXISTS columns (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    col_order INTEGER NOT NULL
);

-- Criar tabela de cards vinculados às colunas
CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(50) PRIMARY KEY,
    column_id VARCHAR(50) REFERENCES columns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    labels JSONB DEFAULT '[]'::jsonb,
    members JSONB DEFAULT '[]'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    files JSONB DEFAULT '[]'::jsonb,
    visible_workspaces JSONB DEFAULT '[]'::jsonb,
    comments_count INTEGER DEFAULT 0,
    attachments_count INTEGER DEFAULT 0,
    card_order INTEGER NOT NULL,
    platform VARCHAR(50),
    post_date VARCHAR(50),
    workspace_id VARCHAR(50) DEFAULT 'igreja',
    assignee VARCHAR(100)
);

-- Configurações Globais (Primary Color)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY,
    primary_color VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 100
);

-- Inserir dados mockados base para testes no primeiro deploy
INSERT INTO columns (id, title, col_order) VALUES
('col-1', 'Backlog / Pedidos', 1),
('col-2', 'To Do (Fazer)', 2),
('col-3', 'In Progress (Fazendo)', 3),
('col-4', 'Aprovação', 4),
('col-5', 'Concluído', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cards (id, column_id, title, labels, comments_count, attachments_count, card_order) VALUES
('card-1', 'col-1', 'Aprovar Arte - Culto Vida', '[{"text": "Design", "color": "purple"}]', 2, 1, 1),
('card-2', 'col-1', 'Fazer orçamento de câmeras', '[{"text": "Financeiro", "color": "yellow"}]', 0, 0, 2),
('card-3', 'col-2', 'Roteiro Vídeo Juventude', '[{"text": "Copy", "color": "blue"}]', 5, 2, 1),
('card-4', 'col-3', 'Tratamento de fotos do Batismo', '[{"text": "Mídia", "color": "green"}, {"text": "Urgente", "color": "red"}]', 1, 15, 1),
('card-5', 'col-5', 'Post Carrossel Ceia', '[{"text": "Design", "color": "purple"}]', 1, 1, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_settings (id, primary_color) VALUES (1, '#4F46E5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, name, priority) VALUES
('lagoinhaalphaville.sp', 'Lagoinha Alphaville Principal', 1),
('heroalphaville', 'Hero Alphaville', 2),
('shinealphaville', 'Shine Alphaville', 3)
ON CONFLICT (id) DO NOTHING;
