# Diseño de base de datos SQL Server

El archivo `schema.sql` crea el modelo multiempresa para la plataforma.

## Módulos

- `core`: empresas y personalización visual.
- `security`: usuarios, roles globales TIBOX y permisos por empresa.
- `compliance`: ámbitos, catálogo de 41 controles, estado por empresa y evidencias.
- `incident`: incidentes, comunicaciones y evidencias.
- `audit`: trazabilidad de cambios.

## Progreso

La vista `compliance.vw_OrganizationProgress` calcula el avance global y por ámbito. Un control completado pesa 100 %, uno en proceso 50 %, uno pendiente 0 % y “No aplica” se excluye del denominador.

## Archivos

La base almacena únicamente metadatos, URL segura, hash y tamaño. Los archivos deben almacenarse fuera de SQL Server, por ejemplo en Azure Blob Storage o SharePoint, utilizando vínculos privados con autorización desde la API.

## Autenticación

Para producción se recomienda Microsoft Entra ID. Si se habilitan cuentas locales, la API debe utilizar Argon2id o bcrypt y guardar solo el hash en `security.Users.PasswordHash`; nunca contraseñas en texto plano.
