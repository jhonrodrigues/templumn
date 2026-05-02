require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'templum-super-secret-key-agencia';

function generateFourDigitCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function addRecurringDate(baseDate, recurrenceType) {
    const [year, month, day] = (baseDate || '').split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (recurrenceType === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
    if (recurrenceType === 'monthly') date.setUTCMonth(date.getUTCMonth() + 1);
    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getUTCDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
}

function normalizeRecurrenceType(value) {
    const normalized = String(value || 'none').trim().toLowerCase();
    if (normalized === 'weekly' || normalized === 'semanal') return 'weekly';
    if (normalized === 'monthly' || normalized === 'mensal') return 'monthly';
    return 'none';
}

function getSaoPauloDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}`
    };
}

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL Required in some cloud DBs (Easypanel might vary)
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_NO_SSL !== 'true' ? { rejectUnauthorized: false } : false
});

// Inicialização Automática do Banco de Dados
async function initDb() {
    try {
        console.log('[TEMPLUM] Iniciando migrações de banco de dados...');
        
        // 1. Migrações Críticas (devem vir antes do init.sql que usa estas colunas)
        try { await pool.query("ALTER TABLE columns ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'editorial';"); } catch(e){
            // Fallback para versões do PG que não suportam IF NOT EXISTS em ADD COLUMN
            try { await pool.query("ALTER TABLE columns ADD COLUMN category VARCHAR(50) DEFAULT 'editorial';"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'editorial';"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN category VARCHAR(50) DEFAULT 'editorial';"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50) REFERENCES cards(id) ON DELETE SET NULL;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN parent_id VARCHAR(50) REFERENCES cards(id) ON DELETE SET NULL;"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS platform VARCHAR(50);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN platform VARCHAR(50);"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS post_date VARCHAR(50);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN post_date VARCHAR(50);"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS post_time VARCHAR(10);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN post_time VARCHAR(10);"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) DEFAULT 'none';"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN recurrence_type VARCHAR(20) DEFAULT 'none';"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN description TEXT DEFAULT '';"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN members JSONB DEFAULT '[]'::jsonb;"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN checklist JSONB DEFAULT '[]'::jsonb;"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN images JSONB DEFAULT '[]'::jsonb;"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS visible_workspaces JSONB DEFAULT '[]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN visible_workspaces JSONB DEFAULT '[]'::jsonb;"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN files JSONB DEFAULT '[]'::jsonb;"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(50) DEFAULT 'lagoinhaalphaville.sp';"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN workspace_id VARCHAR(50) DEFAULT 'lagoinhaalphaville.sp';"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS assignee VARCHAR(100);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN assignee VARCHAR(100);"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS design_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN design_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL;"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN created_by VARCHAR(255);"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS demand_type VARCHAR(100);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN demand_type VARCHAR(100);"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS photo_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN photo_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL;"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS video_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN video_column_id VARCHAR(50) REFERENCES columns(id) ON DELETE SET NULL;"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS deadline VARCHAR(50);"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN deadline VARCHAR(50);"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"); } catch(e){
            try { await pool.query("ALTER TABLE cards ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"); } catch(e2){}
        }

        try { await pool.query("CREATE TABLE IF NOT EXISTS demand_types (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, icon VARCHAR(50) DEFAULT 'fa-tag', color VARCHAR(50) DEFAULT '#6b7280', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"); } catch(e){}

        try { await pool.query("CREATE TABLE IF NOT EXISTS user_functions (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, icon VARCHAR(50) DEFAULT 'fa-user', color VARCHAR(50) DEFAULT '#6b7280', sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"); } catch(e){}

        try { await pool.query("INSERT INTO user_functions (name, icon, color, sort_order) SELECT 'Membro', 'fa-user', '#6b7280', 1 WHERE NOT EXISTS (SELECT 1 FROM user_functions WHERE name = 'Membro');"); } catch(e){}
        try { await pool.query("INSERT INTO user_functions (name, icon, color, sort_order) SELECT 'Editor', 'fa-pen', '#10b981', 2 WHERE NOT EXISTS (SELECT 1 FROM user_functions WHERE name = 'Editor');"); } catch(e){}
        try { await pool.query("INSERT INTO user_functions (name, icon, color, sort_order) SELECT 'Designer', 'fa-palette', '#8b5cf6', 3 WHERE NOT EXISTS (SELECT 1 FROM user_functions WHERE name = 'Designer');"); } catch(e){}
        try { await pool.query("INSERT INTO user_functions (name, icon, color, sort_order) SELECT 'Social Media', 'fa-share-nodes', '#f59e0b', 4 WHERE NOT EXISTS (SELECT 1 FROM user_functions WHERE name = 'Social Media');"); } catch(e){}
        try { await pool.query("INSERT INTO user_functions (name, icon, color, sort_order) SELECT 'Videomaker', 'fa-video', '#ef4444', 5 WHERE NOT EXISTS (SELECT 1 FROM user_functions WHERE name = 'Videomaker');"); } catch(e){}
        try { await pool.query("INSERT INTO user_functions (name, icon, color, sort_order) SELECT 'Fotógrafo', 'fa-camera', '#06b6d4', 6 WHERE NOT EXISTS (SELECT 1 FROM user_functions WHERE name = 'Fotógrafo');"); } catch(e){}

        // 2. Executar init.sql para garantir estrutura base e dados iniciais
        const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
        
        // 3. Setup initial Admin Account
        const hash = await bcrypt.hash('123456', 8);
        await pool.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING', ['admin@templum.com', hash, 'master']);
        try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '';"); } catch(e){
            try { await pool.query("ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT '';"); } catch(e2){}
        }
        
        try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_boards JSONB DEFAULT '[\"editorial\", \"design\", \"photo\", \"video\", \"gestao\"]'::jsonb;"); } catch(e){
            try { await pool.query("ALTER TABLE users ADD COLUMN allowed_boards JSONB DEFAULT '[\"editorial\", \"design\", \"photo\", \"video\", \"gestao\"]'::jsonb;"); } catch(e2){}
        }

        try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS function VARCHAR(100) DEFAULT 'membro';"); } catch(e){
            try { await pool.query("ALTER TABLE users ADD COLUMN function VARCHAR(100) DEFAULT 'membro';"); } catch(e2){}
        }
        
        // 4. Garantir integridade dos dados existentes
        await pool.query("UPDATE columns SET category = 'editorial' WHERE category IS NULL");
        await pool.query("UPDATE cards SET category = 'editorial' WHERE category IS NULL");

        // 5. Criar colunas do board de Gestão Interna se não existirem
        try {
            const gestaoColsExist = await pool.query("SELECT id FROM columns WHERE category = 'gestao' LIMIT 1");
            if (gestaoColsExist.rows.length === 0) {
                await pool.query("INSERT INTO columns (id, title, col_order, category) VALUES ('gestao-1', 'A Fazer', 1, 'gestao')");
                await pool.query("INSERT INTO columns (id, title, col_order, category) VALUES ('gestao-2', 'Em Andamento', 2, 'gestao')");
                await pool.query("INSERT INTO columns (id, title, col_order, category) VALUES ('gestao-3', 'Concluído', 3, 'gestao')");
            }
        } catch (e) {}

        console.log('[TEMPLUM] Database schema e tabelas inicializados com sucesso!');
    } catch (err) {
        console.error('[TEMPLUM] Erro crítico ao inicializar tabelas:', err);
    }
}
initDb();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
// Serves default HTML/CSS/JS files
app.use(express.static(__dirname)); 

// =======================
//   SECURITY SYSTEM
// =======================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const uRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (uRes.rows.length === 0) return res.status(401).json({error: 'Usuário não encontrado. Fale com a gestão.'});
        const user = uRes.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({error: 'Senha incorreta.'});
        
        const allowedBoards = user.allowed_boards || ['editorial', 'design', 'photo', 'video', 'gestao'];
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, email: user.email, role: user.role, allowed_boards: allowedBoards });
    } catch(err) {
        res.status(500).json({error: 'Erro de validação.'});
    }
});

app.get('/api/me', authGuard, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, allowed_boards, function FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar perfil' });
    }
});

app.put('/api/me', authGuard, async (req, res) => {
    try {
        const nextEmail = (req.body.email || '').trim().toLowerCase();
        const nextPassword = (req.body.password || '').trim();
        if (!nextEmail) return res.status(400).json({ error: 'E-mail obrigatório' });

        const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [nextEmail, req.user.id]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Este e-mail já está em uso' });

        if (nextPassword) {
            const hash = await bcrypt.hash(nextPassword, 8);
            await pool.query('UPDATE users SET email = $1, password_hash = $2 WHERE id = $3', [nextEmail, hash, req.user.id]);
        } else {
            await pool.query('UPDATE users SET email = $1 WHERE id = $2', [nextEmail, req.user.id]);
        }

        const token = jwt.sign({ id: req.user.id, role: req.user.role, email: nextEmail }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, email: nextEmail, role: req.user.role });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

function authGuard(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({error: 'Token Ausente - Não Autorizado'});
    
    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({error: 'Sessão Expirada'});
        
        try {
            let userData = { allowed_boards: ['editorial', 'design', 'photo', 'video', 'gestao'], function: 'membro' };
            try {
                const userRes = await pool.query('SELECT allowed_boards, function FROM users WHERE id = $1', [user.id]);
                if (userRes.rows.length > 0) {
                    userData = userRes.rows[0];
                }
            } catch (queryErr) {
                console.log('User query warning:', queryErr.message);
            }
            user.allowed_boards = userData.allowed_boards || ['editorial', 'design', 'photo', 'video', 'gestao'];
            user.function = userData.function || 'membro';
        } catch (e) {
            console.log('authGuard error:', e.message);
            user.allowed_boards = ['editorial', 'design', 'photo', 'video', 'gestao'];
            user.function = 'membro';
        }
        
        req.user = user;
        next();
    });
}

function authOrTvGuard(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({error: 'Token Ausente - Não Autorizado'});

    jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) return res.status(403).json({error: 'Sessão Expirada'});
        if (payload.tv === true) {
            req.tv = true;
            req.user = { role: 'tv' };
        } else {
            req.user = payload;
        }
        next();
    });
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Permissão Negada' });
        }
        next();
    };
}

function normalizeWorkspaceList(primaryWorkspace, workspaces) {
    const unique = new Set([primaryWorkspace]);
    if (Array.isArray(workspaces)) {
        workspaces.forEach((workspaceId) => {
            if (workspaceId && typeof workspaceId === 'string') unique.add(workspaceId);
        });
    }
    return Array.from(unique);
}

function workspaceVisibilityClause(paramIndex) {
    return `(workspace_id = $${paramIndex} OR COALESCE(visible_workspaces, '[]'::jsonb) @> to_jsonb($${paramIndex}::text))`;
}


// =======================
//   ROUTES OVERVIEW
// =======================

// --- API: Workspaces ---
app.get('/api/workspaces', authGuard, async (req, res) => {
    try {
        // await ensureWorkspaceSchema();
        const result = await pool.query('SELECT * FROM workspaces ORDER BY priority ASC, name ASC');
        res.json(result.rows);
    } catch(err) {
        console.error('Workspace load error:', err);
        res.status(500).json({ error: 'Erro ao carregar workspaces' });
    }
});

app.post('/api/workspaces', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // await ensureWorkspaceSchema();
        const name = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ error: 'Nome obrigatorio' });
        const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        if (!id) return res.status(400).json({ error: 'Nome invalido para gerar identificador' });
        const priority = Number.isFinite(Number(req.body.priority)) ? Number(req.body.priority) : 100;
        await pool.query('INSERT INTO workspaces (id, name, priority) VALUES ($1, $2, $3)', [id, name, priority]);
        res.json({ success: true });
    } catch(err) {
        console.error('Workspace create error:', err);
        if (err.code === '23505') return res.status(409).json({ error: 'Ja existe um workspace com esse identificador' });
        res.status(500).json({ error: 'Erro ao criar workspace' });
    }
});

app.put('/api/workspaces/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // await ensureWorkspaceSchema();
        const name = (req.body.name || '').trim();
        const priority = Number.isFinite(Number(req.body.priority)) ? Number(req.body.priority) : 100;
        if (!name) return res.status(400).json({ error: 'Nome obrigatorio' });
        await pool.query('UPDATE workspaces SET name = $1, priority = $2 WHERE id = $3', [name, priority, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar workspace' });
    }
});

app.delete('/api/workspaces/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // Schema already ensured by initDb()
        const cardsRes = await pool.query(`SELECT COUNT(*) as total FROM cards WHERE workspace_id = $1 OR COALESCE(visible_workspaces, '[]'::jsonb) ? $1`, [req.params.id]);
        if (Number(cardsRes.rows[0].total) > 0) {
            return res.status(400).json({ error: 'Existem cards vinculados a este workspace. Remova ou mova as demandas antes de excluir.' });
        }
        await pool.query('DELETE FROM workspaces WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir workspace' });
    }
});

// --- API: Users Governance ---
app.get('/api/users', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, allowed_boards, function FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch(err) { res.status(500).send('Error loading users'); }
});

// --- API: Label Presets ---
app.get('/api/label-presets', authGuard, async (req, res) => {
    try {
        // await ensureLabelPresetSchema();
        const result = await pool.query('SELECT id, name, color FROM label_presets ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Label preset load error:', err);
        res.status(500).json({ error: 'Erro ao carregar etiquetas padrao' });
    }
});

app.post('/api/label-presets', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // await ensureLabelPresetSchema();
        const name = (req.body.name || '').trim();
        const color = (req.body.color || '').trim();
        if (!name || !color) return res.status(400).json({ error: 'Nome e cor obrigatorios' });
        await pool.query('INSERT INTO label_presets (name, color) VALUES ($1, $2)', [name, color]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar etiqueta padrao' });
    }
});

app.put('/api/label-presets/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // Schema already ensured by initDb()
        const name = (req.body.name || '').trim();
        const color = (req.body.color || '').trim();
        if (!name || !color) return res.status(400).json({ error: 'Nome e cor obrigatorios' });
        await pool.query('UPDATE label_presets SET name = $1, color = $2 WHERE id = $3', [name, color, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar etiqueta padrao' });
    }
});

app.delete('/api/label-presets/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // Schema already ensured by initDb()
        await pool.query('DELETE FROM label_presets WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir etiqueta padrao' });
    }
});

// --- API: Demand Types ---
app.get('/api/demand-types', authGuard, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, icon, color FROM demand_types ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Demand types load error:', err);
        res.status(500).json({ error: 'Erro ao carregar tipos de demanda' });
    }
});

app.post('/api/demand-types', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const icon = (req.body.icon || 'fa-tag').trim();
        const color = (req.body.color || '#6b7280').trim();
        if (!name) return res.status(400).json({ error: 'Nome obrigatorio' });
        await pool.query('INSERT INTO demand_types (name, icon, color) VALUES ($1, $2, $3)', [name, icon, color]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar tipo de demanda' });
    }
});

app.put('/api/demand-types/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        const icon = (req.body.icon || 'fa-tag').trim();
        const color = (req.body.color || '#6b7280').trim();
        if (!name) return res.status(400).json({ error: 'Nome obrigatorio' });
        await pool.query('UPDATE demand_types SET name = $1, icon = $2, color = $3 WHERE id = $4', [name, icon, color, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar tipo de demanda' });
    }
});

app.delete('/api/demand-types/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        await pool.query('DELETE FROM demand_types WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir tipo de demanda' });
    }
});

// --- API: User Functions ---
app.get('/api/user-functions', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, icon, color, sort_order FROM user_functions ORDER BY sort_order ASC, name ASC');
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/user-functions', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome obrigatório' });
        }
        await pool.query('INSERT INTO user_functions (name, icon, color) VALUES ($1, $2, $3)', [name.trim(), icon || 'fa-user', color || '#6b7280']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar função' });
    }
});

app.put('/api/user-functions/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const { name, icon, color, sort_order } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome obrigatório' });
        }
        await pool.query('UPDATE user_functions SET name = $1, icon = $2, color = $3 WHERE id = $4', [name.trim(), icon || 'fa-user', color || '#6b7280', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar função' });
    }
});

app.delete('/api/user-functions/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        await pool.query('DELETE FROM user_functions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir função' });
    }
});

app.get('/api/users/options', authGuard, async (req, res) => {
    try {
        const search = (req.query.q || '').trim();
        const result = search
            ? await pool.query('SELECT name, email FROM users WHERE email ILIKE $1 OR name ILIKE $1 ORDER BY name ASC, email ASC LIMIT 10', [`%${search}%`])
            : await pool.query('SELECT name, email FROM users ORDER BY name ASC, email ASC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuarios' });
    }
});
app.post('/api/users', authGuard, async (req, res) => {
    const { name, email, password, role, allowed_boards, function: userFunction } = req.body;
    try {
        if(req.user.role !== 'master' && req.user.role !== 'gestor') return res.status(403).json({ error: 'Permissão Negada' });
        const hash = await bcrypt.hash(password, 8);
        const defaultBoards = ['editorial', 'design', 'photo', 'video', 'gestao'];
        await pool.query('INSERT INTO users (name, email, password_hash, role, allowed_boards, function) VALUES ($1, $2, $3, $4, $5, $6)', [name || '', email, hash, role || 'membro', JSON.stringify(defaultBoards), userFunction || 'membro']);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: 'Erro ao criar membro.' }); }
});
app.put('/api/users/:id', authGuard, async (req, res) => {
    if(req.user.role !== 'master') return res.status(403).json({ error: 'Permissão Negada' });
    const { name, email, role, password, allowed_boards, function: userFunction } = req.body;
    try {
        if (password && password.trim()) {
            const hash = await bcrypt.hash(password.trim(), 8);
            await pool.query('UPDATE users SET name = $1, email = $2, role = $3, password_hash = $4, allowed_boards = $5, function = $6 WHERE id = $7', [name || '', email || '', role || 'membro', hash, JSON.stringify(allowed_boards || ['editorial', 'design', 'photo', 'video', 'gestao']), userFunction || 'membro', req.params.id]);
        } else {
            await pool.query('UPDATE users SET name = $1, email = $2, role = $3, allowed_boards = $4, function = $5 WHERE id = $6', [name || '', email || '', role || 'membro', JSON.stringify(allowed_boards || ['editorial', 'design', 'photo', 'video', 'gestao']), userFunction || 'membro', req.params.id]);
        }
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: 'Erro ao atualizar membro.' }); }
});
app.delete('/api/users/:id', authGuard, async (req, res) => {
    if(req.user.role !== 'master') return res.status(403).json({ error: 'Permissão Negada' });
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: 'Erro na exclusão.' }); }
});

app.post('/api/solicitations', async (req, res) => {
    try {
        const { title, description, platform, post_date, post_time, demand_type, priority, ministry, requested_by, request_email } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Título obrigatório' });
        }
        
        const minPriority = priority || 'normal';
        
        await pool.query(
            `INSERT INTO cards (id, column_id, title, description, platform, post_date, post_time, demand_type, priority, workspace_id, assignee, labels, created_by, category, card_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                'card-' + Date.now() + Math.floor(Math.random() * 1000),
                'col-1',
                title,
                description || '',
                platform || null,
                post_date || null,
                post_time || null,
                demand_type || null,
                minPriority,
                'lagoinhaalphaville.sp',
                requested_by || null,
                JSON.stringify([{ text: ministry || 'Solicitação', color: '#3b82f6' }]),
                `Solicitante: ${requested_by || 'Anónimo'} (${request_email || 'sem email'})`,
                'editorial',
                1
            ]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Solicitation error:', err);
        res.status(500).json({ error: 'Erro ao enviar solicitação' });
    }
});

