import { Buffer } from "buffer";
import * as iconv from "iconv-lite";

import BufferHelper from "./buffer-helper";
import { generateRasterQRCode } from "./qr-encoder";

// ── Printer initialization ──────────────────────────────────────────────────

const init_printer_bytes = Buffer.from([27, 64]); // ESC @

// ── Alignment ───────────────────────────────────────────────────────────────

const l_start_bytes = Buffer.from([27, 97, 0]); // ESC a 0 — Left
const l_end_bytes = Buffer.from([]);
const c_start_bytes = Buffer.from([27, 97, 1]); // ESC a 1 — Center
const c_end_bytes = Buffer.from([]);
const r_start_bytes = Buffer.from([27, 97, 2]); // ESC a 2 — Right
const r_end_bytes = Buffer.from([]);

// ── Clean Reset (sent after every newline) ───────────────────────────────────

const reset_bytes = Buffer.from([
	27, 97, 0, // ESC a 0  — Left align for next line
	29, 33, 0, // GS ! 0   — Normal character size (1x1)
	27, 45, 0, // ESC - 0  — Underline off
	27, 69, 0, // ESC E 0  — Bold/emphasis off
	29, 66, 0, // GS B 0   — Reverse off
	27, 123, 0, // ESC { 0 — Upside-down off
]);

// ── Legacy formatting (ESC ! / FS !) ────────────────────────────────────────

const m_start_bytes = Buffer.from([27, 33, 16]); // Double-height
const m_end_bytes = Buffer.from([27, 33, 0]);
const b_start_bytes = Buffer.from([27, 33, 48]); // Double-height + double-width
const b_end_bytes = Buffer.from([27, 33, 0]);
const d_start_bytes = Buffer.from([27, 33, 32]); // Double-width
const d_end_bytes = Buffer.from([27, 33, 0]);
const db_start_bytes = Buffer.from([27, 33, 40]); // Double-width + bold emphasis
const db_end_bytes = Buffer.from([27, 33, 0]);

// ── Legacy alignment + size combos ──────────────────────────────────────────

const cm_start_bytes = Buffer.from([27, 97, 1, 27, 33, 16]);
const cm_end_bytes = Buffer.from([27, 33, 0]);
const cb_start_bytes = Buffer.from([27, 97, 1, 27, 33, 48]);
const cb_end_bytes = Buffer.from([27, 33, 0]);
const cd_start_bytes = Buffer.from([27, 97, 1, 27, 33, 32]);
const cd_end_bytes = Buffer.from([27, 33, 0]);

// ── Underline ───────────────────────────────────────────────────────────────

const u_start_bytes = Buffer.from([27, 45, 1]); // ESC - 1 — 1-dot underline
const u_end_bytes = Buffer.from([27, 45, 0]); // ESC - 0 — underline off
const u2_start_bytes = Buffer.from([27, 45, 2]); // ESC - 2 — 2-dot (thick) underline
const u2_end_bytes = Buffer.from([27, 45, 0]);

// ── Bold / Emphasis (no size change) ────────────────────────────────────────

const bold_start_bytes = Buffer.from([27, 69, 1]); // ESC E 1
const bold_end_bytes = Buffer.from([27, 69, 0]); // ESC E 0

// ── Reverse (white-on-black) ────────────────────────────────────────────────

const rev_start_bytes = Buffer.from([29, 66, 1]); // GS B 1
const rev_end_bytes = Buffer.from([29, 66, 0]); // GS B 0

// ── Upside-down ─────────────────────────────────────────────────────────────

const updown_start_bytes = Buffer.from([27, 123, 1]); // ESC { 1
const updown_end_bytes = Buffer.from([27, 123, 0]); // ESC { 0

// ── Font selection ──────────────────────────────────────────────────────────

const font_a_bytes = Buffer.from([27, 77, 0]); // ESC M 0 — Font A (default, 12×24)
const font_b_bytes = Buffer.from([27, 77, 1]); // ESC M 1 — Font B (smaller, 9×17)

// ── Character size helpers (GS ! n) ─────────────────────────────────────────

function sizeBytes(w: number, h: number): Buffer {
	const cw = Math.min(Math.max(w, 1), 8) - 1;
	const ch = Math.min(Math.max(h, 1), 8) - 1;
	return Buffer.from([29, 33, cw | (ch << 4)]); // GS ! n
}

const size_reset_bytes = Buffer.from([29, 33, 0]); // GS ! 0 — 1×1

