require('dotenv').config();
const Knex = require('knex');

const knex = Knex({
    client: 'mysql',
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    },
    pool: { min: 0, max: 10 },
});

// (optional) log để chắc chắn
console.log('[DB] connect =>', process.env.DB_HOST, process.env.DB_PORT);
knex.raw('SELECT 1').then(() => console.log('[DB] ready'))
    .catch(e => console.error('[DB] error:', e.message));

module.exports = knex;     // <-- export INSTANCE (một hàm callable)
