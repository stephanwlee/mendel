var nodeResolveSync = require('resolve').sync;
var path = require('path');

function resolvePlugin(pluginName, basedir) {
    const pluginPackagePath = _resolve(path.join(pluginName, 'package.json'), {
        basedir,
    });
    const pluginPath = _resolve(pluginName, {basedir});

    const resolved = {
        plugin: pluginPath,
    };
    if (pluginPath) {
        resolved.mode =
            [pluginPackagePath, pluginPath]
                .filter(Boolean)
                .map(plugin => require(plugin).mode)
                .filter(Boolean)[0] || 'ist';
    } else {
        resolved.mode = 'unknown';
    }
    return resolved;
}
function _resolve(pluginPath, opt) {
    try {
        return nodeResolveSync(pluginPath, opt);
    } catch (e) {
        return false;
    }
}

module.exports = resolvePlugin;
