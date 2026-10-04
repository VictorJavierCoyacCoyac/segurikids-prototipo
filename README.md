# SeguriKids · Prototipo funcional

**Plataforma de control de acceso y recogida segura para centros de educación preescolar.**

> ⚠️ **Prototipo académico de demostración.** Todos los datos son ficticios y las
> credenciales son públicas por diseño. No está endurecido para producción ni
> cumple, por sí mismo, los requisitos legales de tratamiento de datos de
> menores. Consulta [Limitaciones](#limitaciones-del-prototipo).

---

## 1. Qué es SeguriKids

Muchos centros preescolares siguen controlando la entrada y la salida de los
niños con listas en papel. Eso provoca colas en la puerta, errores de registro,
falta de trazabilidad y, sobre todo, incertidumbre en el momento más delicado
del día: **saber con certeza que cada niño se va con la persona correcta**.

SeguriKids sustituye ese proceso manual por un control digital que:

- registra cada entrada y salida con fecha, hora, método y responsable;
- identifica mediante **código QR** a la persona que llega a recoger;
- **valida su autorización antes de permitir la entrega** y bloquea los casos no
  autorizados;
- avisa automáticamente al padre o tutor cuando su hijo entra o sale;
- permite la comunicación escuela ↔ familia;
- difunde alertas de emergencia a toda la comunidad escolar;
- genera reportes de asistencia, puntualidad, recogidas e incidencias;
- deja una bitácora de auditoría de todas las acciones sensibles.

### Objetivo de este prototipo

Poder **abrir la aplicación y simular una jornada completa** de un centro
educativo, con datos relacionados y lógica de negocio real, de modo que una
demostración muestre el sistema funcionando y no una maqueta de pantallas.

La característica estrella es el **control seguro y rápido de la recogida**:
identificación de la persona, validación de su autorización y registro
automático de la salida.

---

## 2. Tecnologías

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router, React Server Components) |
| Lenguaje | TypeScript en modo estricto |
| Interfaz | React 19 + Tailwind CSS 3 + lucide-react |
| Lógica de negocio | Server Actions + capa de servicios propia |
| ORM | Prisma 6 |
| Base de datos | SQLite (migrable a PostgreSQL sin cambios de código) |
| Validación | Zod |
| Códigos QR | `qrcode` (generación) + `BarcodeDetector` nativo (lectura) |

Decisiones deliberadas para mantener el prototipo ligero y fácil de modificar:

- **Sin librería de gráficas.** Las visualizaciones son SVG/CSS propios
  (`src/components/ui/stat.tsx`), lo que evita ~100 kB de JavaScript.
- **Sin librería de componentes.** El sistema de diseño vive en
  `src/components/ui/`, es pequeño y se adapta sin luchar contra estilos ajenos.
- **Sin dependencia de escáner.** La lectura usa la API nativa del navegador y
  siempre existe una alternativa manual y otra simulada.
- **Sin fuentes remotas.** Se usa la pila tipográfica del sistema, de modo que
  la aplicación compila y funciona sin conexión a Internet.

---

## 3. Arquitectura

```
CLIENTE                          BACKEND / API                  DATOS
─────────────────────────        ───────────────────────        ──────────────
React Server Components    →     Server Actions           →     Prisma Client
Componentes de cliente           Capa de servicios              SQLite / Postgres
(escáner, formularios)           Route handlers (QR, CSV)
```

La regla que sostiene el proyecto: **la interfaz nunca habla con la base de
datos**. Toda operación pasa por un servicio, y toda mutación pasa además por
una server action que valida permisos y datos de entrada.

