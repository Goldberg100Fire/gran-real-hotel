# Gran Real Hotel

Sistema de reservas para **Gran Real Hotel** (Otuzco, La Libertad): disponibilidad, reservas, acceso por correo y panel admin.

## Qué incluye

- Sitio público con logo, fotos reales y estilo café/dorado de la marca
- Consulta de habitaciones Simple, Matrimonial y Doble
- Reserva con acceso por código al correo (comprobante por email)
- Panel admin para habitaciones, tipos y reservas
- Pago en línea (Mercado Pago / Yape) preparado para activar después

## Stack

- Next.js + TypeScript + Tailwind
- Firestore (inventario y reservas)
- Resend (correos)
- Mercado Pago (opcional, más adelante)

## Arranque local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://127.0.0.1:3451`. Sin Firebase, la app usa datos locales de ejemplo.

## Base de datos (Firestore)

Guía: [docs/FIRESTORE.md](docs/FIRESTORE.md)

1. Crea el proyecto en Firebase Console  
2. Activa Firestore (modo producción)  
3. Publica las reglas de `firestore.rules`  
4. Configura las variables de la service account  
5. Ejecuta `npm run seed:firestore`

## Datos del hotel

- **Dirección:** Calle Tacna Nº 542 · Otuzco · La Libertad  
- **Cel.:** 978113578 · **Telf.:** 044 727074  
- **Habitaciones:** Simple, Matrimonial, Doble  
- **Servicios:** Baño privado, Agua caliente, TV cable, Wi‑Fi  

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3451) |
| `npm run seed:firestore` | Carga inventario inicial en Firestore |
| `npm run build` | Build de producción |
