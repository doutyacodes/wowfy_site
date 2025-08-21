import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/schema.js',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: '68.178.163.247',
    user: 'devuser_wowfy_site',
    password: 'Wowfy#user',
    database: 'devuser_wowfy_site',
  },
});