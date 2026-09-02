export const SCOPES = [
  { id: 'governance', icon: '⌂', name: 'Gobierno y gestión del cumplimiento', controls: ['Registro de Actividades de Tratamiento (RAT)', 'Informe de Análisis de Brecha', 'Responsable de Privacidad / DPO, cuando corresponda', 'Estructura o Comité de Privacidad', 'Matriz de Roles y Responsabilidades RACI'] },
  { id: 'rights', icon: '◇', name: 'Privacidad, consentimiento y derechos', controls: ['Política de Protección de Datos y Privacidad', 'Avisos de Privacidad y Cláusulas de Consentimiento', 'Registro de Consentimientos y Revocaciones', 'Procedimiento para el Ejercicio de Derechos', 'Registro de Solicitudes y Respuestas de Titulares', 'Portal o Formulario de Solicitudes', 'Gestor de Consentimiento y Cookies, cuando corresponda'] },
  { id: 'retention', icon: '◷', name: 'Conservación, calidad y eliminación de datos', controls: ['Política de Retención y Supresión de Datos', 'Matriz de Períodos de Conservación', 'Registro de Eliminación o Anonimización', 'Procedimiento de Calidad y Actualización de Datos'] },
  { id: 'thirdparties', icon: '⇄', name: 'Terceros, encargados y transferencias', controls: ['Anexos Contractuales de Protección de Datos (DPA)', 'Matriz y Evaluación de Proveedores', 'Registro y Acuerdos de Cesión de Datos', 'Registro de Devolución o Eliminación por Proveedores', 'Matriz de Transferencias Internacionales', 'Acuerdos de Confidencialidad'] },
  { id: 'risks', icon: '△', name: 'Riesgos y tratamientos especiales', controls: ['Matriz de Riesgos de Privacidad', 'Evaluación de Impacto en Protección de Datos (EIPD / DPIA)', 'Procedimiento para Datos Sensibles y Tratamientos Especiales', 'Evaluación de Decisiones Automatizadas y Perfilamiento', 'Procedimiento de Videovigilancia y Control de Acceso'] },
  { id: 'design', icon: '✦', name: 'Privacidad desde el diseño y por defecto', controls: ['Procedimiento de Privacidad desde el Diseño y por Defecto', 'Checklist y Registro de Evaluaciones para nuevos procesos, sistemas y proyectos'] },
  { id: 'security', icon: '⬡', name: 'Seguridad, incidentes y vulneraciones', controls: ['Matriz de Medidas Técnicas y Organizativas', 'Protocolo de Gestión y Notificación de Vulneraciones', 'Registro de Incidentes y Vulneraciones', 'Registro de Comunicaciones de Vulneraciones', 'Protocolo de Teletrabajo y BYOD', 'Plan de Continuidad con foco en privacidad'] },
  { id: 'training', icon: '◎', name: 'Capacitación y seguimiento continuo', controls: ['Programa de Cumplimiento de Protección de Datos', 'Plan y Materiales de Capacitación', 'Registro de Capacitaciones y Participación', 'Control de Versiones y Vigencia Documental', 'Informe de Auditoría / Balance de Privacidad', 'KPIs e Indicadores de Privacidad'] },
]

export const CONTROLS = SCOPES.flatMap((scope) =>
  scope.controls.map((name, index) => ({ id: `${scope.id}-${index + 1}`, scopeId: scope.id, name, order: index + 1 })),
)

export const STATUS = {
  completed: { label: 'Completado', weight: 1 },
  progressing: { label: 'En proceso', weight: 0.5 },
  pending: { label: 'No iniciado', weight: 0 },
  na: { label: 'No aplica', weight: null },
}

export const TIBOX_COLORS = { cyan: '#00BCEB', orange: '#FF5A26', yellow: '#F4C300' }