// --- API: Board API (Columns & Cards) ---
app.get('/api/board', authOrTvGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        const category = req.query.category || 'editorial';
        const isAllWorkspaces = workspace === '__all__';
        
        // Verificar acesso ao board - apenas master/gestor ou usuários com acesso liberado
        if (!req.tv) {
            const userRole = req.user?.role;
            const userBoards = req.user?.allowed_boards || [];
            if (userRole !== 'master' && userRole !== 'gestor' && !userBoards.includes(category)) {
                return res.status(403).json({ error: 'Acesso negado ao board' });
            }
        }
        
        const cardVisibilityCondition = isAllWorkspaces ? '1=1' : workspaceVisibilityClause(1);
        const params = isAllWorkspaces ? [category] : [workspace, category];
        const catParam = isAllWorkspaces ? 1 : 2;
        
        // For design boards, join cards via design_column_id instead of column_id
        const isDesign = category === 'design';
        const isPhoto = category === 'photo';
        const isVideo = category === 'video';
        const cardJoinCondition = isDesign
            ? `c.id = k.design_column_id AND ${cardVisibilityCondition}`
            : isPhoto
            ? `c.id = k.photo_column_id AND ${cardVisibilityCondition}`
            : isVideo
            ? `c.id = k.video_column_id AND ${cardVisibilityCondition}`
            : `c.id = k.column_id AND ${cardVisibilityCondition} AND k.category = $${catParam}`;
        
        const query = `
            SELECT 
                c.id, c.title, c.col_order,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', k.id,
                            'workspace_id', k.workspace_id,
                            'workspace_name', ws.name,
                            'title', k.title,
                            'description', k.description,
                            'labels', k.labels,
                            'members', k.members,
                            'checklist', k.checklist,
                            'comments_data', k.comments,
                            'images', k.images,
                            'files', k.files,
                            'visible_workspaces', k.visible_workspaces,
                            'comments', k.comments_count,
                            'attachments', k.attachments_count,
                            'card_order', k.card_order,
                            'platform', k.platform,
                            'post_date', k.post_date,
                            'post_time', k.post_time,
                            'recurrence_type', k.recurrence_type,
                            'assignee', k.assignee,
                            'category', k.category,
                            'parent_id', k.parent_id,
                            'design_column_id', k.design_column_id,
                            'column_id', k.column_id,
                            'created_by', k.created_by,
                            'demand_type', k.demand_type,
                            'photo_column_id', k.photo_column_id,
                            'video_column_id', k.video_column_id,
                            'priority', k.priority,
                            'deadline', k.deadline,
                            'created_at', k.created_at
                        ) ORDER BY k.post_date ASC NULLS LAST, k.post_time ASC NULLS LAST, k.card_order ASC
                    ) FILTER (WHERE k.id IS NOT NULL), '[]'
                ) as cards
            FROM columns c
            LEFT JOIN cards k ON ${cardJoinCondition}
            LEFT JOIN workspaces ws ON ws.id = k.workspace_id
            WHERE c.category = $${catParam}
            GROUP BY c.id
            ORDER BY c.col_order ASC;
        `;
        const result = await pool.query(query, params);
        res.json({ columns: result.rows });
    } catch (err) {
        console.error('Error fetching board state', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/board/move', authGuard, async (req, res) => {
    const { cardId, targetColId, newOrder, workspace_id, category } = req.body;
    const resolvedWS = workspace_id || 'lagoinhaalphaville.sp';
    
    // Verificar acesso ao board
    if (category) {
        const userRole = req.user?.role;
        const userBoards = req.user?.allowed_boards || [];
        if (userRole !== 'master' && userRole !== 'gestor' && !userBoards.includes(category)) {
            return res.status(403).json({ error: 'Acesso negado ao board' });
        }
    }
    
    try {
        // If moving in the design, photo, or video board, update the respective column_id instead of column_id
        const columnField = category === 'design' ? 'design_column_id' : (category === 'photo' ? 'photo_column_id' : (category === 'video' ? 'video_column_id' : 'column_id'));
        const result = await pool.query(
            `UPDATE cards SET ${columnField} = $1, card_order = $2 WHERE id = $3 AND ${workspaceVisibilityClause(4)}`,
            [targetColId, newOrder, cardId, resolvedWS]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update card location' });
    }
});

// --- API: Create & Delete Cards ---
app.post('/api/cards', authGuard, async (req, res) => {
    // Schema already ensured by initDb()
    const { title, column_id, platform, post_date, post_time, workspace_id, assignee, visible_workspaces, images, files, labels, category, parent_id, demand_type, priority, deadline } = req.body;
    const resolvedWS = workspace_id || 'lagoinhaalphaville.sp';
    const resolvedCategory = category || 'editorial';
    
    // Verificar acesso ao board
    if (resolvedCategory) {
        const userRole = req.user?.role;
        const userBoards = req.user?.allowed_boards || [];
        if (userRole !== 'master' && userRole !== 'gestor' && !userBoards.includes(resolvedCategory)) {
            return res.status(403).json({ error: 'Acesso negado ao board' });
        }
    }
    
    const resolvedPriority = priority || 'normal';
    const visibleWorkspaces = normalizeWorkspaceList(resolvedWS, visible_workspaces);
    const serializedVisibleWorkspaces = JSON.stringify(visibleWorkspaces);
    const serializedImages = JSON.stringify(Array.isArray(images) ? images : []);
    const serializedFiles = JSON.stringify(Array.isArray(files) ? files : []);
    const serializedLabels = JSON.stringify(Array.isArray(labels) ? labels : []);
    const id = 'card-' + Date.now() + Math.floor(Math.random()*1000);
    try {
        console.log('Creating card with:', { column_id, title, post_date, post_time, resolvedWS, category: resolvedCategory, priority: resolvedPriority });
        const maxRes = await pool.query(`SELECT COALESCE(MAX(card_order), 0) + 1 as next_order FROM cards WHERE column_id = $1 AND ${workspaceVisibilityClause(2)}`, [column_id, resolvedWS]);
        const order = maxRes.rows[0].next_order;
        
        const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
        const createdBy = userResult.rows.length > 0 ? (userResult.rows[0].name || userResult.rows[0].email) : null;
        
        await pool.query(
            'INSERT INTO cards (id, column_id, title, card_order, platform, post_date, post_time, workspace_id, assignee, visible_workspaces, images, files, attachments_count, category, parent_id, created_by, labels, demand_type, priority, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)',
            [id, column_id, title, order, platform, post_date, post_time || null, resolvedWS, assignee, serializedVisibleWorkspaces, serializedImages, serializedFiles, (Array.isArray(images) ? images.length : 0) + (Array.isArray(files) ? files.length : 0), resolvedCategory, parent_id || null, createdBy, serializedLabels, demand_type || null, resolvedPriority, deadline || null]
        );
        res.json({ success: true, id, title });
    } catch (err) {
        console.error('Insert error:', err);
        res.status(500).json({ error: 'Erro ao criar card: ' + err.message });
    }
});

app.put('/api/cards/:id', authGuard, async (req, res) => {
    // Schema already ensured by initDb()
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    const { title, description, platform, post_date, post_time, assignee, labels, members, checklist, comments, images, files, visible_workspaces, primary_workspace_id, category, parent_id, demand_type, priority, deadline } = req.body;
    try {
        const serializedLabels = Array.isArray(labels) ? JSON.stringify(labels) : '[]';
        const serializedMembers = Array.isArray(members) ? JSON.stringify(members) : '[]';
        const serializedChecklist = Array.isArray(checklist) ? JSON.stringify(checklist) : '[]';
        const serializedComments = Array.isArray(comments) ? JSON.stringify(comments) : '[]';
        const serializedImages = JSON.stringify(Array.isArray(images) ? images : []);
        const serializedFiles = JSON.stringify(Array.isArray(files) ? files : []);
        const primaryWorkspace = primary_workspace_id || workspace;
        const serializedVisibleWorkspaces = JSON.stringify(normalizeWorkspaceList(primaryWorkspace, visible_workspaces));
        const commentsCount = Array.isArray(comments) ? comments.length : 0;
        const attachmentsCount = (Array.isArray(images) ? images.length : 0) + (Array.isArray(files) ? files.length : 0);
        const result = await pool.query(
            `UPDATE cards
             SET title = $1, description = $2, platform = $3, post_date = $4, post_time = $5, assignee = $6,
                 labels = $7::jsonb, members = $8::jsonb, checklist = $9::jsonb, comments = $10::jsonb, comments_count = $11,
                 images = $12::jsonb, files = $13::jsonb, visible_workspaces = $14::jsonb, attachments_count = $15,
                 category = COALESCE($16, category), parent_id = COALESCE($17, parent_id), demand_type = $18, priority = $19, deadline = $20
             WHERE id = $21 AND ${workspaceVisibilityClause(22)}`,
            [title, description || '', platform || null, post_date || null, post_time || null, assignee || null, serializedLabels, serializedMembers, serializedChecklist, serializedComments, commentsCount, serializedImages, serializedFiles, serializedVisibleWorkspaces, attachmentsCount, category || null, parent_id || null, demand_type || null, priority || 'normal', deadline || null, req.params.id, workspace]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar card' });
    }
});

app.post('/api/cards/:id/remove-workspace', authGuard, async (req, res) => {
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    try {
        const cardRes = await pool.query(
            `SELECT id, workspace_id, visible_workspaces FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );

        if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });

        const card = cardRes.rows[0];
        const visibleWorkspaces = normalizeWorkspaceList(card.workspace_id, card.visible_workspaces || []);
        const nextVisible = visibleWorkspaces.filter((workspaceId) => workspaceId !== workspace);

        if (nextVisible.length === 0) {
            return res.status(400).json({ error: 'Nao e possivel remover a ultima conta visivel do card' });
        }

        const nextPrimaryWorkspace = card.workspace_id === workspace ? nextVisible[0] : card.workspace_id;
        const serializedVisible = JSON.stringify(normalizeWorkspaceList(nextPrimaryWorkspace, nextVisible));

        await pool.query(
            'UPDATE cards SET workspace_id = $1, visible_workspaces = $2::jsonb WHERE id = $3',
            [nextPrimaryWorkspace, serializedVisible, req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover card deste workspace' });
    }
});

app.post('/api/cards/:id/request-design', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        
        // 1. Fetch source card
        const cardRes = await pool.query(
            `SELECT * FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado' });
        const sourceCard = cardRes.rows[0];

        // 2. Check if already in design
        if (sourceCard.design_column_id) {
            return res.status(400).json({ error: 'Esta demanda já está no setor de Design.' });
        }

        // 3. Simply set design_column_id on the SAME card — no duplication!
        await pool.query(
            `UPDATE cards SET design_column_id = 'design-1' WHERE id = $1`,
            [sourceCard.id]
        );

        res.json({ success: true, id: sourceCard.id });
    } catch (err) {
        console.error('Request design error:', err);
        res.status(500).json({ error: 'Erro ao solicitar arte' });
    }
});

app.post('/api/cards/:id/request-photo', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        
        const cardRes = await pool.query(
            `SELECT * FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado' });
        const sourceCard = cardRes.rows[0];

        if (sourceCard.photo_column_id) {
            return res.status(400).json({ error: 'Esta demanda já está no setor de Foto.' });
        }

        await pool.query(
            `UPDATE cards SET photo_column_id = 'photo-1' WHERE id = $1`,
            [sourceCard.id]
        );

        res.json({ success: true, id: sourceCard.id });
    } catch (err) {
        console.error('Request photo error:', err);
        res.status(500).json({ error: 'Erro ao solicitar produção de foto' });
    }
});

app.post('/api/cards/:id/request-video', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        
        const cardRes = await pool.query(
            `SELECT * FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado' });
        const sourceCard = cardRes.rows[0];

        if (sourceCard.video_column_id) {
            return res.status(400).json({ error: 'Esta demanda já está no setor de Vídeo.' });
        }

        await pool.query(
            `UPDATE cards SET video_column_id = 'video-1' WHERE id = $1`,
            [sourceCard.id]
        );

        res.json({ success: true, id: sourceCard.id });
    } catch (err) {
        console.error('Request video error:', err);
        res.status(500).json({ error: 'Erro ao solicitar produção de vídeo' });
    }
});

app.post('/api/cards/:id/mark-posted', authGuard, async (req, res) => {
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    try {
        // Schema already ensured by initDb()
        const cardRes = await pool.query(
            `SELECT * FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });
        const card = cardRes.rows[0];

        // Check if current date is >= post_date
        if (card.post_date) {
            const { date: today } = getSaoPauloDateParts();
            if (today < card.post_date) {
                return res.status(400).json({ error: 'Só pode marcar como postado na data ou após a data de postagem prevista (' + card.post_date + ')' });
            }
        }

        const result = await pool.query(
            `UPDATE cards SET column_id = 'col-6' WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao marcar card como postado' });
    }
});

app.put('/api/columns/:id', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const title = (req.body.title || '').trim();
        if (!title) return res.status(400).json({ error: 'Titulo obrigatorio' });
        await pool.query('UPDATE columns SET title = $1 WHERE id = $2', [title, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar quadro' });
    }
});

app.post('/api/columns', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const title = (req.body.title || '').trim();
        if (!title) return res.status(400).json({ error: 'Titulo obrigatorio' });
        const nextOrderRes = await pool.query('SELECT COALESCE(MAX(col_order), 0) + 1 AS next_order FROM columns');
        const nextOrder = Number(nextOrderRes.rows[0].next_order || 1);
        const id = `col-${Date.now()}`;
        await pool.query('INSERT INTO columns (id, title, col_order) VALUES ($1, $2, $3)', [id, title, nextOrder]);
        res.json({ success: true, id, title, col_order: nextOrder });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar quadro' });
    }
});

app.delete('/api/columns/:id', authGuard, requireRole(['master']), async (req, res) => {
    try {
        const cardsRes = await pool.query('SELECT COUNT(*) AS total FROM cards WHERE column_id = $1', [req.params.id]);
        if (Number(cardsRes.rows[0].total) > 0) {
            return res.status(400).json({ error: 'Esvazie o quadro antes de excluir' });
        }
        await pool.query('DELETE FROM columns WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir quadro' });
    }
});

