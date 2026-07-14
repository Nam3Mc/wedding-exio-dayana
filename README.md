# Wedding Exio & Dayana

Aplicación Express + PostgreSQL/Neon para crear invitaciones, compartir enlaces individuales y registrar confirmaciones presenciales, virtuales o rechazadas.

## Estructura

```text
.
├── database/schema.sql
├── public/
│   ├── assets/
│   ├── admin.html
│   └── invitation.html
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── index.js
├── package.json
└── vercel.json
```

## Variables de entorno

Copia `.env.example` como `.env` y completa:

```env
DATABASE_URL=
ADMIN_PASSWORD=
JWT_SECRET=
PORT=3000
ADMIN_SESSION_HOURS=8
DB_POOL_MAX=5
NODE_ENV=development
```

Para Vercel, agrega `DATABASE_URL`, `ADMIN_PASSWORD` y `JWT_SECRET` en **Project → Settings → Environment Variables** para Production, Preview y Development según corresponda.

Usa preferiblemente la URL agrupada de Neon. Normalmente el hostname contiene `-pooler`.

## Crear la base de datos

Ejecuta `database/schema.sql` una sola vez en el SQL Editor de Neon. El script es idempotente y puede volver a ejecutarse de forma segura.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre:

```text
http://localhost:3000
```

Prueba una invitación con:

```text
http://localhost:3000/invitation/UUID_DE_LA_INVITACION
```

## Validación

```bash
npm run check
npm test
```

## Deployment en Vercel

1. Sube todos los archivos del proyecto a GitHub, incluido `package-lock.json`.
2. Importa el repositorio en Vercel.
3. Deja **Framework Preset** en detección automática u **Other**.
4. No configures Output Directory.
5. Agrega las variables de entorno.
6. Ejecuta un nuevo deployment.
7. Verifica `/api/health`, el login, la creación, el enlace público, la confirmación y la eliminación.

También puedes probar el entorno de Vercel localmente:

```bash
npx vercel dev
```

## Rutas

```text
POST   /api/auth/login
GET    /api/auth/session
POST   /api/auth/logout
GET    /api/invitations
POST   /api/invitations
DELETE /api/invitations/:id
GET    /api/public/invitation/:uuid
POST   /api/public/respond
GET    /api/health
```

## Seguridad incluida

- Cookie de sesión `httpOnly`, `Secure` en Vercel y `SameSite=Strict`.
- JWT con emisor, audiencia, expiración y algoritmo explícitos.
- Comparación de contraseña resistente a diferencias de tiempo.
- Helmet y cabeceras de seguridad de Vercel.
- Política CSP para los recursos usados por los HTML.
- Límites de peticiones y de tamaño JSON.
- Consultas parametrizadas.
- Validación de UUID, fechas, estados y cuerpos JSON.
- Transacción y bloqueo de fila al responder invitaciones.
- Protección contra respuestas duplicadas y cambios después de expirar.
- HTML protegido contra inyección de nombres almacenados.
