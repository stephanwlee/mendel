var nodeResolveSync = require('resolve').sync;
var path = require('path');

function resolvePlugin({plugin, basedir}, packageResolver=modeResolver) {
    const pluginPackagePath = _resolve(path.join(plugin, 'package.json'), {
        basedir,
    });
    const pluginPath = _resolve(plugin, {basedir});

    const resolved = {
        plugin: pluginPath,
    };

    [pluginPackagePath, pluginPath].forEach(path => {
            try {
                const packageOrModule = require(path);
                packageResolver(resolved, packageOrModule);
            } catch (e) {
                // Nice try, but we don't need to do anything yet
                // ¯\_(ツ)_/¯
            }
    });

    return resolved;
}

function modeResolver(resolved, packageOrModule) {
    if (resolved.mode) return;
    resolved.mode = packageOrModule.mode || 'ist';
}

function _resolve(pluginPath, opt) {
    try {
        return nodeResolveSync(pluginPath, opt);
    } catch (e) {
        return false;
    }
}

module.exports = resolvePlugin;
module.exports.modeResolver = modeResolver;
