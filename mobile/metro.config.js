const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const path = require('path');
const config = getDefaultConfig(__dirname);

// Force CommonJS for packages that use import.meta in their ESM versions
config.resolver.alias = {
  ...config.resolver.alias,
  'zustand': path.resolve(__dirname, 'node_modules/zustand/index.js'),
  'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
  'zustand/vanilla': path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
};

// Add .wasm to the resolver extensions
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('wasm');

// Ensure node_modules are transpiled if they contain ESM syntax
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