app.post('/api/columns/:id/move', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    const { id } = req.params;
    const { direction } = req.body;
    console.log(`[MOVE COLUMN] ID: ${id}, Direction: ${direction}`);
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const targetRes = await client.query('SELECT id, col_order, title FROM columns WHERE id = $1', [id]);
            if (targetRes.rows.length === 0) throw new Error(`Coluna ${id} nao encontrada`);
            const currentOrder = targetRes.rows[0].col_order;
            console.log(`[MOVE COLUMN] Current Column: ${targetRes.rows[0].title}, Order: ${currentOrder}`);

            let swapRes;
            if (direction === 'left') {
                swapRes = await client.query('SELECT id, col_order, title FROM columns WHERE col_order < $1 ORDER BY col_order DESC LIMIT 1', [currentOrder]);
            } else {
                swapRes = await client.query('SELECT id, col_order, title FROM columns WHERE col_order > $1 ORDER BY col_order ASC LIMIT 1', [currentOrder]);
            }

            if (swapRes.rows.length > 0) {
                const other = swapRes.rows[0];
                console.log(`[MOVE COLUMN] Found neighbor: ${other.title}, Order: ${other.col_order}`);
                await client.query('UPDATE columns SET col_order = $1 WHERE id = $2', [other.col_order, id]);
                await client.query('UPDATE columns SET col_order = $1 WHERE id = $2', [currentOrder, other.id]);
                console.log(`[MOVE COLUMN] SWAP SUCCESS: ${id} <-> ${other.id}`);
            } else {
                console.log(`[MOVE COLUMN] No neighbor found in direction ${direction}`);
            }

            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[MOVE COLUMN] ROLLBACK ERROR:', err);
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[MOVE COLUMN] Final Error:', err);
        res.status(500).json({ error: 'Erro ao mover quadro: ' + err.message });
    }
});

