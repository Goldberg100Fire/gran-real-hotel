# Mercado Pago · Gran Real Hotel (Perú)

El pago online (Yape / tarjeta) va a la **cuenta Mercado Pago del dueño**.

## 1. Crear cuenta
1. Entra a [https://www.mercadopago.com.pe](https://www.mercadopago.com.pe)
2. Crea / inicia sesión con el correo del dueño o del negocio
3. Completa datos del comercio (hotel)

## 2. Credenciales
1. Entra a [https://www.mercadopago.com.pe/developers/panel/app](https://www.mercadopago.com.pe/developers/panel/app)
2. Crea una aplicación: `Gran Real Hotel`
3. Abre **Credenciales**
4. Empieza con **Credenciales de prueba**
5. Copia:
   - **Public Key** → secreto `MERCADOPAGO_PUBLIC_KEY`
   - **Access Token** → secreto `MERCADOPAGO_ACCESS_TOKEN`

## 3. Webhook (cuando la app tenga dominio)
URL de notificación:
`https://TU-DOMINIO/api/mercadopago/webhook`

Eventos: pagos / `payment`.

## 4. Producción
Cuando todo funcione en prueba, cambia a **Credenciales de producción** y vuelve a guardar los secretos.
