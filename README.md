# Gran Real Hotel

Sistema de reservas para **Gran Real Hotel** (Otuzco, La Libertad): disponibilidad, reservas, acceso por correo y panel admin.

## Stack

- Next.js + TypeScript + Tailwind
- **Firestore** (inventario y reservas)
- Stripe (pagos) y Resend (correos) — siguientes pasos

## Arranque local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin Firebase, la app usa datos locales de ejemplo. Con Firebase configurado, usa Firestore.

## Base de datos (Firestore)

Guía completa: [docs/FIRESTORE.md](docs/FIRESTORE.md)

Resumen:

1. Crea el proyecto en Firebase Console  
2. Activa Firestore (modo producción)  
3. Publica las reglas de `firestore.rules`  
4. Genera la service account y guarda las 3 variables  
5. Ejecuta `npm run seed:firestore`

Verifica con:

```bash
curl http://127.0.0.1:3451/api/health
```

## Datos del hotel

- **Dirección:** Calle Tacna Nº 542 · Otuzco · La Libertad  
- **Cel.:** 978113578 · **Telf.:** 044 727074  
- **Habitaciones:** Simple, Matrimonial, Doble  
- **Servicios:** Baño privado, Agua caliente, TV cable, Wi‑Fi  

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run seed:firestore` | Carga inventario inicial en Firestore |
| `npm run build` | Build de producción |
