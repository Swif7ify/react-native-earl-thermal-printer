import { Buffer } from "buffer";
import * as iconv from "iconv-lite";
// import * as Jimp from "jimp";

import BufferHelper from "./buffer-helper";

// ── Printer initialization ──────────────────────────────────────────────────

const init_printer_bytes = Buffer.from([27, 64]); // ESC @

// ── Alignment ───────────────────────────────────────────────────────────────

const l_start_bytes = Buffer.from([27, 97, 0]); // ESC a 0 — Left
const l_end_bytes = Buffer.from([]);
const c_start_bytes = Buffer.from([27, 97, 1]); // ESC a 1 — Center
const c_end_bytes = Buffer.from([]);
const r_start_bytes = Buffer.from([27, 97, 2]); // ESC a 2 — Right
const r_end_bytes = Buffer.from([]);

// ── Spacing ─────────────────────────────────────────────────────────────────

const default_space_bytes = Buffer.from([27, 50]); // ESC 2 — Default line spacing

// ── Reset (sent after every newline) ────────────────────────────────────────

const reset_bytes = Buffer.from([
	27,
	97,
	0, // ESC a 0  — Left align
	29,
	33,
	0, // GS ! 0   — Normal character size
	27,
	33,
	0, // ESC ! 0  — Normal print mode
	28,
	33,
	0, // FS ! 0   — Normal CJK mode
	27,
	45,
	0, // ESC - 0  — Underline off
	27,
	69,
	0, // ESC E 0  — Bold/emphasis off
	29,
	66,
	0, // GS B 0   — Reverse off
	27,
	123,
	0, // ESC { 0 — Upside-down off
	27,
	50, // ESC 2       — Default line spacing
]);

// ── Legacy formatting (ESC ! / FS !) ────────────────────────────────────────
//    These use the master print-mode byte; kept for backward compatibility.

const m_start_bytes = Buffer.from([27, 33, 16, 28, 33, 8]); // Double-height
const m_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);
const b_start_bytes = Buffer.from([27, 33, 48, 28, 33, 12]); // Double-height + double-width
const b_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);
const d_start_bytes = Buffer.from([27, 33, 32, 28, 33, 4]); // Double-width
const d_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);
const db_start_bytes = Buffer.from([27, 33, 40, 28, 33, 12]); // Double-width + bold emphasis
const db_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);

// ── Legacy alignment + size combos ──────────────────────────────────────────

const cm_start_bytes = Buffer.from([27, 97, 1, 27, 33, 16, 28, 33, 8]);
const cm_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);
const cb_start_bytes = Buffer.from([27, 97, 1, 27, 33, 48, 28, 33, 12]);
const cb_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);
const cd_start_bytes = Buffer.from([27, 97, 1, 27, 33, 32, 28, 33, 4]);
const cd_end_bytes = Buffer.from([27, 33, 0, 28, 33, 0]);

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
//    Width multiplier = bits 0-3 (0–7 → 1×–8×)
//    Height multiplier = bits 4-7 (0–7 → 1×–8×)

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
const beep_bytes = Buffer.from([27, 66, 3, 2]);
const line_bytes = Buffer.from([10, 10, 10, 10, 10]);

// ── Cash drawer ─────────────────────────────────────────────────────────────

const drawer_bytes = Buffer.from([27, 112, 0, 60, 120]); // ESC p 0 60 120

// ── Encoding ────────────────────────────────────────────────────────────────

const encoding_mappings_bytes: { [key: string]: Buffer } = {
	// single byte encodings
	CP437: Buffer.from([27, 116, 0]),
	// multiple bit encodings
	GB18030: Buffer.from([28, 38, 28, 67, 0]),
	BIG5: Buffer.from([28, 38, 28, 67, 1]),
	UTF8: Buffer.from([28, 38, 28, 67, 255]),
};

const options_controller = {
	cut: cut_bytes,
	beep: beep_bytes,
	tailingLine: line_bytes,
	encoding: encoding_mappings_bytes,
};

// ── Static tag → bytes map ──────────────────────────────────────────────────
//    Tags are matched longest-first at parse time to avoid prefix collisions.

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
	"<TAB>": Buffer.from([9]),
	"<RESET>": reset_bytes,
};