const hash = (text) => {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export const buildDocuments = (company) => {
  const [done, doing, notApplicable] = company.seed ?? [0, 0, 0]
  const ordered = [...CONTROLS].sort((a, b) => hash(company.id + a.id) - hash(company.id + b.id))
  return Object.fromEntries(ordered.map((control, index) => {
    const status = index < done ? 'completed' : index < done + doing ? 'progressing' : index < done + doing + notApplicable ? 'na' : 'pending'
    return [control.id, {
      status,
      owner: status === 'pending' ? '' : company.owner,
      dueDate: status === 'progressing' ? '2026-11-15' : '',
      reviewedAt: status === 'completed' ? '2026-08-20' : '',
      notes: status === 'progressing' ? 'Documento en elaboración y revisión interna.' : '',
      evidences: status === 'completed' ? [{ id: `ev-${company.id}-${control.id}`, name: `${control.name.slice(0, 38)}_v1.pdf`, url: '', date: '2026-08-20' }] : [],
    }]
  }))
}

const companySeeds = [
  { id: 'tibox', name: 'TIBOX', industry: 'Servicios TI y tecnología', taxId: '76.000.000-0', owner: 'Paula Farias', initials: 'TIBOX', seed: [21, 10, 2], themeMode: 'cyan', themeColor: '#00BCEB' },
  { id: 'froens', name: 'Froens SpA', industry: 'Retail', taxId: '76.123.456-7', owner: 'Estela Astudillo', initials: 'FR', seed: [14, 8, 0], themeMode: 'cyan', themeColor: '#00BCEB' },
  { id: 'quintero', name: 'Quintero Energía', industry: 'Energía', taxId: '76.234.567-8', owner: 'Felipe Lizana', initials: 'QE', seed: [8, 8, 0], themeMode: 'orange', themeColor: '#FF5A26' },
  { id: 'qc-terminales', name: 'QC Terminales Chile', industry: 'Logística portuaria', taxId: '76.345.678-9', owner: 'Claudio Molina', initials: 'QC', seed: [5, 5, 0], themeMode: 'yellow', themeColor: '#F4C300' },
]

export const DEMO_COMPANIES = companySeeds.map((company) => ({ ...company, logoData: '', documents: buildDocuments(company) }))

export const DEMO_USERS = [
  { id: 'usr-tibox-admin', email: 'demo-admin@example.invalid', firstName: 'Paula', lastName: 'Farias', jobTitle: 'Administradora de plataforma', type: 'tibox', permission: 'editor', companyIds: [] },
  { id: 'usr-tibox-view', email: 'demo-visor@example.invalid', firstName: 'Felipe', lastName: 'Lizana', jobTitle: 'Visualizador TIBOX', type: 'tibox', permission: 'viewer', companyIds: [] },
  { id: 'usr-froens-editor', email: 'demo-froens@example.invalid', firstName: 'Estela', lastName: 'Astudillo', jobTitle: 'Responsable de cumplimiento', type: 'client', permission: 'editor', companyIds: ['froens'] },
  { id: 'usr-quintero-view', email: 'demo-quintero@example.invalid', firstName: 'Carolina', lastName: 'Méndez', jobTitle: 'Encargada de privacidad', type: 'client', permission: 'viewer', companyIds: ['quintero'] },
]

export const DEMO_INCIDENTS = [
  {
    id: 'inc-demo-1', companyId: 'tibox', title: 'Acceso no autorizado a carpeta compartida', incidentDate: '2026-08-18T09:10', detectedAt: '2026-08-18T10:05', description: 'Se detectó acceso de una cuenta externa a una carpeta de proyecto con antecedentes de clientes.', systems: 'SharePoint · carpeta de proyecto', dataCategories: 'Datos de identificación y contacto', affectedPeople: 24, severity: 'high', impact: 'Exposición temporal de antecedentes personales.', containment: 'Se revocaron permisos y se preservaron los registros de auditoría.', correctiveActions: 'Revisión de grupos de acceso y alertas para invitados externos.', agencyNotification: 'evaluating', agencyNotificationDate: '', holderCommunication: 'evaluating', holderCommunicationDate: '', communications: 'Escalamiento al responsable de privacidad y seguridad.', owner: 'Omar Pinto', status: 'investigating', evidences: [{ id: 'iev-1', name: 'Informe_inicial_incidente.pdf', url: '', date: '2026-08-18' }], updatedAt: '2026-08-18T15:20' },
  {
    id: 'inc-demo-2', companyId: 'froens', title: 'Envío de planilla a destinatario incorrecto', incidentDate: '2026-07-29T15:40', detectedAt: '2026-07-29T15:55', description: 'Una planilla de atención fue enviada por error a un proveedor distinto.', systems: 'Correo corporativo', dataCategories: 'Nombre, correo y número de orden', affectedPeople: 12, severity: 'medium', impact: 'Divulgación acotada de datos de contacto.', containment: 'Se solicitó eliminación inmediata y se obtuvo confirmación.', correctiveActions: 'Doble validación de destinatarios.', agencyNotification: 'no', agencyNotificationDate: '', holderCommunication: 'no', holderCommunicationDate: '', communications: 'Comité de privacidad informado.', owner: 'Estela Astudillo', status: 'contained', evidences: [{ id: 'iev-2', name: 'Confirmacion_eliminacion.eml', url: '', date: '2026-07-29' }], updatedAt: '2026-07-30T11:00' },
]

export const INCIDENT_STATUS = { open: 'Abierto', investigating: 'En investigación', contained: 'Contenido', closed: 'Cerrado' }
export const INCIDENT_SEVERITY = { low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico' }
