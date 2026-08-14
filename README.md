# Splitter

Gestión de gastos personales y gastos compartidos en grupo. PWA mobile-first
(pensada para iPhone, funciona igual de bien en Android y escritorio),
construida con React + TypeScript + Firebase.

> Sé rápidamente cuánto he gastado, cuánto debo, cuánto me deben y cómo
> saldar las cuentas con el menor número de pagos posible.

---

## 1. Estado del proyecto

Este proyecto implementa **Fase 1 (MVP) completa y la mayor parte de la Fase
2** del roadmap original (ver §9). Es funcional de extremo a extremo contra
Firebase real (Auth + Firestore + Cloud Functions), no un prototipo visual:

**Implementado y probado de extremo a extremo:**
- Autenticación por email/contraseña, perfil de usuario.
- Gastos personales: crear/editar/eliminar, categorías, gastos futuros.
- Gastos recurrentes (motor de próximas ocurrencias — ver §5).
- Grupos: crear, invitar por código, unirse, miembros, colores.
- Gastos de grupo: reparto igual y por importe exacto, validación de sumas.
- Regla "solo el creador edita/elimina", **aplicada en Firestore Security
  Rules**, no solo en el frontend.
- Cálculo de balances y algoritmo de liquidación óptima (mín. transferencias).
- Registro de pagos, reversión de pagos, historial de grupo append-only.
- Estadísticas personales y de grupo (gráficos ligeros sin dependencias).
- Dashboard con resumen personal + tarjetas de grupo.
- PWA instalable en iOS/Android/escritorio, dark mode, safe areas, offline
  con persistencia de Firestore.

**Explícitamente no implementado (Fase 3 / fuera de alcance), marcado en el
código donde aplica:**
- Conversión real de divisas (la arquitectura lo soporta — cada grupo/gasto
  ya guarda su `currency` — pero no hay tipos de cambio).
- Reparto por porcentajes o por participaciones (`SplitMethod` está tipado
  para añadirlos sin romper nada: `"equal" | "amount"` hoy, reservado
  `"percentage" | "shares"`).
- Notificaciones push (no hay generación de ruido innecesario: cero
  notificaciones implementadas, ver §9).
- Materialización automática de gastos recurrentes vía Cloud Function
  programada (la lógica de "próxima ocurrencia" ya existe y está testeada
  en `src/domain/recurring.ts`; conectarla a un cron de Cloud Functions es
  un añadido de una función, ver comentario en `functions/src/index.ts`).

---

## 2. Arquitectura

```
React 18 + TypeScript + Vite + Tailwind CSS
Firebase: Authentication · Cloud Firestore · Cloud Functions (v2)
PWA: vite-plugin-pwa (Workbox), manifest, iOS safe areas
Routing: react-router-dom (HashRouter — ver §7 sobre GitHub Pages)
Tests: Vitest (lógica de dominio)
```

### Estructura de carpetas

```
src/
  domain/       Lógica financiera pura, sin Firebase (testeada, ver §4)
  types/        Modelos de datos compartidos
  lib/          Config de Firebase, formateo, errores, categorías, colores
  services/     Capa de acceso a Firestore/Auth/Functions (un archivo por
                colección: auth, users, groups, expenses, payments, history…)
  hooks/        Hooks de React sobre los services (listeners en tiempo real)
  context/      AuthContext, ThemeContext, ToastContext
  components/   ui/ (Button, Input, BottomSheet…), expense/, group/, layout/,
                charts/ — reutilizables, sin lógica de negocio
  pages/        Una por pantalla principal (Home, Expenses, Groups,
                GroupDetail, Stats, Settings, Login)
functions/       Cloud Functions (TypeScript, Admin SDK)
firestore.rules  Reglas de seguridad (la fuente de verdad de permisos)
firestore.indexes.json
```

### Por qué esta separación

La lógica financiera (`src/domain/`) es la parte más importante de la
aplicación y **no importa nada de Firebase ni de React** — son funciones
puras (`splitEqual`, `computeBalances`, `optimizeSettlement`,
`occurrencesInRange`...) que reciben datos y devuelven datos. Esto permite:
1. Testearla exhaustivamente sin mocks (`npm run test`, 31 tests).
2. Reutilizarla igual en el cliente y, si hiciera falta, en una Cloud
   Function, sin duplicar la lógica de reparto o de balances.
