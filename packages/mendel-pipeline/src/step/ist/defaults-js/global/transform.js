const t = require('babel-types');

const NODE_GLOBAL = new Map([
    ['global', 'global'],
    ['process', 'process'],
    ['Buffer', 'buffer'],
]);

const visitor = {
    Program: {
        exit(path) {
            Object.keys(path.scope.globals)
                .filter(global => NODE_GLOBAL.has(global))
                .forEach(global => {
                    const requireCall = t.callExpression(
                        t.identifier('require'),
                        [
                            t.stringLiteral(NODE_GLOBAL.get(global)),
                        ]);
                    const globalDecl = t.variableDeclaration('var', [
                        t.variableDeclarator(t.identifier(global), requireCall),
                    ]);

                    path.unshiftContainer('body', globalDecl);
                });
        },
    },
};

module.exports = function testPlugin() {
    return {visitor};
};
