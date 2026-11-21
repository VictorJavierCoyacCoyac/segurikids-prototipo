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
- **vocea en voz alta** el nombre del alumno en cuanto se valida el QR, para que
  el aula sepa que han llegado por él;
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
| Códigos QR | `qrcode` (generación) + `BarcodeDetector` nativo con respaldo `jsqr` (lectura) |
| Voz | Web Speech API del navegador (`speechSynthesis`) |

Decisiones deliberadas para mantener el prototipo ligero y fácil de modificar:

- **Sin librería de gráficas.** Las visualizaciones son SVG/CSS propios
  (`src/components/ui/stat.tsx`), lo que evita ~100 kB de JavaScript.
- **Sin librería de componentes.** El sistema de diseño vive en
  `src/components/ui/`, es pequeño y se adapta sin luchar contra estilos ajenos.
- **Lectura de QR sin dependencia obligatoria.** Se usa la API nativa del
  navegador; `jsqr` se carga de forma dinámica **solo** donde esa API no existe
  (iOS/Safari, Firefox), y siempre existe una alternativa manual y otra
  simulada.
- **Sin servicio de voz ni de IA.** El voceo lo sintetiza el propio navegador y
  el asistente del mostrador responde desde un catálogo cerrado de respuestas,
  así que no hay claves de API ni datos saliendo del dispositivo.
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
│   ├── login/                    Acceso + cuentas demo + sesiones abiertas
│   ├── terminos/                 Términos y aviso de privacidad (+ aceptación)
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
│       ├── scanner/              ⭐ Consola de control de salida
│       └── voice/                Voceo por voz y asistente guionizado
│
├── lib/
│   ├── auth/                     Sesión por área, contraseñas y permisos
│   ├── domain/                   Catálogos: estados, roles, términos, voceo
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
├── middleware.ts                 Barrera de acceso + resolución del área
└── prisma/
    ├── schema.prisma             Modelo relacional documentado
    ├── migrations/               Migración inicial + aceptación de términos
    └── seed.ts                   Escenario DEMO completo y determinista