3. Que un cliente manipulado nunca sea la fuente de verdad: el cliente
   calcula el reparto para *proponerlo*, pero las Security Rules validan
   que la suma de `splits` cuadre con el importe total en cada escritura.

---

## 3. Modelo de datos (Firestore)

```
users/{uid}
users/{uid}/personalExpenses/{expenseId}
users/{uid}/recurringExpenses/{recurringId}

inviteCodes/{code}                        → { groupId, groupName, icon, color }
groups/{groupId}                          → memberIds: string[] (denormalizado)
groups/{groupId}/members/{uid}
groups/{groupId}/expenses/{expenseId}     → soft-delete vía `deleted: true`
groups/{groupId}/payments/{paymentId}     → soft-delete vía `deleted: true`
groups/{groupId}/history/{historyId}      → append-only
```

Decisiones de diseño relevantes:

- **`memberIds` denormalizado** en el propio documento del grupo: permite
  que la query "mis grupos" sea `where('memberIds', 'array-contains', uid)`
  (1 lectura) y que cada regla de subcolección compruebe pertenencia con un
  único `get()`, en vez de una query a la subcolección `members`.
- **Borrado suave** en gastos y pagos (`deleted: true` en vez de `delete()`):
  el historial financiero nunca desaparece, solo se oculta de las vistas
  activas. Esto es lo que permite que "editar" y "eliminar" compartan la
  misma regla de seguridad (`update`, creador únicamente).
- **`inviteCodes` como colección separada**, de solo-lectura para
  cualquier usuario autenticado pero con campos mínimos (nombre, icono,
  color) — nunca expone gastos, saldos ni miembros. El *join* real nunca es
  una escritura de cliente (ver §4).
- **Cantidades en `number` decimal** (no minor units) en Firestore, porque
  es lo que los formularios y el SDK de Firestore manejan mejor; toda la
  aritmética sensible ocurre en `domain/money.ts` convirtiendo a enteros
  (céntimos) internamente para evitar errores de coma flotante, y
  devolviendo decimales redondeados al límite del dominio.

### Índices

`firestore.indexes.json` cubre las consultas compuestas necesarias:
`groups` por `memberIds` + `createdAt`, `expenses`/`payments` por
`deleted` + fecha, `personalExpenses` por `status`/`categoryId` + fecha.
Se despliegan con `firebase deploy --only firestore:indexes`.

---

## 4. Seguridad

**Regla de oro: el cliente nunca es la fuente de verdad.** Todo lo que
importa se valida en `firestore.rules` o en una Cloud Function con Admin
SDK, no solo ocultando botones en la UI.

Puntos concretos que las reglas garantizan (ver comentarios en
`firestore.rules` para el detalle de cada uno):

| Amenaza | Cómo se evita |
|---|---|
| Leer gastos personales de otro usuario | `users/{uid}/**` solo permite `uid == request.auth.uid` |
| Leer/escribir en un grupo sin pertenecer | Toda subcolección exige `request.auth.uid in groupDoc(groupId).data.memberIds` |
| Editar/eliminar un gasto ajeno | `update` exige `resource.data.createdBy == request.auth.uid`; no existe `delete` (todo pasa por `update`, así que el mismo check cubre ambos casos) |
| Unirse a un grupo solo conociendo el código | El *join* real es la Cloud Function `joinGroupByCode` (Admin SDK); el cliente nunca puede escribir en `memberIds` ni crear su propio doc en `members/` |
| Fabricar el creador de un gasto/pago | `createdBy` se fija a `request.auth.uid` en la regla de `create` y es inmutable en `update` |
| Manipular importes o splits desde DevTools | Se valida tipo/positividad en las reglas; el split se recalcula y valida también en `domain/split.ts` antes de enviarse, pero la regla es la que de verdad protege |
| Escalado de privilegios (auto-nombrarse admin, etc.) | `role`, `memberIds`, `createdBy`, `inviteCode` son inmutables desde el cliente en todas las rutas de `update` |

### Cloud Functions (por qué existen estas y no más)

Solo hay Cloud Functions donde una operación **no puede validarse con
reglas declarativas** porque necesita tocar más de un documento de forma
atómica y/o generar un dato del que el cliente no puede ser la fuente
(un código de invitación único, por ejemplo):

- `onUserCreate` — crea `users/{uid}` al registrarse (red de seguridad; el
  cliente también lo hace inline para que el onboarding no espere).
