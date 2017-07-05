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
    this.exec = resolved.exec;

    TransformConfig.validate(this, {plugin: transform.plugin});
}

function pluginPackageResolver(resolved, packageOrModule) {
    if (resolved.mode) return;
    resolved.mode = packageOrModule.mode || 'ist';

    if (resolved.exec) return;
    resolved.exec = packageOrModule.exec;
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
    exec: {
        required: true,
        errorMessage: process.env.NODE_ENV !== 'production' ?
            'WARN: "$plugin" is missing required "exec" field. Possible values are js, css, html.' :
            '',
    },
});

module.exports = TransformConfig;
