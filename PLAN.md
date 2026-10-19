# Plan de correccion

## Item: Token Bearer accesible desde almacenamiento del navegador (H-01)

**Hallazgo:** H-01, Vulnerabilidad, severidad alta, Pendiente. El cambio previo a `sessionStorage` reduce persistencia, pero el token sigue disponible a JavaScript del mismo origen.

**Alcance propio:** resolver el riesgo de exposicion del Bearer, no extraer todas las llamadas HTTP (H-05) ni modificar otros hallazgos. El frontend no puede emitir una cookie `HttpOnly`; cualquier cambio de servidor debe coordinarse como dependencia externa y queda fuera de este repositorio.

**Cambio propuesto:** acordar con el responsable del backend un flujo de sesion basado en cookie emitida por servidor con `HttpOnly`, `Secure` y `SameSite`, validacion y revocacion del lado servidor. Solo tras confirmar que ese contrato está soportado, adaptar login y tareas para enviar credenciales de navegador (`withCredentials`) y retirar lectura/almacenamiento Bearer desde JavaScript. No sustituir el token por otro secreto frontend. Si el backend no soporta el mecanismo, dejar H-01 Pendiente con riesgo residual; no etiquetar la mitigacion `sessionStorage` como solucion completa. Actualizar `docs/ENDPOINTS.md` solamente con el contrato externo aprobado para este item.

**Pruebas a escribir antes de tocar los archivos del item:** caracterizar el flujo actual en specs de login, tareas y sesion (POST/body/timeout, persistencia, GET/Bearer, logout). Escribir además tests objetivo para login con credenciales de navegador, ausencia de token accesible desde JS, GET sin Bearer construido en el frontend y logout del flujo acordado. Las expectativas nuevas requieren un backend/mock de integracion que implemente el contrato aprobado; no hacer tests verdes con un mock que omita validacion o revocacion.

**Archivos a tocar:** `src/app/login/login.component.spec.ts`, `src/app/dashboard/dashboard.component.spec.ts`, `src/app/services/auth-session.service.ts` y su spec, `src/app/login/login.component.ts`, `src/app/dashboard/dashboard.component.ts`, `docs/ENDPOINTS.md` y `HALLAZGOS.md`. No se modificara el backend en este repositorio.

## Item: Mensaje dinamico renderizado mediante innerHTML (H-02)

**Hallazgo de HALLAZGOS.md:** H-02, “Mensaje dinamico renderizado mediante innerHTML”, Vulnerabilidad, severidad media, estado Pendiente.

**Alcance propio:** cambiar solamente la representacion de mensajes del login y sus pruebas/documentacion de seguridad. No incluye el manejo del token (H-01), auditoria/actualizacion de dependencias (H-03), ni extraccion de HTTP a servicios.

**Problema:** `LoginComponent` construye mensajes con fragmentos `<strong>`/`<br>` y concatena username y errores de Axios; `login.component.html` los inserta mediante `[innerHTML]`. Angular sanitiza el binding por defecto y no se ha demostrado ejecucion de scripts, pero el contenido se procesa como HTML y el binding no es necesario para mensajes textuales.

**Cambio propuesto:** representar los mensajes como texto plano y reemplazar `[innerHTML]` por interpolacion Angular (`{{ message }}`). Quitar las etiquetas HTML de todos los mensajes producidos por el componente; preservar el texto informativo y las reacciones del flujo. No usar `DomSanitizer` ni introducir una dependencia. Los saltos visuales, si se requieren, se resuelven con texto/CSS sin interpretar markup.

**Pruebas a escribir antes de tocar los archivos del item:** ampliar `src/app/login/login.component.spec.ts` para validar mensajes de campos vacios, respuesta sin token y error del backend como texto sin etiquetas agregadas por el componente; incluir username y error con caracteres `<`/`>` y comprobar que se conservan como contenido literal. Agregar una verificacion de plantilla sin dependencias nuevas que confirme interpolacion de `message` y ausencia de `[innerHTML]` en `src/app/login/login.component.html` (el runner actual usa Vitest en entorno `node`, no DOM de navegador). Ejecutar primero estas pruebas contra el estado actual y registrar la expectativa que falla por el binding/markup; despues aplicar el cambio y ejecutar nuevamente.

**Archivos a tocar:**

- `src/app/login/login.component.spec.ts`: pruebas test-first de mensajes literales y contrato de plantilla.
- `src/app/login/login.component.ts`: retirar markup de cadenas de mensaje, sin cambiar llamadas HTTP ni transiciones de estado.
- `src/app/login/login.component.html`: cambiar `[innerHTML]` a interpolacion de texto.
- `docs/ENDPOINTS.md`: actualizar unicamente la nota de seguridad de login para reflejar interpolacion; no modificar rutas, requests, responses ni otros contratos.
- `HALLAZGOS.md`: marcar H-02 Resuelto solo despues de comprobar que ya no existe el binding en la plantilla y pasan las pruebas; incluir una nota breve de la correccion.