app.get('/api/captacoes', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        const isAllWorkspaces = workspace === '__all__';
        const filterClause = isAllWorkspaces ? '1=1' : workspaceVisibilityClause(1);
        const params = isAllWorkspaces ? [] : [workspace];

        const query = `
            SELECT id, title, description, labels, post_date, post_time, platform, workspace_id, assignee, card_order, column_id
            FROM cards
            WHERE ${filterClause}
              AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(labels) l 
                WHERE l->>'text' ILIKE '%Captação de Vídeo%' 
                   OR l->>'text' ILIKE '%Captação de foto%'
                   OR l->>'text' ILIKE '%Captacao de Video%'
                   OR l->>'text' ILIKE '%Captacao de foto%'
              )
            ORDER BY post_date ASC NULLS LAST, post_time ASC NULLS LAST;
        `;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Captacoes load error:', err);
        res.status(500).json({ error: 'Erro ao carregar captações' });
    }
});

app.get('/api/cards/:id', authGuard, async (req, res) => {
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    try {
        const result = await pool.query(
            `SELECT k.*, ws.name as workspace_name, c.title as column_name
             FROM cards k
             LEFT JOIN workspaces ws ON ws.id = k.workspace_id
             LEFT JOIN columns c ON c.id = k.column_id
             WHERE k.id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado' });
        
        const card = result.rows[0];
        // Normalize for frontend expectations (comments_data vs comments)
        card.comments_data = card.comments;
        
        res.json(card);
    } catch (err) {
        console.error('Get card error:', err);
        res.status(500).json({ error: 'Erro ao carregar detalhes da demanda' });
    }
});

app.post('/api/cards/:id/duplicate', authGuard, async (req, res) => {
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    try {
        const cardRes = await pool.query(
            `SELECT * FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`,
            [req.params.id, workspace]
        );
        if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });
        const card = cardRes.rows[0];

        const maxRes = await pool.query(
            `SELECT COALESCE(MAX(card_order), 0) + 1 as next_order FROM cards WHERE column_id = $1 AND ${workspaceVisibilityClause(2)}`,
            [card.column_id, workspace]
        );
        const order = maxRes.rows[0].next_order;
        const nextId = 'card-' + Date.now() + Math.floor(Math.random() * 1000);

        await pool.query(
            `INSERT INTO cards (id, column_id, title, description, labels, members, checklist, comments, images, files, visible_workspaces, comments_count, attachments_count, card_order, platform, post_date, post_time, recurrence_type, workspace_id, assignee)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
            [
                nextId,
                card.column_id,
                '(Cópia) ' + card.title,
                card.description || '',
                JSON.stringify(card.labels || []),
                JSON.stringify(card.members || []),
                JSON.stringify(card.checklist || []),
                JSON.stringify([]), // Reset comments
                JSON.stringify(card.images || []),
                JSON.stringify(card.files || []),
                JSON.stringify(card.visible_workspaces || []),
                0,
                card.attachments_count || 0,
                order,
                card.platform || null,
                card.post_date || null,
                card.post_time || null,
                card.recurrence_type || 'none',
                card.workspace_id,
                card.assignee || null
            ]
        );

        res.json({ success: true, id: nextId });
    } catch (err) {
        console.error('Duplicate error:', err);
        res.status(500).json({ error: 'Erro ao duplicar card' });
    }
});