```
src/
├── app/                          Rutas (App Router)
│   ├── login/                    Acceso + cuentas demo
│   ├── app/                      📱 App familiar (padre / tutor)
│   ├── staff/                    🏫 Panel del personal escolar
│   ├── admin/                    📊 Panel de dirección
│   └── api/
│       ├── qr/                   Generación del PNG del código QR
│       └── reports/export/       Exportación CSV real
│
├── components/
│   ├── ui/                       Sistema de diseño (botones, tarjetas, campos…)
│   ├── layout/                   Estructuras de navegación por rol
│   └── domain/                   Componentes de negocio reutilizables
│       └── scanner/              ⭐ Consola de control de salida
│
├── lib/
│   ├── auth/                     Sesión demo, contraseñas y matriz de permisos
│   ├── domain/                   Catálogos: estados, roles, tipos, etiquetas
│   ├── validation/               Esquemas Zod compartidos
│   ├── utils/                    Fechas, formato, CSV, clases CSS
│   └── db.ts                     Cliente Prisma único
│
├── server/
│   ├── services/                 ⭐ Lógica de negocio (única que toca la BD)
│   │   ├── attendance.ts         Validación de QR y registro de movimientos
│   │   ├── authorizations.ts     Personas autorizadas y permisos de recogida
│   │   ├── students.ts           Alumnado
│   │   ├── dashboard.ts          Agregados de los paneles
│   │   ├── reports.ts            Reportes y filas del CSV
│   │   ├── emergencies.ts        Alertas e incidencias
│   │   ├── messages.ts           Comunicación escuela ↔ familia
│   │   ├── notifications.ts      Centro de avisos
│   │   ├── audit.ts              Bitácora de auditoría
│   │   └── users.ts              Tutores y personal
│   └── actions/                  Server actions (validan permisos y entrada)
│
├── middleware.ts                 Primera barrera de acceso por ruta
└── prisma/
    ├── schema.prisma             Modelo relacional documentado
    ├── migrations/               Migración inicial
    └── seed.ts                   Escenario DEMO completo y determinista
```

El corazón del sistema es `registerMovement()` en
[`src/server/services/attendance.ts`](src/server/services/attendance.ts): es la
**única** función que modifica el estado de un alumno, de forma que ese estado
siempre es consecuencia de un movimiento auditado.

### Modelo de datos

```
School ──┬── User ──────────┬── Student ──┬── AttendanceEvent
         │   (ADMIN/STAFF/  │  (tutorId)  │
         │    PARENT)       │             └── StudentAuthorizedPerson ──┐
         │                  │                                          │
         │                  ├── Notification                           │
         │                  └── Conversation ── Message                 │
         │                                                             │
         ├── AuthorizedPerson ────────────────────────────────────────┘
         │   (qrIdentifier único)
         ├── EmergencyAlert
         ├── Incident
         └── AuditLog
```

`StudentAuthorizedPerson` es la tabla clave: relación N:M entre alumnos y
personas autorizadas, con un campo `active` que permite **revocar una
autorización concreta sin borrar el historial**.

---

## 4. Instalación

Requisitos: **Node.js 20 o superior** y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env

# 3. Crear la base de datos y cargar los datos DEMO
npm run db:migrate
npm run db:seed

# 4. Arrancar
npm run dev
```

Abre <http://localhost:3000>.

> Si npm bloquea los scripts de instalación (npm 11+), apruébalos una vez con:
> `npm install-scripts approve prisma @prisma/client @prisma/engines esbuild`

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Conexión a la base de datos. `file:./dev.db` en el prototipo; para PostgreSQL basta cambiar esta variable y el `provider` del esquema. |
| `SESSION_SECRET` | Clave para firmar la cookie de sesión (HMAC-SHA256). Mínimo 16 caracteres. En producción debe venir de un gestor de secretos. |
| `NEXT_PUBLIC_DEMO_MODE` | `"true"` muestra las credenciales y el acceso rápido en el login. Debe ser `"false"` en cualquier entorno que no sea una demostración. |

### Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilación y arranque en modo producción |
| `npm run typecheck` | Validación de TypeScript |
| `npm run lint` | ESLint |
| `npm run db:seed` | **Reinicia los datos DEMO** (útil antes de presentar) |
| `npm run db:reset` | Recrea la base de datos desde cero |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run verify` | ⭐ Verifica automáticamente los flujos de demostración |

`npm run verify` ejecuta 57 comprobaciones sobre una base de datos
independiente (`prisma/verify.db`, no toca tus datos) y confirma que la recogida
autorizada, el bloqueo de personas no autorizadas, las emergencias, la auditoría
y los reportes funcionan de verdad.

