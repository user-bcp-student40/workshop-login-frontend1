# Mapa y contrato funcional del frontend

Documento derivado de inspeccion estatica del frontend. Describe lo que el cliente envia y espera, no un contrato verificado de los servidores. No se consultaron otros componentes del workspace ni se ejecutaron peticiones. El seguimiento de hallazgos vive exclusivamente en `../HALLAZGOS.md`.

## Ejecucion y dependencias

Segun `README.md:14-22`, se requiere Node.js >=22.12.0; ejecutar `npm install` y `npm start` desde este repositorio sirve la aplicacion en http://localhost:4200. No se ejecutaron estos comandos durante el analisis.

`package.json:13-32` declara Angular 21.2.19 (common, compiler, core, forms, platform-browser y router), Axios 0.31.0, Lodash 4.17.21, RxJS 7.8.2, tslib 2.8.1 y zone.js 0.15.1. Las herramientas incluyen Angular CLI/build/compiler, TypeScript 5.9.3, tipos de Lodash y Vitest/coverage-v8 3.2.4. Son versiones declaradas, no un inventario de paquetes instalados ni una auditoria de CVEs.

Dependencias externas esperadas por el cliente: autenticacion en http://localhost:8080 y tareas en http://localhost:8000. No se inspecciono su implementacion; sus respuestas, permisos, CORS y disponibilidad no estan verificados.

## Componentes y relaciones

| Superficie | Responsabilidad y dependencias | Evidencia |
|---|---|---|
| Arranque | bootstrapApplication registra el router y monta AppComponent. | src/main.ts:1; src/main.ts:6 |
| AppComponent | Contiene un RouterOutlet, sin logica de autenticacion. | src/app/app.component.ts:7; src/app/app.component.ts:8 |
| Rutas | Carga diferida de /login y /dashboard; raiz y rutas desconocidas redirigen a /login. No se declara un guard en estas rutas. | src/app/app.routes.ts:3; src/app/app.routes.ts:6; src/app/app.routes.ts:10; src/app/app.routes.ts:12; src/app/app.routes.ts:13 |
| LoginComponent | CommonModule y FormsModule para la vista; Router para navegar; Axios para HTTP; AuthSessionService para token y usuario en sessionStorage; localStorage y lodash/merge para preferencias. La plantilla enlaza credenciales, accion login y mensaje. | src/app/login/login.component.ts:1; src/app/login/login.component.ts:12; src/app/login/login.component.ts:23; src/app/login/login.component.html:19; src/app/login/login.component.html:30; src/app/login/login.component.html:34; src/app/login/login.component.html:39 |
| DashboardComponent | CommonModule para la vista; Router y Axios para navegacion y tareas; AuthSessionService para leer y limpiar sesion en sessionStorage; NgZone y ChangeDetectorRef para actualizar la vista; formatTaskLabel para etiquetas. | src/app/dashboard/dashboard.component.ts:1; src/app/dashboard/dashboard.component.ts:6; src/app/dashboard/dashboard.component.ts:33; src/app/dashboard/dashboard.component.ts:57; src/app/dashboard/dashboard.component.ts:66 |
| formatTaskLabel | Recibe una tarea; devuelve prioridad y propietario en mayusculas separados por un punto medio. Valores ausentes: NORMAL y SIN-ASIGNAR; tarea ausente: SIN-DATOS. | src/app/utils/legacy-format.ts:1; src/app/utils/legacy-format.ts:3; src/app/utils/legacy-format.ts:5; src/app/utils/legacy-format.ts:7 |
| Vistas de tareas | Presenta usuario, carga, error, tareas visibles y estado vacio; el boton de cierre llama logout. Los estados conocidos se traducen mediante STATUS_LABELS. | src/app/dashboard/dashboard.component.html:6; src/app/dashboard/dashboard.component.html:9; src/app/dashboard/dashboard.component.html:13; src/app/dashboard/dashboard.component.html:18; src/app/dashboard/dashboard.component.html:21; src/app/dashboard/dashboard.component.html:27; src/app/dashboard/dashboard.component.ts:7 |

## Endpoints consumidos

