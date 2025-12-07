// generate_qrcodes_dynamic_with_dots.js
// Dynamic QR generator with top and bottom 2mm dots centered horizontally in each 40x40 cell

const fs = require("fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const SVGtoPDF = require("svg-to-pdfkit");

const mmToPt = (mm) => (mm * 72) / 25.4;

// === CONFIG ===
const PLACE_CODE = "BL"; // e.g. "NO" (Noida), "CH" (Chennai)
const SERIES_LETTER = "C"; // e.g. "A", "B", "C"
const OUTPUT_FILENAME = `Qr_Bengaluru_C_Series.pdf`;
const DUPLICATE_EACH = true; // true = each code duplicated immediately

// === Numeric range (use integers) ===
const START_NUM = 0;
const END_NUM = 9999;

// === Layout constants ===
const PAGE_W_MM = 320;
const PAGE_H_MM = 200;
const CELL_MM = 40;
const QR_MM = 17;
const COLS = Math.floor(PAGE_W_MM / CELL_MM);
const ROWS = Math.floor(PAGE_H_MM / CELL_MM);
const PAGE_W_PT = mmToPt(PAGE_W_MM);
const PAGE_H_PT = mmToPt(PAGE_H_MM);
const CELL_PT = mmToPt(CELL_MM);
const QR_PT = mmToPt(QR_MM);

// === Font ===
const FONT_PATH = "./ARLRDBD.TTF";
if (!fs.existsSync(FONT_PATH)) {
  console.warn(
    "⚠️ Font not found:",
    FONT_PATH,
    "\nPlease place ARLRDBD.TTF here or change FONT_PATH."
  );
}

// === Text & QR Spacing ===
const FONT_SIZE_MM = 4.0;
const FONT_SIZE_PT = mmToPt(FONT_SIZE_MM);
const TEXT_LEFT_PADDING_PT = mmToPt(3);
const BORDER_THICKNESS_PT = 0.6;
const QR_MARGIN_PT = (CELL_PT - QR_PT) / 2;

// === Dot dimensions ===
const DOT_DIAM_MM = 2; // 2 mm dot
const DOT_OFFSET_MM = 5; // 5 mm from top/bottom (center of dot)
const DOT_DIAM_PT = mmToPt(DOT_DIAM_MM);
const DOT_OFFSET_PT = mmToPt(DOT_OFFSET_MM);

// === Payload builder ===
function formatPayload(place, series, n) {
  const suffix = String(n).padStart(4, "0");
  return `GM-25-${place}-BC-${series}${suffix}`;
}

function buildPayloadList(place, series) {
  const list = [];
  for (let num = START_NUM; num <= END_NUM; num++) {
    const payload = formatPayload(place, series, num);
    list.push(payload);
    if (DUPLICATE_EACH) list.push(payload);
  }
  return list;
}

async function main() {
  const payloads = buildPayloadList(PLACE_CODE, SERIES_LETTER);
  const total = payloads.length;
  const perPage = COLS * ROWS;
  const pages = Math.ceil(total / perPage);

  console.log(`PLACE_CODE=${PLACE_CODE} SERIES=${SERIES_LETTER}`);
  console.log(
    `Range: ${String(START_NUM).padStart(4, "0")} → ${String(END_NUM).padStart(
      4,
      "0"
    )}`
  );
  console.log(`Total placements: ${total} (~${pages} pages)`);

  const doc = new PDFDocument({ size: [PAGE_W_PT, PAGE_H_PT], margin: 0 });
  const out = fs.createWriteStream(OUTPUT_FILENAME);
  doc.pipe(out);

  if (fs.existsSync(FONT_PATH)) {
    doc.registerFont("labelBold", FONT_PATH);
    doc.font("labelBold");
  } else {
    doc.font("Helvetica-Bold");
  }

  const tailRegex = new RegExp(`GM-25-${PLACE_CODE}-(BC-.+)$`);

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const pos = i % perPage;
    const row = Math.floor(pos / COLS);
    const col = pos % COLS;
    const xCell = col * CELL_PT;
    const yCell = row * CELL_PT;

    if (pos === 0 && i > 0)
      doc.addPage({ size: [PAGE_W_PT, PAGE_H_PT], margin: 0 });

    // Border
    doc.save();
    doc.lineWidth(BORDER_THICKNESS_PT);
    doc.strokeColor("#000000");
    doc.rect(xCell, yCell, CELL_PT, CELL_PT);
    doc.stroke();
    doc.restore();

    // Generate QR (vector)
    const svg = await QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 0,
    });

    // Draw centered QR
    SVGtoPDF(doc, svg, xCell + QR_MARGIN_PT, yCell + QR_MARGIN_PT, {
      assumePt: true,
      width: QR_PT,
      height: QR_PT,
    });

    // Extract tail part for vertical text
    const tailMatch = payload.match(tailRegex);
    const tail = tailMatch && tailMatch[1] ? tailMatch[1] : payload.slice(-8);
    const chars = tail.split("");

    // Draw vertical stacked text
    const totalHeight = chars.length * FONT_SIZE_PT;
    const textY = yCell + (CELL_PT - totalHeight) / 2;
    const textX = xCell + TEXT_LEFT_PADDING_PT;

    doc.save();
    doc.fontSize(FONT_SIZE_PT);
    doc.fillColor("#000000");
    for (let j = 0; j < chars.length; j++) {
      doc.text(chars[j], textX, textY + j * FONT_SIZE_PT, { lineBreak: false });
    }
    doc.restore();

    // === Draw 2mm dots centered horizontally in the cell, 5mm from top & bottom ===
    const dotXCenter = xCell + CELL_PT / 2; // centered horizontally in the 40mm cell
    const topDotYCenter = yCell + DOT_OFFSET_PT;
    const bottomDotYCenter = yCell + CELL_PT - DOT_OFFSET_PT;

    doc.save();
    doc.fillColor("#000000");
    doc.circle(dotXCenter, topDotYCenter, DOT_DIAM_PT / 2).fill();
    doc.circle(dotXCenter, bottomDotYCenter, DOT_DIAM_PT / 2).fill();
    doc.restore();
  }

  doc.end();
  out.on("finish", () => {
    console.log(
      `✅ Saved ${OUTPUT_FILENAME} (${pages} pages, ${total} QR placements)`
    );
  });
}

main().catch(console.error);
