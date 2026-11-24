# Variables de entorno en Vercel

Proyecto: https://gran-real-hotel.vercel.app/  
Panel: https://vercel.com → proyecto **gran-real-hotel** → **Settings** → **Environment Variables**

Marca **Production** (y Preview si quieres). Luego **Redeploy**.

## Obligatorias (login + datos)

| Nombre | Dónde sacar el valor |
|---|---|
| `ADMIN_ALLOWED_EMAILS` | Correo del jefe, ej. `geylquimichen@ucvvirtual.edu.pe` |
| `ADMIN_SESSION_SECRET` | Cadena aleatoria ≥ 32 caracteres |
| `ADMIN_PASSWORD` | Contraseña de arranque del jefe (la que usarás en `/personal`) |
| `FIREBASE_PROJECT_ID` | Campo `project_id` del JSON de service account |
| `FIREBASE_CLIENT_EMAIL` | Campo `client_email` del JSON |
| `FIREBASE_PRIVATE_KEY` | Campo `private_key` del JSON (incluye `-----BEGIN…` y `\n`) |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `MAIL_FROM` | Ej. `Gran Real Hotel <onboarding@resend.dev>` |

## Recomendadas

| Nombre | Valor |
|---|---|
| `APP_URL` | `https://gran-real-hotel.vercel.app` |
| `GOOGLE_CLIENT_ID` | Si usas Google (opcional) |
| `GOOGLE_CLIENT_SECRET` | Si usas Google (opcional) |

## Cómo pegar `FIREBASE_PRIVATE_KEY`

1. Abre el JSON de Firebase → copia `private_key` completo.
2. En Vercel pégalo **en una sola línea** con `\n` literales, o multilínea si el panel lo permite.
3. No agregues comillas extra alrededor de todo el valor.

## Comprobar

Tras el redeploy:

```bash
curl https://gran-real-hotel.vercel.app/api/health
```

Debe mostrar `"storage":"firestore"` y `"firestoreConfigured":true`.

Login: https://gran-real-hotel.vercel.app/personal
