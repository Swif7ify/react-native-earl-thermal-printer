import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	LayoutAnimation,
	PermissionsAndroid,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	UIManager,
	View,
} from "react-native";
import { BLEPrinter, IBLEPrinter } from "react-native-earl-thermal-printer";

// Enable LayoutAnimation for Android
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Demo print payloads ──────────────────────────────────────────────────────

const DEMO_TEXT_STYLES =
	"<C><BOLD>--- Text Styles ---</BOLD></C>\n" +
	"Normal text\n" +
	"<BOLD>Bold emphasis (BOLD)</BOLD>\n" +
	"<U>Thin underline (U)</U>\n" +
	"<U2>Thick underline (U2)</U2>\n" +
	"<REV> Reverse: white on black </REV>\n" +
	"<UPDOWN>Upside-down text</UPDOWN>\n" +
	"<FONT_B>Font B — smaller/condensed<FONT_A>\n" +
	"Back to Font A (default)\n";

const DEMO_SIZE_PRESETS =
	"<C><BOLD>--- Size Presets ---</BOLD></C>\n" +
	"<W2>Width x2 (W2)</W2>\n" +
	"<W3>Width x3 (W3)</W3>\n" +
	"<H2>Height x2 (H2)</H2>\n" +
	"<H3>Height x3 (H3)</H3>\n" +
	"<X2>Both x2 (X2)</X2>\n" +
	"<X3>Both x3 (X3)</X3>\n" +
	"<X4>Both x4 (X4)</X4>\n";

const DEMO_CUSTOM_SIZE =
	"<C><BOLD>--- Custom Size (FS:W,H) ---</BOLD></C>\n" +
	"<FS:1,1>1x1 normal</FS>\n" +
	"<FS:2,1>2x wide</FS>\n" +
	"<FS:1,2>1x2 tall</FS>\n" +
	"<FS:2,2>2x2 big</FS>\n" +
	"<FS:3,3>3x3 larger</FS>\n" +
	"<FS:4,4>4x4 huge</FS>\n";

const DEMO_ALIGNMENT =
	"<C><BOLD>--- Alignment ---</BOLD></C>\n" +
	"<L>Left aligned (L)</L>\n" +
	"<C>Center aligned (C)</C>\n" +
	"<R>Right aligned (R)</R>\n" +
	"<C><U>Center + underline</U></C>\n" +
	"<R><BOLD>Right + bold</BOLD></R>\n";

const DEMO_SPACING =
	"<C><BOLD>--- Spacing Control ---</BOLD></C>\n" +
	"Default line spacing\n" +
	"Default line spacing\n" +
	"<LINESPC:60>Tight lines (60 dots)\n" +
	"Tight lines (60 dots)\n" +
	"</LINESPC><LINESPC:120>Loose lines (120 dots)\n" +
	"Loose lines (120 dots)\n" +
	"</LINESPC>Back to default\n" +
	"<CHARSPC:8>W i d e   c h a r s</CHARSPC>\n" +
	"Normal char spacing\n";

const DEMO_FEED_CUT =
	"<C><BOLD>--- Feed & Partial Cut ---</BOLD></C>\n" +
	"Line 1\n" +
	"<FEED:2>" +
	"After 2 blank fed lines\n" +
	"<FEED:1>" +
	"After 1 more blank line\n" +
	"--- partial cut above ---\n" +
	"<PARTCUT>" +
	"After partial cut\n";

const DEMO_FULL_RECEIPT =
	"<C><X2>CAFE EARL</X2></C>\n" +
	"<C><FONT_B>123 Brew St, Melbourne VIC 3000</FONT_A></C>\n" +
	"<C>Tel: (03) 9000-0000</C>\n" +
	"<C><U2>================================</U2></C>\n" +
	"<BOLD>Table 7<TAB><TAB>Dine-In</BOLD>\n" +
	"Order #0042\n" +
	"<U>--------------------------------</U>\n" +
	"<FONT_B>1x Flat White         $4.50\n" +
	"1x Long Black         $4.00\n" +
	"2x Banana Bread       $9.00\n" +
	"1x Avo Toast         $14.00<FONT_A>\n" +
	"<U>--------------------------------</U>\n" +
	"Subtotal<TAB><TAB>  $31.50\n" +
	"GST (10%)<TAB><TAB>   $3.15\n" +
	"<U>--------------------------------</U>\n" +
	"<R><FS:2,2>$34.65</FS></R>\n" +
	"<C><BOLD>TOTAL  $34.65</BOLD></C>\n" +
	"<U>--------------------------------</U>\n" +
	"<C><REV>  VISA •••• 4242  APPROVED  </REV></C>\n" +
	"<C><FONT_B>Thank you for visiting Cafe Earl!<FONT_A></C>\n" +
	"<C><FONT_B>cafe-earl.com.au<FONT_A></C>\n";