---

### Enseñar el prototipo a alguien de otra red

La forma más rápida es el **reenvío de puertos de VS Code**: panel *Puertos* →
*Reenviar un puerto* → `3000` → clic derecho → **Visibilidad: Público**. Sin
ese último paso, quien reciba el enlace verá un error de acceso.

Conviene servir la compilación de producción (`npm run build && npm start`):
arranca en menos de un segundo y va más fluido que el modo desarrollo.

> **Por qué hace falta `allowedOrigins`.** Next.js rechaza las Server Actions
> cuyo `Origin` no coincide con el `Host`, como protección contra CSRF. El proxy
> de los *dev tunnels* de VS Code **reescribe la cabecera `Origin`** con la
> dirección local de destino, así que al servidor le llega `localhost:3000`
> aunque el navegador esté en `xxx-3000.usw3.devtunnels.ms`. Por eso
> [`next.config.ts`](next.config.ts) autoriza tanto `localhost:3000` como
> `**.devtunnels.ms`. Sin esto la interfaz se ve, pero cualquier botón falla con
> *«Invalid Server Actions request»*.
>
> Ojo también con el comodín: el `*` de Next cubre **un solo** segmento de
> dominio, por lo que `*.devtunnels.ms` no encaja con
> `xxx-3000.usw3.devtunnels.ms`. Hay que usar `**`.

Tras cada `npm run build`, **recarga la página en el navegador** (Ctrl+Shift+R).
Una pestaña abierta antes de recompilar apunta a identificadores de acción
antiguos y da *«Failed to find Server Action»*.

Mientras el puerto esté público cualquiera con el enlace entra, y las
credenciales demo están visibles en la propia pantalla. Los datos son ficticios,
pero conviene volver a poner el puerto en privado al terminar.

## 5. Cuentas demo

Todas usan la contraseña **`demo1234`** y aparecen como botones de acceso rápido
en la pantalla de login.

| Rol | Correo | Persona (ficticia) |
| --- | --- | --- |
| Administración | `admin@demo.local` | Andrea Solís · Dirección general |
| Personal escolar | `docente@demo.local` | Ricardo Peña · Control de acceso |
| Padre / Tutor | `padre@demo.local` | Carmen Martínez · madre de Sofía y Emiliano |

También existen `docente2@demo.local`, `docente3@demo.local` y
`tutor2@demo.local` … `tutor11@demo.local` con la misma contraseña.

### Códigos QR preparados para la demostración

| Código | Persona | Resultado esperado |
| --- | --- | --- |
| `SK-DEMO-000101` | Carmen Martínez (tutora) | ✅ **AUTORIZADO** — dos hijos en plantel |
| `SK-DEMO-000201` | Rosa Elena Martínez (abuela) | ✅ **AUTORIZADO** |
| `SK-DEMO-000202` | Luis Ángel Ortega | ⛔ **NO AUTORIZADO** — autorización revocada |
| `SK-DEMO-000203` | Hugo Medina | ⛔ **NO AUTORIZADO** — persona suspendida |
| `SK-DEMO-999999` | — | ⛔ **CÓDIGO NO RECONOCIDO** |

---

## 6. DEMO PRINCIPAL

> **Escenario:** un tutor llega al centro a recoger a su hija. Duración: unos
> 3 minutos. Conviene tener dos ventanas o dos dispositivos abiertos.

### Preparación

```bash
npm run db:seed   # deja el escenario en su estado inicial
npm run dev
```

### Paso 1 · La familia muestra su código (ventana A)

1. Entra en <http://localhost:3000> y pulsa **Padre / Tutor** (Carmen Martínez).
2. En el inicio verás que **Sofía Martínez** y **Emiliano Martínez** están
   `EN PLANTEL`.
3. Pulsa **Mostrar mi QR**. Aparece la credencial con el código
   `SK-DEMO-000101`.
   *Observa el aviso: el QR solo contiene un identificador, nunca datos del
   menor.*

### Paso 2 · El personal escanea (ventana B)

