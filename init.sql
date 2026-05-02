-- Tabela de Usuários para Login e Segurança
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'membro'
);

-- Criar tabela de colunas
CREATE TABLE IF NOT EXISTS columns (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    col_order INTEGER NOT NULL,
    category VARCHAR(50) DEFAULT 'editorial'
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
    post_time VARCHAR(10),
    recurrence_type VARCHAR(20) DEFAULT 'none',
    workspace_id VARCHAR(50) DEFAULT 'igreja',
    assignee VARCHAR(100),
    category VARCHAR(50) DEFAULT 'editorial',
    parent_id VARCHAR(50) REFERENCES cards(id) ON DELETE SET NULL,
    created_by VARCHAR(255),
    demand_type VARCHAR(100),
    photo_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL,
    video_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL
);

-- Configurações Globais (Primary Color)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY,
    primary_color VARCHAR(10) NOT NULL,
    tv_access_code VARCHAR(4) DEFAULT '0000'
);

CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 100
);

CREATE TABLE IF NOT EXISTS label_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demand_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'fa-tag',
    color VARCHAR(50) DEFAULT '#6b7280',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados mockados base para testes no primeiro deploy
INSERT INTO columns (id, title, col_order, category) VALUES
('col-1', 'Backlog / Pedidos', 1, 'editorial'),
('col-2', 'To Do (Fazer)', 2, 'editorial'),
('col-3', 'In Progress (Fazendo)', 3, 'editorial'),
('col-4', 'Aprovação', 4, 'editorial'),
('col-5', 'Concluído', 5, 'editorial'),
('col-6', 'Postados', 6, 'editorial'),
-- Colunas do Setor de Design
('design-1', 'Pedidos de Arte', 1, 'design'),
('design-2', 'Pauta Design', 2, 'design'),
('design-3', 'Em Produção', 3, 'design'),
('design-4', 'Aprovação Arte', 4, 'design'),
('design-5', 'Arte Finalizada', 5, 'design'),
-- Colunas do Setor de Foto
('photo-1', 'Pedidos de Foto', 1, 'photo'),
('photo-2', 'Pauta de Produção', 2, 'photo'),
('photo-3', 'Em Produção', 3, 'photo'),
('photo-4', 'Revisão', 4, 'photo'),
('photo-5', 'Finalizado', 5, 'photo'),
-- Colunas do Setor de Vídeo
('video-1', 'Pedidos de Vídeo', 1, 'video'),
('video-2', 'Pauta de Produção', 2, 'video'),
('video-3', 'Em Produção', 3, 'video'),
('video-4', 'Revisão', 4, 'video'),
('video-5', 'Finalizado', 5, 'video'),
-- Colunas do Setor de Gestão Interna
('gestao-1', 'A Fazer', 1, 'gestao'),
('gestao-2', 'Em Andamento', 2, 'gestao'),
('gestao-3', 'Concluído', 3, 'gestao')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_settings (id, primary_color, tv_access_code) VALUES (1, '#4F46E5', '0000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, name, priority) VALUES
('lagoinhaalphaville.sp', 'Lagoinha Alphaville Principal', 1),
('heroalphaville', 'Hero Alphaville', 2),
('shinealphaville', 'Shine Alphaville', 3)
ON CONFLICT (id) DO NOTHING;