// ── Component ────────────────────────────────────────────────────────────────

export default function ThermalPrinterTest() {
	const [printers, setPrinters] = useState<IBLEPrinter[]>([]);
	const [currentPrinter, setCurrentPrinter] = useState<IBLEPrinter | null>(
		null,
	);
	const [isScanning, setIsScanning] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [printing, setPrinting] = useState<string | null>(null);

	// Custom print inputs
	const [qrValue, setQrValue] = useState(
		"https://www.npmjs.com/package/react-native-earl-thermal-printer",
	);
	const [imageUrl, setImageUrl] = useState(
		"https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200&auto=format&fit=crop",
	);
	const [customText, setCustomText] = useState(
		"<C><X2>STORE NAME</X2></C>\n" +
			"<C><U>================================</U></C>\n" +
			"<FONT_B>Item 1               $10.00\n" +
			"Item 2                $5.00<FONT_A>\n" +
			"<U>--------------------------------</U>\n" +
			"<R><FS:2,2>$15.00</FS></R>\n" +
			"<C><BOLD>TOTAL  $15.00</BOLD></C>\n" +
			"<C><REV> THANK YOU! </REV></C>\n",
	);

	useEffect(() => {
		BLEPrinter.init()
			.then(() => console.log("Printer initialized"))
			.catch((err) => console.warn("Init failed:", err));
	}, []);

	const toggleDropdown = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setIsDropdownOpen(!isDropdownOpen);
	};

	const requestPermissions = async () => {
		if (Platform.OS === "android" && Platform.Version >= 31) {
			try {
				const granted = await PermissionsAndroid.requestMultiple([
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
					PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				]);
				if (
					granted["android.permission.BLUETOOTH_CONNECT"] ===
					PermissionsAndroid.RESULTS.GRANTED
				) {
					scanDevices();
				} else {
					Alert.alert(
						"Permission denied",
						"Bluetooth permissions are required.",
					);
				}
			} catch (err) {
				console.warn(err);
			}
		} else {
			scanDevices();
		}
	};

	const scanDevices = () => {
		setIsScanning(true);
		BLEPrinter.getDeviceList()
			.then((devices) => {
				setPrinters(devices);
				setIsScanning(false);
			})
			.catch((err) => {
				setIsScanning(false);
				Alert.alert("Scan Failed", String(err));
			});
	};

	const connectPrinter = (printer: IBLEPrinter) => {
		BLEPrinter.connectPrinter(printer.inner_mac_address)
			.then(() => {
				setCurrentPrinter(printer);
				Alert.alert("Connected", `Connected to ${printer.device_name}`);
				toggleDropdown();
			})
			.catch((err) => Alert.alert("Connection Failed", String(err)));
	};

	/** Generic print helper — shows a loading label while printing. */
	const doPrint = async (label: string, fn: () => Promise<void>) => {
		if (!currentPrinter) {
			Alert.alert("No Printer", "Please connect to a printer first.");
			return;
		}
		setPrinting(label);
		try {
			await fn();
		} catch (err) {
			Alert.alert("Print Error", String(err));
		} finally {
			setPrinting(null);
		}
	};

	const printCustom = () =>
		doPrint("Custom", async () => {
			if (imageUrl.trim()) await BLEPrinter.printImage(imageUrl.trim());
			if (qrValue.trim()) await BLEPrinter.printQrCode(qrValue.trim());
			await BLEPrinter.printBill(customText);
		});

	// ── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.container}>
				{/* HEADER */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>React Native</Text>
					<Text style={styles.headerSubtitle}>
						Earl Thermal Printer
					</Text>
					<Text style={styles.versionText}>v1.0.0 • TurboModule</Text>
				</View>

				{/* ── SECTION 1: PRINTER SELECTION ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>1. Select Printer</Text>

					<TouchableOpacity
						style={styles.dropdownHeader}
						onPress={toggleDropdown}
						activeOpacity={0.7}
					>
						<Text style={styles.dropdownHeaderText}>
							{currentPrinter
								? currentPrinter.device_name
								: "Select a device..."}
						</Text>
						<Text style={styles.dropdownIcon}>
							{isDropdownOpen ? "▲" : "▼"}
						</Text>
					</TouchableOpacity>

					{isDropdownOpen && (
						<View style={styles.dropdownBody}>
							<TouchableOpacity
								style={styles.scanButton}
								onPress={requestPermissions}
								disabled={isScanning}
							>
								<Text style={styles.scanButtonText}>
									{isScanning
										? "Scanning nearby..."
										: "↻ Scan for Devices"}
								</Text>
							</TouchableOpacity>

							{isScanning && (
								<ActivityIndicator
									style={{ marginVertical: 10 }}
									color="#007AFF"
								/>
							)}

							{printers.length > 0
								? printers.map((item) => (
										<TouchableOpacity
											key={item.inner_mac_address}
											style={[
												styles.deviceItem,
												currentPrinter?.inner_mac_address ===
													item.inner_mac_address &&
													styles.deviceItemSelected,
											]}
											onPress={() => connectPrinter(item)}
										>
											<Text style={styles.deviceName}>
												{item.device_name ||
													"Unknown Device"}
											</Text>
											<Text style={styles.deviceMac}>
												{item.inner_mac_address}
											</Text>
										</TouchableOpacity>
									))
								: !isScanning && (
										<Text style={styles.emptyText}>
											No devices found. Tap Scan.
										</Text>
									)}
						</View>
					)}

					<Text style={styles.statusText}>
						Status:{" "}
						{currentPrinter ? "✅ Connected" : "❌ Disconnected"}
					</Text>
				</View>

				{/* ── SECTION 2: FORMAT DEMOS ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						2. Formatting Demos
					</Text>
					<Text style={styles.sectionHint}>
						Each button prints a dedicated demo strip.
					</Text>

					<DemoButton
						label="Text Styles"
						sub="BOLD · U · U2 · REV · UPDOWN · Font A/B"
						color="#5C6BC0"
						printing={printing}
						onPress={() =>
							doPrint("Text Styles", () =>
								BLEPrinter.printBill(DEMO_TEXT_STYLES),
							)
						}
					/>

					<DemoButton
						label="Size Presets"
						sub="W2 · W3 · H2 · H3 · X2 · X3 · X4"
						color="#26A69A"
						printing={printing}
						onPress={() =>
							doPrint("Size Presets", () =>
								BLEPrinter.printBill(DEMO_SIZE_PRESETS),
							)
						}
					/>

					<DemoButton
						label="Custom Font Size"
						sub="<FS:W,H> — any 1×–8× combo"
						color="#EF5350"
						printing={printing}
						onPress={() =>
							doPrint("Custom Font Size", () =>
								BLEPrinter.printBill(DEMO_CUSTOM_SIZE),
							)
						}
					/>

					<DemoButton
						label="Alignment"
						sub="L · C · R combined with styles"
						color="#AB47BC"
						printing={printing}
						onPress={() =>
							doPrint("Alignment", () =>
								BLEPrinter.printBill(DEMO_ALIGNMENT),
							)
						}
					/>

					<DemoButton
						label="Spacing Control"
						sub="LINESPC · CHARSPC"
						color="#FF7043"
						printing={printing}
						onPress={() =>
							doPrint("Spacing", () =>
								BLEPrinter.printBill(DEMO_SPACING),
							)
						}
					/>

					<DemoButton
						label="Feed & Partial Cut"
						sub="FEED:N · PARTCUT"
						color="#8D6E63"
						printing={printing}
						onPress={() =>
							doPrint("Feed & Cut", () =>
								BLEPrinter.printBill(DEMO_FEED_CUT),
							)
						}
					/>

					<DemoButton
						label="Full Receipt Demo"
						sub="All features combined in a real receipt"
						color="#007AFF"
						printing={printing}
						onPress={() =>
							doPrint("Full Receipt", () =>
								BLEPrinter.printBill(DEMO_FULL_RECEIPT),
							)
						}
					/>
				</View>

				{/* ── SECTION 3: QR & IMAGE ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>3. QR & Image</Text>

					<DemoButton
						label="Print QR Code"
						sub={qrValue.slice(0, 40) + (qrValue.length > 40 ? "…" : "")}
						color="#2E7D32"
						printing={printing}
						onPress={() =>
							doPrint("QR", () =>
								BLEPrinter.printBill(
									"<C><BOLD>QR Code Demo</BOLD></C>\n",
								).then(() =>
									BLEPrinter.printQrCode(qrValue, 250),
								),
							)
						}
					/>
					<Text style={styles.inputLabel}>QR Value:</Text>
					<TextInput
						style={styles.input}
						value={qrValue}
						onChangeText={setQrValue}
						placeholder="Enter QR content"
						autoCapitalize="none"
					/>

					<DemoButton
						label="Print Image"
						sub="Prints from the URL below"
						color="#F57C00"
						printing={printing}
						onPress={() =>
							doPrint("Image", () =>
								BLEPrinter.printImage(imageUrl, 300),
							)
						}
					/>
					<Text style={styles.inputLabel}>Image URL:</Text>
					<TextInput
						style={styles.input}
						value={imageUrl}
						onChangeText={setImageUrl}
						placeholder="https://..."
						autoCapitalize="none"
					/>
				</View>

				{/* ── SECTION 4: CUSTOM TEXT ── */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>4. Custom Text</Text>
					<Text style={styles.sectionHint}>
						Edit the text below — use any formatting tags directly.
					</Text>

					<TextInput
						style={[styles.input, styles.textArea]}
						value={customText}
						onChangeText={setCustomText}
						multiline
						numberOfLines={8}
					/>

					<TouchableOpacity
						style={[
							styles.printButton,
							!currentPrinter && styles.printButtonDisabled,
						]}
						onPress={printCustom}
						disabled={!currentPrinter || printing !== null}
					>
						<Text style={styles.printButtonText}>
							{printing === "Custom" ? "Printing…" : "PRINT CUSTOM"}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}

// ── DemoButton helper component ──────────────────────────────────────────────

function DemoButton({
	label,
	sub,
	color,
	onPress,
	printing,
}: {
	label: string;
	sub: string;
	color: string;
	onPress: () => void;
	printing: string | null;
}) {
	const isActive = printing === label;
	const isBusy = printing !== null;
	return (
		<TouchableOpacity
			style={[
				styles.demoButton,
				{ borderLeftColor: color },
				isBusy && styles.demoButtonBusy,
			]}
			onPress={onPress}
			disabled={isBusy}
			activeOpacity={0.7}
		>
			<View style={{ flex: 1 }}>
				<Text style={[styles.demoButtonLabel, { color }]}>{label}</Text>
				<Text style={styles.demoButtonSub}>{sub}</Text>
			</View>
			<Text style={[styles.demoButtonArrow, { color }]}>
				{isActive ? "…" : "▶"}
			</Text>
		</TouchableOpacity>
	);
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: { flex: 1, marginTop: 20, backgroundColor: "#f0f2f5" },
	container: { padding: 16, paddingBottom: 40 },

	header: { alignItems: "center", marginBottom: 24, marginTop: 10 },
	headerTitle: { fontSize: 18, fontWeight: "600", color: "#555" },
	headerSubtitle: { fontSize: 26, fontWeight: "bold", color: "#007AFF" },
	versionText: { fontSize: 12, color: "#aaa", marginTop: 4 },

	section: {
		backgroundColor: "#fff",
		padding: 16,
		borderRadius: 14,
		marginBottom: 16,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 4,
		color: "#222",
	},
	sectionHint: {
		fontSize: 12,
		color: "#999",
		marginBottom: 12,
	},

	// Dropdown
	dropdownHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 12,
		backgroundColor: "#fafafa",
	},
	dropdownHeaderText: { fontSize: 14, color: "#333", fontWeight: "500" },
	dropdownIcon: { fontSize: 12, color: "#666" },
	dropdownBody: {
		marginTop: 10,
		borderTopWidth: 1,
		borderTopColor: "#eee",
		paddingTop: 10,
	},
	scanButton: {
		backgroundColor: "#e3f2fd",
		padding: 10,
		borderRadius: 6,
		alignItems: "center",
		marginBottom: 10,
	},
	scanButtonText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },
	deviceItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderColor: "#eee",
		backgroundColor: "#fff",
	},
	deviceItemSelected: { backgroundColor: "#e8f5e9", borderColor: "#4caf50" },
	deviceName: { fontWeight: "500", color: "#333" },
	deviceMac: { fontSize: 10, color: "#888" },
	emptyText: {
		textAlign: "center",
		color: "#bbb",
		marginVertical: 10,
		fontSize: 12,
	},
	statusText: {
		marginTop: 14,
		fontWeight: "600",
		textAlign: "center",
		color: "#555",
		fontSize: 13,
	},

	// Demo buttons
	demoButton: {
		flexDirection: "row",
		alignItems: "center",
		borderLeftWidth: 4,
		borderRadius: 8,
		backgroundColor: "#fafafa",
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 10,
	},
	demoButtonBusy: { opacity: 0.45 },
	demoButtonLabel: { fontWeight: "700", fontSize: 14 },
	demoButtonSub: { fontSize: 11, color: "#888", marginTop: 2 },
	demoButtonArrow: { fontSize: 16, fontWeight: "bold", marginLeft: 8 },

	// Inputs
	inputLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: "#444",
		marginTop: 10,
		marginBottom: 5,
	},
	input: {
		borderWidth: 1,
		borderColor: "#e0e0e0",
		borderRadius: 8,
		padding: 10,
		backgroundColor: "#fff",
		fontSize: 13,
	},
	textArea: { height: 160, textAlignVertical: "top", fontFamily: "monospace" },

	// Print button
	printButton: {
		backgroundColor: "#007AFF",
		padding: 16,
		borderRadius: 10,
		alignItems: "center",
		marginTop: 12,
	},
	printButtonDisabled: { backgroundColor: "#ccc" },
	printButtonText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 15,
		letterSpacing: 1,
	},
});