**Validacion posterior:** `npm test -- src/app/login/login.component.spec.ts`, `npm run test:coverage` y `git diff --check`. Revisar que la cobertura del codigo modificado siga en 85% o superior conforme a `REGLAS.md`. No ampliar el alcance a otros hallazgos.

## Item: Axios 0.31.0 declarado y utilizado (H-03)

**Hallazgo de HALLAZGOS.md:** H-03, “Axios 0.31.0 declarado y utilizado”, Sugerencia, severidad media, estado Pendiente. La matriz confirma version y uso; no confirma una CVE aplicable.

**Alcance propio:** verificar y corregir la dependencia Axios y su arbol de dependencias si la evidencia actual justifica un cambio. No incluir Lodash/H-04, cambios al token/H-01, al template/H-02 ni extraccion general de HTTP/H-05.

**Problema:** `package.json` fija Axios 0.31.0 y ambos componentes lo importan. Sin consultar el aviso de auditoria y su aplicabilidad a esta version/uso, no se debe afirmar que sea vulnerable ni elegir arbitrariamente una version.

**Cambio propuesto:** primero ejecutar y conservar evidencia de `npm audit --json` y revisar las alertas que correspondan especificamente a Axios y a su version resuelta. Si existe una alerta aplicable, actualizar Axios a una version mantenida que la corrija, eligiendo una version compatible con las llamadas actuales; no anadir otra dependencia. Si no existe alerta aplicable, no hacer un bump cosmetico: documentar la evidencia y reevaluar si la sugerencia de version debe seguir Pendiente. La presencia de Axios en el codigo esta confirmada, por lo que ausencia de CVE no significa “No encontrado”. Preservar exactamente los contratos de `docs/ENDPOINTS.md`: POST `/auth/login`, body/client, timeout de 5000 ms, GET `/api/tasks?owner=...` y cabecera Bearer; mantener la semantica actual de errores de Axios.

**Pruebas a escribir antes de tocar los archivos del item:** extender/confirmar primero tests de caracterizacion que verifiquen la llamada Axios de login (URL, body, timeout), la llamada de tareas (URL/query/Authorization) y las reacciones de UI ante error de red/timeout. Ejecutarlas con la version instalada antes del cambio para registrar la linea base. Despues del cambio, repetir exactamente esos tests y ejecutar auditoria otra vez; comparar el reporte para confirmar que la alerta aplicable desaparecio sin ocultar ni reducir quality gates.

**Archivos a tocar:**

- `src/app/login/login.component.spec.ts`: pruebas test-first de la llamada y su timeout/error.
- `src/app/dashboard/dashboard.component.spec.ts`: pruebas test-first de URL, query, Bearer y error de tareas.
- `package.json`: cambiar solo la version de Axios si la auditoria lo justifica.
- `package-lock.json`: revisar primero; actualmente esta sin seguimiento en Git. Si el proyecto decide incorporarlo para fijar el arbol actualizado, documentar y revisar ese cambio conscientemente, no sobrescribir el archivo local a ciegas.
- `docs/ENDPOINTS.md`: actualizar solo la version/dependencia documentada si cambia; conservar intactas las secciones de contrato HTTP.
- `HALLAZGOS.md`: registrar la evidencia del audit; marcar H-03 Resuelto solo si una alerta aplicable queda corregida y verificada. Si no se confirma CVE aplicable, dejar el resultado respaldado por evidencia y revisar si corresponde mantener la sugerencia Pendiente o cerrarla con una nota de verificacion; no marcar la dependencia existente como “No encontrado”.

**Validacion posterior:** `npm test`, `npm run test:coverage`, `npm run build` y `npm audit --audit-level=moderate` (ademas del JSON previo/posterior). Confirmar cobertura del codigo modificado >=85% segun `REGLAS.md`; no silenciar findings del scanner ni rebajar el umbral.

## Item: Lodash 4.17.21 y merge de preferencias almacenadas (H-04)

**Hallazgo:** H-04, Sugerencia, severidad media, Pendiente. Se confirma `lodash/merge` al cargar preferencias; la version por si sola no demuestra una CVE aplicable.

**Alcance propio:** reemplazo/auditoria del uso Lodash en preferencias. No incluir la auditoria ni bump de Axios (H-03), tipado global (H-06) ni HTTP (H-05).