- `createGroup` — crea el grupo, el primer miembro (admin) y el
  `inviteCodes/{code}` en una sola transacción por lotes.
- `joinGroupByCode` — valida el código, añade el miembro y actualiza
  `memberIds` atómicamente.
- `regenerateInviteCode` — solo admin; rota el código de forma atómica.
- `leaveGroup` / `removeMember` — mutan `memberIds`, que ningún cliente
  puede tocar directamente.
- `deleteAccount` — cascada de borrado de datos personales + salida de
  grupos + borrado del usuario de Auth.

Todo lo demás (crear un gasto, marcar un pago, editar tu propio gasto...)
es una escritura de cliente normal, protegida por Security Rules — no hace
falta una función para eso, y añadir una la haría más lenta sin mejorar la
seguridad.

**Nota de implementación real** (documentada porque se encontró y corrigió
durante el desarrollo, no es un detalle menor): las funciones de ayuda de
las reglas que usan `get()` **deben** declararse dentro de
`match /databases/{database}/documents { ... }`, no a nivel de fichero —
si no, `$(database)` queda fuera de alcance y el `get()` falla en
silencio. El fichero actual ya está estructurado así.

---

## 5. Lógica financiera (`src/domain/`)

Todo cubierto por tests (`npm run test`, 31 tests, 4 ficheros):

- **`split.ts`** — reparto igual (con reparto exacto del céntimo sobrante,
  nunca se "pierde" un céntimo) y reparto por importe exacto (valida que
  la suma cuadre exactamente con el total, comparando en céntimos para
  evitar el clásico `0.1 + 0.2 !== 0.3`).
- **`balances.ts`** — cuánto pagó, cuánto debería haber pagado y el saldo
  neto de cada miembro, incorporando los pagos confirmados.
- **`settlement.ts`** — algoritmo voraz de min-cash-flow: empareja el
  mayor acreedor con el mayor deudor repetidamente. Da como máximo
  *(nº de miembros con saldo distinto de cero) − 1* transferencias, que es
  el estándar de facto en este tipo de apps (el óptimo exacto es un
  problema NP-difícil de partición).
- **`recurring.ts`** — genera las fechas de ocurrencia de un gasto
  recurrente dentro de un rango, respetando periodicidad
  (semanal/mensual/anual), día del mes con *clamp* de fin de mes (día 31
  en febrero → día 28/29) y fecha de fin. Es pura y determinista: la
  deduplicación al materializar gastos reales es responsabilidad de la
  capa de servicio (comprobar si ya existe un documento con ese
  `(recurringSourceId, date)` antes de escribir).

---

## 6. Ejecutar en local

### Requisitos
Node 20+, una cuenta de Firebase (gratis).

### 1. Instalar dependencias
```bash
npm install
cd functions && npm install && cd ..
```

### 2. Configurar Firebase
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Activa **Authentication → Email/contraseña**.
3. Activa **Cloud Firestore** (modo producción; las reglas del repo son
   las que mandan).
4. Añade una app web y copia la configuración a un `.env` en la raíz
   (usa `.env.example` como plantilla):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   Estos valores son públicos por diseño (van en el bundle del cliente);
   la seguridad real la dan `firestore.rules`, no este fichero.
5. Cloud Functions requiere el plan **Blaze** (pago por uso; tiene una
   capa gratuita generosa). Sin Functions desplegadas, **crear grupo y
   unirse por código no funcionarán** — el resto de la app sí.

### 3. Desplegar reglas, índices y funciones
```bash
npx firebase-tools login
npx firebase-tools use --add        # selecciona tu proyecto
npx firebase-tools deploy --only firestore:rules,firestore:indexes,functions
```

### 4. Arrancar en local
```bash
npm run dev
```

### Desarrollar contra los emuladores (recomendado, sin tocar datos reales)
```bash
npx firebase-tools emulators:start --only auth,firestore,functions
# en otra terminal:
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```
Usa un `VITE_FIREBASE_PROJECT_ID` que empiece por `demo-` (p. ej.
`demo-splitter`) en tu `.env` para que los emuladores corran en modo
totalmente offline, sin necesitar un proyecto real.

### Tests
```bash
npm run test        # lógica de dominio (Vitest)
npm run typecheck    # TypeScript estricto
```

---