```

El corazón del sistema es `registerMovement()` en
[`src/server/services/attendance.ts`](src/server/services/attendance.ts): es la
**única** función que modifica el estado de un alumno, de forma que ese estado
siempre es consecuencia de un movimiento auditado.

### Sesiones simultáneas (dos dispositivos, dos pestañas)

El sistema se usa en dos dispositivos a la vez —el tutor con su QR y el docente
con el escáner— y durante una demostración también en dos pestañas del mismo
navegador. Con una sola cookie de sesión eso sería imposible: la segunda sesión
sobreescribiría la primera.

Por eso **la sesión no es una cookie, sino una por área de la aplicación**:

| Área | Ruta | Cookie | Rol |
| --- | --- | --- | --- |
| App familiar | `/app` | `sk_session_app` | `PARENT` |
| Personal escolar | `/staff` | `sk_session_staff` | `STAFF` |
| Dirección | `/admin` | `sk_session_admin` | `ADMIN` |

`src/middleware.ts` deduce el área de la ruta y la inyecta en la cabecera
`x-sk-area`; `getCurrentUser()` lee entonces la cookie que corresponde. Así cada
pestaña usa su propia sesión **sin parámetros en la URL ni estado en el
cliente**, y cerrar la sesión del docente no tira la del tutor.

Detalles que sostienen el diseño:

- La cookie de un área solo acepta los roles de esa área, de modo que una
  cookie reutilizada no otorga acceso donde no corresponde.
- `/staff` admite además la cookie de dirección, porque un `ADMIN` puede operar
  el control de acceso. Si existen las dos sesiones, manda la del personal.
- Las rutas de `/api` no tienen área propia. `/api/reports/export` fija
  explícitamente el área `admin`; `/api/qr` acepta cualquier sesión porque la
  credencial la consultan tanto el tutor como dirección.
- La pantalla de acceso ya no expulsa a quien tiene sesión: **lista las sesiones
  abiertas** y permite añadir otra cuenta.

**Límite conocido:** una sesión por área y navegador. Dos cuentas de tutor a la
vez en el mismo navegador siguen requiriendo dos perfiles de navegador o dos
dispositivos.

**Comprobado en vivo** con las tres cookies en un mismo navegador: las nueve
rutas de las tres áreas responden 200 a la vez, y cada área muestra su propio
usuario. Con una sola cookie, las áreas ajenas redirigen al acceso (307), y un
token válido colocado en la cookie de otra área se rechaza, porque cada cookie
solo admite los roles de la suya. `npm run verify` cubre además la resolución de
área ruta por ruta, incluidos los prefijos que se parecen a un área sin serlo
(`/appointments`, `/administracion`, `/staffroom` son rutas públicas, no `/app`,
`/admin` ni `/staff`).

### Reinicio de la jornada (solo demostración)

Durante una presentación el guion se agota: al registrar la salida de un alumno
queda en `OFF_CAMPUS` y el siguiente escaneo del mismo código responde —con
razón— que ya no está en el plantel. En un stand con visitantes toda la mañana,
eso deja el guion inservible al primer pase.

Dirección tiene por eso un botón **«Reiniciar la jornada»** en *Configuración*
(`src/server/actions/demo.ts` → `src/server/services/demo.ts`). Repone el estado
operativo de los alumnos y retira los movimientos y avisos generados al
demostrar, **sin cerrar ninguna sesión**.

Esto último es el motivo de que no se limite a volver a sembrar: el seed
regenera todos los `cuid`, y con ellos invalida las cookies de todos los
dispositivos conectados. En mitad de una demostración con tres pantallas
encendidas, eso significa volver a entrar en las tres.

Cómo distingue la mañana de la demostración: no por marcas en los datos, que
serían frágiles, sino por el estado esperado. `src/lib/domain/demo-day.ts`
declara con qué estado arranca cada alumno; de ahí se deduce qué movimientos
justifica (ninguno si está ausente, una entrada si está en el plantel, entrada y
salida si ya fue recogido), se conservan los primeros de cada tipo y se descarta
el resto. La operación es por tanto **idempotente**.

No borra la bitácora de auditoría: los escaneos de la demostración quedan
registrados —son la prueba de que el sistema los anotó— y el propio reinicio se
audita como `DEMO_DAY_RESET`.

`npm run verify` comprueba que el escenario de `demo-day.ts` coincide con lo que
deja el seed, que una recogida seguida de un reinicio devuelve al alumno a su
estado inicial, que aplicarlo dos veces no cambia nada, y que no desaparecen
cuentas ni autorizaciones.

> **ANTES DE PRODUCCIÓN:** eliminar `src/lib/domain/demo-day.ts`,
> `src/server/services/demo.ts`, `src/server/actions/demo.ts` y la tarjeta de
> *Configuración*. No existe ningún caso real en el que el personal deba poder
> deshacer los movimientos del día.

### Términos y aviso de privacidad

El texto vive en [`src/lib/domain/terms.ts`](src/lib/domain/terms.ts) y lo
comparten la consulta pública (`/terminos`) y la pantalla de aceptación, para
que lo que se acepta coincida con lo que se puede volver a leer.

La aceptación se guarda en `User.termsAcceptedAt` **junto con la versión**
(`User.termsVersion`), no como un booleano: si el documento cambia, cambia
`TERMS_VERSION` y el sistema vuelve a pedir el consentimiento en lugar de dar
por válido el anterior. La comprobación está centralizada en `requireUser()`,
así que ninguna pantalla nueva puede olvidarse de ella, y cada aceptación queda
en la auditoría como `TERMS_ACCEPT`.

**Dónde aparece la puerta.** No es una casilla en el formulario de alta ni un
aviso que se pueda cerrar: es una pantalla completa que intercepta el primer
acceso de la cuenta. Dirección da de alta al tutor, el tutor entra con su
contraseña y, antes de ver cualquier pantalla de `/app`, el sistema lo lleva a
`/terminos/aceptar`. El botón está deshabilitado hasta marcar la casilla, y
hasta que acepta no existe ninguna ruta de la aplicación que le responda.

Las rutas de `/api` no pasan por `requireUser()` —no pueden redirigir a una
pantalla— así que comprueban `termsAccepted` por su cuenta y responden **403**
si falta. `npm run verify` incluye una comprobación estructural que recorre
`src/app/api/**/route.ts` y `src/server/actions/*.ts` y falla si alguna ruta o
acción nueva se olvida del requisito.

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
| `npm run simulate` | Recorre la jornada completa de un tutor, paso a paso |
| `npm run verify:qr` | Comprueba que el QR emitido es el que el lector decodifica |

`npm run verify` ejecuta 75 comprobaciones sobre una base de datos
independiente (`prisma/verify.db`, no toca tus datos) y confirma que la recogida
autorizada, el bloqueo de personas no autorizadas, las emergencias, la auditoría,
los reportes, las sesiones por área, la aceptación de términos y el voceo
funcionan de verdad.

`npm run simulate` cuenta una sola historia de principio a fin —el tutor deja al
niño por la mañana, el niño pasa la jornada en el plantel y el tutor vuelve a
recogerlo por la tarde— imprimiendo el estado real del sistema en cada paso: 34
comprobaciones sobre `prisma/simulate.db`. Sirve para enseñar el ciclo de vida
completo sin abrir el navegador.

`npm run verify:qr` cierra el bucle del escáner sin necesidad de cámara: genera
el PNG con las mismas opciones que `/api/qr`, lo decodifica a píxeles, lo reduce
a 480 px igual que hace el lector y lo pasa por **jsQR**, el motor que corre en
el móvil del docente cuando el navegador no trae `BarcodeDetector`. Admite
además un PNG real:

```bash
npm run verify:qr -- ruta/al/codigo.png
```

Lo único que estas comprobaciones no cubren es la captura de vídeo en sí, que
depende del navegador y del permiso que conceda el usuario.

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

> **Con el internet compartido del teléfono.** El túnel sale a internet y
> vuelve, así que la laptop y la tableta tienen que estar conectadas las dos
> aunque se vean en la misma red. El consumo de datos es bajo: los fotogramas de
> la cámara se analizan en la tableta y nunca se envían, por la red solo viaja el
> código leído. Pero si el internet compartido se cae, el enlace del túnel deja
> de funcionar.
>
> **Plan B sin internet:** servir por la IP local (`http://192.168.x.x:3000`).
> Así no hay cámara —no es contexto seguro— pero la entrada manual del código y
> «Simular escaneo» ejecutan la misma validación de servidor. Para que la IP
> local sea alcanzable desde otro dispositivo hay que abrir el puerto: con `ufw`
> activo, la política de entrada por defecto es `DROP` y la aplicación responde
> solo en la propia máquina.
>
> ```bash
> sudo ufw allow 3000/tcp comment "SeguriKids demo"
> # al terminar la demostración:
> sudo ufw delete allow 3000/tcp
> ```

### La cámara del móvil

El escáner lee el QR con la cámara del dispositivo del personal, y para eso el
navegador exige un **contexto seguro**:

| Cómo se abre el prototipo | ¿Cámara? |
| --- | --- |
| `http://localhost:3000` | ✅ sí — `localhost` se considera seguro |
| Enlace **https** del túnel de VS Code | ✅ sí — es el caso real en el móvil |
| `http://192.168.x.x:3000` (IP de la red local) | ❌ no — el navegador la bloquea |

Es decir: para escanear desde un teléfono hay que usar el **enlace https del
túnel**, no la IP local. Por la IP local el resto de la aplicación funciona
(incluido mostrar el QR del tutor), pero el botón de cámara avisa de que hace
falta una conexión segura en lugar de fallar en silencio.

Dos motores de decodificación, elegidos automáticamente:

1. **`BarcodeDetector`**, la API nativa del navegador (Chrome/Edge y Android).
2. **`jsqr`**, decodificador en JavaScript que se carga **solo** si la API
   nativa no existe — iOS/Safari y Firefox, donde el escáner quedaría
   inservible. Se importa de forma dinámica para no cargar el decodificador en
   los navegadores que no lo necesitan.

Los fotogramas se analizan en el dispositivo y se descartan: no se graba ni se
envía imagen a ningún servidor. Si no hay cámara, la entrada manual del código y
«Simular escaneo» ejecutan **la misma** validación de servidor.

### El voceo de recogida

Al validarse un QR con resultado **AUTORIZADO**, el dispositivo del personal
anuncia en voz alta el nombre del alumno, su grupo y quién lo espera, usando la
síntesis de voz del propio navegador (Web Speech API). El texto se muestra
siempre en pantalla, de modo que el aviso sigue siendo útil sin voz, con el
altavoz silenciado o con ruido.

- Un intento **bloqueado no se vocea nunca**: anunciar en público un acceso
  denegado expondría a la persona y al menor.
- El aviso no incluye teléfonos, domicilios ni el identificador QR.
- El silencio se recuerda por dispositivo (`localStorage`), no por cuenta: la
  tablet de recepción vocea; el móvil de un docente en el aula quizá no debe.
- `/staff/voceo` añade el **voceo manual** de un alumno y un **asistente de
  mostrador**. El asistente es **guionizado**: responde desde un catálogo
  cerrado de palabras clave en
  [`src/lib/domain/announcements.ts`](src/lib/domain/announcements.ts). No hay
  modelo de lenguaje ni llamadas de red, así que ningún dato del centro sale del
  dispositivo, y la interfaz lo dice para no sugerir una capacidad que no tiene.

#### El voceo en Linux necesita un sintetizador en el sistema

La Web Speech API **no trae voces propias**: usa las del sistema operativo. En
Windows y macOS ya vienen instaladas; en Linux, normalmente no. Sin un
sintetizador, `speechSynthesis.getVoices()` devuelve una lista vacía y el voceo
falla **en silencio**: el aviso aparece en pantalla, no se oye nada y el
navegador no reporta ningún error.

En Arch / CachyOS:

```bash
sudo pacman -S speech-dispatcher espeak-ng
```

Instalar los paquetes no basta. El paquete deja
`/etc/speech-dispatcher/speechd.conf` con **todas** las directivas comentadas,
así que el demonio arranca sin sintetizador ni salida de audio y los clientes se
quedan colgados al conectarse. Hay que declarar lo mínimo en la configuración
del usuario, en `~/.config/speech-dispatcher/speechd.conf`:

```conf
AddModule "espeak-ng" "sd_espeak-ng" "espeak-ng.conf"
DefaultModule espeak-ng
AudioOutputMethod "pulse"        # válido también con PipeWire
DefaultLanguage "es"
DefaultVoiceType "FEMALE1"
```

Comprobación, de menor a mayor:

```bash
spd-say -w -l es "Prueba de voceo"    # debe hablar y terminar; si se cuelga, falta la configuración de arriba
pactl list sink-inputs | grep espeak  # mientras habla debe verse el flujo speech-dispatcher-espeak-ng
```

**Reinicia el navegador después de configurarlo.** Chrome y Firefox cargan
`libspeechd.so.2` al arrancar y consultan la lista de voces entonces: una
pestaña abierta antes del arreglo seguirá muda.

> **ANTES DE PRODUCCIÓN:** depender de las voces del sistema hace que el voceo
> sea desigual entre dispositivos y nulo en algunos. Un sistema productivo
> debería sintetizar el aviso en el servidor o reproducir audio pregrabado, de
> forma que el dispositivo de la puerta no necesite configuración local. El
> texto en pantalla debe seguir siendo la vía principal en cualquier caso.

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

> **`tutor11@demo.local` (Tomás Aguilar) se deja a propósito sin aceptar los
> términos**, para poder mostrar la pantalla de aceptación del primer acceso sin
> tener que dar de alta un usuario nuevo. Al entrar con esa cuenta, el sistema
> la lleva a `/terminos/aceptar` y no la deja operar hasta que acepta. Las tres
> cuentas destacadas ya los tienen aceptados para que la demostración entre
> directa al panel.

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
> 3 minutos. Se juega con **dos pestañas o dos dispositivos a la vez**: cada
> área de la aplicación mantiene su propia sesión, así que no hay que cerrar
> una para abrir la otra (ver §3, *Sesiones simultáneas*).

### Preparación

```bash
npm run db:seed   # deja el escenario en su estado inicial
npm run dev
```

### Paso 1 · La familia muestra su código (pestaña A)

1. Entra en <http://localhost:3000> y pulsa **Padre / Tutor** (Carmen Martínez).
2. En el inicio verás que **Sofía Martínez** y **Emiliano Martínez** están
   `EN PLANTEL`.
3. Pulsa **Mostrar mi QR**. Aparece la credencial con el código
   `SK-DEMO-000101`.
   *Observa el aviso: el QR solo contiene un identificador, nunca datos del
   menor.*
4. Pulsa **Mostrar a pantalla completa**: el código queda solo, al máximo
   tamaño y con la pantalla bloqueada para que no se apague. Es la vista que se
   enseña en la puerta.

### Paso 2 · El personal escanea (pestaña B)

5. Abre **otra pestaña** en <http://localhost:3000>. La pantalla de acceso lista
   la sesión del tutor como abierta y te deja **añadir otra cuenta** sin
   cerrarla. Entra como **Personal escolar** (Ricardo Peña).
6. Pulsa **Abrir escáner**.
7. Elige una de las tres vías — las tres ejecutan exactamente la misma
   validación en el servidor:
   - **Código** → escribe `SK-DEMO-000101` y pulsa *Validar identificación*.
   - **Cámara** → activa la cámara y apunta al QR de la pestaña A (o al
     teléfono del tutor). Requiere **https o localhost**: ver §4,
     *La cámara del móvil*.
   - **Simular** → elige *Carmen Martínez* en la lista (cada fila indica el
     resultado que producirá).

### Paso 3 · El sistema valida y el personal entrega

7. La pantalla muestra un **AUTORIZADO** verde e inequívoco, con la persona, su
   relación, el identificador, la hora y —si la tiene registrada— los últimos
   dígitos de su identificación para el cotejo visual.
8. **El dispositivo vocea el aviso en voz alta**: «Atención, grupo … Ya llegaron
   por Sofía Martínez. Carmen Martínez, madre, espera en recepción…». El texto
   queda también en pantalla, y puede repetirse o silenciarse desde el propio
   aviso. Un intento **bloqueado nunca se vocea**: avisar en público de un
   acceso denegado expondría a la persona y al menor.
9. Debajo aparecen **los dos alumnos** que puede recoger, preseleccionados.
   Puedes desmarcar a uno si solo se lleva a la otra.
10. Pulsa **Confirmar entrega**.

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

11. En el escáner, valida el código **`SK-DEMO-000202`** (Luis Ángel Ortega).
12. La pantalla muestra un **NO AUTORIZADO** rojo y bloqueante, explicando que
    la persona existe pero su autorización fue revocada. **No hay ningún botón
    para entregar al alumno.**
13. Pulsa **Reportar incidencia**, descríbela y guárdala.
14. Comprueba en **Admin → Auditoría** que quedó registrado el *Escaneo
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

15. Como **Personal escolar**, entra en *Alertas e incidencias* → **Activar
    emergencia**.
16. Elige el tipo (evacuación, médica, seguridad o aviso general), escribe el
    mensaje y confirma. Hay un paso de confirmación explícito porque la acción
    notifica a todo el centro.
17. La alerta aparece de inmediato, destacada en rojo, en los tres perfiles.
18. Como **Padre / Tutor**, revisa *Avisos*: recibiste la notificación de
    emergencia.
19. Como **Administración**, entra en *Emergencias*, pulsa **Resolver**, añade
    una nota de cierre y confirma. Las familias reciben el aviso de que la
    situación quedó resuelta.

---

## 9. Cuarto flujo · Ciclo de vida completo de un tutor

> **Escenario:** una familia nueva se incorpora al centro, deja al niño por la
> mañana y lo recoge por la tarde. Es el recorrido que une las cuatro piezas:
> alta de cuenta, aceptación de términos, entrada y recogida con voceo.

**1 · Alta de la cuenta.** Como **Administración** → *Padres y tutores* →
**Nuevo tutor**. Rellena nombre, correo, teléfono, parentesco y contraseña
inicial. El sistema crea la cuenta **y su credencial QR**, y lo registra en la
auditoría como `USER_CREATE`. En el directorio, la cuenta aparece marcada como
*Términos pendientes*.

**2 · Vinculación con el alumno.** En *Alumnos* → ficha del alumno, asigna la
cuenta nueva como **Tutor principal**. Sin esto el tutor no tendría a quién
recoger.

**3 · Primer acceso y consentimiento.** En otra pestaña, entra con la cuenta
nueva (o con `tutor11@demo.local`, que el seed deja pendiente a propósito). El
sistema **no la deja pasar al panel**: la lleva a la pantalla de aceptación, con
el texto completo y una casilla que hay que marcar. Al aceptar, queda registrada
la fecha y la versión del documento, y la auditoría guarda un `TERMS_ACCEPT`.
El dato se ve después en *Mi perfil* → «Términos aceptados».

**4 · Entrada por la mañana.** Como **Personal escolar** → *Registrar entrada*,
marca al alumno. Pasa a `EN PLANTEL` y el tutor recibe el aviso.

**5 · Recogida por la tarde.** El tutor abre *Mi QR* → **Mostrar a pantalla
completa**; el docente lo escanea con la cámara. Al validarse, el dispositivo
**vocea** «Ya llegaron por …», el docente confirma la entrega y el tutor recibe
la notificación de salida.

**6 · Rastro completo.** En **Admin → Auditoría** está la secuencia entera:
`USER_CREATE` → `TERMS_ACCEPT` → `LOGIN` → `ENTRY_REGISTER` → `QR_SCAN` →
`EXIT_REGISTER`.

---

## 10. Recorrido por perfiles

### 📱 Padre / Tutor — `/app`

Mobile first, pensado para usarse con una mano en la puerta del colegio.

- **Inicio** — estado de cada hijo, accesos rápidos, últimos movimientos y avisos.
- **Mis hijos** / **Detalle** — estado, datos de salud, quién puede recogerlo e historial.
- **Mi QR** — credencial con los alumnos que permite recoger, y vista **a
  pantalla completa** (con bloqueo de apagado) para enseñarla en la puerta.
- **Personas autorizadas** — alta de personas y revocación por alumno.
- **Historial** — últimos 30 días, filtrable por alumno, tipo y fechas.
- **Avisos** — centro de notificaciones con estado leído/no leído.
- **Mensajes** — conversaciones con el centro.
- **Perfil** — datos de la cuenta, aceptación de términos y cierre de sesión.

### 🏫 Personal escolar — `/staff`

- **Panel de jornada** — presentes, entradas, salidas, incidencias y gráfica horaria.
- **Escáner QR** ⭐ — la pantalla crítica: tres modos de entrada, un solo flujo.
- **Registrar entrada / salida** — vía manual para las excepciones, con la misma
  validación de autorización.
- **Voceo y asistente** — voceo manual de un alumno y asistente guionizado de
  mostrador.
- **Alumnos** — búsqueda rápida y ficha completa.
- **Autorizaciones** — consulta de apoyo antes de una entrega.
- **Actividad reciente** — bitácora operativa filtrable.
- **Alertas e incidencias** — activar emergencias y reportar incidencias.

### 📊 Administración — `/admin`

- **Dashboard** — «¿qué está pasando ahora mismo?» en un vistazo.
- **Alumnos** — alta, edición, filtros y ficha con historial.
- **Padres y tutores** — directorio, alumnos asociados, credenciales, estado de
  los términos y **alta de tutores**.
- **Personal** — cuentas del centro, matriz de permisos, estado de los términos y
  **alta de personal**.
- **Personas autorizadas** — alta, suspensión y historial de recogidas.
- **Movimientos** — trazabilidad completa con exportación CSV.
- **Reportes** — asistencia, puntualidad, recogidas, grupos e incidencias.
- **Emergencias** — activar, consultar y cerrar alertas e incidencias.
- **Auditoría** — quién hizo qué y cuándo.
- **Configuración** — parámetros del centro y tabla *prototipo → producción*.

---

## 11. Datos de demostración

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
- todas las cuentas con los **términos aceptados**, excepto `tutor11@demo.local`,
  que se deja pendiente a propósito para poder mostrar la pantalla de aceptación

Todos los nombres, teléfonos, direcciones e identificaciones son **inventados**.
No se usan fotografías: los avatares se generan a partir de las iniciales, de
modo que el prototipo no trata imágenes de menores.

---

### Alta de usuarios

Las cuentas se crean **solo desde el panel de dirección** (permiso
`MANAGE_USERS`, exclusivo del rol ADMIN). No hay registro autoservicio, y es
deliberado: en un sistema de seguridad escolar el vínculo entre una persona y un
menor tiene que verificarlo el centro, no el propio interesado.

- *Padres y tutores* → **Nuevo tutor**
- *Personal* → **Nueva cuenta de personal**

Al dar de alta un **tutor**, el sistema le genera automáticamente su ficha de
persona autorizada con un identificador QR correlativo, igual que hace el seed:
sin ella la pantalla «Mi QR» de la app familiar estaría vacía. Los alumnos se
vinculan después desde la ficha de cada alumno, en el campo *Tutor principal*.

El permiso se comprueba en el servidor dentro de la propia server action, no
solo ocultando el botón, y cada alta queda registrada en la bitácora de
auditoría como `USER_CREATE`.

> ⚠️ **DEMO:** la contraseña inicial la escribe quien da el alta. En producción
> esto sería una invitación por correo con cambio obligatorio en el primer
> acceso, sobre un hash bcrypt/argon2 en lugar del SHA-256 del prototipo.

## 12. Seguridad aplicada

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
- **Una sesión por área**, con cookies independientes y un rol admitido por
  cookie: cerrar la sesión del docente no afecta a la del tutor, y una cookie
  reutilizada no otorga acceso a otra área.
- **Consentimiento antes de operar.** Ninguna cuenta puede usar el sistema sin
  aceptar los términos y el aviso de privacidad, con la versión del documento
  registrada y auditada.
- **La cámara y el voceo no salen del dispositivo.** Los fotogramas se analizan
  localmente y se descartan; la voz la sintetiza el navegador. El voceo nunca
  anuncia un acceso denegado ni incluye teléfonos o identificadores.
- **Confirmación explícita** antes de toda acción con consecuencias: entregar a
  un alumno, revocar una autorización, suspender a una persona o activar una
  emergencia.
- **Errores comprensibles** sin filtrar trazas internas a la interfaz.

---

## 13. Limitaciones del prototipo

Conviene decirlo con claridad en cualquier presentación:

| Área | En el prototipo | Necesario antes de un piloto real |
| --- | --- | --- |
| Contraseñas | SHA-256 sin salt | bcrypt/argon2id con salt y política de complejidad |
| Sesión | Cookie firmada con HMAC, 12 h | Proveedor de identidad real, revocación, rotación de claves |
| Intentos de acceso | Sin límite | Rate limiting, bloqueo temporal y 2FA en administración |
| Base de datos | SQLite local sin cifrado | PostgreSQL gestionado, cifrado en reposo y copias de seguridad |
| Notificaciones | Guardadas en la BD y mostradas al cargar | Push real (FCM/APNs) y canal en tiempo real |
| Lectura de QR | API nativa del navegador con respaldo en JS; requiere https o localhost | App nativa con lector dedicado |
| Códigos QR | Identificador fijo sin caducidad | Códigos rotatorios o de un solo uso |
| Auditoría | Misma BD, sin IP ni dispositivo | Almacenamiento inmutable, retención definida y alertas |
| Datos personales | Ficticios | Aviso de privacidad, consentimiento del tutor y derechos ARCO/GDPR |
| Términos y privacidad | Texto orientativo no revisado jurídicamente, aceptación con fecha y versión | Redacción legal revisada, copia inmutable del texto aceptado y evidencia del consentimiento |
| Voceo por voz | Síntesis del navegador en el propio dispositivo | Megafonía integrada o aviso dirigido al aula, con control de volumen por zona |
| Asistente | Guionizado, catálogo cerrado de respuestas | Si se quisiera conversacional, un modelo con control de qué datos puede ver |
| Sesiones simultáneas | Una por área y navegador | Sesiones por dispositivo, listado y revocación remota |
| Gestión de usuarios | Alta desde el panel de dirección | Edición, baja, restablecimiento de contraseña e invitación por correo |

Detalles técnicos menores conocidos:

- El `middleware.ts` solo comprueba la **presencia** de la cookie del área
  (corre en el runtime Edge); la verificación real de firma, caducidad, rol y
  aceptación de términos la hacen los layouts y las server actions en Node.
- Dos cuentas **del mismo rol** no pueden coexistir en un mismo navegador: la
  segunda sustituye a la primera, porque comparten la cookie de su área. Para
  eso hacen falta dos perfiles de navegador o dos dispositivos.
- Cuando se solicita un registro que no corresponde al usuario, se muestra
  correctamente la pantalla *«No encontramos esta página»* y **no se filtra
  ningún dato**, pero el código HTTP puede llegar como 200 en lugar de 404
  porque Next.js ya ha comenzado a enviar la respuesta en streaming.
- La aplicación se sirve como web responsive. No está empaquetada como app
  nativa, aunque la interfaz familiar está diseñada para poder envolverse
  después con Capacitor o similar.

---

## 14. Funciones futuras

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

## 15. Responsive

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

## 16. Créditos

Prototipo funcional desarrollado como demostración técnica de la propuesta
académica **SeguriKids**. El nombre del producto es conceptual; los datos, las
personas y el centro educativo que aparecen en la aplicación son ficticios.
