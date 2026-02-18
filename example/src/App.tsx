import React, { useState, useEffect, useCallback } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Alert,
	Platform,
} from "react-native";
import {
	BLEPrinter,
	NetPrinter,
	USBPrinter,
	NetPrinterEventEmitter,
	RN_THERMAL_RECEIPT_PRINTER_EVENTS,
	IUSBPrinter,
	IBLEPrinter,
	INetPrinter,
	PrinterOptions,
} from "react-native-earl-thermal-printer";
import Loader from "./Loader";

type PrinterType = "ble" | "net" | "usb";

const printerList: Record<
	PrinterType,
	typeof BLEPrinter | typeof NetPrinter | typeof USBPrinter
> = {
	ble: BLEPrinter,
	net: NetPrinter,
	usb: USBPrinter,
};

export default function App() {
	const [selectedType, setSelectedType] = useState<PrinterType>("ble");
	const [devices, setDevices] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [connected, setConnected] = useState(false);
	const [host, setHost] = useState("192.168.1.100");
	const [port, setPort] = useState("9100");
	const [customText, setCustomText] = useState(
		"Hello from Earl Thermal Printer!\n",
	);

	// ── Init & scan on type change ────────────────────────────────────────
	useEffect(() => {
		const initPrinter = async () => {
			const Printer = printerList[selectedType];
			if (selectedType === "net") return; // net uses manual IP entry
			try {
				setLoading(true);
				await Printer.init();
				const results = await Printer.getDeviceList();
				setDevices(results as any[]);
			} catch (err: any) {
				Alert.alert("Init Error", err?.message ?? String(err));
			} finally {
				setLoading(false);
			}
		};
		setConnected(false);
		setDevices([]);
		initPrinter();
	}, [selectedType]);

	// ── Net printer events ────────────────────────────────────────────────
	useEffect(() => {
		const sub1 = NetPrinterEventEmitter.addListener(
			RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNED_SUCCESS,
			(printers: INetPrinter[]) => {
				console.log("Discovered net printers:", printers);
				setDevices(printers);
			},
		);
		const sub2 = NetPrinterEventEmitter.addListener(
			RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNING,
			(isScanning: boolean) => {
				setLoading(isScanning);
			},
		);
		return () => {
			sub1.remove();
			sub2.remove();
		};
	}, []);

	// ── Connect ───────────────────────────────────────────────────────────
	const handleConnect = useCallback(
		async (device?: any) => {
			try {
				setLoading(true);
				switch (selectedType) {
					case "ble":
						if (!device) return;
						await BLEPrinter.connectPrinter(
							device.inner_mac_address,
						);
						break;
					case "net":
						await NetPrinter.init();
						await NetPrinter.connectPrinter(
							host,
							parseInt(port, 10),
						);
						break;
					case "usb":
						if (!device) return;
						await USBPrinter.connectPrinter(
							device.vendor_id,
							device.product_id,
						);
						break;
				}
				setConnected(true);
				Alert.alert("Connected", "Printer connected successfully");
			} catch (err: any) {
				Alert.alert("Connection Error", err?.message ?? String(err));
			} finally {
				setLoading(false);
			}
		},
		[selectedType, host, port],
	);

	// ── Print actions ─────────────────────────────────────────────────────
	const handlePrintText = useCallback(async () => {
		try {
			const Printer = printerList[selectedType];
			await Printer.printText(customText);
			Alert.alert("Printed", "Text sent to printer");
		} catch (err: any) {
			Alert.alert("Print Error", err?.message ?? String(err));
		}
	}, [selectedType, customText]);

	const handlePrintBill = useCallback(async () => {
		try {
			const Printer = printerList[selectedType];
			await Printer.printBill(
				"<C><B>EARL THERMAL PRINTER</B></C>\n" +
					"================================\n" +
					"Item 1                    $5.00\n" +
					"Item 2                    $3.50\n" +
					"Item 3                    $7.25\n" +
					"================================\n" +
					"<B>TOTAL                  $15.75</B>\n" +
					"\n" +
					"<C>Thank you!</C>\n",
			);
			Alert.alert("Printed", "Bill sent to printer");
		} catch (err: any) {
			Alert.alert("Print Error", err?.message ?? String(err));
		}
	}, [selectedType]);

	const handlePrintQr = useCallback(async () => {
		try {
			const Printer = printerList[selectedType];
			await Printer.printQrCode(
				"https://github.com/Swif7ify/react-native-earl-thermal-printer",
			);
			Alert.alert("Printed", "QR code sent to printer");
		} catch (err: any) {
			Alert.alert("Print Error", err?.message ?? String(err));
		}
	}, [selectedType]);

	const handleDisconnect = useCallback(() => {
		printerList[selectedType].closeConn();
		setConnected(false);
	}, [selectedType]);

	// ── Render ────────────────────────────────────────────────────────────
	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Loader loading={loading} />

			<Text style={styles.title}>Earl Thermal Printer</Text>
			<Text style={styles.subtitle}>New Architecture Example</Text>

			{/* Printer type selector */}
			<Text style={styles.label}>Printer Type</Text>
			<View style={styles.row}>
				{(["ble", "net", "usb"] as PrinterType[]).map((type) => (
					<TouchableOpacity
						key={type}
						style={[
							styles.typeBtn,
							selectedType === type && styles.typeBtnActive,
						]}
						onPress={() => setSelectedType(type)}
					>
						<Text
							style={[
								styles.typeBtnText,
								selectedType === type &&
									styles.typeBtnTextActive,
							]}
						>
							{type.toUpperCase()}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Device list / manual input */}
			{selectedType === "net" ? (
				<View style={styles.section}>
					<Text style={styles.label}>Host</Text>
					<TextInput
						style={styles.input}
						value={host}
						onChangeText={setHost}
						placeholder="192.168.1.100"
					/>
					<Text style={styles.label}>Port</Text>
					<TextInput
						style={styles.input}
						value={port}
						onChangeText={setPort}
						placeholder="9100"
						keyboardType="numeric"
					/>
					<TouchableOpacity
						style={styles.btn}
						onPress={() => handleConnect()}
					>
						<Text style={styles.btnText}>Connect</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.section}>
					<Text style={styles.label}>
						Devices ({devices.length} found)
					</Text>
					{devices.map((device, idx) => (
						<TouchableOpacity
							key={idx}
							style={styles.deviceItem}
							onPress={() => handleConnect(device)}
						>
							<Text style={styles.deviceText}>
								{device.device_name ||
									device.inner_mac_address ||
									"Unknown"}
							</Text>
						</TouchableOpacity>
					))}
					{devices.length === 0 && (
						<Text style={styles.hint}>
							No devices found. Make sure printer is on and
							paired.
						</Text>
					)}
				</View>
			)}

			{/* Connected actions */}
			{connected && (
				<View style={styles.section}>
					<Text style={[styles.label, { color: "#2e7d32" }]}>
						Connected
					</Text>

					<Text style={styles.label}>Custom Text</Text>
					<TextInput
						style={[styles.input, { height: 80 }]}
						value={customText}
						onChangeText={setCustomText}
						multiline
					/>

					<TouchableOpacity
						style={styles.btn}
						onPress={handlePrintText}
					>
						<Text style={styles.btnText}>Print Text</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.btn}
						onPress={handlePrintBill}
					>
						<Text style={styles.btnText}>Print Sample Bill</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.btn}
						onPress={handlePrintQr}
					>
						<Text style={styles.btnText}>Print QR Code</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.btn, styles.btnDanger]}
						onPress={handleDisconnect}
					>
						<Text style={styles.btnText}>Disconnect</Text>
					</TouchableOpacity>
				</View>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		padding: 20,
		paddingTop: Platform.OS === "ios" ? 60 : 40,
		backgroundColor: "#f5f5f5",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 6,
		marginTop: 12,
	},
	row: {
		flexDirection: "row",
		gap: 8,
	},
	typeBtn: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: "#e0e0e0",
		alignItems: "center",
	},
	typeBtnActive: {
		backgroundColor: "#1976d2",
	},
	typeBtnText: {
		fontWeight: "600",
		color: "#333",
	},
	typeBtnTextActive: {
		color: "#fff",
	},
	section: {
		marginTop: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		padding: 10,
		backgroundColor: "#fff",
		fontSize: 16,
		marginBottom: 8,
	},
	btn: {
		backgroundColor: "#1976d2",
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 8,
	},
	btnDanger: {
		backgroundColor: "#c62828",
	},
	btnText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 16,
	},
	deviceItem: {
		padding: 12,
		backgroundColor: "#fff",
		borderRadius: 8,
		marginBottom: 6,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	deviceText: {
		fontSize: 14,
	},
	hint: {
		color: "#999",
		fontStyle: "italic",
		marginTop: 8,
	},
});
