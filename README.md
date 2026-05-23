# Marketplace — Sprint 2 (Node.js + Express)

Esta es la implementación del **Sprint 2** solicitado, construida como un proyecto totalmente nuevo en **Node.js, Express y SQLite** siguiendo estrictamente la metodología **Spec-Driven Development (SDD)**.

> Nota: El proyecto original `producto-app` (Java/Spring Boot) se mantiene intacto en la raíz del workspace como referencia al Sprint 1.

---

## 1. Arquitectura Final

La arquitectura sigue el patrón MVC / API REST con un frontend SPA (Single Page Application) en Vanilla JS, servido por el mismo Express.

### Backend (API REST)
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4
- **Base de Datos:** SQLite3 (vía `better-sqlite3`) — elegida por no requerir dependencias externas y funcionar perfectamente en Render.
- **Autenticación:** JWT (JSON Web Tokens) + `bcryptjs` para contraseñas.
- **Seguridad:** Middleware de protección de rutas por roles (`ADMIN`, `OFERTANTE`, `DEMANDANTE`) y verificación de ownership para edición/eliminación.
- **Testing:** Jest + Supertest (Behavior-Driven).

### Frontend (SPA)
- HTML5, CSS3, JS Vanilla (sin bundlers).
- Peticiones asíncronas con `fetch`.
- Manejo de estado de autenticación en `localStorage`.

---

## 2. Flujo Completo del Sistema

El flujo de aprobación (HU-01, HU-02, HU-03) funciona así:

1. **Registro:** Un usuario se registra como `OFERTANTE`.
2. **Creación (HU-01):** El `OFERTANTE` crea un producto desde su Dashboard. El estado inicial es automáticamente **PENDING**. El producto no aparece en la página pública.
3. **Moderación (HU-03):** El `ADMIN` ingresa a su panel y ve la "Cola de Moderación". Revisa el producto y hace clic en **Aprobar** (cambia a **APPROVED**).
4. **Visibilidad Pública:** Ahora el producto aparece en la Landing Page pública (`index.html`) para los demandantes.
5. **Edición con Reset (HU-02):** Si el `OFERTANTE` edita un campo crítico (Título, Descripción, Precio, Categoría) de su producto aprobado, el sistema intercepta el cambio y devuelve automáticamente el estado a **PENDING**. El producto desaparece de la vista pública hasta que el admin lo vuelva a aprobar.

---

## 3. Instrucciones de Instalación

```bash
# 1. Entrar al directorio
cd scratch/marketplace-sprint2

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm run dev
```
La aplicación estará corriendo en **http://localhost:3000**

### Variables de Entorno (.env)
No son estrictamente necesarias para desarrollo (tiene valores por defecto fallback), pero para producción en Render se debe configurar:
- `JWT_SECRET=tu_secreto_super_seguro`
- `NODE_ENV=production`

---

## 4. Cómo Correr los Tests (SDD)

Antes de escribir el código de los controladores, se escribieron los tests de comportamiento en `/tests/auth.test.js` y `/tests/products.test.js`.

Para ejecutar la suite de pruebas completa:

```bash
npm run test
```

> La base de datos SQLite cambia automáticamente a modo `:memory:` durante los tests para no ensuciar la base de datos de desarrollo.

---

## 5. Instrucciones de Despliegue en Render

El proyecto incluye un archivo `render.yaml` que automatiza el despliegue como *Blueprint*.

1. Sube este repositorio a GitHub.
2. Ve a [Render.com](https://render.com) > **Blueprints** > **New Blueprint Instance**.
3. Conecta tu repositorio. Render leerá el `render.yaml` y configurará el *Web Service* (Node, `npm install`, `node server.js`) automáticamente.
4. Render generará un `JWT_SECRET` seguro automáticamente gracias a la propiedad `generateValue: true`.

---

## 6. Guía de Demostración al Docente

Para demostrar el funcionamiento correcto del Sprint 2 al docente, sigue estos pasos:

1. **Abre http://localhost:3000** — Verás que está vacío.
2. **Crea un ofertante:** Ve a "Registrarse", ingresa datos y selecciona "Ofertante". Serás redirigido al Dashboard Ofertante.
3. **Publica un servicio:** Clic en "Crear Nuevo", llena los datos y guarda. Verás que en la tabla aparece con estado `PENDING`.
4. **Verifica la privacidad:** Ve a "Ver Tienda Pública". Comprueba que el producto NO aparece.
5. **Crea al administrador:** Cierra sesión, ve a "Registrarse" y selecciona rol "Ofertante" (Nota: *Para la demo, puedes cambiar el rol a ADMIN directamente en la BD, o usar el script de tests que ya crea un admin en `admin@test.com` / `password123`*).
6. **Aprueba el producto:** Entra como Admin al Dashboard Admin. Verás el producto PENDING. Dale clic a "Aprobar".
7. **Verifica la publicación:** Ve a "Ver Tienda Pública" y ahora el producto sí aparece.
8. **Prueba el Reset Automático:** Vuelve a entrar como el ofertante. Edita el título del producto. Guarda. Verás una alerta de que el producto "volverá a PENDING". Verifica en la tienda pública que volvió a desaparecer.
