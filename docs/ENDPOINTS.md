# Endpoints externos

Esta pagina describe lo que el cliente Angular envia, consume y muestra. El backend no se inspecciono ni se hicieron capturas HTTP: los ejemplos de respuesta reproducen fixtures de pruebas locales y muestran formas que el cliente acepta, no respuestas observadas de los servicios. Cuando el codigo no fija un detalle del contrato del servidor, se declara como pregunta abierta.

## Login - POST /auth/login

### 1. Quien lo llama

`LoginComponent.login()` inicia la solicitud cuando el usuario pulsa Ingresar y las credenciales no estan vacias tras aplicar `trim()` solo a la validacion. Los valores originales se envian, sin recortarlos. Usa Axios y configura un timeout de 5000 ms. Evidencia: `src/app/login/login.component.ts`.

### 2. Que envia

URL completa: `http://localhost:8080/auth/login`.

| Parte | Campo | Valor o regla | Ejemplo verificable |
|---|---|---|---|
| Metodo y URL | - | POST a la URL indicada. | `POST http://localhost:8080/auth/login` |
| Headers | - | El componente no proporciona headers ni un header Authorization para esta llamada. | Sin headers configurados por el componente. |
| Body | `username` | Valor del campo de usuario; debe no ser null/undefined y no quedar vacio tras `trim()`. El valor enviado no se recorta. | `"student"` |
| Body | `password` | Valor del campo de contrasena; misma validacion local, sin recortar el valor enviado. | `"Workshop123!"` |
| Body | `client` | Literal fijo `angular-workshop`. | `"angular-workshop"` |
| Configuracion Axios | `timeout` | 5000 milisegundos. | `5000` |

Ejemplo del body usado por el test del componente:

```json
{
	"username": "student",
	"password": "Workshop123!",
	"client": "angular-workshop"
}
```

El componente no fija explicitamente `Content-Type`; no se afirma aqui el header serializado final que Axios agrega.

### 3. Que espera recibir en exito

El componente no consulta `response.status`: trata como exitoso lo que Axios resuelve y comprueba que `response.data.token` sea truthy. Axios, sin `validateStatus` personalizado en esta llamada, resuelve por defecto estados 2xx; el codigo exacto que entrega el backend no esta fijado por el frontend.

| Campo consumido | Uso y validacion realizada |
|---|---|
| `data.token` | Debe ser truthy para continuar. Se guarda mediante `AuthSessionService` como `workshop_token` en `sessionStorage` y luego se envia como Bearer al endpoint de tareas. El frontend no valida formato, emisor, expiracion ni firma. |
| `data.user` | Se serializa y guarda como `workshop_user`. El cliente lee despues `username` para el query `owner` y `displayName`/`username` para el saludo. El componente no valida que el objeto o esos campos esten presentes. |

Ejemplo de respuesta exitosa usado como fixture de prueba (no capturado del backend):

```json
{
	"token": "token-123",
	"user": {
		"username": "student",
		"displayName": "Student"
	}
}
```

Al aceptar token y user, guarda la sesion, guarda `workshop_preferences` aparte en `localStorage` y navega a `/dashboard`.

### 4. Errores y reaccion de la UI

| Caso | Comportamiento del cliente | Resultado visible |
|---|---|---|
| Usuario o contrasena vacios | No hace la peticion y no activa `busy`. | Mensaje local para completar el campo. |
| Respuesta resuelta sin `data.token` truthy | No guarda sesion ni navega; `finally` restablece `busy`. | Mensaje “El backend respondió sin token.” |
| HTTP no-2xx, error de red o timeout | Axios rechaza la promesa y entra al `catch`; se selecciona `error.response.data.message`, luego `error.message`, luego “Error desconocido”. `finally` restablece `busy`. No hay tratamiento separado por status. | Se muestra usuario y mensaje seleccionado. El texto se asigna a `message`. |
| Timeout | Axios aborta/rechaza al alcanzar 5000 ms; no hay reintento. | Sigue el mismo `catch`; el mensaje depende de `error.message` que entregue Axios. |
| Respuesta con token truthy pero `user` ausente o incompatible | No se valida el esquema. Puede guardarse un valor que luego no se pueda deserializar; `getUser()` puede lanzar en el inicio del dashboard, antes del `try` de la peticion de tareas. | No existe un mensaje de login especifico para esta forma; puede fallar la inicializacion del dashboard. |

### 5. Notas de seguridad

- El token vive en `sessionStorage` a traves de `AuthSessionService`; se borra al cerrar sesion y el navegador normalmente elimina el almacenamiento de sesion al cerrar la pestana. Sigue siendo legible por JavaScript del mismo origen: no mitiga el robo del token si ocurre XSS. No es una cookie `HttpOnly`.
- El endpoint configurado usa HTTP en localhost, no HTTPS. El frontend no configura ni verifica TLS para esta URL.
- La UI construye mensajes con el usuario y el error. La plantilla actual mantiene `[innerHTML]`; Angular aplica su sanitizacion por defecto y no se observa un bypass con `DomSanitizer`, pero el binding sigue siendo una superficie de HTML dinamico (H-02 continua Pendiente). No se afirma que todo contenido arbitrario del backend se muestre literalmente.
- `sessionStorage` y las claves de sesion estan encapsuladas en `src/app/services/auth-session.service.ts`. Las preferencias no son el token y permanecen en `localStorage`.

## Tareas - GET /api/tasks?owner=...

### 1. Quien lo llama

