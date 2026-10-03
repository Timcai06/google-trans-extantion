const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Shared source packages use Node-compatible ESM `.js` specifiers; Metro needs
// the corresponding TypeScript source files during native bundle compilation.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    /[/\\]packages[/\\](core|data)[/\\]src[/\\]/.test(context.originModulePath)
  ) {
    return context.resolveRequest(context, moduleName.slice(0, -3) + '.ts', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
