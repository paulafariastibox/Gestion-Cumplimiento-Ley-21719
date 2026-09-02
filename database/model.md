# Modelo lógico

```mermaid
erDiagram
  ORGANIZATIONS ||--o{ USER_ROLE_ASSIGNMENTS : autoriza
  USERS ||--o{ USER_ROLE_ASSIGNMENTS : recibe
  ROLES ||--o{ USER_ROLE_ASSIGNMENTS : define
  SCOPES ||--o{ CONTROLS : agrupa
  ORGANIZATIONS ||--o{ ORGANIZATION_CONTROLS : evalua
  CONTROLS ||--o{ ORGANIZATION_CONTROLS : instancia
  ORGANIZATION_CONTROLS ||--o{ CONTROL_EVIDENCES : respalda
  ORGANIZATIONS ||--o{ INCIDENTS : registra
  INCIDENTS ||--o{ INCIDENT_EVIDENCES : respalda
  INCIDENTS ||--o{ INCIDENT_COMMUNICATIONS : documenta
  USERS ||--o{ ACTIVITY_LOG : ejecuta
  ORGANIZATIONS ||--o{ ACTIVITY_LOG : audita
```

## Criterio de acceso

- Los roles `TIBOX_ADMIN` y `TIBOX_VIEWER` tienen alcance global.
- Los roles `CLIENT_EDITOR` y `CLIENT_VIEWER` se asignan por empresa.
- Una persona puede tener permisos diferentes en empresas distintas.
- La API debe resolver las empresas autorizadas desde `security.UserRoleAssignments` en cada solicitud.