4. Abre otra ventana en <http://localhost:3000>, cierra sesión si hace falta y
   entra como **Personal escolar** (Ricardo Peña).
5. Pulsa **Abrir escáner**.
6. Elige una de las tres vías — las tres ejecutan exactamente la misma
   validación en el servidor:
   - **Código** → escribe `SK-DEMO-000101` y pulsa *Validar identificación*.
   - **Cámara** → activa la cámara y apunta al QR de la ventana A.
   - **Simular** → elige *Carmen Martínez* en la lista (cada fila indica el
     resultado que producirá).

### Paso 3 · El sistema valida y el personal entrega

7. La pantalla muestra un **AUTORIZADO** verde e inequívoco, con la persona, su
   relación, el identificador, la hora y —si la tiene registrada— los últimos
   dígitos de su identificación para el cotejo visual.
8. Debajo aparecen **los dos alumnos** que puede recoger, preseleccionados.
   Puedes desmarcar a uno si solo se lleva a la otra.
9. Pulsa **Confirmar entrega**.

### Paso 4 · Comprueba que todo el sistema reaccionó

El comprobante ya enumera los efectos automáticos. Verifícalos uno a uno:

| Dónde mirar | Qué deberías ver |
| --- | --- |
| Escáner (mismo comprobante) | Salida registrada con hora y persona |
| **B** → *Alumnos* | Sofía pasó de `EN PLANTEL` a `FUERA DEL PLANTEL` |
| **B** → *Actividad reciente* | La salida encabeza la lista, con método *Código QR* |
| **A** → *Avisos* | Notificación nueva: «Sofía salió del plantel con Carmen Martínez, persona autorizada» |
| **A** → *Historial* | El movimiento aparece con fecha, hora, persona y método |
| **Admin** → *Dashboard* | Bajó «Presentes», subió «Ya salieron» y la gráfica horaria |
| **Admin** → *Movimientos* | El registro con todos sus campos |
| **Admin** → *Reportes* | El movimiento cuenta en las salidas y en las recogidas por persona |
| **Admin** → *Auditoría* | Dos entradas nuevas: *Escaneo de QR* y *Registro de salida* |

---

## 7. Segundo flujo · Persona NO autorizada

10. En el escáner, valida el código **`SK-DEMO-000202`** (Luis Ángel Ortega).
11. La pantalla muestra un **NO AUTORIZADO** rojo y bloqueante, explicando que
    la persona existe pero su autorización fue revocada. **No hay ningún botón
    para entregar al alumno.**
12. Pulsa **Reportar incidencia**, descríbela y guárdala.
13. Comprueba en **Admin → Auditoría** que quedó registrado el *Escaneo
    rechazado*, y en **Admin → Emergencias** la incidencia abierta.

Variantes con el mismo comportamiento bloqueante:

- `SK-DEMO-000203` → persona **suspendida** por la dirección.
- `SK-DEMO-999999` → **código inexistente**.

> La validación es de servidor. Aunque se manipulara la petición del navegador,
> `registerMovement()` vuelve a comprobar la autorización antes de registrar
> nada. Está verificado en `npm run verify`.

### Ver la revocación en acción

En **App familiar → Personas autorizadas**, revoca a *Rosa Elena Martínez*
sobre Sofía. Vuelve al escáner, valida `SK-DEMO-000201` y comprobarás que Sofía
ya no aparece entre los alumnos entregables. Vuelve a autorizarla y reaparece.

---

## 8. Tercer flujo · Emergencia

14. Como **Personal escolar**, entra en *Alertas e incidencias* → **Activar
    emergencia**.
15. Elige el tipo (evacuación, médica, seguridad o aviso general), escribe el
    mensaje y confirma. Hay un paso de confirmación explícito porque la acción
    notifica a todo el centro.
16. La alerta aparece de inmediato, destacada en rojo, en los tres perfiles.
17. Como **Padre / Tutor**, revisa *Avisos*: recibiste la notificación de
    emergencia.
18. Como **Administración**, entra en *Emergencias*, pulsa **Resolver**, añade
    una nota de cierre y confirma. Las familias reciben el aviso de que la
    situación quedó resuelta.

---