app.delete('/api/cards/:id', authGuard, async (req, res) => {
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    try {
        const result = await pool.query(`DELETE FROM cards WHERE id = $1 AND ${workspaceVisibilityClause(2)}`, [req.params.id, workspace]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro na lixeira' });
    }
});

app.get('/api/my-cards', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace;
        const userEmail = req.user.email;
        const userId = req.user.id;
        
        // Get user name for matching
        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
        const userName = userRes.rows.length > 0 ? userRes.rows[0].name : null;
        
        // Build query - search by email in assignee or JSONB members array
        let params = [userEmail];
        let query = `SELECT id, title, assignee, members, created_by, post_date, post_time, workspace_id, platform, column_id 
                     FROM cards 
                     WHERE (assignee = $1`;
        
        // Search in members JSONB array - use jsonb comparison
        params.push(userEmail);
        query += ` OR members @> to_jsonb($${params.length}::text)`;
        
        // Also check created_by with name or email
        if (userName) {
            params.push(userName);
            query += ` OR created_by = $${params.length}`;
        }
        params.push(userEmail);
        query += ` OR created_by = $${params.length}`;

        if (workspace && workspace !== '__all__') {
            params.push(workspace);
            query += ` AND workspace_id = $${params.length}`;
        }

        query += ') ORDER BY post_date ASC NULLS LAST, post_time ASC NULLS LAST';
        
        console.log('my-cards query:', query, params);
        const result = await pool.query(query, params);
        console.log('my-cards result count:', result.rows.length);
        res.json(result.rows);
    } catch(err) {
        console.error('My cards error:', err);
        res.status(500).json({ error: 'Erro de Mesa' });
    }
});

