import { Buffer } from "buffer";
import * as iconv from "iconv-lite";
import {
	exchange_text,
	formatColumns,
	barcodeBytes,
	qrCodeBytes,
	cashDrawerBytes,
	buzzerBytes,
	cutPaperBytes,
	sanitizePrinterText,
	BarcodeOptions,
	QRCodeOptions,
	TableColumn,
	IOptions,
} from "./EPToolkit";

export type Alignment = "left" | "center" | "right";
export type TextSize =
	| "normal"
	| "1x"
	| "2x"
	| "3x"
	| "4x"
	| "double-width"
	| "double-height";

export interface TextOptions {
	align?: Alignment;
	bold?: boolean;
	underline?: boolean | 1 | 2;
	invert?: boolean;
	size?: TextSize;
	font?: "A" | "B";
}

export interface ColumnItem {
	text: string;
	width: number; // Ratio (0.0–1.0) or character count
	align?: Alignment;
}

export interface ReceiptBuilderOptions {
	encoding?: string;
	paperWidth?: 32 | 42 | 48 | number; // 32 for 58mm, 42/48 for 80mm
}

/**
 * Fluent, chainable builder for generating ESC/POS thermal receipt data.
 *
 * Example:
 * ```ts
 * const receipt = new ReceiptBuilder({ paperWidth: 32 })
 *   .align('center')
 *   .textLine('MY STORE', { bold: true, size: '2x' })
 *   .divider('-')
 *   .table([
 *     { text: 'Espresso', width: 0.5 },
 *     { text: '1', width: 0.2, align: 'center' },
 *     { text: '$3.50', width: 0.3, align: 'right' }
 *   ])
 *   .divider('=')
 *   .textLine('TOTAL: $3.50', { align: 'right', bold: true })
 *   .feed(2)
 *   .barcode('123456789012', { type: 'CODE128' })
 *   .cut()
 *   .build();
 * ```
 */
export class ReceiptBuilder {
	private chunks: Buffer[] = [];
	private encoding: string = "UTF8";
	private paperWidth: number = 32;

	constructor(options?: ReceiptBuilderOptions) {
		if (options?.encoding) this.encoding = options.encoding;
		if (options?.paperWidth) this.paperWidth = options.paperWidth;
		// Initialize printer ESC @
		this.chunks.push(Buffer.from([27, 64]));
	}

