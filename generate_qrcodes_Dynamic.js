// generate_qrcodes_dynamic_with_dots.js

const fs = require("fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const SVGtoPDF = require("svg-to-pdfkit");

const mmToPt = (mm) => (mm * 72) / 25.4;

// =====================================================
// CONFIG
// =====================================================

const PLACE_CODE = "CH";
const SERIES_LETTER = "A";
const OUTPUT_FILENAME = "Chennai-13274-0-971.pdf";

const DUPLICATE_EACH = true;

const START_NUM = 0;
const END_NUM = 971;

// =====================================================
// PAGE LAYOUT (MATCH SAMPLE PDF)
// =====================================================

const PAGE_W_MM = 960;
const PAGE_H_MM = 480;

const COLS = 12;
const ROWS = 6;

const CELL_W_MM = 80;
const CELL_H_MM = 80;

const QR_MM = 48;

// =====================================================
// CONVERSIONS
// =====================================================

const PAGE_W_PT = mmToPt(PAGE_W_MM);
const PAGE_H_PT = mmToPt(PAGE_H_MM);

const CELL_W_PT = mmToPt(CELL_W_MM);
const CELL_H_PT = mmToPt(CELL_H_MM);

const QR_PT = mmToPt(QR_MM);

// =====================================================
// FONT
// =====================================================

const FONT_PATH = "./ARLRDBD.TTF";

if (!fs.existsSync(FONT_PATH)) {
  console.warn(
    "⚠️ Font not found:",
    FONT_PATH,
    "\nPlease place ARLRDBD.TTF here or change FONT_PATH."
  );
}

const FONT_SIZE_MM = 7.5;
const FONT_SIZE_PT = mmToPt(FONT_SIZE_MM);

const TEXT_LEFT_PADDING_MM = 5;
const TEXT_LEFT_PADDING_PT = mmToPt(TEXT_LEFT_PADDING_MM);

const BORDER_THICKNESS_PT = 0.4;

// =====================================================
// DOTS
// =====================================================

const DOT_DIAM_MM = 4;
const DOT_OFFSET_MM = 6.5;

const DOT_DIAM_PT = mmToPt(DOT_DIAM_MM);
const DOT_OFFSET_PT = mmToPt(DOT_OFFSET_MM);

// =====================================================
// PAYLOAD BUILDER
// =====================================================

function formatPayload(place, series, n) {
  const suffix = String(n).padStart(4, "0");
  return `GP26-${place}-CB-${series}${suffix}`;
}

function buildPayloadList(place, series) {
  const list = [];

  for (let num = START_NUM; num <= END_NUM; num++) {
    const payload = formatPayload(place, series, num);

    list.push(payload);

    if (DUPLICATE_EACH) {
      list.push(payload);
    }
  }

  return list;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  const payloads = buildPayloadList(
    PLACE_CODE,
    SERIES_LETTER
  );

  const total = payloads.length;
  const perPage = COLS * ROWS;
  const pages = Math.ceil(total / perPage);

  console.log(`PLACE_CODE=${PLACE_CODE}`);
  console.log(`SERIES=${SERIES_LETTER}`);

  console.log(
    `Range: ${String(START_NUM).padStart(
      4,
      "0"
    )} → ${String(END_NUM).padStart(
      4,
      "0"
    )}`
  );

  console.log(
    `Total placements: ${total}`
  );

  const doc = new PDFDocument({
    size: [PAGE_W_PT, PAGE_H_PT],
    margin: 0,
  });

  const out = fs.createWriteStream(
    OUTPUT_FILENAME
  );

  doc.pipe(out);

  if (fs.existsSync(FONT_PATH)) {
    doc.registerFont(
      "labelBold",
      FONT_PATH
    );

    doc.font("labelBold");
  } else {
    doc.font("Helvetica-Bold");
  }

  const tailRegex = new RegExp(
    `GP26-${PLACE_CODE}-(CB-.+)$`
  );

  for (
    let i = 0;
    i < payloads.length;
    i++
  ) {
    const payload = payloads[i];

    const pos = i % perPage;

    if (pos === 0 && i > 0) {
      doc.addPage({
        size: [PAGE_W_PT, PAGE_H_PT],
        margin: 0,
      });
    }

    const row = Math.floor(
      pos / COLS
    );

    const col = pos % COLS;

    const xCell =
      col * CELL_W_PT;

    const yCell =
      row * CELL_H_PT;

    // =================================================
    // BORDER
    // =================================================

    doc.save();

    doc.lineWidth(
      BORDER_THICKNESS_PT
    );

    doc.strokeColor("#000000");

    doc.rect(
      xCell,
      yCell,
      CELL_W_PT,
      CELL_H_PT
    );

    doc.stroke();

    doc.restore();

    // =================================================
    // QR
    // =================================================

    const svg =
      await QRCode.toString(
        payload,
        {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 0,
        }
      );

    const qrX =
      xCell + mmToPt(16);

    const qrY =
      yCell + mmToPt(16);

    SVGtoPDF(
      doc,
      svg,
      qrX,
      qrY,
      {
        assumePt: true,
        width: QR_PT,
        height: QR_PT,
      }
    );

    // =================================================
    // VERTICAL TEXT
    // =================================================

    const tailMatch =
      payload.match(
        tailRegex
      );

    const tail =
      tailMatch &&
      tailMatch[1]
        ? tailMatch[1]
        : payload.slice(-8);

    const chars =
      tail.split("");

    const totalHeight =
      chars.length *
      FONT_SIZE_PT;

    const textX =
      xCell +
      TEXT_LEFT_PADDING_PT;

    const textY =
      yCell +
      (CELL_H_PT -
        totalHeight) /
        2;

    doc.save();

    doc.fontSize(
      FONT_SIZE_PT
    );

    doc.fillColor(
      "#000000"
    );

    for (
      let j = 0;
      j < chars.length;
      j++
    ) {
      doc.text(
        chars[j],
        textX,
        textY +
          j *
            FONT_SIZE_PT,
        {
          lineBreak: false,
        }
      );
    }

    doc.restore();

    // =================================================
    // TOP / BOTTOM DOTS
    // =================================================

    const dotXCenter =
      xCell +
      CELL_W_PT / 2;

    const topDotYCenter =
      yCell +
      DOT_OFFSET_PT;

    const bottomDotYCenter =
      yCell +
      CELL_H_PT -
      DOT_OFFSET_PT;

    doc.save();

    doc.fillColor(
      "#000000"
    );

    doc.circle(
      dotXCenter,
      topDotYCenter,
      DOT_DIAM_PT / 2
    ).fill();

    doc.circle(
      dotXCenter,
      bottomDotYCenter,
      DOT_DIAM_PT / 2
    ).fill();

    doc.restore();
  }

  doc.end();

  out.on("finish", () => {
    console.log(
      `✅ Saved ${OUTPUT_FILENAME}`
    );

    console.log(
      `✅ ${pages} page(s)`
    );

    console.log(
      `✅ ${total} QR placements`
    );
  });
}

main().catch(console.error);