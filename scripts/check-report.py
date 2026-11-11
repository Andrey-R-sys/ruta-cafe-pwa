from pathlib import Path
import fitz
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[1]
directory=root/'tmp/pdf-review';directory.mkdir(parents=True,exist_ok=True)
pdf=fitz.open(root/'output/pdf/reporte-ruta-cafe.pdf')
thumbs=[]
for index,page in enumerate(pdf):
    pix=page.get_pixmap(matrix=fitz.Matrix(1.4,1.4));filename=directory/f'page-{index+1:02}.png';pix.save(filename)
    img=Image.open(filename).convert('RGB');img.thumbnail((300,425))
    thumb=Image.new('RGB',(320,450),'#dbe2d9');thumb.paste(img,((320-img.width)//2,8));ImageDraw.Draw(thumb).text((10,430),f'Página {index+1}',fill='black');thumbs.append(thumb)
    text=page.get_text()
    assert len(text)>60,f'Página casi vacía {index+1}'
    assert '\ufffd' not in text,f'Carácter de reemplazo {index+1}'
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            for span in line['spans']:
                x0,y0,x1,y1=span['bbox']
                assert x0>=45 and x1<=550 and y0>=10 and y1<=825,(index+1,span['text'],span['bbox'])
for start in range(0,len(thumbs),9):
    batch=thumbs[start:start+9];sheet=Image.new('RGB',(960,450*((len(batch)+2)//3)),'white')
    for i,thumb in enumerate(batch):sheet.paste(thumb,((i%3)*320,(i//3)*450))
    sheet.save(directory/f'contact-{start//9+1}.png')
print(f'{len(pdf)} páginas renderizadas; texto dentro de márgenes; contactos en {directory}')
