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

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL Required in some cloud DBs (Easypanel might vary)
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_NO_SSL !== 'true' ? { rejectUnauthorized: false } : false
});

// Inicialização Automática do Banco de Dados
async function initDb() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
        
        // Setup initial Admin Account
        const hash = await bcrypt.hash('123456', 8);
        await pool.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING', ['admin@templum.com', hash, 'master']);
        
        // Auto Migration para fase 6 e 7
        try { await pool.query('ALTER TABLE cards ADD COLUMN platform VARCHAR(50);'); } catch(e){}
        try { await pool.query('ALTER TABLE cards ADD COLUMN post_date VARCHAR(50);'); } catch(e){}
        
        // Dynamic Workspaces Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            )
        `);
        // Inserir os 3 iniciais pedidos sob demanda
        await pool.query("INSERT INTO workspaces (id, name) VALUES ('lagoinhaalphaville.sp', 'Lagoinha Alphaville Principal'), ('heroalphaville', 'Hero Alphaville'), ('shinealphaville', 'Shine Alphaville') ON CONFLICT DO NOTHING;");
        
        try { await pool.query("ALTER TABLE cards ADD COLUMN workspace_id VARCHAR(50) DEFAULT 'lagoinhaalphaville.sp';"); } catch(e){}
        try { await pool.query("ALTER TABLE cards ADD COLUMN assignee VARCHAR(100);"); } catch(e){}

        console.log('[TEMPLUM] Database schema e tabelas criadas com sucesso!');
    } catch (err) {
        console.error('[TEMPLUM] Erro ao inicializar tabelas:', err);
    }
}
initDb();

app.use(cors());
app.use(express.json());
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
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, email: user.email, role: user.role });
    } catch(err) {
        res.status(500).json({error: 'Erro de validação.'});
    }
});

function authGuard(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({error: 'Token Ausente - Não Autorizado'});
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({error: 'Sessão Expirada'});
        req.user = user;
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

// =======================
//   ROUTES OVERVIEW
// =======================

// --- API: Workspaces ---
app.get('/api/workspaces', authGuard, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM workspaces ORDER BY id ASC');
        res.json(result.rows);
    } catch(err) { res.status(500).send('Error'); }
});

app.post('/api/workspaces', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const id = req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        await pool.query('INSERT INTO workspaces (id, name) VALUES ($1, $2)', [id, req.body.name]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: 'Erro ao criar' }); }
});

// --- API: Users Governance ---
app.get('/api/users', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch(err) { res.status(500).send('Error loading users'); }
});
app.post('/api/users', authGuard, async (req, res) => {
    const { email, password, role } = req.body;
    try {
        if(req.user.role !== 'master' && req.user.role !== 'gestor') return res.status(403).json({ error: 'Permissão Negada' });
        const hash = await bcrypt.hash(password, 8);
        await pool.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)', [email, hash, role || 'membro']);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: 'Erro ao criar membro.' }); }
});
app.delete('/api/users/:id', authGuard, async (req, res) => {
    if(req.user.role !== 'master') return res.status(403).json({ error: 'Permissão Negada' });
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ error: 'Erro na exclusão.' }); }
});

// --- API: Board API (Columns & Cards) ---
app.get('/api/board', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
        const query = `
            SELECT 
                c.id, c.title, c.col_order,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', k.id,
                            'title', k.title,
                            'labels', k.labels,
                            'comments', k.comments_count,
                            'attachments', k.attachments_count,
                            'card_order', k.card_order,
                            'platform', k.platform,
                            'post_date', k.post_date,
                            'assignee', k.assignee
                        ) ORDER BY k.card_order ASC
                    ) FILTER (WHERE k.id IS NOT NULL), '[]'
                ) as cards
            FROM columns c
            LEFT JOIN cards k ON c.id = k.column_id AND k.workspace_id = $1
            GROUP BY c.id
            ORDER BY c.col_order ASC;
        `;
        const result = await pool.query(query, [workspace]);
        res.json({ columns: result.rows });
    } catch (err) {
        console.error('Error fetching board state', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/board/move', authGuard, async (req, res) => {
    const { cardId, targetColId, newOrder, workspace_id } = req.body;
    const resolvedWS = workspace_id || 'lagoinhaalphaville.sp';
    try {
        const result = await pool.query(
            'UPDATE cards SET column_id = $1, card_order = $2 WHERE id = $3 AND workspace_id = $4',
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
    const { title, column_id, platform, post_date, workspace_id, assignee } = req.body;
    const resolvedWS = workspace_id || 'lagoinhaalphaville.sp';
    const id = 'card-' + Date.now() + Math.floor(Math.random()*1000);
    try {
        const maxRes = await pool.query('SELECT COALESCE(MAX(card_order), 0) + 1 as next_order FROM cards WHERE column_id = $1 AND workspace_id = $2', [column_id, resolvedWS]);
        const order = maxRes.rows[0].next_order;
        await pool.query('INSERT INTO cards (id, column_id, title, card_order, platform, post_date, workspace_id, assignee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, column_id, title, order, platform, post_date, resolvedWS, assignee]);
        res.json({ success: true, id, title });
    } catch (err) {
        console.error('Insert error:', err);
        res.status(500).json({ error: 'Erro ao criar card' });
    }
});

app.delete('/api/cards/:id', authGuard, async (req, res) => {
    const workspace = req.query.workspace || 'lagoinhaalphaville.sp';
    try {
        const result = await pool.query('DELETE FROM cards WHERE id = $1 AND workspace_id = $2', [req.params.id, workspace]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Card não encontrado neste workspace' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro na lixeira' });
    }
});

app.get('/api/my-cards', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace;
        const params = [req.user.email];
        let query = 'SELECT * FROM cards WHERE assignee = $1';

        if (workspace) {
            params.push(workspace);
            query += ' AND workspace_id = $2';
        }

        query += ' ORDER BY post_date ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch(err) {
        res.status(500).json({ error: 'Erro de Mesa' });
    }
});

// --- API: Dashboard Metrics ---
app.get('/api/dashboard', authGuard, async (req, res) => {
    try {
        const workspace = req.query.workspace;
        const totalRes = workspace
            ? await pool.query('SELECT COUNT(*) as t FROM cards WHERE workspace_id = $1', [workspace])
            : await pool.query('SELECT COUNT(*) as t FROM cards');
        const grouped = workspace
            ? await pool.query('SELECT column_id, COUNT(*) as c FROM cards WHERE workspace_id = $1 GROUP BY column_id', [workspace])
            : await pool.query('SELECT column_id, COUNT(*) as c FROM cards GROUP BY column_id');
        
        let total = parseInt(totalRes.rows[0].t) || 0;
        let completed = 0; // Col-5 é o Concluido
        
        grouped.rows.forEach(r => {
            if(r.column_id === 'col-5') completed = parseInt(r.c);
        });
        
        let taxaDeEntrega = total > 0 ? Math.round((completed / total) * 100) : 100;

        res.json({ 
            total_cards: total, 
            cards_concluidos: completed,
            taxa_entrega: taxaDeEntrega
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed Dashboard' });
    }
});

// --- API: Settings (Admin Master) ---
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT primary_color FROM system_settings LIMIT 1');
        if (result.rows.length > 0) {
            res.json({ primary_color: result.rows[0].primary_color });
        } else {
            res.json({ primary_color: '#4F46E5' }); // Default Purple
        }
    } catch (err) {
        // Return default gracefully on first init
        res.json({ primary_color: '#4F46E5' });
    }
});

app.post('/api/settings', authGuard, requireRole(['master', 'gestor']), async (req, res) => {
    const { primary_color } = req.body;
    try {
        await pool.query(`
            INSERT INTO system_settings (id, primary_color) VALUES (1, $1)
            ON CONFLICT (id) DO UPDATE SET primary_color = $1
        `, [primary_color]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// For any fallback (like refreshing /gestao), send the HTML file
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
