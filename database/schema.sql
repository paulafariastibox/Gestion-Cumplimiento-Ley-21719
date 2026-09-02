/*
  TIBOX · Gestión de Cumplimiento Ley N° 21.719
  Motor: Microsoft SQL Server 2019+ / Azure SQL Database
  Ejecución: sobre una base de datos vacía ya creada.

  Principios:
  - Multiempresa: toda información operacional referencia OrganizationId.
  - Permisos globales TIBOX y permisos específicos por empresa.
  - Contraseñas: guardar únicamente hashes generados por el proveedor de identidad.
  - Evidencias: guardar metadatos; el archivo binario debe vivir en Blob Storage/SharePoint.
  - Auditoría: registrar las mutaciones desde la API dentro de la misma transacción.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'core') EXEC('CREATE SCHEMA core');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'security') EXEC('CREATE SCHEMA security');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'compliance') EXEC('CREATE SCHEMA compliance');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'incident') EXEC('CREATE SCHEMA incident');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit') EXEC('CREATE SCHEMA audit');
GO

CREATE TABLE core.Organizations (
  OrganizationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Organizations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  LegalName NVARCHAR(200) NOT NULL,
  TradeName NVARCHAR(160) NOT NULL,
  TaxId NVARCHAR(20) NULL,
  Industry NVARCHAR(120) NULL,
  PrivacyOwnerName NVARCHAR(160) NULL,
  LogoUrl NVARCHAR(1000) NULL,
  ThemeMode VARCHAR(20) NOT NULL CONSTRAINT DF_Organizations_ThemeMode DEFAULT 'cyan',
  PrimaryColor CHAR(7) NOT NULL CONSTRAINT DF_Organizations_PrimaryColor DEFAULT '#00BCEB',
  IsActive BIT NOT NULL CONSTRAINT DF_Organizations_IsActive DEFAULT 1,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Organizations_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Organizations_UpdatedAt DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT CK_Organizations_ThemeMode CHECK (ThemeMode IN ('cyan', 'orange', 'yellow', 'custom')),
  CONSTRAINT CK_Organizations_PrimaryColor CHECK (PrimaryColor LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);
GO

CREATE TABLE security.Users (
  UserId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  Email NVARCHAR(320) NOT NULL,
  FirstName NVARCHAR(100) NOT NULL,
  LastName NVARCHAR(100) NOT NULL,
  JobTitle NVARCHAR(160) NULL,
  IdentityProvider VARCHAR(30) NOT NULL CONSTRAINT DF_Users_IdentityProvider DEFAULT 'local',
  ExternalObjectId NVARCHAR(100) NULL,
  PasswordHash VARBINARY(512) NULL,
  PasswordAlgorithm VARCHAR(30) NULL,
  MustChangePassword BIT NOT NULL CONSTRAINT DF_Users_MustChangePassword DEFAULT 0,
  IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
  LastLoginAt DATETIME2(3) NULL,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT UQ_Users_Email UNIQUE (Email),
  CONSTRAINT CK_Users_IdentityProvider CHECK (IdentityProvider IN ('local', 'entra_id'))
);
GO

CREATE TABLE security.Roles (
  RoleId SMALLINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
  RoleCode VARCHAR(40) NOT NULL,
  RoleName NVARCHAR(100) NOT NULL,
  ScopeType VARCHAR(20) NOT NULL,
  CanView BIT NOT NULL CONSTRAINT DF_Roles_CanView DEFAULT 1,
  CanEdit BIT NOT NULL CONSTRAINT DF_Roles_CanEdit DEFAULT 0,
  CanUploadEvidence BIT NOT NULL CONSTRAINT DF_Roles_CanUpload DEFAULT 0,
  CanManageUsers BIT NOT NULL CONSTRAINT DF_Roles_CanManageUsers DEFAULT 0,
  CanManageOrganizations BIT NOT NULL CONSTRAINT DF_Roles_CanManageOrganizations DEFAULT 0,
  CONSTRAINT UQ_Roles_RoleCode UNIQUE (RoleCode),
  CONSTRAINT CK_Roles_ScopeType CHECK (ScopeType IN ('GLOBAL', 'ORGANIZATION'))
);
GO

CREATE TABLE security.UserRoleAssignments (
  UserRoleAssignmentId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserRoleAssignments PRIMARY KEY,
  UserId UNIQUEIDENTIFIER NOT NULL,
  RoleId SMALLINT NOT NULL,
  OrganizationId UNIQUEIDENTIFIER NULL,
  GrantedByUserId UNIQUEIDENTIFIER NULL,
  GrantedAt DATETIME2(3) NOT NULL CONSTRAINT DF_UserRoleAssignments_GrantedAt DEFAULT SYSUTCDATETIME(),
  RevokedAt DATETIME2(3) NULL,
  CONSTRAINT FK_UserRoleAssignments_User FOREIGN KEY (UserId) REFERENCES security.Users(UserId),
  CONSTRAINT FK_UserRoleAssignments_Role FOREIGN KEY (RoleId) REFERENCES security.Roles(RoleId),
  CONSTRAINT FK_UserRoleAssignments_Organization FOREIGN KEY (OrganizationId) REFERENCES core.Organizations(OrganizationId),
  CONSTRAINT FK_UserRoleAssignments_GrantedBy FOREIGN KEY (GrantedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT UQ_UserRoleAssignments UNIQUE (UserId, RoleId, OrganizationId),
  CONSTRAINT CK_UserRoleAssignments_Revocation CHECK (RevokedAt IS NULL OR RevokedAt >= GrantedAt)
);
GO

CREATE TABLE compliance.Scopes (
  ScopeId SMALLINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Scopes PRIMARY KEY,
  ScopeCode VARCHAR(40) NOT NULL,
  ScopeName NVARCHAR(200) NOT NULL,
  IconCode NVARCHAR(20) NULL,
  SortOrder TINYINT NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_Scopes_IsActive DEFAULT 1,
  CONSTRAINT UQ_Scopes_ScopeCode UNIQUE (ScopeCode),
  CONSTRAINT UQ_Scopes_SortOrder UNIQUE (SortOrder)
);
GO

CREATE TABLE compliance.Controls (
  ControlId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Controls PRIMARY KEY,
  ScopeId SMALLINT NOT NULL,
  ControlCode VARCHAR(50) NOT NULL,
  ControlName NVARCHAR(300) NOT NULL,
  Description NVARCHAR(2000) NULL,
  SortOrder TINYINT NOT NULL,
  IsMandatory BIT NOT NULL CONSTRAINT DF_Controls_IsMandatory DEFAULT 1,
  IsActive BIT NOT NULL CONSTRAINT DF_Controls_IsActive DEFAULT 1,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Controls_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Controls_Scope FOREIGN KEY (ScopeId) REFERENCES compliance.Scopes(ScopeId),
  CONSTRAINT UQ_Controls_ControlCode UNIQUE (ControlCode),
  CONSTRAINT UQ_Controls_ScopeSort UNIQUE (ScopeId, SortOrder)
);
GO

CREATE TABLE compliance.OrganizationControls (
  OrganizationControlId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrganizationControls PRIMARY KEY,
  OrganizationId UNIQUEIDENTIFIER NOT NULL,
  ControlId INT NOT NULL,
  StatusCode VARCHAR(20) NOT NULL CONSTRAINT DF_OrganizationControls_Status DEFAULT 'pending',
  AssignedUserId UNIQUEIDENTIFIER NULL,
  ResponsibleName NVARCHAR(160) NULL,
  DueDate DATE NULL,
  LastReviewedAt DATETIME2(3) NULL,
  Notes NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OrganizationControls_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OrganizationControls_UpdatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedByUserId UNIQUEIDENTIFIER NULL,
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT FK_OrganizationControls_Organization FOREIGN KEY (OrganizationId) REFERENCES core.Organizations(OrganizationId),
  CONSTRAINT FK_OrganizationControls_Control FOREIGN KEY (ControlId) REFERENCES compliance.Controls(ControlId),
  CONSTRAINT FK_OrganizationControls_AssignedUser FOREIGN KEY (AssignedUserId) REFERENCES security.Users(UserId),
  CONSTRAINT FK_OrganizationControls_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT UQ_OrganizationControls UNIQUE (OrganizationId, ControlId),
  CONSTRAINT CK_OrganizationControls_Status CHECK (StatusCode IN ('pending', 'progressing', 'completed', 'na'))
);
GO

CREATE TABLE compliance.ControlEvidences (
  ControlEvidenceId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ControlEvidences PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  OrganizationControlId BIGINT NOT NULL,
  EvidenceName NVARCHAR(260) NOT NULL,
  Description NVARCHAR(1000) NULL,
  EvidenceType VARCHAR(20) NOT NULL,
  StorageProvider VARCHAR(30) NULL,
  StorageKey NVARCHAR(1000) NULL,
  ExternalUrl NVARCHAR(2000) NULL,
  MimeType NVARCHAR(150) NULL,
  FileSizeBytes BIGINT NULL,
  Sha256Hash CHAR(64) NULL,
  DocumentVersion NVARCHAR(30) NULL,
  ValidFrom DATE NULL,
  ValidUntil DATE NULL,
  UploadedByUserId UNIQUEIDENTIFIER NOT NULL,
  UploadedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ControlEvidences_UploadedAt DEFAULT SYSUTCDATETIME(),
  IsDeleted BIT NOT NULL CONSTRAINT DF_ControlEvidences_IsDeleted DEFAULT 0,
  CONSTRAINT FK_ControlEvidences_OrganizationControl FOREIGN KEY (OrganizationControlId) REFERENCES compliance.OrganizationControls(OrganizationControlId),
  CONSTRAINT FK_ControlEvidences_UploadedBy FOREIGN KEY (UploadedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT CK_ControlEvidences_Type CHECK (EvidenceType IN ('FILE', 'LINK')),
  CONSTRAINT CK_ControlEvidences_Location CHECK ((EvidenceType = 'FILE' AND StorageKey IS NOT NULL) OR (EvidenceType = 'LINK' AND ExternalUrl IS NOT NULL)),
  CONSTRAINT CK_ControlEvidences_FileSize CHECK (FileSizeBytes IS NULL OR FileSizeBytes >= 0)
);
GO

CREATE TABLE incident.Incidents (
  IncidentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Incidents PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  OrganizationId UNIQUEIDENTIFIER NOT NULL,
  IncidentNumber BIGINT IDENTITY(1,1) NOT NULL,
  Title NVARCHAR(300) NOT NULL,
  IncidentOccurredAt DATETIME2(3) NOT NULL,
  DetectedAt DATETIME2(3) NOT NULL,
  Description NVARCHAR(MAX) NOT NULL,
  AffectedSystems NVARCHAR(2000) NULL,
  PersonalDataCategories NVARCHAR(2000) NULL,
  ApproxAffectedPeople INT NULL,
  SeverityCode VARCHAR(20) NOT NULL,
  ImpactDescription NVARCHAR(MAX) NULL,
  ContainmentMeasures NVARCHAR(MAX) NULL,
  CorrectiveActions NVARCHAR(MAX) NULL,
  AgencyNotificationDecision VARCHAR(20) NOT NULL CONSTRAINT DF_Incidents_AgencyDecision DEFAULT 'evaluating',
  AgencyNotifiedAt DATETIME2(3) NULL,
  HolderCommunicationDecision VARCHAR(20) NOT NULL CONSTRAINT DF_Incidents_HolderDecision DEFAULT 'evaluating',
  HoldersCommunicatedAt DATETIME2(3) NULL,
  InternalOwnerUserId UNIQUEIDENTIFIER NULL,
  InternalOwnerName NVARCHAR(160) NULL,
  StatusCode VARCHAR(20) NOT NULL CONSTRAINT DF_Incidents_Status DEFAULT 'open',
  ClosedAt DATETIME2(3) NULL,
  CreatedByUserId UNIQUEIDENTIFIER NOT NULL,
  UpdatedByUserId UNIQUEIDENTIFIER NOT NULL,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Incidents_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Incidents_UpdatedAt DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT UQ_Incidents_Number UNIQUE (IncidentNumber),
  CONSTRAINT FK_Incidents_Organization FOREIGN KEY (OrganizationId) REFERENCES core.Organizations(OrganizationId),
  CONSTRAINT FK_Incidents_InternalOwner FOREIGN KEY (InternalOwnerUserId) REFERENCES security.Users(UserId),
  CONSTRAINT FK_Incidents_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT FK_Incidents_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT CK_Incidents_Severity CHECK (SeverityCode IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT CK_Incidents_Status CHECK (StatusCode IN ('open', 'investigating', 'contained', 'closed')),
  CONSTRAINT CK_Incidents_AgencyDecision CHECK (AgencyNotificationDecision IN ('evaluating', 'yes', 'no')),
  CONSTRAINT CK_Incidents_HolderDecision CHECK (HolderCommunicationDecision IN ('evaluating', 'yes', 'no')),
  CONSTRAINT CK_Incidents_AffectedPeople CHECK (ApproxAffectedPeople IS NULL OR ApproxAffectedPeople >= 0),
  CONSTRAINT CK_Incidents_ClosedAt CHECK ((StatusCode = 'closed' AND ClosedAt IS NOT NULL) OR StatusCode <> 'closed')
);
GO

CREATE TABLE incident.IncidentCommunications (
  IncidentCommunicationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_IncidentCommunications PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  IncidentId UNIQUEIDENTIFIER NOT NULL,
  CommunicationType VARCHAR(20) NOT NULL,
  Recipient NVARCHAR(300) NULL,
  Subject NVARCHAR(500) NULL,
  Detail NVARCHAR(MAX) NULL,
  SentAt DATETIME2(3) NOT NULL,
  CreatedByUserId UNIQUEIDENTIFIER NOT NULL,
  CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_IncidentCommunications_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_IncidentCommunications_Incident FOREIGN KEY (IncidentId) REFERENCES incident.Incidents(IncidentId),
  CONSTRAINT FK_IncidentCommunications_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT CK_IncidentCommunications_Type CHECK (CommunicationType IN ('AGENCY', 'HOLDERS', 'INTERNAL', 'OTHER'))
);
GO

CREATE TABLE incident.IncidentEvidences (
  IncidentEvidenceId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_IncidentEvidences PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
  IncidentId UNIQUEIDENTIFIER NOT NULL,
  EvidenceName NVARCHAR(260) NOT NULL,
  EvidenceType VARCHAR(20) NOT NULL,
  StorageProvider VARCHAR(30) NULL,
  StorageKey NVARCHAR(1000) NULL,
  ExternalUrl NVARCHAR(2000) NULL,
  MimeType NVARCHAR(150) NULL,
  FileSizeBytes BIGINT NULL,
  Sha256Hash CHAR(64) NULL,
  UploadedByUserId UNIQUEIDENTIFIER NOT NULL,
  UploadedAt DATETIME2(3) NOT NULL CONSTRAINT DF_IncidentEvidences_UploadedAt DEFAULT SYSUTCDATETIME(),
  IsDeleted BIT NOT NULL CONSTRAINT DF_IncidentEvidences_IsDeleted DEFAULT 0,
  CONSTRAINT FK_IncidentEvidences_Incident FOREIGN KEY (IncidentId) REFERENCES incident.Incidents(IncidentId),
  CONSTRAINT FK_IncidentEvidences_UploadedBy FOREIGN KEY (UploadedByUserId) REFERENCES security.Users(UserId),
  CONSTRAINT CK_IncidentEvidences_Type CHECK (EvidenceType IN ('FILE', 'LINK')),
  CONSTRAINT CK_IncidentEvidences_Location CHECK ((EvidenceType = 'FILE' AND StorageKey IS NOT NULL) OR (EvidenceType = 'LINK' AND ExternalUrl IS NOT NULL))
);
GO

CREATE TABLE audit.ActivityLog (
  ActivityLogId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ActivityLog PRIMARY KEY,
  OrganizationId UNIQUEIDENTIFIER NULL,
  UserId UNIQUEIDENTIFIER NULL,
  ActionCode VARCHAR(80) NOT NULL,
  EntityType VARCHAR(80) NOT NULL,
  EntityId NVARCHAR(100) NOT NULL,
  PreviousValues NVARCHAR(MAX) NULL,
  NewValues NVARCHAR(MAX) NULL,
  IpAddress VARCHAR(45) NULL,
  CorrelationId UNIQUEIDENTIFIER NULL,
  OccurredAt DATETIME2(3) NOT NULL CONSTRAINT DF_ActivityLog_OccurredAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ActivityLog_Organization FOREIGN KEY (OrganizationId) REFERENCES core.Organizations(OrganizationId),
  CONSTRAINT FK_ActivityLog_User FOREIGN KEY (UserId) REFERENCES security.Users(UserId),
  CONSTRAINT CK_ActivityLog_PreviousJson CHECK (PreviousValues IS NULL OR ISJSON(PreviousValues) = 1),
  CONSTRAINT CK_ActivityLog_NewJson CHECK (NewValues IS NULL OR ISJSON(NewValues) = 1)
);
GO

CREATE UNIQUE INDEX UX_Organizations_TaxId ON core.Organizations(TaxId) WHERE TaxId IS NOT NULL;
CREATE UNIQUE INDEX UX_Users_ExternalObject ON security.Users(IdentityProvider, ExternalObjectId) WHERE ExternalObjectId IS NOT NULL;
CREATE INDEX IX_UserRoleAssignments_User_Active ON security.UserRoleAssignments(UserId, RevokedAt) INCLUDE (RoleId, OrganizationId);
CREATE INDEX IX_UserRoleAssignments_Organization ON security.UserRoleAssignments(OrganizationId, UserId) WHERE OrganizationId IS NOT NULL AND RevokedAt IS NULL;
CREATE INDEX IX_OrganizationControls_Organization_Status ON compliance.OrganizationControls(OrganizationId, StatusCode) INCLUDE (ControlId, DueDate, AssignedUserId);
CREATE INDEX IX_OrganizationControls_Control ON compliance.OrganizationControls(ControlId, OrganizationId);
CREATE INDEX IX_ControlEvidences_Control_Active ON compliance.ControlEvidences(OrganizationControlId, IsDeleted, UploadedAt DESC);
CREATE INDEX IX_Incidents_Organization_Status ON incident.Incidents(OrganizationId, StatusCode, DetectedAt DESC) INCLUDE (SeverityCode, Title, ApproxAffectedPeople);
CREATE INDEX IX_Incidents_Severity ON incident.Incidents(SeverityCode, StatusCode, DetectedAt DESC);
CREATE INDEX IX_IncidentCommunications_Incident ON incident.IncidentCommunications(IncidentId, SentAt DESC);
CREATE INDEX IX_IncidentEvidences_Incident_Active ON incident.IncidentEvidences(IncidentId, IsDeleted, UploadedAt DESC);
CREATE INDEX IX_ActivityLog_Organization_Date ON audit.ActivityLog(OrganizationId, OccurredAt DESC);
CREATE INDEX IX_ActivityLog_Entity ON audit.ActivityLog(EntityType, EntityId, OccurredAt DESC);
GO

CREATE OR ALTER VIEW compliance.vw_OrganizationProgress
AS
WITH ControlMatrix AS (
  SELECT
    o.OrganizationId,
    c.ScopeId,
    c.ControlId,
    COALESCE(oc.StatusCode, 'pending') AS StatusCode,
    CASE COALESCE(oc.StatusCode, 'pending')
      WHEN 'completed' THEN CONVERT(DECIMAL(5,2), 1.00)
      WHEN 'progressing' THEN CONVERT(DECIMAL(5,2), 0.50)
      WHEN 'pending' THEN CONVERT(DECIMAL(5,2), 0.00)
      ELSE NULL
    END AS ProgressWeight
  FROM core.Organizations o
  CROSS JOIN compliance.Controls c
  LEFT JOIN compliance.OrganizationControls oc
    ON oc.OrganizationId = o.OrganizationId AND oc.ControlId = c.ControlId
  WHERE o.IsActive = 1 AND c.IsActive = 1
)
SELECT
  OrganizationId,
  ScopeId,
  CASE WHEN ScopeId IS NULL THEN 'GLOBAL' ELSE 'SCOPE' END AS ProgressLevel,
  COUNT_BIG(*) AS TotalControls,
  SUM(CASE WHEN StatusCode = 'completed' THEN 1 ELSE 0 END) AS CompletedControls,
  SUM(CASE WHEN StatusCode = 'progressing' THEN 1 ELSE 0 END) AS InProgressControls,
  SUM(CASE WHEN StatusCode = 'pending' THEN 1 ELSE 0 END) AS PendingControls,
  SUM(CASE WHEN StatusCode = 'na' THEN 1 ELSE 0 END) AS NotApplicableControls,
  CONVERT(DECIMAL(5,2), COALESCE(100.0 * SUM(ProgressWeight) / NULLIF(COUNT(ProgressWeight), 0), 100.0)) AS ProgressPercent
FROM ControlMatrix
GROUP BY GROUPING SETS ((OrganizationId, ScopeId), (OrganizationId));
GO

INSERT INTO security.Roles (RoleCode, RoleName, ScopeType, CanView, CanEdit, CanUploadEvidence, CanManageUsers, CanManageOrganizations)
SELECT v.RoleCode, v.RoleName, v.ScopeType, v.CanView, v.CanEdit, v.CanUploadEvidence, v.CanManageUsers, v.CanManageOrganizations
FROM (VALUES
  ('TIBOX_ADMIN', N'Administrador TIBOX', 'GLOBAL', 1, 1, 1, 1, 1),
  ('TIBOX_VIEWER', N'Visualizador TIBOX', 'GLOBAL', 1, 0, 0, 0, 0),
  ('CLIENT_EDITOR', N'Editor cliente', 'ORGANIZATION', 1, 1, 1, 0, 0),
  ('CLIENT_VIEWER', N'Visualizador cliente', 'ORGANIZATION', 1, 0, 0, 0, 0)
) v(RoleCode, RoleName, ScopeType, CanView, CanEdit, CanUploadEvidence, CanManageUsers, CanManageOrganizations)
WHERE NOT EXISTS (SELECT 1 FROM security.Roles r WHERE r.RoleCode = v.RoleCode);
GO

INSERT INTO compliance.Scopes (ScopeCode, ScopeName, IconCode, SortOrder)
SELECT v.ScopeCode, v.ScopeName, v.IconCode, v.SortOrder
FROM (VALUES
  ('governance', N'Gobierno y gestión del cumplimiento', N'home', 1),
  ('rights', N'Privacidad, consentimiento y derechos', N'diamond', 2),
  ('retention', N'Conservación, calidad y eliminación de datos', N'clock', 3),
  ('thirdparties', N'Terceros, encargados y transferencias', N'transfer', 4),
  ('risks', N'Riesgos y tratamientos especiales', N'alert', 5),
  ('design', N'Privacidad desde el diseño y por defecto', N'sparkle', 6),
  ('security', N'Seguridad, incidentes y vulneraciones', N'shield', 7),
  ('training', N'Capacitación y seguimiento continuo', N'target', 8)
) v(ScopeCode, ScopeName, IconCode, SortOrder)
WHERE NOT EXISTS (SELECT 1 FROM compliance.Scopes s WHERE s.ScopeCode = v.ScopeCode);
GO

INSERT INTO compliance.Controls (ScopeId, ControlCode, ControlName, SortOrder)
SELECT s.ScopeId, v.ControlCode, v.ControlName, v.SortOrder
FROM (VALUES
  ('governance','GOV-01',N'Registro de Actividades de Tratamiento (RAT)',1),('governance','GOV-02',N'Informe de Análisis de Brecha',2),('governance','GOV-03',N'Responsable de Privacidad / DPO, cuando corresponda',3),('governance','GOV-04',N'Estructura o Comité de Privacidad',4),('governance','GOV-05',N'Matriz de Roles y Responsabilidades RACI',5),
  ('rights','PRI-01',N'Política de Protección de Datos y Privacidad',1),('rights','PRI-02',N'Avisos de Privacidad y Cláusulas de Consentimiento',2),('rights','PRI-03',N'Registro de Consentimientos y Revocaciones',3),('rights','PRI-04',N'Procedimiento para el Ejercicio de Derechos',4),('rights','PRI-05',N'Registro de Solicitudes y Respuestas de Titulares',5),('rights','PRI-06',N'Portal o Formulario de Solicitudes',6),('rights','PRI-07',N'Gestor de Consentimiento y Cookies, cuando corresponda',7),
  ('retention','RET-01',N'Política de Retención y Supresión de Datos',1),('retention','RET-02',N'Matriz de Períodos de Conservación',2),('retention','RET-03',N'Registro de Eliminación o Anonimización',3),('retention','RET-04',N'Procedimiento de Calidad y Actualización de Datos',4),
  ('thirdparties','TER-01',N'Anexos Contractuales de Protección de Datos (DPA)',1),('thirdparties','TER-02',N'Matriz y Evaluación de Proveedores',2),('thirdparties','TER-03',N'Registro y Acuerdos de Cesión de Datos',3),('thirdparties','TER-04',N'Registro de Devolución o Eliminación por Proveedores',4),('thirdparties','TER-05',N'Matriz de Transferencias Internacionales',5),('thirdparties','TER-06',N'Acuerdos de Confidencialidad',6),
  ('risks','RSK-01',N'Matriz de Riesgos de Privacidad',1),('risks','RSK-02',N'Evaluación de Impacto en Protección de Datos (EIPD / DPIA)',2),('risks','RSK-03',N'Procedimiento para Datos Sensibles y Tratamientos Especiales',3),('risks','RSK-04',N'Evaluación de Decisiones Automatizadas y Perfilamiento',4),('risks','RSK-05',N'Procedimiento de Videovigilancia y Control de Acceso',5),
  ('design','DSN-01',N'Procedimiento de Privacidad desde el Diseño y por Defecto',1),('design','DSN-02',N'Checklist y Registro de Evaluaciones para nuevos procesos, sistemas y proyectos',2),
  ('security','SEC-01',N'Matriz de Medidas Técnicas y Organizativas',1),('security','SEC-02',N'Protocolo de Gestión y Notificación de Vulneraciones',2),('security','SEC-03',N'Registro de Incidentes y Vulneraciones',3),('security','SEC-04',N'Registro de Comunicaciones de Vulneraciones',4),('security','SEC-05',N'Protocolo de Teletrabajo y BYOD',5),('security','SEC-06',N'Plan de Continuidad con foco en privacidad',6),
  ('training','CAP-01',N'Programa de Cumplimiento de Protección de Datos',1),('training','CAP-02',N'Plan y Materiales de Capacitación',2),('training','CAP-03',N'Registro de Capacitaciones y Participación',3),('training','CAP-04',N'Control de Versiones y Vigencia Documental',4),('training','CAP-05',N'Informe de Auditoría / Balance de Privacidad',5),('training','CAP-06',N'KPIs e Indicadores de Privacidad',6)
) v(ScopeCode, ControlCode, ControlName, SortOrder)
INNER JOIN compliance.Scopes s ON s.ScopeCode = v.ScopeCode
WHERE NOT EXISTS (SELECT 1 FROM compliance.Controls c WHERE c.ControlCode = v.ControlCode);
GO

/* Inicializa los 41 controles cuando se crea una nueva empresa. */
CREATE OR ALTER PROCEDURE compliance.InitializeOrganizationControls
  @OrganizationId UNIQUEIDENTIFIER,
  @CreatedByUserId UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO compliance.OrganizationControls (OrganizationId, ControlId, StatusCode, UpdatedByUserId)
  SELECT @OrganizationId, c.ControlId, 'pending', @CreatedByUserId
  FROM compliance.Controls c
  WHERE c.IsActive = 1
    AND NOT EXISTS (
      SELECT 1 FROM compliance.OrganizationControls oc
      WHERE oc.OrganizationId = @OrganizationId AND oc.ControlId = c.ControlId
    );
END;
GO
