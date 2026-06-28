# Azul Store API

API REST en NestJS + MongoDB para autenticación, catálogo, carrito y pedidos.

## Módulos principales

- Auth: login, refresh, logout, perfil, registro público y registro admin
- Users: datos de usuario y dirección
- Products: catálogo, stock por talla, imágenes y subcategorías
- Orders: checkout y pedidos del usuario

## Requisitos

- Node.js 20+
- npm 10+
- MongoDB local o Atlas

## Variables de entorno

Crea archivo .env en esta carpeta usando .env.example:

PORT=3000
MONGO_URI=mongodb://localhost:27017/azul_store
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_DAYS=7
CLIENT_URL=http://localhost:5173

## Instalación

cd /Users/haroldnc/Documents/Code/Tareas/azul-store-api
npm install

## Desarrollo

cd /Users/haroldnc/Documents/Code/Tareas/azul-store-api
npm start

Alternativas:

- npm run start:dev
- npm run start:prod

## Build

cd /Users/haroldnc/Documents/Code/Tareas/azul-store-api
npm run build

## Endpoints clave

Auth:

- POST /auth/register (registro público, rol user fijo)
- POST /auth/admin/register (solo admin, permite roles)
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me
- PATCH /auth/me/address

Products:

- GET /products
- GET /products/:id
- POST /products (admin)
- PATCH /products/:id (admin)
- PATCH /products/:id/stock (admin)

Orders:

- POST /orders/checkout
- GET /orders/me

## Notas de dominio

- El stock se administra por talla en stockBySize y el total se recalcula automáticamente.
- Cada producto admite hasta 5 imágenes totales, incluida la principal.
- Las subcategorías se normalizan en backend para la experiencia de Explora en frontend.

## Bootstrap del primer admin

Como /auth/admin/register requiere rol admin, el primer admin se promueve manualmente en Mongo:

db.users.updateOne(
{ email: "tu-email@dominio.com" },
{ $set: { roles: ["admin", "user"] } }
)
