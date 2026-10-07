/**
 * Sistema de préstamos Biblioteca Viva · Servidor opcional (Google Apps Script)
 * Escuela Primaria Molino de Rosas
 *
 * Qué hace:
 *  - Guarda cada préstamo en la hoja "Prestamos" de la hoja de cálculo vinculada.
 *  - Publica, SIN nombres, cuántos ejemplares de cada ID están fuera, para que
 *    alumnos y familias vean la disponibilidad desde cualquier dispositivo.
 *  - Solo el mostrador (con el token) puede registrar, devolver o leer nombres.
 *
 * Instalación (una sola vez):
 *  1. Crea una hoja de cálculo nueva > Extensiones > Apps Script. Pega este archivo.
 *  2. Configuración del proyecto (engrane) > Propiedades de la secuencia de comandos:
 *     agrega TOKEN con una clave larga que solo conozca el Promotor.
 *  3. Ejecuta una vez la función prepararHoja() y acepta los permisos.
 *  4. Implementar > Nueva implementación > Aplicación web.
 *     Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
 *  5. Copia la URL que termina en /exec y pégala en config.js (endpointPrestamos).
 */

var HOJA = "Prestamos";
var COLS = ["folio", "id", "t", "nombre", "grupo", "salida", "vence", "devuelto", "vale", "registrado"];
var ENCABEZADOS = ["Folio", "ID", "Título", "Nombre", "Grupo", "Salida", "Vence", "Devuelto", "Vale", "Registrado"];

function prepararHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);
  sh.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS]).setFontWeight("bold").setBackground("#1d2745").setFontColor("#ffffff");
  sh.setFrozenRows(1);
  sh.getRange("A:J").setNumberFormat("@"); // todo como texto: las fechas quedan AAAA-MM-DD
  return sh;
}

function hoja_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA) || prepararHoja();
}

function filas_() {
  var sh = hoja_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, COLS.length).getValues().map(function (r, i) {
    var o = { _fila: i + 2 };
    COLS.forEach(function (c, j) { o[c] = r[j] === "" ? null : String(r[j]); });
    return o;
  });
}

function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function tokenValido_(t) {
  var real = PropertiesService.getScriptProperties().getProperty("TOKEN");
  return real && t && String(t) === real;
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.accion === "disponibilidad") {
      var prestados = {};
      filas_().forEach(function (f) {
        if (f.devuelto) return;
        var x = prestados[f.id] || { n: 0, vence: "" };
        x.n++;
        if (!x.vence || f.vence < x.vence) x.vence = f.vence;
        prestados[f.id] = x;
      });
      return salida_({ ok: true, prestados: prestados, actualizado: new Date().toISOString() });
    }
    if (p.accion === "prestamos") {
      if (!tokenValido_(p.token)) return salida_({ ok: false, error: "Token no válido" });
      var lista = filas_().map(function (f) { delete f._fila; delete f.registrado; if (!f.vale) delete f.vale; return f; });
      return salida_({ ok: true, prestamos: lista });
    }
    return salida_({ ok: true, servicio: "Biblioteca Viva" });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var b = JSON.parse(e.postData.contents || "{}");
    if (!tokenValido_(b.token)) return salida_({ ok: false, error: "Token no válido" });
    var sh = hoja_();
    if (b.accion === "prestar") {
      var p = b.prestamo || {};
      if (!p.folio || !p.id) return salida_({ ok: false, error: "Faltan datos" });
      var existente = filas_().filter(function (f) { return f.folio === p.folio; })[0];
      var fila = COLS.map(function (c) { return c === "registrado" ? new Date().toISOString() : (p[c] == null ? "" : String(p[c])); });
      if (existente) sh.getRange(existente._fila, 1, 1, COLS.length).setValues([fila]);
      else sh.appendRow(fila);
      return salida_({ ok: true });
    }
    if (b.accion === "devolver") {
      var f = filas_().filter(function (x) { return x.folio === b.folio; })[0];
      if (!f) return salida_({ ok: false, error: "No existe el folio " + b.folio });
      sh.getRange(f._fila, COLS.indexOf("devuelto") + 1).setValue(String(b.fecha || ""));
      return salida_({ ok: true });
    }
    return salida_({ ok: false, error: "Acción desconocida" });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
