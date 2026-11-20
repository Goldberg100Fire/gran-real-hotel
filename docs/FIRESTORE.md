# Crear Firestore para Gran Real Hotel

Sigue estos pasos en orden. Al terminar, el sistema podrá guardar habitaciones, reservas y estados.

## 1. Crear el proyecto Firebase

1. Abre [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Inicia sesión con tu cuenta Google.
3. Pulsa **Create a project** / **Agregar proyecto**.
4. Nombre sugerido: `gran-real-hotel`
5. Puedes desactivar Google Analytics (no es necesario ahora).
6. Espera a que termine de crearse y entra al proyecto.

## 2. Activar Firestore

1. En el menú izquierdo: **Build → Firestore Database**.
2. Pulsa **Create database**.
3. Elige **Start in production mode** (modo producción).
4. Ubicación recomendada: `southamerica-east1` (São Paulo) o la más cercana a Perú.
5. Confirma **Enable**.

## 3. Pegar las reglas de seguridad

1. Pestaña **Rules**.
2. Reemplaza todo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Pulsa **Publish**.

> La app escribe desde el servidor con una cuenta de servicio. Nadie desde el navegador debe poder tocar la base.

## 4. Crear la cuenta de servicio (clave de conexión)

1. Ícono de engranaje → **Project settings**.
2. Pestaña **Service accounts**.
3. Asegúrate de que diga **Firebase Admin SDK**.
4. Pulsa **Generate new private key** → **Generate key**.
5. Se descarga un archivo JSON. Ábrelo solo en tu PC.

Del JSON vas a usar:

| Campo del JSON | Variable que necesita la app |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

**No pegues ese JSON en el chat.** Cárgalo en:
- el formulario seguro de Cursor, **o**
- un archivo local `.env.local` (nunca se sube a Git).

Para `FIREBASE_PRIVATE_KEY`, deja los `\n` como vienen en el JSON, entre comillas:

```env
FIREBASE_PROJECT_ID=gran-real-hotel
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@gran-real-hotel.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

## 5. Cargar el inventario del hotel

Con las 3 variables listas:

```bash
cp .env.example .env.local
# edita .env.local con tus 3 valores FIREBASE_*
npm run seed:firestore
```

Eso crea automáticamente:

- `hotel/gran-real` — datos del hotel (Otuzco, teléfonos, dirección)
- `services` — Baño privado, Agua caliente, TV cable, Wi‑Fi
- `roomTypes` — Simple, Matrimonial, Doble
- `rooms` — 12 habitaciones con estados

## 6. Verificar que quedó bien

En Firebase Console → Firestore deberías ver las colecciones:

```
hotel
services
roomTypes
rooms
```

En la app:

```bash
npm run dev
curl http://127.0.0.1:3451/api/health
```

Respuesta esperada: `"storage":"firestore"` y los 3 tipos de habitación.

## Colecciones del sistema

| Colección | Para qué |
|---|---|
| `hotel` | Nombre, dirección, contactos |
| `services` | Servicios incluidos |
| `roomTypes` | Tipos y precios |
| `rooms` | Inventario y estado |
| `reservations` | Reservas (se crean al reservar) |
| `loginCodes` | Códigos de acceso por correo |
| `mailOutbox` | Historial de correos enviados |

## Si algo falla

- **Permission denied**: revisa que usas la private key de *este* proyecto.
- **Invalid private key**: la clave debe ir entre comillas y con `\n`.
- **storage: local` en /api/health**: faltan las variables FIREBASE_* en el entorno donde corre la app.
