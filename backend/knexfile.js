require('dotenv').config();
const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;
/**
* @type { import("knex").Knex.Config }
*/
module.exports = {
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: 'tttt',
    database: 'homestay',
  },
  pool: { min: 0, max: 10 },
}