**Cambio propuesto:** obtener `npm audit --json` y comprobar advisory y version resuelta para Lodash. Como el uso local mezcla preferencias planas con defaults, reemplazarlo por combinacion nativa tipada que preserve valores por defecto y overrides válidos; retirar dependencia/tipos solo si se comprueba que no quedan otros usos en el repositorio. Si hay un advisory aplicable, actualizar/remover de modo que la alerta quede resuelta sin esconder findings. Si no lo hay, registrar evidencia y cerrar/reclasificar la sugerencia con evidencia, sin afirmar exploitabilidad.

**Pruebas a escribir antes de tocar los archivos del item:** en `login.component.spec.ts`, fijar comportamiento para preferencias ausentes, JSON invalido, overrides validos y claves adicionales. Confirmar los defaults `theme`, `showTips` y `compact`, y que el login guarda preferencias sin alterarlas. Ejecutar esas pruebas antes y despues del cambio.

**Archivos a tocar:** `src/app/login/login.component.spec.ts`, `src/app/login/login.component.ts`, `package.json` y `package-lock.json` solo si la auditoria/uso justifica retirada, `docs/ENDPOINTS.md` si cambia la lista de dependencias y `HALLAZGOS.md` con la evidencia/estado.

## Item: Componentes concentran URLs, HTTP, sesion y navegacion (H-05)

**Hallazgo:** H-05, Refactor, severidad media, Pendiente. `LoginComponent` y `DashboardComponent` llaman Axios directamente y conocen URLs además de estado/navegacion.

**Alcance propio:** separar acceso HTTP y configuracion de endpoints sin cambiar contratos. La sesion permanece en `AuthSessionService`; este item no rediseña el almacenamiento/token (H-01), no cambia HTML (H-02), ni resuelve tipos globales (H-06).

**Cambio propuesto:** crear `AuthService` para POST login y `TasksService` para GET tareas; los componentes consumen esos servicios y conservan presentacion/navegacion. Introducir `src/environments/environment.ts` como archivo nuevo y registrar variantes necesarias en `angular.json` porque hoy no existe configuracion de ambientes. Mantener exactamente paths, body `client`, timeout 5000 ms, query `owner`, cabecera Bearer y manejo visible de errores según `docs/ENDPOINTS.md`.

**Pruebas a escribir antes de tocar los archivos del item:** extender tests actuales para capturar URL, metodo, body, timeout, query, Authorization, navegación, respuesta de error y sesion. Agregar specs de `AuthService` y `TasksService` con Axios mockeado que comprueben esos mismos contratos. Correr la caracterizacion antes de cambiar los componentes; después confirmar que componentes no importan Axios y que las llamadas no se duplican.

**Archivos a tocar:** `src/app/login/login.component.spec.ts`, `src/app/dashboard/dashboard.component.spec.ts`, nuevos `src/app/services/auth.service.ts` y spec, `src/app/services/tasks.service.ts` y spec, `src/app/login/login.component.ts`, `src/app/dashboard/dashboard.component.ts`, nuevo `src/environments/environment.ts`, `angular.json`, `docs/ENDPOINTS.md` solo para indicar configuración si aplica, y `HALLAZGOS.md`.

## Item: Uso extensivo de any en estado, respuestas y utilidad (H-06)

**Hallazgo:** H-06, Refactor, severidad media, Pendiente. Login, dashboard y `formatTaskLabel` tienen anotaciones `any`; las respuestas externas no tienen contrato runtime validado.

**Alcance propio:** definir y aplicar tipos de dominio/estado en los archivos identificados. No extraer llamadas HTTP (H-05), cambiar el HTML (H-02), ni rediseñar autenticacion (H-01).

**Cambio propuesto:** definir interfaces para usuario/sesion, login request/response y tarea, basadas solo en campos consumidos y separando campos opcionales; tipar colecciones/estado y `formatTaskLabel`; capturar errores como `unknown` y estrechar antes de leer. Validar respuestas externas en runtime donde se consumen para que respuestas malformadas produzcan error visible controlado en vez de excepcion no manejada. No declarar como garantizados status/campos del servidor que siguen abiertos en `docs/ENDPOINTS.md`.

**Pruebas a escribir antes de tocar los archivos del item:** agregar casos para `formatTaskLabel` con null/campos ausentes; tareas válidas, vacías y malformadas; login con `data`/token/user ausentes; y diferentes formas de error. Esperar mensajes controlados cuando la respuesta es inválida, no el comportamiento roto actual. Ejecutar `npm run build` como comprobacion de tipos.

**Archivos a tocar:** nuevos tipos bajo `src/app/models/` si simplifican contratos comunes, `src/app/login/login.component.ts` y spec, `src/app/dashboard/dashboard.component.ts` y spec, `src/app/services/auth-session.service.ts` y spec, `src/app/utils/legacy-format.ts` y spec, y `HALLAZGOS.md`.

