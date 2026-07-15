# Wedding Exio Dayana

Aplicación Express con estructura inspirada en `Nam3Mc/cse340`:

- `server.js`: servidor único.
- `src/models`: conexión y consultas PostgreSQL.
- `src/controllers`: lógica de las páginas.
- `src/routes`: rutas Express.
- `src/views`: vistas EJS.
- `public`: CSS y JavaScript estático.

## Variables de entorno

- `DATABASE_URL`
- `ADMIN_PASSWORD`

## Base de datos

Ejecuta `src/setup.sql` en el SQL Editor de Neon.

## Desarrollo

```bash
npm install
npm run dev
```

## Vercel

No configures un Output Directory ni un Build Command. Usa Node.js 24.x.
La raíz `/` abre directamente el panel. Ya no existe `/api/auth/login`.
