import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'fs';

const doc = await PDFDocument.load(readFileSync('app/assets/nachtregistratieformulier-2025.pdf'));
console.log('pagina\'s:', doc.getPageCount(), '| pagina 1:', doc.getPage(0).getSize());
const form = doc.getForm();
for (const f of form.getFields()) {
    const w = f.acroField.getWidgets()[0];
    const r = w.getRectangle();
    console.log(f.getName().padEnd(8), 'x:', Math.round(r.x), 'y:', Math.round(r.y), 'w:', Math.round(r.width), 'h:', Math.round(r.height));
}