// --- API: Dashboard Metrics ---
app.get('/api/dashboard', authOrTvGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace;
        const isAllWorkspaces = workspace === '__all__';
        const filterClause = isAllWorkspaces ? '1=1' : (workspace ? workspaceVisibilityClause(1) : '1=1');
        const params = isAllWorkspaces ? [] : (workspace ? [workspace] : []);
        const cardsRes = await pool.query(
            `SELECT c.id, c.title, c.post_date, c.post_time, c.column_id, c.assignee, c.workspace_id, w.name as workspace_name
             FROM cards c
             LEFT JOIN workspaces w ON w.id = c.workspace_id
             WHERE ${filterClause}
             ORDER BY c.post_date ASC NULLS LAST, c.post_time ASC NULLS LAST, c.card_order ASC`,
            params
        );

        const usersRes = await pool.query('SELECT COUNT(*) AS total FROM users');
        const cards = cardsRes.rows;
        const total = cards.length;
        const completed = cards.filter((card) => card.column_id === 'col-5' || card.column_id === 'col-6').length;
        const posted = cards.filter((card) => card.column_id === 'col-6').length;
        const overdue = cards.filter((card) => card.post_date && card.post_date < getSaoPauloDateParts().date && card.column_id !== 'col-5' && card.column_id !== 'col-6').length;
        const dueToday = cards.filter((card) => card.post_date === getSaoPauloDateParts().date && card.column_id !== 'col-6').length;
        const taxaDeEntrega = total > 0 ? Math.round((completed / total) * 100) : 100;

        const currentMonth = getSaoPauloDateParts().date.slice(0, 7);
        const monthlyCards = cards.filter((card) => card.post_date && card.post_date.startsWith(currentMonth));
        const monthlyCompleted = monthlyCards.filter((card) => card.column_id === 'col-5' || card.column_id === 'col-6').length;
        const monthlyCompletion = monthlyCards.length > 0 ? Math.round((monthlyCompleted / monthlyCards.length) * 100) : 100;

        const urgentCards = cards
            .filter((card) => card.post_date && card.column_id !== 'col-5' && card.column_id !== 'col-6')
            .slice()
            .sort((a, b) => `${a.post_date || ''} ${a.post_time || ''}`.localeCompare(`${b.post_date || ''} ${b.post_time || ''}`))
            .slice(0, 5);

        res.json({
            total_cards: total,
            cards_concluidos: completed,
            cards_postados: posted,
            cards_atrasados: overdue,
            cards_hoje: dueToday,
            membros_ativos: Number(usersRes.rows[0].total || 0),
            taxa_entrega: taxaDeEntrega,
            entregas_mes_total: monthlyCards.length,
            entregas_mes_concluidas: monthlyCompleted,
            entregas_mes_percentual: monthlyCompletion,
            urgent_cards: urgentCards
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed Dashboard' });
    }
});

