# Wedding Exio Dayana — Vercel final

## Estructura obligatoria

No debe existir una carpeta `/api` en este proyecto. Vercel reserva `/api` para Vercel Functions. Los módulos internos de Express están en `/server`.

```text
/
├── server/
│   ├── routes/
│   │   ├── admin.js
│   │   └── public.js
│   ├── auth.js
│   └── db.js
├── public/
│   ├── index.html
│   ├── admin.html
│   └── invitation.html
├── index.js
├── package.json
├── package-lock.json
├── vercel.json
└── schema-neon.sql
```

## Variables en Vercel

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_HOURS` (opcional, por defecto 8)
- `DB_POOL_MAX` (opcional, por defecto 5)

No agregues `PORT` ni `NODE_ENV` en Vercel.

## Pruebas después del deployment

- `/` debe mostrar el panel.
- `/api/health` debe responder JSON.
- `/api/auth/login` debe aceptar POST.
