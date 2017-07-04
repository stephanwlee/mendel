var createValidator = require('./helpers/validator');
var resolvePlugin = require('./helpers/resolve-plugin');

function TransformConfig(id, transform, {projectRoot}) {
    this.id = id;
    this.options = transform.options;

    var resolved = resolvePlugin({
        plugin: transform.plugin,
        basedir: projectRoot,
    }, pluginPackageResolver);
    this.plugin = resolved.plugin;
    this.mode = resolved.mode;
    this.execRuntime = resolved.execRuntime;

    TransformConfig.validate(this, {plugin: transform.plugin});
}

function pluginPackageResolver(resolved, packageOrModule) {
    if (resolved.mode) return;
    resolved.mode = packageOrModule.mode || 'ist';

    if (resolved.execRuntime) return;
    resolved.execRuntime = packageOrModule.execRuntime;
}

TransformConfig.validate = createValidator({
    id: {required: true},
    plugin: {required: true},
    mode: {
        required: true,
        errorMessage: process.env.NODE_ENV !== 'production' ?
            'WARN: "$plugin" was not found. Check your configuration ' +
            'or your "npm install --save-dev" your plugin.' : '',
    },
});

module.exports = TransformConfig;
