const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build ships a wasm file.
config.resolver.assetExts.push('wasm');

module.exports = config;