app.get('/api/reports/labels', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace;
        const labelFilter = req.query.label;
        
        let whereClause = '1=1';
        let params = [];
        
        if (workspace && workspace !== '__all__') {
            whereClause += ` AND (c.workspace_id = $${params.length + 1} OR c.visible_workspaces ? $${params.length + 1})`;
            params.push(workspace);
        }
        
        const query = `
            SELECT 
                c.workspace_id,
                w.name as workspace_name,
                c.labels
            FROM cards c
            LEFT JOIN workspaces w ON w.id = c.workspace_id
            WHERE ${whereClause}
        `;
        
        const result = await pool.query(query, params);
        const cards = result.rows;
        
        const labelCounts = {};
        const workspaceLabelCounts = {};
        
        cards.forEach(card => {
            const labels = Array.isArray(card.labels) ? card.labels : (card.labels ? [card.labels] : []);
            const wsId = card.workspace_id || 'unknown';
            const wsName = card.workspace_name || wsId;
            
            labels.forEach(label => {
                if (!label || !label.text) return;
                const labelName = label.text;
                
                if (labelFilter && labelName.toLowerCase() !== labelFilter.toLowerCase()) return;
                
                if (!labelCounts[labelName]) {
                    labelCounts[labelName] = { total: 0, byWorkspace: {} };
                }
                labelCounts[labelName].total++;
                
                if (!labelCounts[labelName].byWorkspace[wsId]) {
                    labelCounts[labelName].byWorkspace[wsId] = { name: wsName, count: 0 };
                }
                labelCounts[labelName].byWorkspace[wsId].count++;
            });
        });
        
        const report = Object.entries(labelCounts).map(([labelName, data]) => ({
            label: labelName,
            total: data.total,
            byWorkspace: Object.entries(data.byWorkspace).map(([wsId, wsData]) => ({
                workspace_id: wsId,
                workspace_name: wsData.name,
                count: wsData.count
            }))
        })).sort((a, b) => b.total - a.total);
        
        res.json({ labels: report });
    } catch (err) {
        console.error('Label report error:', err);
        res.status(500).json({ error: 'Erro ao gerar relatório de etiquetas' });
    }
});

