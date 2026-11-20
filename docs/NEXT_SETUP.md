# Qué falta configurar · Gran Real Hotel

## Ya listo
- Proyecto Firebase `gran-real-hotel`
- Firestore con hotel, servicios, tipos y 12 habitaciones
- Secretos: `FIREBASE_*`, `GOOGLE_CLIENT_*`, `ADMIN_ALLOWED_EMAILS`

## Pendiente (tú creas / agregas en el formulario seguro)

### 1. Sesión admin/huésped
- `ADMIN_SESSION_SECRET` → genera una clave larga (32+ caracteres), por ejemplo en terminal:
  `openssl rand -base64 48`

### 2. Correo (Resend) — códigos de acceso + comprobantes
1. Crea cuenta en [https://resend.com](https://resend.com)
2. Crea API Key
3. Agrega secretos:
   - `RESEND_API_KEY`
   - `MAIL_FROM` → al inicio puedes usar `Gran Real Hotel <onboarding@resend.dev>`

### 3. Pagos reales (Stripe)
1. Crea cuenta en [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Modo **test** primero
3. Agrega secretos:
   - `STRIPE_SECRET_KEY` (`sk_test_...`)
   - `STRIPE_PUBLISHABLE_KEY` (`pk_test_...`)
   - `STRIPE_WEBHOOK_SECRET` (`whsec_...`)
4. Webhook en Stripe apuntando a:
   `https://TU-DOMINIO/api/stripe/webhook`
   Evento: `checkout.session.completed`

### 4. Google OAuth (redirect)
En Google Cloud Console, URI autorizada:
`https://TU-DOMINIO/api/auth/google/callback`
(y local `http://127.0.0.1:3451/api/auth/google/callback` si pruebas en local)

## Flujo ya programado
1. Huésped entra con Google o código por correo  
2. Completa reserva → Stripe Checkout  
3. Webhook confirma pago → guarda en Firestore → envía comprobante  