| Operacion | Solicitud del cliente | Respuesta esperada por el cliente | Evidencia |
|---|---|---|---|
| Autenticar | POST http://localhost:8080/auth/login; cuerpo con username, password y client fijo angular-workshop; timeout de 5000 ms. No se agrega Authorization en esta llamada. | response.data.token con valor truthy y response.data.user serializable. El cliente consume luego user.username y user.displayName. No hay validacion de esquema ni tipo. | src/app/login/login.component.ts:41; src/app/login/login.component.ts:43; src/app/login/login.component.ts:44; src/app/login/login.component.ts:46; src/app/login/login.component.ts:48; src/app/dashboard/dashboard.component.ts:43; src/app/dashboard/dashboard.component.html:6 |
| Consultar tareas | GET http://localhost:8000/api/tasks?owner= seguido de user.username o cadena vacia, concatenado sin codificacion explicita; cabecera Authorization: Bearer seguida del token almacenado. No se configura timeout en esta llamada. | response.data como arreglo de tareas; se consumen status, priority, owner, title y description. El cliente agrega label a las tareas no archivadas. | src/app/dashboard/dashboard.component.ts:43; src/app/dashboard/dashboard.component.ts:44; src/app/dashboard/dashboard.component.ts:46; src/app/dashboard/dashboard.component.ts:49; src/app/dashboard/dashboard.component.ts:50; src/app/utils/legacy-format.ts:5; src/app/utils/legacy-format.ts:6; src/app/dashboard/dashboard.component.html:23; src/app/dashboard/dashboard.component.html:24 |

No hay una llamada HTTP de logout, renovacion de token o revocacion en el flujo inspeccionado. No se deducen codigos de estado de exito o error, duracion del token ni autorizacion del servidor a partir de este cliente.

## Flujo que se debe preservar

1. **Entrada y preferencias.** La raiz abre /login. El constructor del login lee workshop_preferences de localStorage, interpreta JSON y lo mezcla con los valores iniciales theme=light, showTips=true y compact=false. Si falla, registra el error y conserva el estado disponible (`src/app/app.routes.ts:12`; `src/app/login/login.component.ts:20`; `src/app/login/login.component.ts:23-28`).
2. **Validacion local.** login limpia message y rechaza usuario o contrasena nulos, indefinidos o vacios tras trim. La comprobacion no transforma los valores enviados al servidor. Al enviar activa busy, que deshabilita el boton (`src/app/login/login.component.ts:31-44`; `src/app/login/login.component.html:34`).
3. **Autenticacion y almacenamiento.** Tras el POST, si existe token, `AuthSessionService` guarda workshop_token y workshop_user como JSON en sessionStorage; el login guarda workshop_preferences en localStorage y luego navega a /dashboard. Sin token muestra un mensaje. Si hay excepcion, combina el usuario con response.data.message, error.message o un texto alternativo. finally desactiva busy. La plantilla presenta message mediante innerHTML con la sanitizacion normal de Angular (`src/app/login/login.component.ts:46-60`; `src/app/login/login.component.html:39`; `src/app/services/auth-session.service.ts:22-24`).
4. **Lectura de sesion.** Al iniciar el dashboard, `AuthSessionService` lee workshop_token y deserializa workshop_user desde sessionStorage, usando {} si falta. Si no hay token redirige a /login y retorna. El JSON del usuario se interpreta antes de esa comprobacion y fuera del try de la consulta; JSON corrupto puede interrumpir este flujo. La presencia del token no comprueba su validez (`src/app/dashboard/dashboard.component.ts:42-49`; `src/app/services/auth-session.service.ts:13-18`).
5. **Consulta y presentacion.** Solicita tareas con owner y Bearer. Excluye solo status exactamente ARCHIVED de visibleTasks, asigna etiquetas y ordena mediante el comparador de prioridad existente (a.priority > b.priority ? -1 : 1); no debe suponerse un orden semantico adicional. Guarda el arreglo completo en tasks y el filtrado en visibleTasks. Tanto exito como error entran en zone.run, desactivan loading y llaman detectChanges (`src/app/dashboard/dashboard.component.ts:43-70`).
6. **Errores de tareas.** Muestra response.data.detail, error.message o el mensaje alternativo mediante interpolacion. No hay tratamiento especifico de 401/403, borrado de sesion ni redireccion en este catch (`src/app/dashboard/dashboard.component.ts:65-70`; `src/app/dashboard/dashboard.component.html:18`).
7. **Cierre de sesion.** `AuthSessionService` elimina workshop_token y workshop_user de sessionStorage, conserva workshop_preferences en localStorage y navega a /login. Es un cierre local, sin revocacion remota (`src/app/dashboard/dashboard.component.ts:80-83`; `src/app/services/auth-session.service.ts:27-29`).

## Verificacion disponible

La configuracion descubre `src/**/*.spec.ts` con Vitest en entorno node (`vitest.config.ts:4-6`). La prueba existente cubre un caso nominal de formatTaskLabel (`src/app/utils/legacy-format.spec.ts:4-7`). Los comandos declarados son npm test, npm run test:coverage y npm run audit:workshop (`package.json:8-10`); no se ejecutaron ni se atribuyen resultados a ellos.