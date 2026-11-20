# Hotel Brisa Pacífico

Sistema web de reservas hoteleras con acceso por correo, disponibilidad, pagos demo, comprobante por email y panel administrativo.

## Qué incluye

- **Acceso por correo** (`/acceso`): Google OAuth o código de 6 dígitos al email.
- **Reservas** (`/reservar`): requiere sesión; el comprobante se envía al correo de la sesión.
- **Mis reservas** (`/mis-reservas`): historial del huésped autenticado.
- **Admin** (`/admin`): solo correos listados en `ADMIN_ALLOWED_EMAILS`.

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abre el puerto del script (`3451`).

### Acceso local (demo)

1. Ve a `/acceso`, ingresa un correo y usa el código demo que aparece en pantalla.
2. Para admin, usa un correo de `ADMIN_ALLOWED_EMAILS` (por defecto `admin@brisapacifico.pe`).

### Variables

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — login con Google
- `ADMIN_ALLOWED_EMAILS` — correos admin separados por coma
- `ADMIN_SESSION_SECRET` — firma de cookies
- `RESEND_API_KEY` / `MAIL_FROM` — envío real de comprobantes (si faltan, modo demo en bandeja admin)
- `DATABASE_URL` — Postgres opcional; si no hay, usa `data/hotel.json`

En Google Cloud Console, agrega el redirect:
`https://TU-DOMINIO/api/auth/google/callback` (y el local si pruebas OAuth).

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui.
