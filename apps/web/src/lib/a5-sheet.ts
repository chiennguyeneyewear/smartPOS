// Turns an on-screen sheet into a picture that is exactly one A5 landscape page (210 x 148 mm at 300 DPI),
// shrunk to fit inside a small margin, so printing it on A5 never cuts anything off however many rows it has.

const DPI = 300;
const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);
const PAGE = { w: mmToPx(210), h: mmToPx(148) };
const MARGIN = mmToPx(4);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Writes the 300 DPI into the PNG so print dialogs / photo viewers that print "actual size" give 210 x 148 mm.
function withPrintDensity(png: Uint8Array): Uint8Array {
  const perMeter = Math.round(DPI / 0.0254);
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, perMeter);
  view.setUint32(12, perMeter);
  chunk[16] = 1; // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const afterHeader = 8 + 25; // 8-byte signature + IHDR chunk (4 length + 4 type + 13 data + 4 crc)
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, afterHeader), 0);
  out.set(chunk, afterHeader);
  out.set(png.subarray(afterHeader), afterHeader + chunk.length);
  return out;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function renderA5Png(node: HTMLElement): Promise<Blob> {
  const { toPng } = await import("html-to-image");
  const sheet = await loadImage(await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true }));

  const canvas = document.createElement("canvas");
  canvas.width = PAGE.w;
  canvas.height = PAGE.h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE.w, PAGE.h);

  const scale = Math.min((PAGE.w - 2 * MARGIN) / sheet.width, (PAGE.h - 2 * MARGIN) / sheet.height);
  const w = sheet.width * scale;
  const h = sheet.height * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sheet, (PAGE.w - w) / 2, (PAGE.h - h) / 2, w, h);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Không tạo được ảnh");
  const bytes = withPrintDensity(new Uint8Array(await blob.arrayBuffer()));
  return new Blob([bytes.buffer as ArrayBuffer], { type: "image/png" });
}

// Opens the print dialog with one A5 landscape page per picture (e.g. front then back of the sheet), no extra margin.
export function printA5Pages(urls: string[], onDone?: () => void) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>Tờ thu chi</title><style>@page{size:A5 landscape;margin:0}html,body{margin:0}img{display:block;width:210mm;height:148mm;break-after:page}img:last-child{break-after:auto}</style></head><body>${urls
      .map((u) => `<img src="${u}">`)
      .join("")}</body></html>`,
  );
  doc.close();
  const imgs = [...doc.querySelectorAll("img")];
  let pending = imgs.filter((img) => !img.complete).length;
  const go = () => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => {
      iframe.remove();
      onDone?.();
    }, 60_000);
  };
  if (pending === 0) go();
  else
    imgs.forEach((img) => {
      if (img.complete) return;
      img.onload = () => {
        pending -= 1;
        if (pending === 0) go();
      };
    });
}
