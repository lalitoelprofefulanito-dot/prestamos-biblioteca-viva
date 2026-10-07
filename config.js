/* ===================================================================
   Sistema de préstamos Biblioteca Viva · Configuración
   Edita solo los valores de la derecha. Guarda y sube el archivo.
   =================================================================== */
window.BV_CONFIG = {
  escuela: "Escuela Primaria Molino de Rosas",
  cct: "09DPR1858N",
  responsable: "Profr. Eduardo Kantún Martínez, Promotor de Lectura",

  // Días de préstamo que se proponen al registrar un libro.
  diasPrestamo: 7,

  // Cuántos libros puede llevar un alumno en un mismo vale.
  librosPorVale: 2,

  // Grupos que aparecen en los formularios (sin cuentas de usuario).
  grupos: ["1° A", "2° A", "3° A", "4° A", "5° A", "6° A", "Familia", "Docente"],

  // true: los ejemplares asignados a la Biblioteca de Aula 2026-2027
  // se descuentan de los que hay en la biblioteca escolar.
  descontarBibliotecaDeAula: true,

  // Clave para abrir el Mostrador del Promotor. NO es seguridad real:
  // solo evita que los alumnos entren por accidente a esa pantalla.
  claveMostrador: "molino2026",

  // OPCIONAL. URL de la aplicación web de Apps Script (carpeta apps-script/).
  // Vacío = los préstamos se guardan solo en el equipo de la biblioteca.
  endpointPrestamos: ""
};
