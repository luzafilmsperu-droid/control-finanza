# Manual de Desarrollo de Qori Capital

## Objetivo

Este documento establece las reglas oficiales para el desarrollo de Qori Capital.

Todo desarrollador o inteligencia artificial que participe en este proyecto deberá cumplir obligatoriamente estas normas.

El objetivo es mantener un sistema estable, modular, documentado y fácil de mantener.

---

# Principios generales

- Analizar el proyecto antes de realizar cualquier modificación.
- Comprender el funcionamiento del módulo antes de escribir código.
- Respetar la arquitectura existente.
- Mantener la compatibilidad con las versiones anteriores.
- Priorizar la estabilidad del sistema.

---

# Archivos

Solo podrán modificarse los archivos indicados en la solicitud de desarrollo.

No modificar otros archivos sin una justificación técnica.

Si es necesario modificar archivos adicionales, explicar claramente el motivo antes de hacerlo.

---

# Calidad del código

Todo código nuevo deberá:

- Mantener el estilo existente del proyecto.
- Ser legible y fácil de mantener.
- Reutilizar funciones existentes cuando sea posible.
- Evitar código duplicado.
- Evitar funciones innecesariamente largas.
- Utilizar nombres descriptivos para variables y funciones.

---

# Compatibilidad

Ninguna mejora podrá afectar el funcionamiento de:

- Dashboard
- Ingresos y Gastos
- Bancos y Ahorros
- Libro Mayor
- Reportes
- Auditoría
- Exportación a Excel
- Exportación a PDF
- Backup
- Restauración

---

# Prohibiciones

No está permitido:

- Eliminar funciones existentes.
- Cambiar nombres de funciones sin necesidad.
- Reescribir módulos completos cuando solo se requiere una mejora localizada.
- Cambiar la estructura del proyecto sin autorización.
- Introducir dependencias innecesarias.

---

# Documentación obligatoria

Cada mejora deberá actualizar:

- CHANGELOG.md
- DOCUMENTACION.md
- ROADMAP.md

Si la mejora modifica la arquitectura del sistema, también deberá actualizarse el Documento Maestro.

---

# Pruebas obligatorias

Antes de entregar cualquier cambio se deberá comprobar:

- Registro de movimientos.
- Edición de movimientos.
- Eliminación de movimientos.
- Filtros.
- Búsquedas.
- Totales.
- Reportes.
- Auditoría.
- Exportación a Excel.
- Exportación a PDF.
- Backup y restauración.

No entregar código sin haber realizado estas verificaciones.

---

# Pull Request

Toda mejora deberá generar un Pull Request que incluya:

- Objetivo de la mejora.
- Archivos modificados.
- Funciones agregadas.
- Riesgos identificados.
- Resultado de las pruebas realizadas.

---

# Versionado

Cada mejora corresponde a una nueva versión del proyecto.

Nunca sobrescribir una versión anterior sin autorización.

---

# Filosofía de Qori Capital

Qori Capital no es únicamente una aplicación para registrar ingresos y gastos.

Qori Capital es un Sistema de Gestión Patrimonial Personal.

Todas las nuevas funcionalidades deberán contribuir a ese objetivo.

Las decisiones de desarrollo deberán priorizar:

- Organización.
- Escalabilidad.
- Rendimiento.
- Facilidad de uso.
- Calidad del código.
- Documentación.

---

# Regla principal

Antes de escribir una sola línea de código, analizar el impacto de la modificación sobre el resto del sistema.

El objetivo es mejorar Qori Capital sin comprometer su estabilidad.