## 7. Desplegar en producción (GitHub Pages)

La app usa `HashRouter` (URLs tipo `/#/grupos/abc123`) precisamente para
funcionar en GitHub Pages sin configuración de servidor adicional — no
hace falta el truco del `404.html` para SPAs.

### Opción A — GitHub Actions (automático)
Ya incluido en `.github/workflows/deploy.yml`. Pasos:
1. En el repo de GitHub: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions**, añade los 6
   `VITE_FIREBASE_*` como secrets (mismos valores que tu `.env`).
3. Haz push a `main` — el workflow compila, testea y publica `dist/` en
   Pages automáticamente.

Si tu repositorio no se llama `splitter`, o lo sirves desde una ruta
distinta, ajusta `base: "/splitter/"` en `vite.config.ts` (y `start_url`
/`scope` del manifest, que usan la misma ruta).

### Opción B — manual
```bash
npm run build
# sube el contenido de dist/ a la rama/rama-carpeta que sirva GitHub Pages
```

### Firebase Hosting (alternativa)
El repo también incluye `firebase.json` con `hosting` configurado
(`public: "dist"`), por si prefieres desplegar ahí en vez de GitHub Pages:
```bash
npm run build
npx firebase-tools deploy --only hosting
```

---

## 8. Variables de entorno

| Variable | Necesaria para | Secreta |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Cliente Firebase | No (pública) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Cliente Firebase | No |
| `VITE_FIREBASE_PROJECT_ID` | Cliente Firebase | No |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cliente Firebase | No |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cliente Firebase | No |
| `VITE_FIREBASE_APP_ID` | Cliente Firebase | No |
| `VITE_USE_FIREBASE_EMULATORS` | Solo desarrollo local | No |

Ninguna es secreta en el sentido criptográfico (son identificadores
públicos de un proyecto Firebase), pero se inyectan vía Secrets de GitHub
Actions/`.env` en vez de hardcodearse para poder cambiar de proyecto sin
tocar código.

---

## 9. Fases (roadmap original vs. estado actual)

**Fase 1 — MVP: ✅ completa.** Auth, perfil, gastos personales, crear/unirse
a grupos, miembros, añadir gastos, reparto igual/por importe, balances,
liquidación, historial, Security Rules, PWA.

**Fase 2: mayormente completa.** Estadísticas ✅, gastos recurrentes ✅
(motor de ocurrencias; falta el cron que los materializa automáticamente,
ver §1), gastos futuros ✅, Dark Mode ✅, mejoras offline ✅ (persistencia
IndexedDB de Firestore). Notificaciones: **no implementadas** a propósito
— el enunciado pide explícitamente no añadir ruido innecesario, y
requieren infraestructura adicional (FCM + Cloud Functions con triggers)
que no aporta valor sin un flujo de notificaciones ya validado con
usuarios reales.

**Fase 3: no implementada**, arquitectura preparada para ella:
conversión de divisas (cada gasto/grupo ya tiene `currency`), reparto por
porcentajes/participaciones (`SplitMethod` reservado), funciones
avanzadas de análisis.

---

## 10. Componentes principales

`Button`, `Input`, `AmountInput`, `Avatar`/`UserColorIndicator`,
`BottomSheet`, `ConfirmDialog`, `Toast`, `EmptyState`, `Skeleton`/
`CardListSkeleton`, `ErrorState`/`OfflineBanner`, `Card`/`Badge`,
`BottomNav`, `TopBar`, `FAB`, `BarChart`, `CategoryBreakdown`,
`CategoryPicker`, `MemberSelector`/`PayerSelector`, `SplitSelector`,
`PersonalExpenseCard`/`GroupExpenseCard`, `GroupCard`, `BalanceRow`,
`PaymentCard` — todos en `src/components/`, sin lógica de negocio dentro
(la reciben por props desde los `hooks`/`services`).

## 11. Manejo de errores

`src/lib/errors.ts` traduce códigos de Firebase (`permission-denied`,
`unauthenticated`, `auth/wrong-password`...) a mensajes en español
comprensibles — nunca se muestra un `FirebaseError:` crudo al usuario. Los
estados de "sin conexión", "grupo inexistente" (`GroupDetail` muestra un
`ErrorState` dedicado si el grupo no existe o no tienes acceso) y "código
de invitación inválido" (el *preview* antes de unirse) están cubiertos.
