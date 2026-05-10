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

## Raspberry

Lo mas limpio es que `RPI_STREAM_COMMAND` arranque un servicio ya definido en la Raspberry, por ejemplo:

```bash
sudo systemctl start qviart-stream.service
```

Asi la web no contiene el comando largo de captura y la Raspberry puede gestionar permisos, logs y reinicios.

## Desarrollo

```bash
npm install
npm run dev
```

Si npm se atasca en Windows dentro de una carpeta con espacios, usa una carpeta sin espacios o `corepack pnpm install`.
