# TIBOX · Gestión de Cumplimiento Ley N° 21.719

Aplicación web multiempresa para gestionar controles, documentos, evidencias, incidentes y avance asociados a la Ley N° 21.719 de Protección de Datos Personales.

## Tecnologías

- React 19.2.
- Tailwind CSS 4.
- Vite 7.
- JavaScript moderno.
- Diseño de base de datos para Microsoft SQL Server 2019+ y Azure SQL.
- GitHub Actions y GitHub Pages.

## Funcionalidades del prototipo

- Empresas en formato de lista con logo, rubro y avance.
- 8 ámbitos y 41 controles agrupados con avance global y por ámbito.
- Registro de estado, responsable, fechas, notas y evidencias por control.
- Registro de incidentes con filtro por empresa, impacto, medidas y comunicaciones.
- Perfiles TIBOX y clientes con permisos de visualización o edición.
- Acceso de clientes limitado a sus empresas asociadas.
- Personalización por empresa: logo, celeste, naranjo, amarillo TIBOX o color HEX.
- Modo claro y oscuro.

## Ejecución local

```bash
npm install
npm run dev
```

Validación de producción:

```bash
npm run lint
npm run build
npm run preview
```

## Acceso de demostración

La pantalla inicial permite seleccionar un perfil TIBOX o cliente, con permisos de edición o visualización. El prototipo no publica ni almacena contraseñas.

> La autenticación con correo y clave requiere un backend seguro. No debe implementarse validando credenciales dentro del código React ni almacenándolas en `localStorage`.

## Base de datos

El diseño se encuentra en [`database/schema.sql`](database/schema.sql) y su modelo lógico en [`database/model.md`](database/model.md). Incluye:

- organizaciones y personalización;
- usuarios y roles globales o por empresa;
- catálogo de ámbitos y controles;
- estado y evidencias por empresa;
- incidentes, comunicaciones y evidencias;
- auditoría;
- vista de avance global y por ámbito.

## Alcance actual

La interfaz React continúa funcionando como prototipo y persiste datos en `localStorage`. El esquema SQL Server queda preparado para la siguiente etapa: implementar una API, autenticación real y almacenamiento seguro de archivos. Para producción se recomienda ASP.NET Core Web API, Microsoft Entra ID y Azure Blob Storage o SharePoint.