	/**
	 * Append raw ESC/POS Buffer or byte array.
	 */
	public raw(bytes: Buffer | number[]): this {
		this.chunks.push(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
		return this;
	}

	/**
	 * Set text alignment (left, center, right).
	 */
	public align(alignment: Alignment): this {
		const pos = alignment === "center" ? 1 : alignment === "right" ? 2 : 0;
		this.chunks.push(Buffer.from([27, 97, pos])); // ESC a n
		return this;
	}

	/**
	 * Enable or disable bold emphasis.
	 */
	public bold(enable: boolean = true): this {
		this.chunks.push(Buffer.from([27, 69, enable ? 1 : 0])); // ESC E n
		return this;
	}

	/**
	 * Enable or disable underline (1-dot or 2-dot thick).
	 */
	public underline(mode: boolean | 1 | 2 = true): this {
		const val = mode === 2 ? 2 : mode ? 1 : 0;
		this.chunks.push(Buffer.from([27, 45, val])); // ESC - n
		return this;
	}

	/**
	 * Enable or disable reverse printing (white text on black background).
	 */
	public invert(enable: boolean = true): this {
		this.chunks.push(Buffer.from([29, 66, enable ? 1 : 0])); // GS B n
		return this;
	}

	/**
	 * Select Font A (default 12x24) or Font B (compact 9x17).
	 */
	public font(f: "A" | "B"): this {
		this.chunks.push(Buffer.from([27, 77, f === "B" ? 1 : 0])); // ESC M n
		return this;
	}

	/**
	 * Set text sizing multiplier.
	 */
	public size(s: TextSize): this {
		switch (s) {
			case "2x":
			case "double-width":
			case "double-height":
				this.chunks.push(Buffer.from([29, 33, 17])); // 2x2
				break;
			case "3x":
				this.chunks.push(Buffer.from([29, 33, 34])); // 3x3
				break;
			case "4x":
				this.chunks.push(Buffer.from([29, 33, 51])); // 4x4
				break;
			case "1x":
			case "normal":
			default:
				this.chunks.push(Buffer.from([29, 33, 0])); // 1x1 normal
				break;
		}
		return this;
	}

	/**
	 * Reset all text formatting to defaults (normal size, unbolded, left aligned).
	 */
	public reset(): this {
		this.chunks.push(
			Buffer.from([
				27, 97, 0, // Left align
				29, 33, 0, // Normal size
				27, 45, 0, // Underline off
				27, 69, 0, // Bold off
				29, 66, 0, // Invert off
				27, 123, 0, // Upside-down off
			]),
		);
		return this;
	}

	/**
	 * Print text inline without automatic trailing newline.
	 */
	public text(content: string, options?: TextOptions): this {
		if (options?.align) this.align(options.align);
		if (options?.bold !== undefined) this.bold(options.bold);
		if (options?.underline !== undefined) this.underline(options.underline);
		if (options?.invert !== undefined) this.invert(options.invert);
		if (options?.size) this.size(options.size);
		if (options?.font) this.font(options.font);

		const sanitized = sanitizePrinterText(content);
		this.chunks.push(iconv.encode(sanitized, this.encoding));
		return this;
	}

	/**
	 * Print text line with automatic newline.
	 */
	public textLine(content: string = "", options?: TextOptions): this {
		this.text(content, options);
		this.chunks.push(Buffer.from([10])); // LF
		if (options) {
			this.reset();
		}
		return this;
	}

	/**
	 * Print a horizontal divider rule (e.g. '----------------' or '================').
	 */
	public divider(char: string = "-", width?: number): this {
		const targetWidth = width || this.paperWidth;
		const line = char.repeat(Math.ceil(targetWidth / (char.length || 1))).slice(0, targetWidth);
		return this.textLine(line);
	}

	/**
	 * Print a double-line divider rule ('================').
	 */
	public doubleDivider(width?: number): this {
		return this.divider("=", width);
	}

	/**
	 * Print formatted multi-column table row (e.g. Item, Qty, Price).
	 */
	public table(columns: ColumnItem[], customWidth?: number): this {
		const width = customWidth || this.paperWidth;
		const tableColumns: TableColumn[] = columns.map((c) => ({
			text: sanitizePrinterText(c.text),
			width: c.width,
			align: c.align,
		}));
		const formatted = formatColumns(tableColumns, width);
		return this.textLine(formatted);
	}

	/**
	 * Print a 2-column key-value row with automatic padding.
	 * Example: `builder.keyValue('Subtotal:', '$25.00')`
	 */
	public keyValue(key: string, value: string, customWidth?: number): this {
		return this.table(
			[
				{ text: key, width: 0.6, align: "left" },
				{ text: value, width: 0.4, align: "right" },
			],
			customWidth,
		);
	}

	/**
	 * Feed paper N lines (1–255).
	 */
	public feed(lines: number = 1): this {
		const n = Math.min(Math.max(lines, 1), 255);
		this.chunks.push(Buffer.from([27, 100, n])); // ESC d n
		return this;
	}

	/**
	 * Print native 1D Barcode (CODE128, CODE39, EAN13, EAN8, UPC-A, etc.).
	 */
	public barcode(data: string, options?: BarcodeOptions): this {
		this.align("center");
		this.chunks.push(barcodeBytes(data, options));
		this.chunks.push(Buffer.from([10]));
		this.align("left");
		return this;
	}

	/**
	 * Print native 2D QR Code using universal ESC/POS raster bitmap command.
	 */
	public qrCode(data: string, options?: QRCodeOptions): this {
		this.chunks.push(qrCodeBytes(data, options));
		this.chunks.push(Buffer.from([10]));
		return this;
	}

	/**
	 * Sound the internal buzzer/beeper.
	 */
	public beep(times: number = 2, duration: number = 2): this {
		this.chunks.push(buzzerBytes(times, duration));
		return this;
	}

	/**
	 * Pulse cash drawer kick-out (pin 2 or pin 5).
	 */
	public openDrawer(pin: 2 | 5 = 2): this {
		this.chunks.push(cashDrawerBytes(pin));
		return this;
	}

	/**
	 * Cut paper (full or partial).
	 */
	public cut(options?: { partial?: boolean; feed?: number }): this {
		const partial = options?.partial ?? false;
		const feed = options?.feed ?? 3;
		this.chunks.push(cutPaperBytes(partial, feed));
		return this;
	}

	/**
	 * Embed legacy XML-style formatted string (e.g. `<C><B>Store</B></C>`).
	 */
	public xml(xmlText: string, options?: IOptions): this {
		this.chunks.push(exchange_text(xmlText, options));
		return this;
	}

	/**
	 * Build final ESC/POS Base64 string ready to pass directly to `printRawData(...)`.
	 */
	public toBase64(): string {
		return this.toBuffer().toString("base64");
	}

	/**
	 * Build raw ESC/POS byte Buffer.
	 */
	public toBuffer(): Buffer {
		return Buffer.concat(this.chunks);
	}

	/**
	 * Alias for `toBase64()`.
	 */
	public build(): string {
		return this.toBase64();
	}
}
