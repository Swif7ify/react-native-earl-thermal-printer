import React, { useEffect, useState } from "react";
import {
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
import {
	BLEPrinter,
	USBPrinter,
	NetPrinter,
	NetPrinterEventEmitter,
	RN_THERMAL_RECEIPT_PRINTER_EVENTS,
	ReceiptBuilder,
	IBLEPrinter,
	IUSBPrinter,
	INetPrinter,
} from "react-native-earl-thermal-printer";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

type PrinterType = "BLE" | "USB" | "NET";

// ── Demo Payload Presets ─────────────────────────────────────────────────────

const DEMO_XML_STYLES =
	"<C><BOLD>=== ESC/POS TEXT STYLES ===</BOLD></C>\n" +
	"Normal default text\n" +
	"<BOLD>Bold emphasis (BOLD)</BOLD>\n" +
	"<U>Thin 1-dot underline (U)</U>\n" +
	"<U2>Thick 2-dot underline (U2)</U2>\n" +
	"<REV> Reverse: White on Black </REV>\n" +
	"<UPDOWN>Upside-Down Text (UPDOWN)</UPDOWN>\n" +
	"<FONT_B>Font B — Compact 9x17 Font</FONT_B>\n" +
	"Back to Font A default 12x24\n";

const DEMO_XML_SIZES =
	"<C><BOLD>=== SIZE MULTIPLIERS ===</BOLD></C>\n" +
	"<W2>Width 2x (W2)</W2>\n" +
	"<W3>Width 3x (W3)</W3>\n" +
	"<H2>Height 2x (H2)</H2>\n" +
	"<H3>Height 3x (H3)</H3>\n" +
	"<X2>Both 2x (X2)</X2>\n" +
	"<X3>Both 3x (X3)</X3>\n" +
	"<X4>Both 4x (X4)</X4>\n" +
	"<FS:2,1>Custom FS:2,1</FS>\n" +
	"<FS:1,2>Custom FS:1,2</FS>\n" +
	"<FS:2,2>Custom FS:2,2</FS>\n";

const DEMO_XML_ALIGNMENT =
	"<C><BOLD>=== ALIGNMENT DEMO ===</BOLD></C>\n" +
	"<L>Left aligned text</L>\n" +
	"<C>Center aligned text</C>\n" +
	"<R>Right aligned text</R>\n" +
	"<C><U>Center + Underline</U></C>\n" +
	"<R><BOLD>Right + Bold</BOLD></R>\n" +
	"<C><REV> CENTER + REVERSE </REV></C>\n";

const DEMO_XML_SPACING =
	"<C><BOLD>=== SPACING CONTROLS ===</BOLD></C>\n" +
	"Normal line spacing (ESC 2)\n" +
	"<LINESPC:50>Tight line spacing (50 dots)\n" +
	"Tight line spacing second row\n" +
	"</LINESPC><LINESPC:100>Spacious line spacing (100 dots)\n" +
	"Spacious line spacing second row\n" +
	"</LINESPC><CHARSPC:6>W i d e   C h a r   S p a c i n g</CHARSPC>\n" +
	"Normal character spacing\n";

// ── Main Showcase Component ──────────────────────────────────────────────────

export default function ThermalPrinterShowcase() {
	const [activeTab, setActiveTab] = useState<PrinterType>("BLE");
	const [statusMessage, setStatusMessage] = useState<string>("Ready");
	const [printing, setPrinting] = useState<string | null>(null);

	// BLE State
	const [blePrinters, setBlePrinters] = useState<IBLEPrinter[]>([]);
	const [currentBle, setCurrentBle] = useState<IBLEPrinter | null>(null);
	const [isBleScanning, setIsBleScanning] = useState(false);

	// USB State
	const [usbPrinters, setUsbPrinters] = useState<IUSBPrinter[]>([]);
	const [currentUsb, setCurrentUsb] = useState<IUSBPrinter | null>(null);

	// Network State
	const [netPrinters, setNetPrinters] = useState<INetPrinter[]>([]);
	const [currentNet, setCurrentNet] = useState<INetPrinter | null>(null);
	const [netHost, setNetHost] = useState("192.168.1.100");
	const [netPort, setNetPort] = useState("9100");
	const [isNetScanning, setIsNetScanning] = useState(false);

	const [qrValue, setQrValue] = useState(
		"https://github.com/Swif7ify/react-native-earl-thermal-printer",
	);
	const [barcodeValue, setBarcodeValue] = useState("123456789012");
	const [imageUrl, setImageUrl] = useState(
		"https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200&auto=format&fit=crop",
	);
	const [paperWidth, setPaperWidth] = useState<32 | 48>(32);
	const [customXml, setCustomXml] = useState(
		"<C><X2>MY STORE</X2></C>\n" +
			"<C><BOLD>123 Artisan Street, Melbourne</BOLD></C>\n" +
			"================================\n" +
			"Item 1 (Qty 2)            $10.00\n" +
			"Item 2 (Qty 1)             $5.50\n" +
			"--------------------------------\n" +
			"<R><BOLD>SUBTOTAL: $15.50</BOLD></R>\n" +
			"<R><BOLD>TAX (10%):  $1.55</BOLD></R>\n" +
			"<R><X2>TOTAL: $17.05</X2></R>\n" +
			"================================\n" +
			"<C><BOLD>THANK YOU FOR SHOPPING!</BOLD></C>\n" +
			"<C><QR:5:https://github.com/Swif7ify/react-native-earl-thermal-printer></C>\n",
	);

	useEffect(() => {
		// Initialize BLE module on mount
		BLEPrinter.init()
			.then(() => setStatusMessage("BLE Printer module initialized"))
			.catch((e) => console.warn("BLE init:", e));

		// Listen to Net Printer discovery events
		const subSuccess = NetPrinterEventEmitter.addListener(
			RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNED_SUCCESS,
			(printers: INetPrinter[]) => {
				setNetPrinters(printers);
				setIsNetScanning(false);
				setStatusMessage(
					`Discovered ${printers.length} network printer(s)`,
				);
			},
		);
		const subScanning = NetPrinterEventEmitter.addListener(
			RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNING,
			(status: boolean) => setIsNetScanning(status),
		);

		return () => {
			subSuccess.remove();
			subScanning.remove();
		};
	}, []);

	// ── Bluetooth Connection ────────────────────────────────────────────────────

	const scanBle = async () => {
		if (Platform.OS === "android") {
			try {
				if (Platform.Version >= 31) {
					const permissions = [
						PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
						PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
					];
					const statuses =
						await PermissionsAndroid.requestMultiple(permissions);
					const connectGranted =
						statuses[
							PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
						] === PermissionsAndroid.RESULTS.GRANTED;
					if (!connectGranted) {
						const hasConnect = await PermissionsAndroid.check(
							PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
						);
						if (!hasConnect) {
							Alert.alert(
								"Bluetooth Permission Required",
								"Please grant 'Nearby Devices / Bluetooth' permission in App Settings to scan Bluetooth printers.",
							);
							return;
						}
					}
				} else {
					const hasLocation = await PermissionsAndroid.check(
						PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
					);
					if (!hasLocation) {
						await PermissionsAndroid.request(
							PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
						);
					}
				}
			} catch (e) {
				console.warn("BLE permission check error:", e);
			}
		}

		setIsBleScanning(true);
		setStatusMessage("Scanning paired Bluetooth devices...");
		try {
			const devices = await BLEPrinter.getDeviceList();
			setBlePrinters(devices);
			setStatusMessage(
				`Found ${devices.length} paired Bluetooth printer(s)`,
			);
			if (devices.length === 0) {
				Alert.alert(
					"No Paired Printers Found",
					"Please pair your Bluetooth thermal printer in Android Bluetooth Settings first, then tap Scan.",
				);
			}
		} catch (e: any) {
			const msg = e?.message || String(e);
			Alert.alert("Scan Failed", msg);
			setStatusMessage("BLE scan failed");
		} finally {
			setIsBleScanning(false);
		}
	};

	const connectBle = async (printer: IBLEPrinter) => {
		setStatusMessage(`Connecting to ${printer.device_name}...`);
		try {
			await BLEPrinter.connectPrinter(printer.inner_mac_address);
			setCurrentBle(printer);
			setStatusMessage(`Connected to ${printer.device_name}`);
			Alert.alert("Connected", `Connected to ${printer.device_name}`);
		} catch (e) {
			Alert.alert("Connection Failed", String(e));
			setStatusMessage("Connection failed");
		}
	};

	// ── USB Connection (Android) ────────────────────────────────────────────────

	const scanUsb = async () => {
		if (Platform.OS !== "android") {
			Alert.alert(
				"Unsupported",
				"USB printer support is available on Android only.",
			);
			return;
		}
		try {
			await USBPrinter.init();
			const devices = await USBPrinter.getDeviceList();
			setUsbPrinters(devices);
			setStatusMessage(`Found ${devices.length} USB device(s)`);
		} catch (e) {
			Alert.alert("USB Scan Error", String(e));
		}
	};

	const connectUsb = async (printer: IUSBPrinter) => {
		try {
			await USBPrinter.connectPrinter(
				printer.vendor_id,
				printer.product_id,
			);
			setCurrentUsb(printer);
			setStatusMessage(`Connected to USB ${printer.device_name}`);
			Alert.alert("Connected", `Connected to USB ${printer.device_name}`);
		} catch (e) {
			Alert.alert("USB Connect Error", String(e));
		}
	};

	// ── Network Connection (TCP/IP) ─────────────────────────────────────────────

	const scanNet = async () => {
		try {
			await NetPrinter.init();
			setIsNetScanning(true);
			setStatusMessage("Scanning subnet on port 9100...");
			await NetPrinter.getDeviceList();
		} catch (e) {
			Alert.alert("Net Scan Error", String(e));
			setIsNetScanning(false);
		}
	};

	const connectNet = async (host?: string, port?: number) => {
		const targetHost = host || netHost.trim();
		const targetPort = port || parseInt(netPort, 10) || 9100;
		setStatusMessage(`Connecting to TCP ${targetHost}:${targetPort}...`);
		try {
			await NetPrinter.init();
			const dev = await NetPrinter.connectPrinter(targetHost, targetPort);
			setCurrentNet(dev);
			setStatusMessage(`Connected to ${dev.host}:${dev.port}`);
			Alert.alert("Connected", `Connected to ${dev.host}:${dev.port}`);
		} catch (e) {
			Alert.alert("Net Connect Error", String(e));
			setStatusMessage("Network connect failed");
		}
	};

	// ── Generic Print Executor ──────────────────────────────────────────────────

	const isConnected =
		(activeTab === "BLE" && !!currentBle) ||
		(activeTab === "USB" && !!currentUsb) ||
		(activeTab === "NET" && !!currentNet);

	const executePrint = async (label: string, fn: () => Promise<void>) => {
		if (!isConnected) {
			Alert.alert(
				"No Connection",
				`Please connect to a ${activeTab} printer first.`,
			);
			return;
		}
		setPrinting(label);
		setStatusMessage(`Printing ${label}...`);
		try {
			await fn();
			setStatusMessage(`Successfully printed: ${label}`);
		} catch (e) {
			Alert.alert("Print Error", String(e));
			setStatusMessage(`Print failed: ${label}`);
		} finally {
			setPrinting(null);
		}
	};

	const sendRaw = (base64Payload: string) => {
		if (activeTab === "BLE") return BLEPrinter.printRawData(base64Payload);
		if (activeTab === "USB") return USBPrinter.printRawData(base64Payload);
		return NetPrinter.printRawData(base64Payload);
	};

	const sendText = (xmlString: string) => {
		if (activeTab === "BLE") return BLEPrinter.printBill(xmlString);
		if (activeTab === "USB") return USBPrinter.printBill(xmlString);
		return NetPrinter.printBill(xmlString);
	};

	// ── Technique 1: Fluent ReceiptBuilder Demos ────────────────────────────────

	const printCafeReceipt = () =>
		executePrint("Cafe Receipt", () => {
			const payload = new ReceiptBuilder({ paperWidth })
				.align("center")
				.textLine("CAFE EARL & ROASTERY", { bold: true, size: "2x" })
				.textLine("123 Artisan Alley, Melbourne")
				.textLine("Tel: (03) 9876-5432")
				.divider("-")
				.textLine("Order: #042 | Table: 7 | Dine-In", { bold: true })
				.divider("-")
				.table([
					{ text: "Item", width: 0.5 },
					{ text: "Qty", width: 0.2, align: "center" },
					{ text: "Price", width: 0.3, align: "right" },
				])
				.divider("-")
				.table([
					{ text: "Flat White (Oat)", width: 0.5 },
					{ text: "2", width: 0.2, align: "center" },
					{ text: "$9.00", width: 0.3, align: "right" },
				])
				.table([
					{ text: "Avocado Toast + Egg", width: 0.5 },
					{ text: "1", width: 0.2, align: "center" },
					{ text: "$14.50", width: 0.3, align: "right" },
				])
				.table([
					{ text: "Almond Croissant", width: 0.5 },
					{ text: "1", width: 0.2, align: "center" },
					{ text: "$5.00", width: 0.3, align: "right" },
				])
				.divider("=")
				.keyValue("Subtotal:", "$28.50")
				.keyValue("GST (10%):", "$2.85")
				.textLine("TOTAL: $31.35", {
					bold: true,
					size: "2x",
					align: "right",
				})
				.divider("-")
				.textLine("VISA **** 4242 (Approved)", { align: "center" })
				.feed(1)
				.barcode("ORD-2026-042", {
					type: "CODE128",
					height: 60,
					position: "below",
				})
				.feed(1)
				.qrCode("https://cafe-earl.com/receipt/042", { size: 6 })
				.textLine("Thank you for your visit!", { align: "center" })
				.cut({ partial: false, feed: 3 })
				.build();

			return sendRaw(payload);
		});

	const printWarehouseTicket = () =>
		executePrint("Warehouse Ticket", () => {
			const payload = new ReceiptBuilder({ paperWidth })
				.align("center")
				.textLine("WAREHOUSE DISPATCH", { bold: true, size: "2x" })
				.textLine("EXPRESS DELIVERY", { invert: true })
				.divider("=")
				.keyValue("Tracking #:", "TRK-998822")
				.keyValue("Carrier:", "DHL Express")
				.keyValue("Priority:", "URGENT")
				.divider("-")
				.textLine("Customer Details:", { bold: true })
				.textLine("John Doe - +1 (555) 019-2834")
				.textLine("4500 Sunset Blvd, Los Angeles, CA")
				.divider("-")
				.table([
					{ text: "SKU-882 (Widget A)", width: 0.7 },
					{ text: "x 10", width: 0.3, align: "right" },
				])
				.table([
					{ text: "SKU-991 (Widget B)", width: 0.7 },
					{ text: "x 4", width: 0.3, align: "right" },
				])
				.feed(1)
				.barcode("TRK99882233", {
					type: "CODE128",
					height: 70,
					position: "below",
				})
				.cut({ partial: false, feed: 3 })
				.build();

			return sendRaw(payload);
		});

	const printKitchenTicket = () =>
		executePrint("Kitchen KOT", () => {
			const payload = new ReceiptBuilder({ paperWidth })
				.align("center")
				.textLine("KITCHEN ORDER #109", { bold: true, size: "3x" })
				.textLine("SERVER: SARAH | TABLE: 14", { bold: true })
				.divider("=")
				.textLine("2x BURGER (NO ONIONS)", { bold: true, size: "2x" })
				.textLine("   * Extra Cheddar Cheese")
				.textLine("   * Medium Rare")
				.feed(1)
				.textLine("1x TRUFFLE FRIES", { bold: true, size: "2x" })
				.feed(1)
				.textLine("2x COKE ZERO", { size: "2x" })
				.divider("=")
				.beep(3, 2)
				.cut({ partial: true, feed: 3 })
				.build();

			return sendRaw(payload);
		});

	const printColumnsDemo = () =>
		executePrint("Table Columns", () => {
			const payload = new ReceiptBuilder({ paperWidth })
				.align("center")
				.textLine("--- MULTI-COLUMN TABLE DEMO ---", { bold: true })
				.feed(1)
				.table([
					{ text: "ITEM DESCRIPTION", width: 0.5, align: "left" },
					{ text: "QTY", width: 0.2, align: "center" },
					{ text: "PRICE", width: 0.3, align: "right" },
				])
				.divider("-")
				.table([
					{ text: "Organic Sourdough Loaf", width: 0.5, align: "left" },
					{ text: "2", width: 0.2, align: "center" },
					{ text: "$12.00", width: 0.3, align: "right" },
				])
				.table([
					{ text: "Avocado & Poached Eggs on Toast", width: 0.5, align: "left" },
					{ text: "1", width: 0.2, align: "center" },
					{ text: "$16.50", width: 0.3, align: "right" },
				])
				.table([
					{ text: "Flat White (Extra Oat Milk)", width: 0.5, align: "left" },
					{ text: "3", width: 0.2, align: "center" },
					{ text: "$13.50", width: 0.3, align: "right" },
				])
				.table([
					{ text: "Smoked Salmon Croissant", width: 0.5, align: "left" },
					{ text: "1", width: 0.2, align: "center" },
					{ text: "$8.50", width: 0.3, align: "right" },
				])
				.table([
					{ text: "Iced Matcha Latte (Large)", width: 0.5, align: "left" },
					{ text: "2", width: 0.2, align: "center" },
					{ text: "$11.00", width: 0.3, align: "right" },
				])
				.divider("=")
				.keyValue("Items Count:", "9 items")
				.keyValue("Subtotal:", "$61.50")
				.keyValue("Tax (10%):", "$6.15")
				.divider("-")
				.textLine("TOTAL: $67.65", { bold: true, size: "2x", align: "right" })
				.feed(1)
				.cut({ partial: false, feed: 3 })
				.build();

			return sendRaw(payload);
		});

	// ── Technique 2: Native ESC/POS Hardware Barcodes ───────────────────────────

	const printBarcodeDemo = (type: "CODE128" | "EAN13" | "CODE39" | "UPC-A") =>
		executePrint(`Barcode (${type})`, () => {
			const builder = new ReceiptBuilder({ paperWidth })
				.align("center")
				.textLine(`--- Barcode: ${type} ---`, { bold: true })
				.barcode(barcodeValue, {
					type,
					height: 70,
					width: 2,
					position: "below",
				})
				.feed(2)
				.cut()
				.build();
			return sendRaw(builder);
		});

	const printNativeQrDemo = () =>
		executePrint("Native QR Code", () => {
			const builder = new ReceiptBuilder({ paperWidth })
				.align("center")
				.textLine("--- Native ESC/POS QR Code ---", { bold: true })
				.qrCode(qrValue, { size: 7, errorCorrection: "M" })
				.textLine(
					qrValue.slice(0, 30) + (qrValue.length > 30 ? "…" : ""),
				)
				.feed(2)
				.cut()
				.build();
			return sendRaw(builder);
		});

	// ── Technique 3: Cash Drawer & Cutter Test ──────────────────────────────────

	const testCashDrawer = (pin: 2 | 5) =>
		executePrint(`Cash Drawer (Pin ${pin})`, () => {
			const builder = new ReceiptBuilder({ paperWidth })
				.openDrawer(pin)
				.textLine(`Cash Drawer pulse sent (Pin ${pin})`, {
					align: "center",
				})
				.build();
			return sendRaw(builder);
		});

	const testPaperCut = (partial: boolean) =>
		executePrint(partial ? "Partial Cut" : "Full Cut", () => {
			const builder = new ReceiptBuilder({ paperWidth })
				.textLine(
					`--- Paper Cut Test (${partial ? "Partial" : "Full"}) ---`,
					{ align: "center" },
				)
				.cut({ partial, feed: 4 })
				.build();
			return sendRaw(builder);
		});

	// ── Technique 4: Photorealistic Image Dithering ─────────────────────────────

	const printImageDemo = () =>
		executePrint("Image (Dithered)", () => {
			if (activeTab === "BLE")
				return BLEPrinter.printImage(imageUrl, 300);
			if (activeTab === "USB")
				return USBPrinter.printImage(imageUrl, 300);
			return NetPrinter.printImage(imageUrl, 300);
		});

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<View style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.container}>
				{/* ── HEADER ── */}
				<View style={styles.header}>
					<Text style={styles.headerSubtitle}>React Native</Text>
					<Text style={styles.headerTitle}>
						Thermal Printer Showcase
					</Text>
					<Text style={styles.badge}>
						TurboModules • New Architecture • v2.0.0
					</Text>
				</View>

				{/* ── CONNECTION TABS ── */}
				<View style={styles.tabContainer}>
					{(["BLE", "USB", "NET"] as PrinterType[]).map((tab) => (
						<TouchableOpacity
							key={tab}
							style={[
								styles.tabButton,
								activeTab === tab && styles.tabButtonActive,
							]}
							onPress={() => {
								LayoutAnimation.configureNext(
									LayoutAnimation.Presets.easeInEaseOut,
								);
								setActiveTab(tab);
							}}
						>
							<Text
								style={[
									styles.tabButtonText,
									activeTab === tab &&
										styles.tabButtonTextActive,
								]}
							>
								{tab === "BLE"
									? "Bluetooth"
									: tab === "USB"
										? "USB"
										: "Network (TCP)"}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* ── PRINTER SELECTION PANEL ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						1.{" "}
						{activeTab === "BLE"
							? "Bluetooth (BLE)"
							: activeTab === "USB"
								? "USB (Android)"
								: "Network (TCP/IP)"}{" "}
						Setup
					</Text>

					{activeTab === "BLE" && (
						<View>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={scanBle}
								disabled={isBleScanning}
							>
								<Text style={styles.actionBtnText}>
									{isBleScanning
										? "Scanning Paired Devices..."
										: "↻ Scan Bluetooth Devices"}
								</Text>
							</TouchableOpacity>

							{blePrinters.map((item) => (
								<TouchableOpacity
									key={item.inner_mac_address}
									style={[
										styles.deviceItem,
										currentBle?.inner_mac_address ===
											item.inner_mac_address &&
											styles.deviceSelected,
									]}
									onPress={() => connectBle(item)}
								>
									<Text style={styles.deviceName}>
										{item.device_name || "Thermal Printer"}
									</Text>
									<Text style={styles.deviceSub}>
										{item.inner_mac_address}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					{activeTab === "USB" && (
						<View>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={scanUsb}
							>
								<Text style={styles.actionBtnText}>
									↻ Scan Connected USB Printers
								</Text>
							</TouchableOpacity>

							{usbPrinters.map((item) => (
								<TouchableOpacity
									key={item.device_id}
									style={[
										styles.deviceItem,
										currentUsb?.device_id ===
											item.device_id &&
											styles.deviceSelected,
									]}
									onPress={() => connectUsb(item)}
								>
									<Text style={styles.deviceName}>
										{item.device_name}
									</Text>
									<Text style={styles.deviceSub}>
										VID: {item.vendor_id} | PID:{" "}
										{item.product_id}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					{activeTab === "NET" && (
						<View>
							<View style={styles.row}>
								<TextInput
									style={[
										styles.input,
										{ flex: 3, marginRight: 8 },
									]}
									value={netHost}
									onChangeText={setNetHost}
									placeholder="192.168.1.100"
									autoCapitalize="none"
								/>
								<TextInput
									style={[
										styles.input,
										{ flex: 1, marginRight: 8 },
									]}
									value={netPort}
									onChangeText={setNetPort}
									placeholder="9100"
									keyboardType="numeric"
								/>
								<TouchableOpacity
									style={[styles.actionBtn, { flex: 2 }]}
									onPress={() => connectNet()}
								>
									<Text style={styles.actionBtnText}>
										Connect
									</Text>
								</TouchableOpacity>
							</View>

							<TouchableOpacity
								style={[styles.actionBtn, { marginTop: 8 }]}
								onPress={scanNet}
								disabled={isNetScanning}
							>
								<Text style={styles.actionBtnText}>
									{isNetScanning
										? "Scanning Subnet..."
										: "↻ Discover Network Printers"}
								</Text>
							</TouchableOpacity>

							{netPrinters.map((item, idx) => (
								<TouchableOpacity
									key={idx}
									style={[
										styles.deviceItem,
										currentNet?.host === item.host &&
											styles.deviceSelected,
									]}
									onPress={() =>
										connectNet(item.host, item.port)
									}
								>
									<Text style={styles.deviceName}>
										{item.device_name || "Network Printer"}
									</Text>
									<Text style={styles.deviceSub}>
										{item.host}:{item.port}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}

					<View style={styles.statusBox}>
						<Text style={styles.statusText}>
							Status: {statusMessage}
						</Text>
					</View>
				</View>

				{/* ── PAPER WIDTH TOGGLE ── */}
				<View style={styles.paperWidthContainer}>
					<Text style={styles.paperWidthLabel}>
						Paper Roll Width:
					</Text>
					<TouchableOpacity
						style={[
							styles.widthChip,
							paperWidth === 32 && styles.widthChipActive,
						]}
						onPress={() => setPaperWidth(32)}
					>
						<Text
							style={[
								styles.widthChipText,
								paperWidth === 32 && styles.widthChipTextActive,
							]}
						>
							58mm (32 chars)
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.widthChip,
							paperWidth === 48 && styles.widthChipActive,
						]}
						onPress={() => setPaperWidth(48)}
					>
						<Text
							style={[
								styles.widthChipText,
								paperWidth === 48 && styles.widthChipTextActive,
							]}
						>
							80mm (48 chars)
						</Text>
					</TouchableOpacity>
				</View>

				{/* ── SECTION 2: FLUENT RECEIPTBUILDER TEMPLATES ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						2. Fluent ReceiptBuilder Templates
					</Text>
					<Text style={styles.cardSubtitle}>
						Real-world receipts built with chainable, type-safe API
					</Text>

					<ShowcaseButton
						title="Cafe & Restaurant Receipt"
						description="Header, 3-column table items, tax totals, barcode, and QR code"
						color="#2563eb"
						printing={printing}
						onPress={printCafeReceipt}
					/>

					<ShowcaseButton
						title="Warehouse Dispatch Ticket"
						description="Express delivery tag, SKU quantities, and Code39 barcode"
						color="#059669"
						printing={printing}
						onPress={printWarehouseTicket}
					/>

					<ShowcaseButton
						title="Kitchen Order Ticket (KOT)"
						description="3x large item headers, modifier notes, buzzer beeps & partial cut"
						color="#d97706"
						printing={printing}
						onPress={printKitchenTicket}
					/>

					<ShowcaseButton
						title="Multi-Column Table (printColumns)"
						description="Proportional column widths with auto word-wrapping (32/48 cols)"
						color="#8b5cf6"
						printing={printing}
						onPress={printColumnsDemo}
					/>
				</View>

				{/* ── SECTION 3: NATIVE HARDWARE BARCODES ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						3. Native ESC/POS Hardware Barcodes
					</Text>
					<Text style={styles.cardSubtitle}>
						Hardware generated crisp vector barcodes (no blurry
						bitmaps)
					</Text>

					<TextInput
						style={styles.input}
						value={barcodeValue}
						onChangeText={setBarcodeValue}
						placeholder="Enter barcode string"
					/>

					<View style={styles.buttonGrid}>
						<TouchableOpacity
							style={styles.gridBtn}
							onPress={() => printBarcodeDemo("CODE128")}
						>
							<Text style={styles.gridBtnText}>CODE128</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.gridBtn}
							onPress={() => printBarcodeDemo("CODE39")}
						>
							<Text style={styles.gridBtnText}>CODE39</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.gridBtn}
							onPress={() => printBarcodeDemo("EAN13")}
						>
							<Text style={styles.gridBtnText}>EAN13</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.gridBtn}
							onPress={() => printBarcodeDemo("UPC-A")}
						>
							<Text style={styles.gridBtnText}>UPC-A</Text>
						</TouchableOpacity>
					</View>

					<ShowcaseButton
						title="Native ESC/POS QR Code"
						description="Hardware QR command (GS ( k) with configurable error correction"
						color="#7c3aed"
						printing={printing}
						onPress={printNativeQrDemo}
					/>
				</View>

				{/* ── SECTION 4: HARDWARE CASH DRAWER & CUTTER ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						4. Cash Drawer & Paper Cutter
					</Text>
					<Text style={styles.cardSubtitle}>
						Send raw electrical pulses and feed/cut cycles
					</Text>

					<View style={styles.buttonGrid}>
						<TouchableOpacity
							style={[
								styles.gridBtn,
								{
									backgroundColor: "#ECFDF5",
									borderColor: "#10B981",
								},
							]}
							onPress={() => testCashDrawer(2)}
						>
							<Text
								style={[
									styles.gridBtnText,
									{ color: "#059669" },
								]}
							>
								Kick Drawer (Pin 2)
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.gridBtn,
								{
									backgroundColor: "#ECFDF5",
									borderColor: "#10B981",
								},
							]}
							onPress={() => testCashDrawer(5)}
						>
							<Text
								style={[
									styles.gridBtnText,
									{ color: "#059669" },
								]}
							>
								Kick Drawer (Pin 5)
							</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.buttonGrid}>
						<TouchableOpacity
							style={[
								styles.gridBtn,
								{
									backgroundColor: "#FEF2F2",
									borderColor: "#EF4444",
								},
							]}
							onPress={() => testPaperCut(false)}
						>
							<Text
								style={[
									styles.gridBtnText,
									{ color: "#DC2626" },
								]}
							>
								Full Paper Cut
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.gridBtn,
								{
									backgroundColor: "#FEF2F2",
									borderColor: "#EF4444",
								},
							]}
							onPress={() => testPaperCut(true)}
						>
							<Text
								style={[
									styles.gridBtnText,
									{ color: "#DC2626" },
								]}
							>
								Partial Paper Cut
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* ── SECTION 5: FLOYD-STEINBERG IMAGE DITHERING ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						5. Photorealistic Image Dithering
					</Text>
					<Text style={styles.cardSubtitle}>
						Floyd-Steinberg error diffusion algorithm for logos and
						photos
					</Text>

					<TextInput
						style={styles.input}
						value={imageUrl}
						onChangeText={setImageUrl}
						placeholder="https://... or file:///..."
						autoCapitalize="none"
					/>

					<ShowcaseButton
						title="Print Dithered Image"
						description="Renders gradients, shadows, and photos smoothly onto thermal paper"
						color="#db2777"
						printing={printing}
						onPress={printImageDemo}
					/>
				</View>

				{/* ── SECTION 6: ESC/POS XML TAG SUITES ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						6. ESC/POS Inline XML Tag Suites
					</Text>
					<Text style={styles.cardSubtitle}>
						Direct tag tests for formatting engines
					</Text>

					<ShowcaseButton
						title="Text Styles"
						description="BOLD · U · U2 · REV · UPDOWN · Font A/B"
						color="#4f46e5"
						printing={printing}
						onPress={() =>
							executePrint("Text Styles", () =>
								sendText(DEMO_XML_STYLES),
							)
						}
					/>

					<ShowcaseButton
						title="Size Multipliers"
						description="W2 · W3 · H2 · H3 · X2 · X3 · X4 · FS:W,H"
						color="#0d9488"
						printing={printing}
						onPress={() =>
							executePrint("Size Multipliers", () =>
								sendText(DEMO_XML_SIZES),
							)
						}
					/>

					<ShowcaseButton
						title="Alignment Strip"
						description="Left, Center, Right combined with text modes"
						color="#c026d3"
						printing={printing}
						onPress={() =>
							executePrint("Alignment", () =>
								sendText(DEMO_XML_ALIGNMENT),
							)
						}
					/>

					<ShowcaseButton
						title="Spacing & Dot Controls"
						description="LINESPC (dot height) · CHARSPC (dot width)"
						color="#ea580c"
						printing={printing}
						onPress={() =>
							executePrint("Spacing", () =>
								sendText(DEMO_XML_SPACING),
							)
						}
					/>
				</View>

				{/* ── SECTION 7: INTERACTIVE XML PLAYGROUND ── */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						7. Live ESC/POS XML Playground
					</Text>
					<Text style={styles.cardSubtitle}>
						Edit formatting tags directly to preview custom layouts
					</Text>

					<TextInput
						style={[styles.input, styles.textArea]}
						value={customXml}
						onChangeText={setCustomXml}
						multiline
						numberOfLines={8}
					/>

					<TouchableOpacity
						style={[
							styles.printBtn,
							!isConnected && styles.printBtnDisabled,
						]}
						onPress={() =>
							executePrint("Playground", () =>
								sendText(customXml),
							)
						}
						disabled={!isConnected || printing !== null}
					>
						<Text style={styles.printBtnText}>
							{printing === "Playground"
								? "PRINTING PAYLOAD…"
								: "PRINT CUSTOM XML"}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}

// ── Reusable Showcase Button Component ───────────────────────────────────────

function ShowcaseButton({
	title,
	description,
	color,
	onPress,
	printing,
}: {
	title: string;
	description: string;
	color: string;
	onPress: () => void;
	printing: string | null;
}) {
	const isBusy = printing !== null;
	const isActive = printing === title;

	return (
		<TouchableOpacity
			style={[styles.demoCard, isBusy && styles.demoCardBusy]}
			onPress={onPress}
			disabled={isBusy}
			activeOpacity={0.7}
		>
			<View style={{ flex: 1, paddingRight: 12 }}>
				<Text style={[styles.demoCardTitle, { color }]}>{title}</Text>
				<Text style={styles.demoCardDesc}>{description}</Text>
			</View>
			<Text style={styles.demoCardActionText}>
				{isActive ? "Running..." : "→"}
			</Text>
		</TouchableOpacity>
	);
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: "#F3F4F6" },
	container: { padding: 16, paddingBottom: 60 },

	// Header
	header: { alignItems: "center", marginBottom: 20, marginTop: 10 },
	headerSubtitle: {
		fontSize: 13,
		textTransform: "uppercase",
		letterSpacing: 2,
		color: "#6B7280",
		fontWeight: "700",
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "800",
		color: "#111827",
		marginTop: 4,
	},
	badge: {
		backgroundColor: "#E0E7FF",
		color: "#4F46E5",
		fontSize: 11,
		fontWeight: "600",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		marginTop: 8,
		overflow: "hidden",
	},

	// Tabs
	tabContainer: {
		flexDirection: "row",
		backgroundColor: "#E5E7EB",
		borderRadius: 8,
		padding: 4,
		marginBottom: 16,
	},
	tabButton: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center",
		borderRadius: 6,
	},
	tabButtonActive: {
		backgroundColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 1,
		elevation: 2,
	},
	tabButtonText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#6B7280",
	},
	tabButtonTextActive: {
		color: "#111827",
	},

	// Cards
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 8,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 12,
		color: "#6B7280",
		marginBottom: 14,
	},

	// Paper Width Selector
	paperWidthContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#F9FAFB",
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	paperWidthLabel: {
		color: "#4B5563",
		fontSize: 13,
		fontWeight: "600",
		marginRight: 10,
	},
	widthChip: {
		backgroundColor: "#F3F4F6",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		marginRight: 8,
	},
	widthChipActive: {
		backgroundColor: "#2563EB",
	},
	widthChipText: {
		color: "#4B5563",
		fontSize: 12,
		fontWeight: "600",
	},
	widthChipTextActive: {
		color: "#FFFFFF",
	},

	// Actions & Inputs
	actionBtn: {
		backgroundColor: "#2563EB",
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	actionBtnText: {
		color: "#FFFFFF",
		fontWeight: "600",
		fontSize: 13,
	},
	deviceItem: {
		padding: 12,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		backgroundColor: "#F9FAFB",
		borderRadius: 6,
		marginTop: 8,
	},
	deviceSelected: {
		borderColor: "#10B981",
		backgroundColor: "#ECFDF5",
	},
	deviceName: {
		color: "#111827",
		fontWeight: "600",
		fontSize: 14,
	},
	deviceSub: {
		color: "#6B7280",
		fontSize: 12,
		marginTop: 2,
	},
	statusBox: {
		marginTop: 12,
		padding: 10,
		backgroundColor: "#F3F4F6",
		borderRadius: 6,
		alignItems: "center",
	},
	statusText: {
		color: "#0369A1",
		fontSize: 12,
		fontWeight: "500",
	},

	row: {
		flexDirection: "row",
		alignItems: "center",
	},
	input: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#D1D5DB",
		borderRadius: 6,
		padding: 10,
		color: "#111827",
		fontSize: 14,
		marginBottom: 10,
	},
	textArea: {
		height: 150,
		textAlignVertical: "top",
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},

	// Button Grid
	buttonGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	gridBtn: {
		width: "48%",
		borderWidth: 1,
		borderColor: "#E5E7EB",
		backgroundColor: "#F9FAFB",
		paddingVertical: 10,
		borderRadius: 6,
		alignItems: "center",
		marginBottom: 8,
	},
	gridBtnText: {
		color: "#374151",
		fontSize: 13,
		fontWeight: "600",
	},

	// Demo Buttons
	demoCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 8,
		padding: 14,
		marginBottom: 10,
	},
	demoCardBusy: {
		opacity: 0.5,
	},
	demoCardTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
	demoCardDesc: {
		fontSize: 12,
		color: "#6B7280",
		marginTop: 4,
	},
	demoCardActionText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#9CA3AF",
	},

	// Print CTA
	printBtn: {
		backgroundColor: "#10B981",
		paddingVertical: 14,
		borderRadius: 6,
		alignItems: "center",
		marginTop: 4,
	},
	printBtnDisabled: {
		backgroundColor: "#9CA3AF",
	},
	printBtnText: {
		color: "#FFFFFF",
		fontWeight: "700",
		fontSize: 14,
		letterSpacing: 0.5,
	},
});
