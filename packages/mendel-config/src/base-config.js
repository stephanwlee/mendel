const path = require('path');
const createValidator = require('./helpers/validator');

function BaseConfig(config) {
    const input = config.baseConfig;

    BaseConfig.validate(input);

    return {
        id: input.id,
        dir: path.relative(config.projectRoot, input.dir),
        outdir: path.resolve(config.projectRoot, input.outdir || 'build'),
    };
}

BaseConfig.validate = createValidator({
    id: {required: true},
    dir: {required: true},
});


module.exports = BaseConfig;
