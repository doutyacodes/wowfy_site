import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const connection = mysql.createPool({
  host: '68.178.163.247',
  user: 'devuser_wowfy_site',
  password: 'Wowfy#user',
  database: 'devuser_wowfy_site',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(connection, { schema, mode: 'default' });