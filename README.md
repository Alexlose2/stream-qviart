# Stream Qviart

Panel web privado para arrancar bajo demanda una transmision de la capturadora conectada a una Raspberry Pi.

## Que hace

- Login con Google mediante Firebase Authentication.
- Lista blanca de emails con `ALLOWED_EMAILS`.
- Boton protegido que ejecuta un comando SSH en la Raspberry.
- Reproductor configurable con `NEXT_PUBLIC_STREAM_URL`.
- Preparado para desplegar en Vercel y apuntar `stream.alexlose2.me`.

## Variables necesarias

Copia `.env.example` a `.env.local` para desarrollo local y configura los mismos valores en Vercel para produccion.

El comando de la Raspberry no lo envia el navegador. Vive en `RPI_STREAM_COMMAND`, se ejecuta solo en el servidor y solo despues de validar la sesion.

## Firebase Auth

En Firebase Console crea una Web App y activa Authentication con Google. Anade este dominio autorizado:

- `stream.alexlose2.me`

Despues configura en Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`

Tambien activa en Authentication el proveedor `Email/Password` si quieres
entrar con correo y contrasena.

Para la pestana Admin, crea una base de datos Firestore y usa reglas como estas:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null && request.auth.token.email_verified == true;
    }

    function bootstrapAdmin() {
      return signedIn() && request.auth.token.email == "alexlose2@gmail.com";
    }

    function storedAdmin() {
      return signedIn()
        && exists(/databases/$(database)/documents/allowedEmails/$(request.auth.token.email))
        && get(/databases/$(database)/documents/allowedEmails/$(request.auth.token.email)).data.role == "admin";
    }

    match /allowedEmails/{emailId} {
      allow get: if signedIn() && (
        resource.data.email == request.auth.token.email
        || bootstrapAdmin()
        || storedAdmin()
      );
      allow list, create, update, delete: if bootstrapAdmin() || storedAdmin();
    }
  }
}
```

## Raspberry

Lo mas limpio es que `RPI_STREAM_COMMAND` arranque un servicio ya definido en la Raspberry, por ejemplo:

```bash
sudo systemctl start qviart-stream.service
```

Asi la web no contiene el comando largo de captura y la Raspberry puede gestionar permisos, logs y reinicios.

Si la Raspberry solo esta dentro de tu red local, usa `raspberry-agent/server.mjs`
con Tailscale Funnel y configura en Vercel:

- `RPI_AGENT_URL`
- `RPI_AGENT_TOKEN`

En ese modo Vercel no usa SSH. Llama por HTTPS al Funnel y el agente local ejecuta
`STREAM_COMMAND` en la Raspberry.

Ejemplo en la Raspberry:

```bash
cd ~/stream-qviart/raspberry-agent
AGENT_TOKEN="pon-un-token-largo" STREAM_COMMAND="sudo systemctl start qviart-stream.service" node server.mjs
sudo tailscale funnel --https=443 http://127.0.0.1:8787
```

La URL resultante de Tailscale acabara en `/start` para `RPI_AGENT_URL`.

## Desarrollo

```bash
npm install
npm run dev
```

Si npm se atasca en Windows dentro de una carpeta con espacios, usa una carpeta sin espacios o `corepack pnpm install`.
