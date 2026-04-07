require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
//   ROUTES OVERVIEW
// =======================

// --- API: Board API (Columns & Cards) ---
app.get('/api/board', async (req, res) => {
    try {
        // Query to get all columns and nest their cards using Postgres JSON aggregation
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
                            'card_order', k.card_order
                        ) ORDER BY k.card_order ASC
                    ) FILTER (WHERE k.id IS NOT NULL), '[]'
                ) as cards
            FROM columns c
            LEFT JOIN cards k ON c.id = k.column_id
            GROUP BY c.id
            ORDER BY c.col_order ASC;
        `;
        const result = await pool.query(query);
        
        res.json({ columns: result.rows });
    } catch (err) {
        console.error('Error fetching board state', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/board/move', async (req, res) => {
    const { cardId, targetColId, newOrder } = req.body;
    try {
        await pool.query('UPDATE cards SET column_id = $1, card_order = $2 WHERE id = $3', [targetColId, newOrder, cardId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update card location' });
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

app.post('/api/settings', async (req, res) => {
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
