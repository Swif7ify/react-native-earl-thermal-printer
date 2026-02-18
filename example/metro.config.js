const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const escape = require("escape-string-regexp");
const pak = require("../package.json");

const root = path.resolve(__dirname, "..");

const modules = Object.keys({
	...pak.peerDependencies,
});

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 */
const config = {
	projectRoot: __dirname,
	watchFolders: [root],

	resolver: {
		blacklistRE: new RegExp(
			modules
				.map(
					(m) =>
						`^${escape(path.join(root, "node_modules", m))}\\/.*$`,
				)
				.join("|"),
		),

		extraNodeModules: modules.reduce((acc, name) => {
			acc[name] = path.join(__dirname, "node_modules", name);
			return acc;
		}, {}),
	},
};

module.exports = mergeConfig(defaultConfig, config);
