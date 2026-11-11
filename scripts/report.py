"""Compila el reporte editable Markdown y un PDF con tablas y evidencias."""
from pathlib import Path
import json, re, subprocess, html
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, LongTable, TableStyle, PageBreak, Image, KeepTogether, Preformatted, CondPageBreak
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/reporte-ruta-cafe.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = Path('C:/Windows/Fonts')
for name, file in [('Body','arial.ttf'),('Body-Bold','arialbd.ttf'),('Body-Italic','ariali.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT/file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Body-Bold', italic='Body-Italic', boldItalic='Body-Bold')

INK = colors.HexColor('#183c35')
MUTED = colors.HexColor('#607167')
ACCENT = colors.HexColor('#b44f2e')
PALE = colors.HexColor('#eef2e8')
LINE = colors.HexColor('#dce3d7')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Text',fontName='Body',fontSize=9.2,leading=14,textColor=INK,spaceAfter=9))
styles.add(ParagraphStyle(name='TitleLarge',fontName='Body-Bold',fontSize=44,leading=48,textColor=INK,spaceAfter=20))
styles.add(ParagraphStyle(name='Deck',fontName='Body',fontSize=17,leading=24,textColor=MUTED,spaceAfter=18))
styles.add(ParagraphStyle(name='Section',fontName='Body-Bold',fontSize=19,leading=25,textColor=INK,spaceBefore=12,spaceAfter=16,keepWithNext=True))
styles.add(ParagraphStyle(name='Subsection',fontName='Body-Bold',fontSize=12,leading=17,textColor=ACCENT,spaceBefore=13,spaceAfter=9,keepWithNext=False))
styles.add(ParagraphStyle(name='Cell',fontName='Body',fontSize=7.4,leading=10.4,textColor=INK))
styles.add(ParagraphStyle(name='CellHead',fontName='Body-Bold',fontSize=7.4,leading=10.4,textColor=colors.white))
styles.add(ParagraphStyle(name='CodeBlock',fontName='Mono',fontSize=8,leading=12,textColor=INK,backColor=PALE,borderPadding=10,spaceBefore=8,spaceAfter=14))
styles.add(ParagraphStyle(name='Caption',fontName='Body',fontSize=8,leading=12,textColor=MUTED,spaceAfter=14,alignment=TA_CENTER))
styles.add(ParagraphStyle(name='Eyebrow',fontName='Body-Bold',fontSize=9,leading=15,textColor=ACCENT,spaceAfter=16))

metadata=json.loads((ROOT/'docs/publicacion.json').read_text(encoding='utf8'))
version=json.loads((ROOT/'package.json').read_text(encoding='utf8'))['version']
phases=json.loads((ROOT/'docs/fases.json').read_text(encoding='utf8'))
publication=json.loads((ROOT/'docs/evidencias/pages-publico.json').read_text(encoding='utf8'))
logs=subprocess.check_output(['git','log','--reverse','--format=%h%x09%s'],cwd=ROOT,text=True,encoding='utf8').splitlines()
commits={}
for line in logs:
    sha,title=line.split('\t',1)
    match=re.match(r'Fase (\d+):',title)
    if match: commits.setdefault(int(match.group(1)),(sha,title))
trace='| Fase | Commit inicial | Comprobaciones al cerrar la fase |\n|---|---|---|\n'
for phase in range(14):
    sha,title=commits[phase]
    entry=next(e for e in phases if e['phase']==phase)
    trace+=f'| {phase} | {sha} | {len(entry["checks"])} comprobaciones aprobadas |\n'
tests=(ROOT/'docs/PRUEBAS.md').read_text(encoding='utf8')
tests=tests[tests.index('## Tabla de casos de prueba'):]
tests=tests.replace('## Tabla de casos de prueba','### Casos ejecutados y pendientes',1).replace('## Pruebas manuales pendientes','### Validaciones manuales pendientes')
content=(ROOT/'docs/CONTENIDO-REPORTE.md').read_text(encoding='utf8').replace('{{PRUEBAS}}',tests)
intro=f'''# Ruta Café - Reporte de desarrollo PWA

Proyecto educativo · 10 de noviembre de 2026 · America/Mexico_City

Responsable del repositorio: {metadata['owner']}. Versión del código: {version}.

Aplicación: {metadata['pages']}

Repositorio: {metadata['repository']}

Estado público verificado: HTTP {publication['httpStatus']}; versión observada {publication['version']}; catálogo de seis lugares; hidratación, recarga offline y reseña local operativas.

## Historial de fases

{trace}

Cada fase tiene un commit identificado. Los registros HTTP y de contenido corresponden al estado de cada fase; las pruebas de comportamiento completas se realizaron en la fase 12. La publicación y sus correcciones tienen commits adicionales. El catálogo quedó incorporado al historial final tras ajustar /data/ en .gitignore.

'''
markdown=intro+content
(ROOT/'docs/REPORTE.md').write_text(markdown,encoding='utf8')

def inline(text):
    text=html.escape(text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`(.+?)`',r'<font name="Mono">\1</font>',text)
    # URLs largas se muestran como enlace y pueden partirse entre segmentos.
    text=re.sub(r'https?://[^\s<>]+',lambda m:f'<link href="{m.group(0)}" color="#2d6758">{m.group(0)}</link>',text)
    return text

story=[]
story.append(Spacer(1,28))
story.append(Paragraph('PROYECTO DE APLICACIÓN WEB PROGRESIVA',styles['Eyebrow']))
story.append(Paragraph('Ruta Café',styles['TitleLarge']))
story.append(Paragraph('De un shell a una app<br/>que también funciona sin conexión.',styles['Deck']))
story.append(Spacer(1,14))
metrics=Table([[Paragraph('<b>14 fases</b><br/>con commit y verificación',styles['Text']),Paragraph('<b>5 grupos API</b><br/>y 9 escenarios de navegador',styles['Text'])]],colWidths=[247,247])
metrics.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LINE),('TOPPADDING',(0,0),(-1,-1),18),('BOTTOMPADDING',(0,0),(-1,-1),10),('LEFTPADDING',(0,0),(-1,-1),17)]))
story.append(metrics)
story.append(Spacer(1,30))
for text in [f'<b>Fecha:</b> 10 de noviembre de 2026 · America/Mexico_City',f'<b>Repositorio:</b> {metadata["owner"]}/ruta-cafe-pwa',f'<b>Versión:</b> {version}',f'<b>Aplicación:</b> {metadata["pages"]}',f'<b>Código:</b> {metadata["repository"]}']:
    story.append(Paragraph(inline(text).replace('&lt;b&gt;','<b>').replace('&lt;/b&gt;','</b>'),styles['Text']))