## Item: Pruebas limitadas a un caso de la utilidad (H-07)

**Hallazgo:** H-07, Sugerencia, severidad media, Pendiente. Su descripcion original precede los tests de flujo añadidos; no asumir que sigue describiendo la suite actual. La ejecucion reciente reportó 84,04% de lineas globales y mayor cobertura en archivos de login/sesion/dashboard.

**Alcance propio:** identificar brechas de pruebas del repositorio y completar pruebas faltantes. No tocar produccion por el solo hecho de elevar un porcentaje, ni rebajar/inflar gates. La meta de `REGLAS.md` es >=85% en codigo modificado; la cobertura global puede requerir justificar archivos que queden fuera de esta tanda.

**Cambio propuesto:** ejecutar coverage y mapear líneas/ramas sin cubrir contra lógica de negocio; completar casos realmente faltantes de formato, carga, errores, sesion y estados vacíos. Mantener la suite Vitest existente y usar mocks de API; no llamar servidores externos ni declarar integración real. Actualizar la evidencia del item para reflejar cobertura nueva.

**Pruebas a escribir antes de tocar los archivos del item:** primero guardar reporte baseline de `npm run test:coverage`; escribir specs para brechas seleccionadas en la utilidad, login, dashboard o sesion antes de cualquier ajuste de produccion. Añadir/verificar casos de estado vacio, prioridad/owner opcionales y estados de error/recuperacion que no estén ya cubiertos. Repetir `npm test` y coverage después.

**Archivos a tocar:** `src/app/utils/legacy-format.spec.ts`, specs existentes de login/dashboard/sesion según brechas medidas, `vitest.config.ts` solo si se requiere incluir archivos sin relajar thresholds, `docs/TESTING.md` si necesita actualizar resultados reales, y `HALLAZGOS.md`. No se anticipan archivos de producción.

## Item: Validacion de login con condicionales anidados (H-08)

**Hallazgo:** H-08, Refactor, severidad baja, Pendiente. `login()` anida validacion de username, password y envio.

**Alcance propio:** aplanar el flujo de validacion de credenciales sin cambiar contrato ni extraer HTTP/tipado general.

**Cambio propuesto:** usar retornos anticipados para usuario y password inválidos; preservar mensajes, criterio `trim()` solo para validar, valores originales enviados, `busy`, `finally`, manejo de respuesta sin token y navegación.

**Pruebas a escribir antes de tocar los archivos del item:** completar `login.component.spec.ts` con null, undefined, cadena vacía y espacios para cada credencial; confirmar que no hay Axios call en inválidos, y caracterizar exito/error, mensaje, navegacion y `busy`. Correr antes y después para preservar comportamiento visible.

**Archivos a tocar:** `src/app/login/login.component.spec.ts`, `src/app/login/login.component.ts` y `HALLAZGOS.md`.

## Item: Duplicacion del cierre de carga y de claves de sesion (H-09)

**Hallazgo:** H-09, Refactor, severidad baja, Pendiente. Las claves de sesion ya están centralizadas por `AuthSessionService`; el cierre de carga/error sigue duplicado en DashboardComponent. Revalidar la evidencia al iniciar este item y resolver solo lo que persista.

**Alcance propio:** deduplicar finalizacion del estado de carga del dashboard. No tocar login ni reimplementar almacenamiento de sesión ya centralizado.

**Cambio propuesto:** extraer a una función privada de dashboard el bloque común de `NgZone.run`, `loading = false` y `detectChanges`, manteniendo asignaciones específicas de éxito/error en su rama y dejando compartido el cierre. No modificar el filtrado/ordenamiento de tareas ni el texto de errores.

**Pruebas a escribir antes de tocar los archivos del item:** ampliar `dashboard.component.spec.ts` para éxito, error y falta de token; verificar estado final de `loading`, `tasks`, `visibleTasks`, error, detección de cambios y navegación/logout. Correrlas como caracterización antes y repetir después.

**Archivos a tocar:** `src/app/dashboard/dashboard.component.spec.ts`, `src/app/dashboard/dashboard.component.ts` y `HALLAZGOS.md` para actualizar evidencia y cerrar solo la duplicacion confirmada.

## Validacion comun

Mantener los items separados en seguimiento aunque se implementen en la misma tanda. Por item, ejecutar pruebas focalizadas antes de produccion y luego; al cerrar tandas correr `npm test`, `npm run test:coverage` y `npm run build`. Cumplir cobertura >=85% de codigo modificado, conservar quality gates y no marcar Resuelto sin evidencia. Los cambios externos de backend para H-01 requieren contrato aprobado fuera de este repositorio.
