const chalk = require('chalk');
const _errors = [];

function maybeThrowIfError() {
    if (!_errors.length) return;

    throw new Error('Configuration Errors\n' + _errors.join('\n'));
}

module.exports = function createValidator(schema) {
    return function(instance, injected = {}) {
        var error = [];

        Object.keys(schema).forEach(function(schemaKey) {
            var criteria = schema[schemaKey];
            var value = instance[schemaKey];
            var curError = [];

            if (criteria.required && typeof value === 'undefined') {
                curError.push('Required field "' + chalk.red(schemaKey) + '" is not present.');
            }

            var type = Array.isArray(value) ? 'array' : typeof value;
            if (criteria.type && type !== criteria.type) {
                curError.push('Requires `' + chalk.red(schemaKey) + '` to be of type [' + criteria.type + '] but is [' + type + ']');
            }

            if (Array.isArray(value)) {
                if (criteria.minLen && criteria.minLen > value.length) {
                    curError.push('Expected `' + chalk.red(schemaKey) + '` to be at least ' + criteria.minLen + ' long');
                }
                if (criteria.maxLen && criteria.maxLen < value.length) {
                    curError.push('Expected `' + chalk.red(schemaKey) + '` to be below ' + criteria.maxLen + ' long');
                }
            }

            if (curError.length) {
                if (criteria.errorMessage) {
                    const message = Object.keys(injected)
                        .reduce((msg, key) => {
                            const regex = new RegExp('\\$' + key, 'g');
                            return msg.replace(regex, injected[key]);
                        }, criteria.errorMessage);
                    error.push(message + '\n  ' + curError.join('\n  '));
                } else {
                    error = error.concat(curError);
                }
            }
        });

        if (instance.options && Array.isArray(schema.supportedOptionFields)) {
            const unsupportedOptionFields = Object.keys(instance.options).filter(field => {
                return schema.supportedOptionFields.indexOf(field) === -1;
            });

            if (unsupportedOptionFields.length > 0) {
                error.push('Found unsupported options `' + unsupportedOptionFields.join('`, `') + '`');
            }
        }

        if (error.length) {
            _errors.push(
                error.filter(Boolean).reduce(function(reduced, error) {
                    return reduced += chalk.red('x ') + error + '\n';
                }, '')
                // Figure out better way of debugging
                // JSON.stringify(instance, null, 2)
            );
        }
    };
};

module.exports.maybeThrowIfError = maybeThrowIfError;
