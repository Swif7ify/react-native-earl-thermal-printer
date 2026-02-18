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

export default function ThermalPrinterTest() {
	const [printers, setPrinters] = useState<IBLEPrinter[]>([]);
	const [currentPrinter, setCurrentPrinter] = useState<IBLEPrinter | null>(
		null,
	);
	const [isScanning, setIsScanning] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Controls dropdown visibility

	// Input States
	const [qrValue, setQrValue] = useState(
		"https://www.npmjs.com/package/react-native-earl-thermal-printer",
	);
	const [imageUrl, setImageUrl] = useState(
		"https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200&auto=format&fit=crop",
	);
	const [receiptText, setReceiptText] = useState(
		"<C>React Native Earl Printer</C>\n<C>--------------------------------</C>\nL 1x Burger           $10.00\nR 2x Fries            $20.00\n<C>--------------------------------</C>\n<B><C>TOTAL             $30.00</C></B>\n\n",
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
				toggleDropdown(); // Close dropdown after selection
			})
			.catch((err) => Alert.alert("Connection Failed", String(err)));
	};

	const printTicket = async () => {
		if (!currentPrinter) {
			Alert.alert("No Printer", "Please connect to a printer first.");
			return;
		}

		try {
			if (imageUrl.length > 0) {
				console.log("Printing Image...");
				await BLEPrinter.printImage(imageUrl);
			}
			if (qrValue.length > 0) {
				await BLEPrinter.printQrCode(qrValue);
			}
			await BLEPrinter.printBill(receiptText);
		} catch (err) {
			console.warn("Print error:", err);
			Alert.alert("Print Error", String(err));
		}
	};

	return (
		<View style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.container}>
				{/* --- HEADER --- */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>React Native</Text>
					<Text style={styles.headerSubtitle}>
						Earl Thermal Printer
					</Text>
					<Text style={styles.versionText}>v1.0.0 • TurboModule</Text>
				</View>

				{/* --- SECTION 1: PRINTER SELECTION (DROPDOWN) --- */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>1. Select Printer</Text>

					{/* Dropdown Header / Trigger */}
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

					{/* Collapsible Content */}
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

				{/* --- SECTION 2: CUSTOMIZE PRINT --- */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>2. Customize Print</Text>

					<Text style={styles.inputLabel}>QR Code Value:</Text>
					<TextInput
						style={styles.input}
						value={qrValue}
						onChangeText={setQrValue}
						placeholder="Enter QR content"
					/>

					<Text style={styles.inputLabel}>Image URL (JPG/PNG):</Text>
					<TextInput
						style={styles.input}
						value={imageUrl}
						onChangeText={setImageUrl}
						placeholder="https://..."
						autoCapitalize="none"
					/>

					<Text style={styles.inputLabel}>Receipt Content:</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						value={receiptText}
						onChangeText={setReceiptText}
						multiline
						numberOfLines={4}
					/>
				</View>

				{/* --- ACTION BUTTON --- */}
				<View style={styles.section}>
					<TouchableOpacity
						style={[
							styles.printButton,
							!currentPrinter && styles.printButtonDisabled,
						]}
						onPress={printTicket}
						disabled={!currentPrinter}
					>
						<Text style={styles.printButtonText}>
							PRINT TEST TICKET
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, marginTop: 20, backgroundColor: "#f5f5f5" },
	container: { padding: 20, paddingBottom: 40 },

	header: { alignItems: "center", marginBottom: 30, marginTop: 10 },
	headerTitle: { fontSize: 20, fontWeight: "600", color: "#333" },
	headerSubtitle: { fontSize: 24, fontWeight: "bold", color: "#007AFF" },
	versionText: { fontSize: 12, color: "#999", marginTop: 5 },

	section: {
		backgroundColor: "white",
		padding: 15,
		borderRadius: 12,
		marginBottom: 20,
		elevation: 2,
		// Shadow for iOS
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 15,
		color: "#333",
	},

	// --- Dropdown Styles ---
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
		color: "#999",
		marginVertical: 10,
		fontSize: 12,
	},
	statusText: {
		marginTop: 15,
		fontWeight: "600",
		textAlign: "center",
		color: "#555",
	},

	// Input Styles
	inputLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: "#444",
		marginTop: 10,
		marginBottom: 5,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 10,
		backgroundColor: "#fff",
		fontSize: 14,
	},
	textArea: { height: 80, textAlignVertical: "top" },

	printButton: {
		backgroundColor: "#007AFF",
		padding: 18,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 10,
	},
	printButtonDisabled: { backgroundColor: "#ccc" },
	printButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
		letterSpacing: 1,
	},
});
