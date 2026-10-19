# Plan de correccion

## Seleccion

Se selecciona **H-01** de `HALLAZGOS.md`: es el unico hallazgo `Pendiente` de severidad alta y aborda la exposicion y persistencia del token. El alcance se mantiene acotado a la sesion del frontend. No se seleccionan otros hallazgos en este plan.

## H-01 - Token persistido en localStorage

**Hallazgo de HALLAZGOS.md:** H-01, “Token persistido en localStorage” (Vulnerabilidad, severidad alta, estado Pendiente).

**Problema:** `LoginComponent` persiste token y usuario en `localStorage`; `DashboardComponent` los lee y el token se envia como Bearer. `localStorage` conserva el token entre sesiones del navegador y, como cualquier almacenamiento accesible al JavaScript del origen, no lo protege frente a codigo malicioso ejecutado en ese origen. No se ha confirmado una explotacion.

**Cambio propuesto:** antes de modificar el codigo de produccion, escribir y ejecutar pruebas de caracterizacion del flujo actual. Luego centralizar la lectura, escritura y limpieza del token y el usuario en un `AuthSessionService`, usando `sessionStorage` en lugar de `localStorage` para estos dos datos. Los componentes dejan de acceder directamente al almacenamiento de sesion. Mantener las preferencias de interfaz (`workshop_preferences`) en su almacenamiento actual, fuera del servicio de sesion. El almacenamiento por pestana reduce la persistencia tras cerrar la pestana, pero sigue siendo accesible al JavaScript del mismo origen; no elimina el riesgo de XSS ni equivale a una cookie HttpOnly. No incorporar dependencias nuevas.

La correccion conserva el flujo login -> guardar sesion -> consultar tareas -> cerrar sesion y el contrato HTTP sin cambios: POST `/auth/login` con el mismo cuerpo y timeout, GET `/api/tasks?owner=...` con la misma cabecera `Authorization: Bearer ...`, y las mismas respuestas consumidas. No se agregan llamadas de renovacion o revocacion. Actualizar en `docs/ENDPOINTS.md` solo la descripcion del almacenamiento de sesion para que documente la decision; no cambiar sus endpoints, cuerpos, cabeceras ni respuestas.

**Pruebas de caracterizacion a escribir primero:**

- `src/app/login/login.component.spec.ts`: con Axios y Router aislados, comprobar que un login exitoso envia el POST al endpoint, cuerpo y timeout documentados, conserva el token y usuario para la siguiente navegacion, y navega a `/dashboard`. Comprobar tambien que una respuesta sin token no inicia la navegacion y que `busy` vuelve a `false`.
- `src/app/dashboard/dashboard.component.spec.ts`: preparar una sesion, comprobar que el dashboard consulta el endpoint de tareas con el `owner` y el Bearer del token, y que logout elimina token y usuario y navega a `/login`. Incluir el caso sin token, que redirige sin consultar tareas.
- `src/app/services/auth-session.service.spec.ts`: despues de crear el servicio, comprobar lectura, escritura y limpieza de token y usuario, incluidos valores ausentes. Estas pruebas complementan las de caracterizacion del flujo y cubren la nueva responsabilidad.

Orden test-first: escribir primero los tres archivos de prueba, antes de modificar o crear codigo de produccion. Ejecutar las pruebas de caracterizacion de login y dashboard contra el comportamiento existente. La prueba del servicio nuevo queda escrita antes de implementarlo y se ejecuta en cuanto exista ese servicio. Usar Vitest y dobles de prueba, sin sumar dependencias. Al validar el cambio, ejecutar `npm test` y medir cobertura del codigo modificado; cumplir la meta de `REGLAS.md` de al menos 85% para ese codigo.

**Archivos a tocar durante la implementacion:**

- `src/app/login/login.component.spec.ts` (nuevo): caracterizacion del login y navegacion.
- `src/app/dashboard/dashboard.component.spec.ts` (nuevo): caracterizacion de consulta autenticada, ruta sin sesion y logout.
- `src/app/services/auth-session.service.ts` (nuevo): unica responsabilidad de leer, escribir y limpiar la sesion de usuario en `sessionStorage`.
- `src/app/services/auth-session.service.spec.ts` (nuevo): pruebas unitarias de almacenamiento y limpieza.
- `src/app/login/login.component.ts`: delegar al servicio la persistencia de token y usuario; conservar preferencias, validacion, llamada y contrato de autenticacion.
- `src/app/dashboard/dashboard.component.ts`: delegar al servicio la lectura y limpieza de sesion; conservar consulta, cabecera Bearer y rutas actuales.
- `docs/ENDPOINTS.md`: actualizar unicamente la descripcion del almacenamiento de sesion en el flujo, preservando intacta la seccion de contratos HTTP.

No se modifican otros componentes, endpoints ni dependencias. No se cambia `HALLAZGOS.md`; el estado del hallazgo se actualiza alli durante el seguimiento posterior, no en este plan.

Plan aprobado 19 oct