## 9. Recorrido por perfiles

### 📱 Padre / Tutor — `/app`

Mobile first, pensado para usarse con una mano en la puerta del colegio.

- **Inicio** — estado de cada hijo, accesos rápidos, últimos movimientos y avisos.
- **Mis hijos** / **Detalle** — estado, datos de salud, quién puede recogerlo e historial.
- **Mi QR** — credencial a pantalla completa con los alumnos que permite recoger.
- **Personas autorizadas** — alta de personas y revocación por alumno.
- **Historial** — últimos 30 días, filtrable por alumno, tipo y fechas.
- **Avisos** — centro de notificaciones con estado leído/no leído.
- **Mensajes** — conversaciones con el centro.
- **Perfil** — datos de la cuenta y cierre de sesión.

### 🏫 Personal escolar — `/staff`

- **Panel de jornada** — presentes, entradas, salidas, incidencias y gráfica horaria.
- **Escáner QR** ⭐ — la pantalla crítica: tres modos de entrada, un solo flujo.
- **Registrar entrada / salida** — vía manual para las excepciones, con la misma
  validación de autorización.
- **Alumnos** — búsqueda rápida y ficha completa.
- **Autorizaciones** — consulta de apoyo antes de una entrega.
- **Actividad reciente** — bitácora operativa filtrable.
- **Alertas e incidencias** — activar emergencias y reportar incidencias.

### 📊 Administración — `/admin`

- **Dashboard** — «¿qué está pasando ahora mismo?» en un vistazo.
- **Alumnos** — alta, edición, filtros y ficha con historial.
- **Padres y tutores** — directorio, alumnos asociados y credenciales.
- **Personal** — cuentas del centro y matriz de permisos vigente.
- **Personas autorizadas** — alta, suspensión y historial de recogidas.
- **Movimientos** — trazabilidad completa con exportación CSV.
- **Reportes** — asistencia, puntualidad, recogidas, grupos e incidencias.
- **Emergencias** — activar, consultar y cerrar alertas e incidencias.
- **Auditoría** — quién hizo qué y cuándo.
- **Configuración** — parámetros del centro y tabla *prototipo → producción*.

---

## 10. Datos de demostración

El seed (`prisma/seed.ts`) genera un escenario **determinista** —misma semilla,
mismos datos— con:

- 1 centro: **Centro Educativo Demo**
- **12 alumnos** en 5 grupos (Sofía Martínez, Mateo Hernández, Valentina López,
  Diego Ramírez, Emma Torres y otros), con estados variados: en plantel, ya
  entregados, ausentes y uno pendiente de revisión
- **11 tutores** y **4 cuentas de personal**
- **19 personas autorizadas**, incluidos a propósito un caso de autorización
  revocada y otro de persona suspendida
- **~480 movimientos** cubriendo 30 días de días hábiles, con retrasos y
  ausencias realistas
- notificaciones, 2 conversaciones, 2 alertas históricas, 3 incidencias y
  bitácora de auditoría

Todos los nombres, teléfonos, direcciones e identificaciones son **inventados**.
No se usan fotografías: los avatares se generan a partir de las iniciales, de
modo que el prototipo no trata imágenes de menores.

---

## 11. Seguridad aplicada

Lo que el prototipo **sí** hace bien y conviene conservar al evolucionarlo:

- **Separación de roles** con una matriz de permisos central
  ([`src/lib/auth/permissions.ts`](src/lib/auth/permissions.ts)) que consultan
  tanto los menús como el servidor.
- **Doble comprobación en el servidor.** Las server actions validan rol y
  permiso, y la lógica de negocio revalida la autorización antes de registrar
  una entrega: no se confía en lo que envía el navegador.
- **El QR no contiene datos personales**, solo un identificador opaco
  (`SK-DEMO-000123`) que el sistema resuelve contra la base de datos. Si alguien
  fotografía el código, no obtiene información del menor.
- **Aislamiento por tutor.** Un tutor solo puede consultar y administrar a sus
  propios hijos; el filtro se aplica en las consultas, no en la interfaz.
