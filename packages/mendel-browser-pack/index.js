const {Transform} = require('stream');
const {Buffer} = require('buffer');
const browserpack = require('browser-pack');
const indexedDeps = require('./index-deps');

class PaddedStream extends Transform {
    constructor({prelude='', appendix=''}, options) {
        super(options);
        this.prelude = prelude;
        this.appendix = appendix;
        this.started = false;
    }
    // Called on every chunk
    _transform(chunk, encoding, cb) {
        if (!this.started) {
            this.started = true;
            chunk = Buffer.concat([Buffer.from(this.prelude), chunk]);
        }
        cb(null, chunk);
    }
    // Called right before it wants to end
    _flush(cb) {
        this.push(Buffer.from(this.appendix));
        cb();
    }
}

function writeToStream(stream, arrData) {
    if (!arrData.length) {
        stream.end();
        return;
    }

    // Writing null terminates the stream. It is equal to EOF for streams.
    while (arrData.length && stream.write(arrData[0])) {
        // If successfully written, remove written one from the arrData.
        arrData.shift();
    }
    if (arrData.length) {
        stream.once(
            'drain',
            () => writeToStream(stream, arrData)
        );
    } else {
        stream.end();
    }
}

module.exports = function mendelBrowserPack(bundleEntries, browserPackOptions) {
    const pack = browserpack(
        Object.assign(
            {},
            browserPackOptions,
            {
                raw: true, // since we pass Object instead of JSON string
                hasExports: true, // exposes `require` globally. Required for multi-bundles.
            }
        )
    );

    bundleEntries = indexedDeps(bundleEntries);

    let prelude = '';
    let appendix = '';

    const stream = new PaddedStream({appendix, prelude});
    pack.pipe(stream);

    writeToStream(pack, bundleEntries);

    return stream;
};
