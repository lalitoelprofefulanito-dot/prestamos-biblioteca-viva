# Sistema de préstamos Biblioteca Viva

Catálogo público y sistema de préstamos de la Biblioteca Viva de la **Escuela Primaria Molino de Rosas** (C.C.T. 09DPR1858N), Zona Escolar 115, Alcaldía Álvaro Obregón, Ciudad de México.

Responsable: Profr. Eduardo Kantún Martínez, Promotor de Lectura.

Es una página estática: no necesita servidor, base de datos ni cuentas de usuario. Funciona en GitHub Pages y también abriendo `index.html` directamente en el navegador.

## Qué ofrece

**Para alumnos y familias**

- **Explorar:** búsqueda por título, autor, tema o ID de la etiqueta. Filtros por serie de Libros del Rincón (con sus lomos), género, color de etiqueta y procedencia.
- **Ficha del libro:** portada para comparar con el ejemplar, reseña, ubicación (anaquel y entrepaño), disponibilidad y una pregunta para platicar en casa.
- **El librero:** los 7 anaqueles × 4 entrepaños, con cada título dibujado como un lomo del color de su etiqueta y en su orden real.
- **¿Qué leo hoy?:** a partir del grado y de un antojo de lectura, propone tres libros disponibles. Siempre da prioridad a los Libros del Rincón de la serie del grado.
- **Mi mochila y vale:** genera un vale de préstamo imprimible con portadas, ubicación, fecha de devolución y un código QR.

**Para el Promotor (Mostrador)**

Se entra desde el enlace "Mostrador del Promotor" al pie de la página o con `#mostrador`.

- Captura por ID, por lector de código de barras USB, por cámara (Chrome en Android y macOS) o por el QR del vale.
- Antes de registrar, muestra la portada para confirmar que el libro en mano es el correcto.
- Listas de préstamos activos, vencidos e historial, más estadísticas por grupo y títulos más pedidos.
- Exportación a CSV (para Excel) y respaldo o restauración en JSON.

## Estructura

```
index.html                  página
estilos.css                 diseño
app.js                      lógica
config.js                   ← lo único que normalmente se edita
datos/acervo.js             acervo público (generado desde el Excel)
datos/estantes.js           descripción de cada entrepaño
portadas/BV-XXXX.webp       1 725 portadas (300 px)
assets/lomos/               lomos oficiales de las series
assets/vendor/qrcode.js     generador de QR (MIT, Kazuhiko Arase)
apps-script/Prestamos.gs    servidor opcional en Google Sheets
herramientas/actualizar_acervo.py   regenera datos y portadas desde el Excel
```

## Publicar en GitHub Pages

Son más de 1 700 archivos y la carga desde la página web de GitHub acepta solo 100 por vez. Por eso conviene usar **GitHub Desktop** o la terminal.

**Con GitHub Desktop**

1. File > New repository. Nombre sugerido: `prestamos-biblioteca-viva`.
2. Copia el contenido de esta carpeta dentro de la carpeta del repositorio.
3. Escribe un resumen ("Primera versión"), presiona *Commit to main* y luego *Publish repository* (desmarca "Keep this code private" si quieres usar Pages gratis).
4. En github.com, abre el repositorio > Settings > Pages > Source: *Deploy from a branch*, rama `main`, carpeta `/ (root)` > Save.
5. En uno o dos minutos la página queda en `https://TU-USUARIO.github.io/prestamos-biblioteca-viva/`.

**Con la terminal**

```bash
cd prestamos-biblioteca-viva
git init && git add . && git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/prestamos-biblioteca-viva.git
git push -u origin main
```

## Incrustar en Google Sites

En la página "Préstamo de libros" del sitio *proyectobibliotecaviva*: Insertar > Incorporar > **Por URL** y pega la dirección de GitHub Pages. Ajusta el alto del recuadro al máximo.

Para compartir un libro concreto, el enlace lleva su ID: `...github.io/prestamos-biblioteca-viva/#libro=BV-0123`. Ese mismo enlace puede imprimirse como QR en etiquetas o carteles.

## Configuración (`config.js`)

| Valor | Para qué sirve |
| --- | --- |
| `diasPrestamo` | Días que se proponen al prestar (7). |
| `librosPorVale` | Libros por vale (2). |
| `grupos` | Grupos que aparecen en los formularios. |
| `descontarBibliotecaDeAula` | Descuenta los ejemplares entregados a las bibliotecas de aula. |
| `claveMostrador` | Clave para abrir el Mostrador. **Cámbiala.** |
| `endpointPrestamos` | URL del Apps Script (opcional). |

**Sobre la seguridad:** la clave del Mostrador está escrita en un archivo público, así que solo evita entradas accidentales. Sin el Apps Script, los préstamos se guardan únicamente en el navegador del equipo de la biblioteca: usa siempre el mismo equipo y navegador, y descarga un respaldo cada semana (Mostrador > Respaldo).

## Servidor opcional en Google Sheets

Si se conecta, los préstamos quedan en una hoja de cálculo y alumnos y familias ven la disponibilidad real desde cualquier dispositivo. La parte pública **nunca recibe nombres**; solo el número de ejemplares fuera y la fecha de regreso.

1. Crea una hoja de cálculo > Extensiones > Apps Script y pega `apps-script/Prestamos.gs`.
2. Configuración del proyecto > Propiedades de la secuencia de comandos: agrega `TOKEN` con una clave larga.
3. Ejecuta `prepararHoja` una vez y acepta los permisos.
4. Implementar > Nueva implementación > Aplicación web. Ejecutar como: *Yo*. Acceso: *Cualquier usuario*.
5. Pega la URL `/exec` en `endpointPrestamos` y sube `config.js`.
6. La primera vez que entres al Mostrador escribe el token; queda guardado en ese equipo.

Si un día no hay internet, el Mostrador guarda los préstamos en el equipo y los envía con *Sincronizar con Google Sheets*.

## Actualizar el acervo

Cuando cambie el Registro del Acervo:

```bash
pip install openpyxl pillow
python herramientas/actualizar_acervo.py "Registro_Acervo_BibliotecaViva.xlsx"
```

El script reescribe `datos/acervo.js`, `datos/estantes.js` y las portadas. Después se suben los cambios (en GitHub Desktop: *Commit* y *Push*).

Reglas que aplica el script:

- Excluye los renglones con Situación "Baja".
- **No publica** Observaciones, Nivel de evidencia, Registró, Fecha de alta ni Clasificación Dewey.
- Toma la portada colocada en la celda de la columna *Portada*. Los libros sin foto se muestran con una tapa del color de su etiqueta.
- Guarda el Excel en Excel antes de usarlo, para que las fórmulas tengan su valor calculado.

Nota: la columna "Público dirigido (grado asignado)" no se usa en la página. Se calcula a partir de la categoría y no indica la etapa lectora; para eso se usa la serie del Rincón.

## Créditos

- Series, logotipos y categorías: Libros del Rincón, SEP.
- La arquitectura de catálogo y préstamos se inspiró en la plantilla SRCB (licencia MIT), sin su módulo de usuarios.
- Generador de QR: qrcode-generator de Kazuhiko Arase (MIT). "QR Code" es marca registrada de DENSO WAVE.
