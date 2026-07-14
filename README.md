# Boda Dayana & Exio

Aplicación Express para crear, copiar, consultar, responder y eliminar invitaciones de boda.

## Estructura

```text
boda-backend/
├── api/
│   ├── routes/
│   │   ├── admin.js
│   │   └── public.js
│   ├── auth.js
│   └── db.js
├── public/
│   ├── admin.html
│   └── invitation.html
├── .env.example
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── vercel.json
```

## Desarrollo local

1. Copia `.env.example` como `.env`.
2. Completa las variables con valores reales.
3. Instala y ejecuta:

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000`.

## Variables necesarias en Vercel

Configura estas variables en **Project → Settings → Environment Variables**:

```text
DATABASE_URL
JWT_SECRET
ADMIN_PASSWORD
ADMIN_SESSION_HOURS
DB_POOL_MAX
```

No configures `PORT` ni `NODE_ENV` manualmente en Vercel.

Después de cambiar variables, crea un deployment nuevo.

## Rutas importantes

```text
GET  /api/health
POST /api/auth/login
GET  /api/invitations
POST /api/invitations
DELETE /api/invitations/:id
GET  /api/public/invitation/:uuid
POST /api/public/respond
```

## Comprobación

```bash
npm run check
```

Después del deployment verifica:

```text
https://TU-DOMINIO.vercel.app/api/health
```

Debe responder con `ok: true` y `database: connected`.