- **Validación de toda entrada** con Zod antes de tocar la base de datos.
- **Minimización de datos**: de las identificaciones solo se guardan los últimos
  dígitos, y los teléfonos se enmascaran en las pantallas operativas.
- **Auditoría** de inicios de sesión, escaneos (válidos y rechazados),
  movimientos, cambios de autorización, emergencias y exportaciones.
- **Secretos en variables de entorno**, nunca en el código.
- **Confirmación explícita** antes de toda acción con consecuencias: entregar a
  un alumno, revocar una autorización, suspender a una persona o activar una
  emergencia.
- **Errores comprensibles** sin filtrar trazas internas a la interfaz.

---

## 12. Limitaciones del prototipo

Conviene decirlo con claridad en cualquier presentación:

| Área | En el prototipo | Necesario antes de un piloto real |
| --- | --- | --- |
| Contraseñas | SHA-256 sin salt | bcrypt/argon2id con salt y política de complejidad |
| Sesión | Cookie firmada con HMAC, 12 h | Proveedor de identidad real, revocación, rotación de claves |
| Intentos de acceso | Sin límite | Rate limiting, bloqueo temporal y 2FA en administración |
| Base de datos | SQLite local sin cifrado | PostgreSQL gestionado, cifrado en reposo y copias de seguridad |
| Notificaciones | Guardadas en la BD y mostradas al cargar | Push real (FCM/APNs) y canal en tiempo real |
| Lectura de QR | API nativa del navegador (no está en todos) | App nativa con lector dedicado |
| Códigos QR | Identificador fijo sin caducidad | Códigos rotatorios o de un solo uso |
| Auditoría | Misma BD, sin IP ni dispositivo | Almacenamiento inmutable, retención definida y alertas |
| Datos personales | Ficticios | Aviso de privacidad, consentimiento del tutor y derechos ARCO/GDPR |
| Gestión de usuarios | Se crean con el seed | Altas, bajas y roles desde la interfaz |

Detalles técnicos menores conocidos:

- El `middleware.ts` solo comprueba la **presencia** de la cookie (corre en el
  runtime Edge); la verificación real de firma, caducidad y rol la hacen los
  layouts y las server actions en Node.
- Cuando se solicita un registro que no corresponde al usuario, se muestra
  correctamente la pantalla *«No encontramos esta página»* y **no se filtra
  ningún dato**, pero el código HTTP puede llegar como 200 en lugar de 404
  porque Next.js ya ha comenzado a enviar la respuesta en streaming.
- La aplicación se sirve como web responsive. No está empaquetada como app
  nativa, aunque la interfaz familiar está diseñada para poder envolverse
  después con Capacitor o similar.

---

## 13. Funciones futuras

Quedan fuera del alcance a propósito, para no desviar el esfuerzo del objetivo
de la demostración:

- Aplicaciones nativas publicadas en App Store y Google Play
- Notificaciones push reales y mensajería en tiempo real
- Multi-centro con administración por franquicia o red de colegios
- Reconocimiento facial, geolocalización y credenciales biométricas
- Pagos, facturación y suscripciones
- Integración con sistemas de gestión escolar y control de acceso físico
  (torniquetes, puertas)
- Analítica avanzada y detección de anomalías en los patrones de recogida
- Firma electrónica de las autorizaciones por parte de los tutores

---

## 14. Responsive

Probado en los tres tamaños de referencia:

- **Móvil (360–430 px)** — la app familiar usa barra inferior fija con el acceso
  al QR destacado en el centro; los paneles se convierten en tarjetas apilables
  con menú lateral desplegable.
- **Tablet (768 px)** — dos columnas y tablas con desplazamiento horizontal
  contenido.
- **Escritorio (1280 px+)** — barra lateral fija en los paneles y cuadrículas de
  hasta cuatro columnas.

Se respetan las áreas seguras de dispositivos con notch, los objetivos táctiles
mínimos y `prefers-reduced-motion`.

---

## 15. Créditos

Prototipo funcional desarrollado como demostración técnica de la propuesta
académica **SeguriKids**. El nombre del producto es conceptual; los datos, las
personas y el centro educativo que aparecen en la aplicación son ficticios.
