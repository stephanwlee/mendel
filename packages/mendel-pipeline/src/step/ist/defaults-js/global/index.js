const TransformBabel = require('mendel-transform-babel');
const path = require('path');

function transform(src, options) {
    options = Object.assign({}, options, {
        plugins: [path.resolve(__dirname, 'transform.js')],
    });
    return TransformBabel(src, options);
}

const config = {
    id: '_mendel_internal-global',
    options: {},
    plugin: __filename,
    mode: 'ist',
    exec: 'js',
};

module.exports = transform;
module.exports.config = config;