app.get('/api/reports/demand-types', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace;
        const typeFilter = req.query.type;
        
        let whereClause = '1=1';
        let params = [];
        
        if (workspace && workspace !== '__all__') {
            whereClause += ` AND (c.workspace_id = $${params.length + 1} OR c.visible_workspaces ? $${params.length + 1})`;
            params.push(workspace);
        }
        
        const query = `
            SELECT 
                c.workspace_id,
                w.name as workspace_name,
                c.demand_type
            FROM cards c
            LEFT JOIN workspaces w ON w.id = c.workspace_id
            WHERE ${whereClause}
        `;
        
        const result = await pool.query(query, params);
        const cards = result.rows;
        
        const typeCounts = {};
        
        cards.forEach(card => {
            const demandType = card.demand_type;
            if (!demandType) return;
            
            const wsId = card.workspace_id || 'unknown';
            const wsName = card.workspace_name || wsId;
            
            if (typeFilter && demandType.toLowerCase() !== typeFilter.toLowerCase()) return;
            
            if (!typeCounts[demandType]) {
                typeCounts[demandType] = { total: 0, byWorkspace: {} };
            }
            typeCounts[demandType].total++;
            
            if (!typeCounts[demandType].byWorkspace[wsId]) {
                typeCounts[demandType].byWorkspace[wsId] = { name: wsName, count: 0 };
            }
            typeCounts[demandType].byWorkspace[wsId].count++;
        });
        
        const report = Object.entries(typeCounts).map(([typeName, data]) => ({
            type: typeName,
            total: data.total,
            byWorkspace: Object.entries(data.byWorkspace).map(([wsId, wsData]) => ({
                workspace_id: wsId,
                workspace_name: wsData.name,
                count: wsData.count
            }))
        })).sort((a, b) => b.total - a.total);
        
        res.json({ types: report });
    } catch (err) {
        console.error('Demand type report error:', err);
        res.status(500).json({ error: 'Erro ao gerar relatório de tipos de demanda' });
    }
});

app.get('/api/notifications', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        const isAllWorkspaces = workspace === '__all__';
        const result = await pool.query(
            `SELECT id, title, post_date, column_id, assignee, members, comments_count
             FROM cards
             WHERE ${isAllWorkspaces ? '1=1' : workspaceVisibilityClause(1)}
             ORDER BY post_date ASC NULLS LAST, post_time ASC NULLS LAST, card_order ASC`,
            isAllWorkspaces ? [] : [workspace]
        );

        const today = getSaoPauloDateParts().date;
        const notifications = [];

        result.rows.forEach((card) => {
            const members = Array.isArray(card.members) ? card.members : [];
            const isAssignedToUser = card.assignee === req.user.email || members.includes(req.user.email);
            if (!isAssignedToUser) return;

            if (card.post_date && card.post_date < today && card.column_id !== 'col-5') {
                notifications.push({ type: 'overdue', title: card.title, detail: `Atrasado desde ${card.post_date}`, card_id: card.id });
            } else if (card.post_date === today) {
                notifications.push({ type: 'today', title: card.title, detail: 'Entrega prevista para hoje', card_id: card.id });
            }

            if (Number(card.comments_count) > 0) {
                notifications.push({ type: 'comments', title: card.title, detail: `${card.comments_count} comentario(s) na demanda`, card_id: card.id });
            }
        });

        res.json({ notifications: notifications.slice(0, 12) });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar notificacoes' });
    }
});

app.get('/api/tv-access-code', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // Schema already ensured by initDb()
        const result = await pool.query('SELECT tv_access_code FROM system_settings WHERE id = 1');
        res.json({ code: result.rows[0]?.tv_access_code || '0000' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar código da TV' });
    }
});

app.post('/api/tv-access-code', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        // Schema already ensured by initDb()
        const code = generateFourDigitCode();
        await pool.query(`
            INSERT INTO system_settings (id, primary_color, tv_access_code) VALUES (1, '#4F46E5', $1)
            ON CONFLICT (id) DO UPDATE SET tv_access_code = $1
        `, [code]);
        res.json({ code });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar código da TV' });
    }
});

app.post('/api/tv/auth', async (req, res) => {
    try {
        // Schema already ensured by initDb()
        const code = String(req.body.code || '').trim();
        if (!/^\d{4}$/.test(code)) return res.status(400).json({ error: 'Código inválido' });
        const result = await pool.query('SELECT tv_access_code FROM system_settings WHERE id = 1');
        if ((result.rows[0]?.tv_access_code || '0000') !== code) return res.status(401).json({ error: 'Código incorreto' });
        const token = jwt.sign({ tv: true }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao autenticar TV' });
    }
});

// --- API: Settings (Admin Master) ---
app.get('/api/settings', async (req, res) => {
    try {
        // Schema already ensured by initDb()
        const result = await pool.query('SELECT primary_color, logo_light, logo_dark FROM system_settings LIMIT 1');
        if (result.rows.length > 0) {
            res.json({ 
                primary_color: result.rows[0].primary_color,
                logo_light_url: result.rows[0].logo_light || null,
                logo_dark_url: result.rows[0].logo_dark || null
            });
        } else {
            res.json({ primary_color: '#4F46E5', logo_light_url: null, logo_dark_url: null });
        }
    } catch (err) {
        res.json({ primary_color: '#4F46E5', logo_light_url: null, logo_dark_url: null });
    }
});

app.post('/api/settings', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    const { primary_color, logo_light, logo_dark } = req.body;
    try {
        await pool.query(`
            INSERT INTO system_settings (id, primary_color, logo_light, logo_dark) VALUES (1, $1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET primary_color = $1, logo_light = COALESCE(NULLIF($2, ''), system_settings.logo_light), logo_dark = COALESCE(NULLIF($3, ''), system_settings.logo_dark)
        `, [primary_color, logo_light || '', logo_dark || '']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// For any fallback (like refreshing /gestao), send the HTML file
app.get('/tv', (req, res) => {
   res.sendFile(path.join(__dirname, 'tv.html'));
});

app.get('/painel-tv', (req, res) => {
   res.redirect('/tv');
});

app.get('/:page', (req, res) => {
   const page = req.params.page;
   if(page.endsWith('.html')){
       res.sendFile(path.join(__dirname, page));
   } else {
       res.sendFile(path.join(__dirname, 'index.html'));
   }
});

app.listen(PORT, () => {
    console.log('[TEMPLUM] Server successfully running at Port', PORT);
});