story.append(Spacer(1,24))
story.append(Paragraph('<b>Resultado verificado.</b> Instalación en Chrome, catálogo, favoritos, almacenamiento local, navegación offline, sincronización con servidor local, actualizaciones y recepción push inducida por CDP.',styles['Text']))
story.append(Paragraph('<b>Alcance de Pages.</b> El servidor Node se entrega por separado. Reseñas compartidas y push real en Internet requieren una API HTTPS. Los casos que necesitan dispositivo físico se marcan como pendientes.',styles['Text']))
story.append(PageBreak())

def add_table(lines):
    rows=[[cell.strip() for cell in line.strip().strip('|').split('|')] for line in lines]
    rows=[row for row in rows if not all(re.fullmatch(r':?-+:?',cell) for cell in row)]
    count=len(rows[0])
    widths={3:[40,86,368],6:[38,87,100,91,89,89]}.get(count,[494/count]*count)
    data=[[Paragraph(inline(cell),styles['CellHead' if i==0 else 'Cell']) for cell in row] for i,row in enumerate(rows)]
    table=LongTable(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),INK),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.3,LINE)]))
    story.extend([table,Spacer(1,14)])

lines=markdown.splitlines()
i=1
while i<len(lines):
    line=lines[i].strip()
    if not line: i+=1;continue
    if line.startswith('```'):
        code=[];i+=1
        while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
        story.append(Preformatted('\n'.join(code),styles['CodeBlock']));i+=1;continue
    if line.startswith('|'):
        table=[]
        while i<len(lines) and lines[i].strip().startswith('|'):table.append(lines[i]);i+=1
        add_table(table);continue
    if line.startswith('## '):
        heading=line[3:]
        if re.match(r'[1345]\. ',heading):story.append(PageBreak())
        story.append(Paragraph(inline(heading),styles['Section']));i+=1;continue
    if line.startswith('### '):
        if line[4:]!='Casos ejecutados y pendientes':story.append(CondPageBreak(160))
        story.append(Paragraph(inline(line[4:]),styles['Subsection']));i+=1;continue
    if line.startswith('- '):
        story.append(Paragraph('• '+inline(line[2:]),styles['Text']));i+=1;continue
    paragraph=[line];i+=1
    while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|- )',lines[i]):paragraph.append(lines[i].strip());i+=1
    story.append(Paragraph(inline(' '.join(paragraph)),styles['Text']))

story.append(PageBreak())
story.append(Paragraph('Anexo visual · Evidencias de ejecución',styles['Section']))
story.append(Paragraph('Las capturas completas están disponibles en docs/evidencias; estas vistas documentan la interfaz y el estado offline.',styles['Text']))
for filename,caption in [('home.png','Home: catálogo de seis lugares, filtros e instalación.'),('offline.png','Ficha recargada sin conexión y reseña conservada en el dispositivo.'),('ssr.png','Ficha con HTML de servidor e interacciones hidratadas.')]:
    image_path=ROOT/'docs/evidencias'/filename
    width,height=ImageReader(str(image_path)).getSize()
    scale=min(494/width,535/height)
    story.append(KeepTogether([Image(str(image_path),width*scale,height*scale),Spacer(1,9),Paragraph(caption,styles['Caption'])]))
    if filename!='ssr.png':story.append(PageBreak())

def decorate(canvas,doc):
    width,height=doc.pagesize
    canvas.saveState()
    canvas.setStrokeColor(LINE);canvas.line(50,height-36,width-50,height-36)
    canvas.setFont('Body-Bold',8);canvas.setFillColor(INK);canvas.drawString(50,height-27,'RUTA CAFÉ  /  REPORTE PWA')
    canvas.setFont('Body',8);canvas.setFillColor(MUTED);canvas.drawString(50,28,'10 NOV 2026 · Proyecto educativo')
    canvas.drawRightString(width-50,28,str(doc.page));canvas.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),leftMargin=50,rightMargin=50,topMargin=54,bottomMargin=48,title='Ruta Café - Reporte de desarrollo PWA',author=metadata['owner'])
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print(OUT)
