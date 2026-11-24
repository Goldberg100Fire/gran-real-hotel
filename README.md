# Gran Real Hotel

Sitio informativo de **Gran Real Hotel** (Otuzco, La Libertad): habitaciones, contacto y un bot público de consultas. Las reservas se confirman **solo por teléfono**.

**En vivo:** https://gran-real-hotel.vercel.app/

## Qué incluye

- Página pública con logo, fotos y datos del hotel
- Habitaciones Simple, Matrimonial, Doble, Familiar y Suite (foto y servicios por tipo)
- Varias **sedes** con dirección, teléfonos y fotos propias (`/sede/[ciudad]`)
- Botón flotante **Consultar** para preguntas sin iniciar sesión
- Reservas por llamada (cada sede tiene su número)
- Panel interno en `/personal` con **correo y contraseña** (sin registro público)
- El **jefe** autoriza correos de empleados; cada uno crea su contraseña; solo el jefe recupera solo; empleados necesitan su OK
- El **jefe** crea/edita tipos, **sube fotos** por habitación, servicios y ofertas/fiestas
- **Sucursales:** cada sede tiene su dirección, teléfonos, foto del hotel, habitaciones y ofertas (`/sede/[ciudad]`)

## Cómo reservar

1. Revisa habitaciones en la web  
2. Llama al hotel  
3. Confirma fechas, precio y forma de pago por teléfono  

No hay login de huéspedes ni reservas online.

## Stack

- Next.js + TypeScript + Tailwind
- Firestore (inventario; opcional para el panel)
- Resend (códigos de acceso del personal)

## Arranque local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://127.0.0.1:3451`. Sin Firebase, la app usa datos locales de ejemplo.

## Acceso admin (producción)

1. Entra a https://gran-real-hotel.vercel.app/personal  
2. Correo del jefe = el de `ADMIN_ALLOWED_EMAILS`  
3. Primer acceso: crea contraseña con el código que llega al correo  

### Variables obligatorias en Vercel

Copia en **Vercel → Settings → Environment Variables** (Production) las mismas que ya usas en Cursor:

| Variable | Para qué |
|---|---|
| `ADMIN_ALLOWED_EMAILS` | Correo(s) del jefe |
| `ADMIN_SESSION_SECRET` | Sesión (≥ 32 caracteres) |
| `ADMIN_PASSWORD` | Login de arranque del jefe (recomendado en Vercel) |
| `FIREBASE_PROJECT_ID` | Persistencia real |
| `FIREBASE_CLIENT_EMAIL` | Persistencia real |
| `FIREBASE_PRIVATE_KEY` | Clave del service account (con `\n`) |
| `RESEND_API_KEY` / `MAIL_FROM` | Códigos crear/recuperar contraseña |

Después: **Redeploy**. Comprueba `/api/health` → `"storage":"firestore"`.

Sin Firestore la web pública sigue; el jefe puede entrar con `ADMIN_PASSWORD`, pero fotos/empleados no se guardan de forma permanente.

## Datos del hotel

- **Dirección:** Calle Tacna Nº 542 · Otuzco · La Libertad  
- **Cel.:** 978113578 · **Telf.:** 044 727074  
- **Habitaciones:** Simple, Matrimonial, Doble, Familiar, Suite Matrimonial  
- **Servicios base:** Baño privado, Agua caliente, TV cable, Wi‑Fi (más opciones por tipo)  

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3451) |
| `npm run seed:firestore` | Carga inventario inicial en Firestore |
| `npm run build` | Build de producción |
