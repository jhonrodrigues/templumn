const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://jhonrodrigues:templum@127.0.0.1:5432/templum' });

async function check() {
    try {
        const res = await pool.query('SELECT id, title, category FROM cards LIMIT 20');
        console.log('--- CARDS ---');
        console.table(res.rows);
        
        const colRes = await pool.query('SELECT id, title, category FROM columns LIMIT 20');
        console.log('--- COLUMNS ---');
        console.table(colRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
