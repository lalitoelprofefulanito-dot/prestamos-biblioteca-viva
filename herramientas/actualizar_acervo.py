"""
Actualiza el Sistema de préstamos Biblioteca Viva a partir del Registro del Acervo (Excel).

Uso (desde la carpeta raíz del repositorio):
    pip install openpyxl pillow
    python herramientas/actualizar_acervo.py "Registro_Acervo_BibliotecaViva.xlsx"

Genera:
    datos/acervo.js     solo campos públicos (sin Observaciones, Nivel de evidencia ni Registró)
    datos/estantes.js   descripción de cada entrepaño (hoja "Acomodo por anaquel")
    portadas/BV-XXXX.webp  portadas a 300 px desde las imágenes colocadas en la celda "Portada"

Requisitos del Excel: hoja "Registro" con los encabezados actuales; guarda el archivo en Excel
antes de usarlo para que las fórmulas (Color, Grado) tengan su valor calculado.
"""
import json, os, re, sys, zipfile, io
from collections import defaultdict
import openpyxl
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def limpiar(v):
    if v is None:
        return ""
    s = re.sub(r"\s+", " ", str(v)).strip()
    return "" if s in ("None", "#VALUE!", "-", "—") else s


def mapa_portadas(z):
    """Devuelve {fila: ruta_de_imagen} para la columna Portada de la hoja Registro."""
    wb = z.read("xl/workbook.xml").decode()
    rels = z.read("xl/_rels/workbook.xml.rels").decode()
    rid = re.search(r'<sheet [^>]*name="Registro"[^>]*r:id="(rId\d+)"', wb).group(1)
    hoja = "xl/" + re.search(r'Id="%s"[^>]*Target="([^"]+)"' % rid, rels).group(1).lstrip("/").replace("xl/", "")
    if "metadata.xml" not in " ".join(z.namelist()):
        return {}
    md = z.read("xl/metadata.xml").decode()
    fut = [int(x) for x in re.findall(r'<xlrd:rvb i="(\d+)"/>', md)]
    vm = [int(v) for v in re.findall(r'<rc t="\d+" v="(\d+)"/>', re.search(r"<valueMetadata[^>]*>(.*?)</valueMetadata>", md, re.S).group(1))]
    rv = re.findall(r'<rv s="\d+"><v>(\d+)</v>', z.read("xl/richData/rdrichvalue.xml").decode())
    rr = re.findall(r'r:id="(rId\d+)"', z.read("xl/richData/richValueRel.xml").decode())
    tg = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="\.\./media/([^"]+)"', z.read("xl/richData/_rels/richValueRel.xml.rels").decode()))
    xml = z.read(hoja).decode()
    return xml, fut, vm, rv, rr, tg