`DashboardComponent.ngOnInit()` consulta tareas despues de recuperar la sesion con `AuthSessionService`. Si no hay token, navega a `/login` y no llama al endpoint. Usa Axios sin configurar timeout ni `validateStatus` personalizado. Evidencia: `src/app/dashboard/dashboard.component.ts`.

### 2. Que envia

URL base codificada en el componente: `http://localhost:8000/api/tasks`. El query se concatena directamente, sin `encodeURIComponent`.

| Parte | Campo | Valor o regla | Ejemplo verificable |
|---|---|---|---|
| Metodo y URL | - | GET a la URL con query `owner`. | `GET http://localhost:8000/api/tasks?owner=student` |
| Query | `owner` | `user.username || ''`, concatenado sin codificacion explicita. | `owner=student`; si no hay username se envia `owner=` |
| Header | `Authorization` | `Bearer ` seguido por el token obtenido de `AuthSessionService`. | `Authorization: Bearer token-123` |
| Body | - | El codigo no envia body en el GET. | Sin body configurado. |
| Timeout | - | No se configura timeout en esta llamada. | Sin timeout establecido por el componente. |

Ejemplo de llamada con los valores usados en los tests:

```http
GET http://localhost:8000/api/tasks?owner=student
Authorization: Bearer token-123
```

### 3. Que espera recibir en exito

El componente no consulta `response.status` ni comprueba el esquema de `response.data`. Axios resuelve por defecto respuestas 2xx; el status exacto del contrato del servidor sigue abierto.

| Campo consumido | Uso realizado por el cliente |
|---|---|
| `data` | Se itera como si fuera una lista de tareas y se asigna a `tasks`; no hay validacion runtime de que sea un array. |
| `status` | Se excluye de `visibleTasks` solo la tarea cuyo valor sea exactamente `ARCHIVED`. Se usa tambien para el label visual. |
| `priority` | Se usa en el ordenamiento existente y para construir el label. |
| `owner` | Se usa para construir el label de la tarea. |
| `title`, `description` | Se muestran en la tarjeta de tarea. |
| `label` | Campo calculado localmente por `formatTaskLabel` a partir de `priority` y `owner`; no se espera que venga del servidor. |

El codigo y los tests no fijan tipos ni campos obligatorios del contrato remoto. Ejemplo de elemento proveniente del fixture de prueba (no capturado del backend):

```json
[
	{
		"title": "Review requirements",
		"status": "TODO",
		"priority": "HIGH",
		"owner": "student"
	}
]
```

### 4. Errores y reaccion de la UI

| Caso | Comportamiento del cliente | Resultado visible |
|---|---|---|
| Token ausente antes de llamar | No hace el GET; navega a `/login`. | Se muestra la pantalla de login. |
| Token invalido/expirado (por ejemplo, backend responde 401) o sin permiso (por ejemplo, 403) | No hay rama por status. Axios rechaza respuestas no-2xx; el `catch` elige `error.response.data.detail`, luego `error.message`, luego “No se pudo cargar el dashboard”. No limpia sesion ni redirige automaticamente. | `error` se muestra en `<p class="error">` mediante interpolacion Angular. |
| Error de red | Entra al mismo `catch`, termina `loading` y muestra `error.message` si existe, si no el fallback. | Se oculta el estado de carga y aparece el error. |
| Timeout | No existe timeout configurado por este componente; el cliente no define un limite de tiempo propio para esta solicitud. | Si la promesa finalmente rechaza, aplica el manejo generico anterior; mientras no rechace, el dashboard permanece cargando. |
| `data` nulo o forma que provoca excepcion al iterar/procesar | La excepcion ocurre dentro del `try` y pasa al `catch`; no hay validacion ni mensaje distinto por esquema. | Se muestra `error.message` o el fallback y termina la carga. |
| `data` con forma inesperada que no lanza excepcion | Puede producir una lista vacia o contenido incompleto; no hay validacion de esquema. | Puede aparecer “No hay tareas para mostrar todavía.” o tarjetas con campos vacios. |

### 5. Notas de seguridad

- El Bearer procede de `sessionStorage` a traves de `AuthSessionService`. Sigue accesible a JavaScript del mismo origen y no protege frente a XSS; H-01 esta registrado como Pendiente por esta limitacion.
- El frontend envia el token como header `Authorization`; no se observa que lo incluya en la URL. El `owner` se concatena sin codificacion, por lo que nombres con caracteres reservados pueden alterar el query. El formato permitido por el backend es pregunta abierta.
- La vista del dashboard muestra los mensajes de error con interpolacion Angular, no con `[innerHTML]`. Los campos de tarea se interpolan en la plantilla; no se usa `DomSanitizer`.
- No se conoce si el backend valida que `owner` coincida con el principal del token. No asumir que el filtro del frontend o el query autorizan el acceso: el control de acceso del servidor es pregunta abierta.

## Preguntas abiertas del contrato remoto

- Que status HTTP exacto retorna cada endpoint en exito y cuales son los esquemas completos/obligatorios de sus respuestas.
- Que formato, expiracion y semantica de revocacion tiene el token; el cliente solo comprueba que sea truthy y lo reenvia como Bearer.
- Que respuestas de error emite cada backend, ademas de los campos `message` (login) y `detail` (tareas) que el frontend intenta leer.
- Que valores y caracteres acepta `owner`, y como se codifica/valida en el servidor.
- Si el backend de tareas aplica autorizacion al propietario independientemente del query recibido.

El cierre de sesion no llama a un endpoint externo: solo limpia token y usuario de `sessionStorage` y navega a `/login`.