# Activar PagoEfectivo (Gran Real Hotel)

El sistema genera un **código CIP único** por reserva. El huésped lo paga en agentes o banca móvil.

## 1. Crear cuenta comercial

1. Entra a [https://pagoefectivo.pe](https://pagoefectivo.pe) (o el portal de afiliados que te indiquen).
2. Solicita afiliación como comercio (hotel / servicios).
3. Te pedirán datos de la empresa, RUC, cuenta bancaria y contacto del dueño.
4. Cuando aprueben, te envían por correo:

| Dato | Variable en Cursor |
|---|---|
| Access Key | `PAGOEFECTIVO_ACCESS_KEY` |
| Secret Key | `PAGOEFECTIVO_SECRET_KEY` |
| ID Service (4 dígitos) | `PAGOEFECTIVO_ID_SERVICE` |

## 2. Guardar secretos en Cursor

En **Secrets** del app (o del entorno):

1. `PAGOEFECTIVO_ACCESS_KEY`
2. `PAGOEFECTIVO_SECRET_KEY`
3. `PAGOEFECTIVO_ID_SERVICE`
4. `PAGOEFECTIVO_ENV` → `sandbox` primero, luego `production`
5. `PAGOEFECTIVO_WEBHOOK_SECRET` → puedes usar la misma Secret Key si PagoEfectivo no te da otra
6. `APP_URL` → URL pública del app, ej. `https://gran-real-hotel.apps.grok.bot`

**No pegues las claves en el chat.** Solo en el formulario seguro.

## 3. Webhook (notificación de pago)

En el panel de PagoEfectivo configura la URL de notificación:

```
https://gran-real-hotel.apps.grok.bot/api/pagoefectivo/webhook
```

Cuando el CIP se paga, PagoEfectivo avisa y la reserva pasa a **pagado**.

## 4. Probar

1. Ambiente `sandbox` + credenciales de prueba.
2. Reserva una habitación → debe salir CIP **live** (no “de prueba”).
3. Simula el pago en el simulador que te den.
4. Verifica que en **Mis reservas** el estado pase a pagado.
5. Cambia `PAGOEFECTIVO_ENV` a `production` y republica.

## Sin claves

Si faltan las 3 claves principales, el sistema genera un **CIP de prueba** solo para ver el flujo. No cobra dinero real.