// Pre-built size presets
const w2_start_bytes = sizeBytes(2, 1); // Width ×2
const w3_start_bytes = sizeBytes(3, 1); // Width ×3
const h2_start_bytes = sizeBytes(1, 2); // Height ×2
const h3_start_bytes = sizeBytes(1, 3); // Height ×3
const x2_start_bytes = sizeBytes(2, 2); // Width ×2, Height ×2
const x3_start_bytes = sizeBytes(3, 3); // Width ×3, Height ×3
const x4_start_bytes = sizeBytes(4, 4); // Width ×4, Height ×4

// ── Line spacing ────────────────────────────────────────────────────────────

function lineSpacingBytes(n: number): Buffer {
	return Buffer.from([27, 51, Math.min(Math.max(n, 0), 255)]); // ESC 3 n
}

const default_line_spacing_bytes = Buffer.from([27, 50]); // ESC 2

// ── Character spacing ───────────────────────────────────────────────────────

function charSpacingBytes(n: number): Buffer {
	return Buffer.from([27, 32, Math.min(Math.max(n, 0), 255)]); // ESC SP n
}

// ── Cut / Beep / Tail ───────────────────────────────────────────────────────

const cut_bytes = Buffer.from([27, 105]); // ESC i — full cut
const partial_cut_bytes = Buffer.from([27, 109]); // ESC m — partial cut
const beep_bytes = Buffer.from([27, 66, 3, 2]); // ESC B 3 2
const line_bytes = Buffer.from([10, 10, 10, 10, 10]);

// ── Cash drawer ─────────────────────────────────────────────────────────────

const drawer_bytes = Buffer.from([27, 112, 0, 60, 120]); // ESC p 0 60 120 (Pin 2)
const drawer_pin5_bytes = Buffer.from([27, 112, 1, 60, 120]); // ESC p 1 60 120 (Pin 5)

export function cashDrawerBytes(pin: 2 | 5 = 2): Buffer {
	return pin === 5 ? drawer_pin5_bytes : drawer_bytes;
}

export function buzzerBytes(times: number = 3, duration: number = 2): Buffer {
	const n = Math.min(Math.max(times, 1), 9);
	const t = Math.min(Math.max(duration, 1), 9);
	return Buffer.from([27, 66, n, t]);
}

export function cutPaperBytes(
	partial: boolean = false,
	feedLines: number = 3,
): Buffer {
	const n = Math.min(Math.max(feedLines, 0), 255);
	const m = partial ? 66 : 65; // GS V m n
	return Buffer.from([29, 86, m, n]);
}

const encoding_mappings_bytes: { [key: string]: Buffer } = {
	CP437: Buffer.from([28, 46, 27, 116, 0]), // FS . (Cancel Chinese) + ESC t 0 (CP437)
	GB18030: Buffer.from([28, 38]), // FS & (Chinese mode)
	BIG5: Buffer.from([28, 38, 28, 67, 1]),
	UTF8: Buffer.from([28, 46]), // FS . (Cancel Chinese/Kanji mode — pure clean text)
};

const options_controller = {
	cut: cut_bytes,
	beep: beep_bytes,
	tailingLine: line_bytes,
	encoding: encoding_mappings_bytes,
};

// ── Static tag → bytes map ──────────────────────────────────────────────────