// Sort tag keys longest-first so that e.g. "</BOLD>" is tried before "</B>"
const sorted_tags = Object.keys(controller).sort((a, b) => b.length - a.length);

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
		// <RAW:HH,HH,...> — send raw hex bytes
		regex: /^<RAW:([0-9A-Fa-f,]+)>/,
		handler: (m) => {
			const hexParts = m[1].split(",").filter(Boolean);
			return Buffer.from(hexParts.map((h) => parseInt(h, 16)));
		},
	},
];

// ── Options ─────────────────────────────────────────────────────────────────

type IOptions = {
	beep: boolean;
	cut: boolean;
	tailingLine: boolean;
	encoding: string;
};

const default_options: IOptions = {
	beep: false,
	cut: true,
	tailingLine: true,
	encoding: "UTF8",
};

// ── Main text → buffer converter ────────────────────────────────────────────

export function exchange_text(text: string, options: IOptions): Buffer {
	const m_options = options || default_options;

	let bytes = new BufferHelper();
	bytes.concat(init_printer_bytes);

	// set encoding
	if (
		m_options["encoding"] &&
		options_controller["encoding"][m_options["encoding"]]
	) {
		bytes.concat(options_controller["encoding"][m_options["encoding"]]);
	}

	bytes.concat(default_space_bytes);

	let temp = "";
	for (let i = 0; i < text.length; i++) {
		let ch = text[i];
		switch (ch) {
			case "<": {
				bytes.concat(iconv.encode(temp, m_options.encoding));
				temp = "";

				const remaining = text.substring(i);

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
				bytes.concat(iconv.encode(temp, m_options.encoding));
				bytes.concat(reset_bytes);
				temp = "";
				break;
			default:
				temp = `${temp}${ch}`;
				break;
		}
	}
	temp.length && bytes.concat(iconv.encode(temp, m_options.encoding));

	// check for "tailingLine" flag
	if (
		typeof m_options["tailingLine"] === "boolean" &&
		options_controller["tailingLine"]
	) {
		bytes.concat(options_controller["tailingLine"]);
	}

	// check for "cut" flag
	if (typeof m_options["cut"] === "boolean" && options_controller["cut"]) {
		bytes.concat(options_controller["cut"]);
	}

	// check for "beep" flag
	if (typeof m_options["beep"] === "boolean" && options_controller["beep"]) {
		bytes.concat(options_controller["beep"]);
	}

	return bytes.toBuffer();
}

// ── Public helpers (re-exported for advanced usage) ─────────────────────────

export { sizeBytes, lineSpacingBytes, charSpacingBytes };

// export async function exchange_image(
//   imagePath: string,
//   threshold: number
// ): Promise<Buffer> {
//   let bytes = new BufferHelper();

//   try {
//     // need to find other solution cause jimp is not working in RN
//     const raw_image = await Jimp.read(imagePath);
//     const img = raw_image.resize(250, 250).quality(60).greyscale();

//     let hex;
//     const nl = img.bitmap.width % 256;
//     const nh = Math.round(img.bitmap.width / 256);

//     // data
//     const data = Buffer.from([0, 0, 0]);
//     const line = Buffer.from([10]);
//     for (let i = 0; i < Math.round(img.bitmap.height / 24) + 1; i++) {
//       // ESC * m nL nH bitmap
//       let header = Buffer.from([27, 42, 33, nl, nh]);
//       bytes.concat(header);
//       for (let j = 0; j < img.bitmap.width; j++) {
//         data[0] = data[1] = data[2] = 0; // Clear to Zero.
//         for (let k = 0; k < 24; k++) {
//           if (i * 24 + k < img.bitmap.height) {
//             // if within the BMP size
//             hex = img.getPixelColor(j, i * 24 + k);
//             if (Jimp.intToRGBA(hex).r <= threshold) {
//               data[Math.round(k / 8)] += 128 >> k % 8;
//             }
//           }
//         }
//         const dit = Buffer.from([data[0], data[1], data[2]]);
//         bytes.concat(dit);
//       }
//       bytes.concat(line);
//     } // data
//   } catch (error) {
//     console.log(error);
//   }
//   return bytes.toBuffer();
// }
