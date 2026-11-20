# Hotel Brisa Pacífico

Sistema web de reservas hoteleras con disponibilidad en tiempo real, precios por tipo de habitación, captura de datos del huésped, pagos online en modo demostración y panel administrativo.

## Qué incluye

- **Sitio público**: inicio, catálogo de habitaciones, consulta por fechas, reserva y pago.
- **Métodos de pago**: tarjeta, Yape, Plin, transferencia o pago en el hotel (simulados).
- **Admin** (`/admin`): estados de habitaciones, tipos, servicios incluidos y gestión de reservas.

## Cómo ejecutar

```bash
npm install
npm run dev -- --port 3451
```

Abre `http://localhost:3451`.

### Panel admin (local)

Contraseña demo: `brisa-admin`

En producción define:

- `ADMIN_PASSWORD` — acceso al panel
- `ADMIN_SESSION_SECRET` — firma de la cookie de sesión (recomendado)
- `DATABASE_URL` — Postgres (opcional en local; si no hay, se usa `data/hotel.json`)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Persistencia en archivo local o Postgres cuando existe `DATABASE_URL`.