const controller: { [key: string]: Buffer } = {
	// Legacy formatting
	"<M>": m_start_bytes,
	"</M>": m_end_bytes,
	"<B>": b_start_bytes,
	"</B>": b_end_bytes,
	"<D>": d_start_bytes,
	"</D>": d_end_bytes,
	"<DB>": db_start_bytes,
	"</DB>": db_end_bytes,

	// Alignment
	"<C>": c_start_bytes,
	"</C>": c_end_bytes,
	"<L>": l_start_bytes,
	"</L>": l_end_bytes,
	"<R>": r_start_bytes,
	"</R>": r_end_bytes,

	// Legacy alignment + size combos
	"<CM>": cm_start_bytes,
	"</CM>": cm_end_bytes,
	"<CD>": cd_start_bytes,
	"</CD>": cd_end_bytes,
	"<CB>": cb_start_bytes,
	"</CB>": cb_end_bytes,

	// Underline
	"<U>": u_start_bytes,
	"</U>": u_end_bytes,
	"<U2>": u2_start_bytes,
	"</U2>": u2_end_bytes,

	// Bold emphasis only (no size change)
	"<BOLD>": bold_start_bytes,
	"</BOLD>": bold_end_bytes,

	// Reverse (white on black)
	"<REV>": rev_start_bytes,
	"</REV>": rev_end_bytes,

	// Upside-down
	"<UPDOWN>": updown_start_bytes,
	"</UPDOWN>": updown_end_bytes,

	// Font selection
	"<FONT_A>": font_a_bytes,
	"<FONT_B>": font_b_bytes,

	// Size presets (GS !)
	"<W2>": w2_start_bytes,
	"</W2>": size_reset_bytes,
	"<W3>": w3_start_bytes,
	"</W3>": size_reset_bytes,
	"<H2>": h2_start_bytes,
	"</H2>": size_reset_bytes,
	"<H3>": h3_start_bytes,
	"</H3>": size_reset_bytes,
	"<X2>": x2_start_bytes,
	"</X2>": size_reset_bytes,
	"<X3>": x3_start_bytes,
	"</X3>": size_reset_bytes,
	"<X4>": x4_start_bytes,
	"</X4>": size_reset_bytes,

	// Close tags for parameterized tags
	"</FS>": size_reset_bytes,
	"</LINESPC>": default_line_spacing_bytes,
	"</CHARSPC>": Buffer.from([27, 32, 0]),

	// Inline action tags (no closing tag)
	"<PARTCUT>": partial_cut_bytes,
	"<DRAWER>": drawer_bytes,
	"<DRAWER2>": drawer_bytes,
	"<DRAWER5>": drawer_pin5_bytes,
	"<TAB>": Buffer.from([9]),
	"<RESET>": reset_bytes,
};

// Sort tag keys longest-first so that e.g. "</BOLD>" is tried before "</B>"
const sorted_tags = Object.keys(controller).sort((a, b) => b.length - a.length);

// ── Native Barcode Generation ───────────────────────────────────────────────

export type BarcodeType =
	| "UPC-A"
	| "UPC-E"
	| "EAN13"
	| "EAN8"
	| "CODE39"
	| "ITF"
	| "CODABAR"
	| "CODE93"
	| "CODE128";

export interface BarcodeOptions {
	type?: BarcodeType;
	width?: number; // 1–6 (module width multiplier)
	height?: number; // 1–255 dots (default 80)
	position?: "none" | "above" | "below" | "both";
	font?: "A" | "B";
}

const barcodeTypeMap: Record<BarcodeType, number> = {
	"UPC-A": 65,
	"UPC-E": 66,
	EAN13: 67,
	EAN8: 68,
	CODE39: 69,
	ITF: 70,
	CODABAR: 71,
	CODE93: 72,
	CODE128: 73,
};

const hriPosMap: Record<string, number> = {
	none: 0,
	above: 1,
	below: 2,
	both: 3,
};

export function barcodeBytes(
	data: string,
	options: BarcodeOptions = {},
): Buffer {
	const type = options.type || "CODE128";
	let content = data;

	// Auto-adjust module width so wide barcodes fit 58mm & 80mm rolls
	let width = options.width;
	if (!width) {
		width = type === "CODE39" || content.length > 10 ? 1 : 2;
	}
	width = Math.min(Math.max(width, 1), 6);

	const height = Math.min(Math.max(options.height || 70, 1), 255);
	const pos = hriPosMap[options.position || "below"] ?? 2;
	const font = options.font === "B" ? 1 : 0;

	// Format data for barcode type
	if (type === "CODE39") {
		// CODE39 in ESC/POS requires uppercase and start/stop asterisks
		content = content.toUpperCase().replace(/[^0-9A-Z-. $/+%*]/g, "");
		if (!content.startsWith("*")) {
			content = `*${content}*`;
		}
	} else if (type === "CODE128" && !content.startsWith("{")) {
		// ESC/POS CODE128 (m=73) expects code set prefix e.g. {B for standard ASCII
		content = `{B${content}`;
	}

	const dataBytes = Buffer.from(content, "ascii");
	const m = barcodeTypeMap[type] || 73;

	return Buffer.concat([
		Buffer.from([27, 97, 1]), // Center alignment for barcode
		Buffer.from([29, 119, width]), // GS w n (width)
		Buffer.from([29, 104, height]), // GS h n (height)
		Buffer.from([29, 72, pos]), // GS H n (HRI position)
		Buffer.from([29, 102, font]), // GS f n (HRI font)
		Buffer.from([29, 107, m, dataBytes.length]), // GS k m n
		dataBytes,
		Buffer.from([27, 97, 0]), // Reset to left alignment
	]);
}

