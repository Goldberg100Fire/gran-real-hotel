# Gran Real Hotel

Sitio informativo de **Gran Real Hotel** (Otuzco, La Libertad): habitaciones, contacto y un bot público de consultas. Las reservas se confirman **solo por teléfono**.

## Qué incluye

- Página pública con logo, fotos y datos del hotel
- Habitaciones Simple, Matrimonial, Doble, Familiar y Suite (foto y servicios por tipo)
- Botón flotante **Consultar** para preguntas sin iniciar sesión
- Reservas por llamada: Cel. 978113578 · Telf. 044 727074
- Panel interno del personal en `/personal` (solo correos autorizados)
- El **jefe** crea/edita tipos (foto, precio, servicios), el catálogo de servicios y ofertas/fiestas

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