def main(ruta):
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    filas = list(wb["Registro"].iter_rows(values_only=True))
    enc = [limpiar(h) for h in filas[0]]

    def col(prefijo):
        for i, h in enumerate(enc):
            if h.startswith(prefijo):
                return i
        raise SystemExit("No encontré la columna que empieza con: " + prefijo)

    C = {k: col(p) for k, p in {
        "u": "Ubitación", "ti": "Tipología", "id": "Id Documento", "t": "Título", "m": "Clase de material",
        "q": "Cantidad", "k": "Color", "img": "Portada", "s": "Subserie", "p": "Procedencia", "a": "Autor",
        "e": "Editorial", "y": "Año", "g": "Tipo de texto", "c": "Categoría SEP", "cs": "Contenidos",
        "tm": "Tema principal", "r": "Reseña", "il": "Ilustrador", "tr": "Traductor", "ed": "Edición",
        "v": "Volumen", "i10": "ISBN-10", "i13": "ISBN-13", "issn": "ISSN", "f": "Estado físico", "sit": "Situación"}.items()}
    letra_portada = openpyxl.utils.get_column_letter(C["img"] + 1)

    # Portadas incrustadas en celda
    z = zipfile.ZipFile(ruta)
    portadas = {}
    datos = mapa_portadas(z)
    if datos:
        xml, fut, vm, rv, rr, tg = datos
        for fila, v in re.findall(r'<c r="%s(\d+)"[^>]*vm="(\d+)"' % letra_portada, xml):
            try:
                portadas[int(fila)] = tg[rr[int(rv[fut[vm[int(v) - 1]]])]]
            except (IndexError, KeyError):
                pass

    # Biblioteca de aula
    aula = defaultdict(list)
    if "Biblioteca de Aula 2026-27" in wb.sheetnames:
        for r in wb["Biblioteca de Aula 2026-27"].iter_rows(values_only=True):
            if r[3] and str(r[3]).startswith("BV-") and r[0]:
                aula[r[3]].append([str(r[0]).replace(".° ", "° "), int(r[10] or 1)])

    os.makedirs(os.path.join(RAIZ, "portadas"), exist_ok=True)
    salida, nuevas = [], 0
    for n, r in enumerate(filas[1:], start=2):
        if not r[C["id"]] or limpiar(r[C["sit"]]) == "Baja":
            continue
        u = re.match(r"Anaquel (\d+) / Entrepaño (\d+)", limpiar(r[C["u"]]))
        if not u:
            print("Sin ubicación válida, se omite:", r[C["id"]])
            continue
        q = limpiar(r[C["q"]])
        d = {"id": limpiar(r[C["id"]])}
        for k in ("t", "a", "e", "y", "s", "p", "g", "c", "k", "cs", "tm", "r", "il", "tr", "ed", "v"):
            d[k] = limpiar(r[C[k]])
        d["i"] = limpiar(r[C["i13"]]) or limpiar(r[C["i10"]]) or limpiar(r[C["issn"]])
        d["m"] = limpiar(r[C["m"]]); d["ti"] = limpiar(r[C["ti"]])
        d["q"] = int(float(q)) if q else 1
        d["an"], d["en"] = int(u.group(1)), int(u.group(2))
        d["f"] = limpiar(r[C["f"]])
        if n in portadas:
            d["img"] = 1
            destino = os.path.join(RAIZ, "portadas", d["id"] + ".webp")
            im = ImageOps.exif_transpose(Image.open(io.BytesIO(z.read("xl/media/" + portadas[n])))).convert("RGB")
            w = 300; h = round(im.height * w / im.width)
            if h > 480:
                h = 480; w = round(im.width * h / im.height)
            im.resize((w, h), Image.LANCZOS).save(destino, "WEBP", quality=68, method=6)
            nuevas += 1
        if d["id"] in aula:
            d["au"] = aula[d["id"]]
        salida.append({k: v for k, v in d.items() if v not in ("", None)})

    with open(os.path.join(RAIZ, "datos", "acervo.js"), "w", encoding="utf-8") as f:
        f.write("window.ACERVO=" + json.dumps(salida, ensure_ascii=False, separators=(",", ":")) + ";\n")

    est, a = {}, 0
    if "Acomodo por anaquel" in wb.sheetnames:
        for r in wb["Acomodo por anaquel"].iter_rows(values_only=True):
            v = str(r[0] or "")
            m = re.match(r"ANAQUEL (\d+)", v)
            if m:
                a = int(m.group(1))
            m = re.match(r"Entrepaño (\d+): (.*?) — \d+ títulos", v)
            if m:
                est["%d-%s" % (a, m.group(1))] = re.sub(r" — Libros del Rincón.*", "", m.group(2)).replace(" ; ", " en adelante; ")
        with open(os.path.join(RAIZ, "datos", "estantes.js"), "w", encoding="utf-8") as f:
            f.write("window.ESTANTES=" + json.dumps(est, ensure_ascii=False) + ";\n")

    print("Listo: %d títulos públicos, %d portadas, %d títulos en bibliotecas de aula." % (len(salida), nuevas, len(aula)))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
