# habisite-api

Backend del Habisite Design Challenge 2026. NestJS 12 + PostgreSQL, con SQL
plano y migraciones a mano — sin ORM.

La documentación vive en [`docs/`](docs/README.md): arquitectura, modelo de
datos, máquinas de estado y la bitácora de configuración.

## Correr en local

```bash
cp .env.example .env    # y completar las credenciales de Google
npm install
npm run start:dev       # http://localhost:3000/salud
```

Si falta una variable del `.env` o tiene una forma imposible, el proceso no
arranca y dice cuál.

## Estructura

```
src/
├─ main.ts            CORS, cookies, tope de body, filtro de errores
├─ app.module.ts      arma el conjunto y valida el entorno
├─ configuracion/     el .env tipado y validado
├─ comun/
│  ├─ base-de-datos/  el Pool de pg, inyectable en todo el proyecto
│  ├─ autorizacion/   @Roles(), RolGuard, CierreGuard
│  └─ filtros/        una sola forma de error para toda la API
└─ salud/             GET /salud, el health check de Railway
```

Los nombres van en español, como el resto del repo (`CLAUDE.md` §9).