// ── Universal ESC/POS QR Code Generation ───────────────────────────────────

export interface QRCodeOptions {
	size?: number; // 2–12 (module size in dots, default 5)
	errorCorrection?: "L" | "M" | "Q" | "H";
}

/**
 * Generates universal ESC/POS 2D QR code bytes via `GS v 0` raster bitmap.
 * Supported on 100% of thermal receipt printers without command incompatibilities.
 */
export function qrCodeBytes(data: string, options: QRCodeOptions = {}): Buffer {
	const moduleSize = options.size || 5;
	const ecc = options.errorCorrection || "M";
	return generateRasterQRCode(data, moduleSize, ecc);
}

// ── Multi-Column Table Layout Formatter ─────────────────────────────────────

export interface TableColumn {
	text: string;
	width: number; // Fraction (0.0–1.0) or fixed character width
	align?: "left" | "center" | "right";
}

export function formatColumns(
	columns: TableColumn[],
	totalWidth: number = 32, // 32 for 58mm, 42 or 48 for 80mm
): string {
	let remaining = totalWidth;
	const widths: number[] = [];

	columns.forEach((col, idx) => {
		if (idx === columns.length - 1) {
			widths.push(Math.max(remaining, 1));
		} else if (col.width <= 1.0) {
			const w = Math.floor(col.width * totalWidth);
			widths.push(w);
			remaining -= w;
		} else {
			const w = Math.floor(col.width);
			widths.push(w);
			remaining -= w;
		}
	});

	// Split text into word-wrapped lines per column
	const colLines: string[][] = columns.map((col, idx) => {
		const w = widths[idx];
		const words = (col.text || "").split(" ");
		const lines: string[] = [];
		let cur = "";

		for (const word of words) {
			if (cur.length === 0) {
				cur = word.slice(0, w);
			} else if (cur.length + 1 + word.length <= w) {
				cur += ` ${word}`;
			} else {
				lines.push(cur);
				cur = word.slice(0, w);
			}
		}
		if (cur.length > 0) lines.push(cur);
		return lines.length > 0 ? lines : [""];
	});

	const maxLines = Math.max(...colLines.map((l) => l.length));
	const rows: string[] = [];

	for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
		let rowStr = "";
		columns.forEach((col, colIdx) => {
			const w = widths[colIdx];
			const lineText = colLines[colIdx][lineIdx] || "";
			const align =
				col.align || (colIdx === columns.length - 1 ? "right" : "left");

			if (align === "right") {
				rowStr += lineText.padStart(w, " ");
			} else if (align === "center") {
				const padTotal = Math.max(w - lineText.length, 0);
				const padLeft = Math.floor(padTotal / 2);
				const padRight = padTotal - padLeft;
				rowStr += " ".repeat(padLeft) + lineText + " ".repeat(padRight);
			} else {
				rowStr += lineText.padEnd(w, " ");
			}
		});
		rows.push(rowStr);
	}

	return rows.join("\n");
}

// ── Parameterized tag regexes ───────────────────────────────────────────────

const parameterized_tags: Array<{
	regex: RegExp;
	handler: (match: RegExpMatchArray) => Buffer;
}> = [
	{
		// <FS:W,H> — custom font size (width 1–8, height 1–8)
		regex: /^<FS:(\d+),(\d+)>/,
		handler: (m) => sizeBytes(parseInt(m[1], 10), parseInt(m[2], 10)),
	},
	{
		// <LINESPC:N> — line spacing in dots (0–255)
		regex: /^<LINESPC:(\d+)>/,
		handler: (m) => lineSpacingBytes(parseInt(m[1], 10)),
	},
	{
		// <CHARSPC:N> — character spacing in dots (0–255)
		regex: /^<CHARSPC:(\d+)>/,
		handler: (m) => charSpacingBytes(parseInt(m[1], 10)),
	},
	{
		// <FEED:N> — feed N lines (1–255)
		regex: /^<FEED:(\d+)>/,
		handler: (m) => {
			const n = Math.min(Math.max(parseInt(m[1], 10), 1), 255);
			return Buffer.from([27, 100, n]); // ESC d n
		},
	},
	{
		// <BARCODE:TYPE:DATA> or <BARCODE:DATA> e.g. <BARCODE:CODE128:123456>
		regex: /^<BARCODE(?::([A-Za-z0-9-]+))?:([^>]+)>/,
		handler: (m) => {
			const type = (m[1] || "CODE128") as BarcodeType;
			const data = m[2] || "";
			return barcodeBytes(data, { type });
		},
	},
	{
		// <QR:DATA> or <QR:SIZE:DATA> e.g. <QR:6:https://example.com>
		regex: /^<QR(?::(\d+))?:([^>]+)>/,
		handler: (m) => {
			const size = m[1] ? parseInt(m[1], 10) : 5;
			const data = m[2] || "";
			return qrCodeBytes(data, { size });
		},
	},
	{
		// <RAW:HH,HH,...> — send raw hex bytes
		regex: /^<RAW:([0-9A-Fa-f,]+)>/,
		handler: (m) => {
			const hexParts = m[1].split(",").filter(Boolean);
			return Buffer.from(hexParts.map((h) => parseInt(h, 16)));
		},
	},
];

