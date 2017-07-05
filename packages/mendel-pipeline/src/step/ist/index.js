const path = require('path');
const BaseStep = require('../step');

const _internalTransforms = [
    require('./defaults-js/global'),
];
const execToDefaultTransforms = new Map();

['js', 'css', 'html'].forEach(exec => {
    execToDefaultTransforms.set(
        exec,
        _internalTransforms
        .filter(({config}) => config.exec === exec)
        .map(({config}) => config.id));
});

class IndependentSourceTransform extends BaseStep {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {Transformer} tool.transformer
     * @param {DepsManager} tool.depsResolver
     */
    constructor({registry, transformer, depsResolver}, options) {
        super();

        this._registry = registry;
        this._depsResolver = depsResolver;
        this._transformer = transformer;

        this._transforms = new Map();
        options.transforms.forEach(transform => {
            this._transforms.set(transform.id, transform);
        });

        _internalTransforms.forEach(({config}) => {
            this._transforms.set(config.id, config);
            this._transformer.addTransform(config);
        });

        this._parserTypeConversion = new Map();
        this._types = options.types;
        this._types.forEach(type => {
            if (!type.parserToType) return;
            // TODO better cycle detection: cannot have cycle
            if (type.parserToType === type.name) return;
            this._parserTypeConversion.set(type.name, type.parserToType);
        });
    }

    getTransformIdsByTypeAndExec(typeName, optEntryId) {
        const type = this._types.get(typeName);
        // Secondary type can be also missing.
        if (!type) return [];
        let appendIds = [];
        if (optEntryId) {
            const exec = this.inferExec(optEntryId, type.transforms);
            appendIds = execToDefaultTransforms.get(exec) || [];
        }
        return type.transforms.concat(appendIds, [type.parser]).filter(Boolean);
    }

    inferExec(id, xformIds) {
        if (xformIds.length) {
            const transform = this._transforms.get(xformIds[0]);
            return transform.exec;
        }
        switch (path.extname) {
            case '.js':
            case '.jsx':
            case '.esnext':
                return 'js';
            case '.css':
                return 'css';
            case '.html':
                return 'html';
        }
    }

    getTransform(entry) {
        const {type} = entry;
        let typeConfig = this._types.get(entry.type);

        // When current entry is a node modules,
        // it can be applied with more global configuration from
        // "includeNodeModules". As node_modules cannot have more than one
        // subtype, this property is used to, for instance, minify or
        // do transformations on the source.
        // Such global configuration will override any transformations configured
        // for the node_modules type.
        if (type !== entry._type && type === 'node_modules') {
            const config = this._types.get(entry._type);
            if (config && config.includeNodeModules) {
                typeConfig = config;
            }
        }
        if (!typeConfig) {
            return {
                type,
                ids: this.getTransformIdsByTypeAndExec(type, entry.id),
            };
        }

        const ist = {type: typeConfig.name, ids: []};

        let xformIds = this.getTransformIdsByTypeAndExec(ist.type, entry.id);

        // If there is a parser, do type conversion
        while (this._parserTypeConversion.has(ist.type)) {
            const newType = this._parserTypeConversion.get(ist.type);
            // node_modules cannot change its type
            if (ist.type !== 'node_modules') ist.type = newType;
            else ist._type = newType;
            xformIds = xformIds.concat(this.getTransformIdsByTypeAndExec(ist.type));
        }

        ist.ids = xformIds
            .map(xformId => this._transforms.get(xformId))
            .filter(Boolean)
            .filter(({mode}) => mode === 'ist')
            .map(({id}) => id);

        // console.log(entry.id, ist.ids);
        return ist;
    }

    perform(entry) {
        const entryId = entry.id;
        const {ids, type: newType} = this.getTransform(entry);
        const source = entry.rawSource;
        const map = entry.map;

        let promise = Promise.resolve({source, map});
        if (ids.length) {
            promise = promise.then(() => {
                return this._transformer.transform(entryId, ids, source, map);
            });
        }

        promise
        .then(({source, map}) => {
            return this._depsResolver.detect(entry.id, source)
            .then(({deps}) => {
                this._registry.addTransformedSource({
                    id: entryId,
                    source,
                    deps,
                    map,
                });

                if (entry.type !== newType) {
                    this._registry.setEntryType(entryId, newType);
                }

                entry.istSource = entry.source;
                entry.istDeps = entry.deps;
            })
            .then(() => this.emit('done', {entryId}, ids))
            .catch(error => {
                error.message = `Errored while resolving deps for ${entryId}: ` + error.message;
                this.emit('error', {error, id: entryId});
            });
        }, error => {
            error.message = `Errored while transforming ${entryId}: ` +
                error.message;
            this.emit('error', {error, id: entryId});
        });
    }
}

module.exports = IndependentSourceTransform;