// ── Options ─────────────────────────────────────────────────────────────────

export type IOptions = {
	beep?: boolean;
	cut?: boolean;
	tailingLine?: boolean | number;
	encoding?: string;
};

const default_options: IOptions = {
	beep: false,
	cut: true,
	tailingLine: true,
	encoding: "UTF8",
};

// ── Text sanitizer for thermal printer single-byte codepages ────────────────

export function sanitizePrinterText(text: string): string {
	return text
		.replace(/[•●]/g, "*")
		.replace(/[’‘]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/[—–]/g, "-")
		.replace(/…/g, "...");
}

// ── Main text → buffer converter ────────────────────────────────────────────

export function exchange_text(text: string, options?: IOptions): Buffer {
	const m_options = { ...default_options, ...options };
	const encoding = m_options.encoding || "UTF8";

	// Sanitize common typography that turns into Chinese characters on non-UTF8 printers
	const sanitized = sanitizePrinterText(text);

	let bytes = new BufferHelper();
	bytes.concat(init_printer_bytes);

	// set encoding
	if (encoding && options_controller.encoding[encoding]) {
		bytes.concat(options_controller.encoding[encoding]);
	}

	let temp = "";
	for (let i = 0; i < sanitized.length; i++) {
		let ch = sanitized[i];
		switch (ch) {
			case "<": {
				bytes.concat(iconv.encode(temp, encoding));
				temp = "";

				const remaining = sanitized.substring(i);

				// 1. Try static tags (longest-first to avoid prefix collisions)
				let matched = false;
				for (const tag of sorted_tags) {
					if (remaining.startsWith(tag)) {
						bytes.concat(controller[tag]);
						i += tag.length - 1;
						matched = true;
						break;
					}
				}

				// 2. Try parameterized tags
				if (!matched) {
					for (const pt of parameterized_tags) {
						const m = remaining.match(pt.regex);
						if (m) {
							bytes.concat(pt.handler(m));
							i += m[0].length - 1;
							matched = true;
							break;
						}
					}
				}

				// 3. Not a known tag — keep the literal '<'
				if (!matched) {
					temp = "<";
				}
				break;
			}
			case "\n":
				temp = `${temp}${ch}`;
				bytes.concat(iconv.encode(temp, encoding));
				bytes.concat(reset_bytes);
				temp = "";
				break;
			default:
				temp = `${temp}${ch}`;
				break;
		}
	}
	temp.length && bytes.concat(iconv.encode(temp, encoding));

	// check for "tailingLine" flag
	if (
		typeof m_options.tailingLine === "number" &&
		m_options.tailingLine > 0
	) {
		// Feed exact number of lines (1–255) using ESC d n
		const n = Math.min(Math.max(m_options.tailingLine, 1), 255);
		bytes.concat(Buffer.from([27, 100, n]));
	} else if (m_options.tailingLine === true) {
		// Legacy behaviour: 5 blank lines
		bytes.concat(options_controller.tailingLine);
	}

	// check for "cut" flag
	if (
		typeof m_options.cut === "boolean" &&
		m_options.cut &&
		options_controller.cut
	) {
		bytes.concat(options_controller.cut);
	}

	// check for "beep" flag
	if (
		typeof m_options.beep === "boolean" &&
		m_options.beep &&
		options_controller.beep
	) {
		bytes.concat(options_controller.beep);
	}

	return bytes.toBuffer();
}

// ── Public helpers (re-exported for advanced usage) ─────────────────────────

export { sizeBytes, lineSpacingBytes, charSpacingBytes };
