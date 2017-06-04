const heapdump = require('heapdump');
const readline = require('readline');
const profiler = require('gc-profiler');
const bytes = require('bytes');


function padZero(number, digit) {
    const strBuilder = [number > 0 ? '' + number : ''];
    while (number / 10 > 0) {
        number = parseInt(number / 10, 10);
        digit--;
    }

    while (digit-- > 0) strBuilder.unshift('0');
    return strBuilder.join('');
}

function toTimeString(date) {
    return '' +
        padZero(date.getHours(), 2) + ':' +
        padZero(date.getMinutes(), 2) + ':' +
        padZero(date.getSeconds(), 2) + '.' +
        padZero(date.getMilliseconds(), 3);
}

// Interval printer
setInterval(() => {
    if (global.gc) global.gc();
    const {heapUsed} = process.memoryUsage();
    console.log(`[${toTimeString(new Date())}] Heap size: ${bytes(heapUsed)}`);
}, 2000);

// Take Heap snapshot upon request on CLI.
readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '>',
}).on('line', (input) => {
    input = input.toLowerCase().trim();
    if (input === 's' || input === 'snap') {
        if (global.gc) global.gc();
        const file = `mendel_${Date.now()}.heapsnapshot`;
        heapdump.writeSnapshot(file);
        console.log(`[SNAPSHOT] written to ${file}`);
    } else if (input === '.exit') {
        process.exit(0);
    }
}).on('pause', () => {
    console.log('(To exit, press ^C again or type .exit)');
});

// Print when GC was triggered.
profiler.on('gc', function({date, type, forced}) {
    let string = `[${toTimeString(date)}]`;
    if (forced) string += '[forced]';
    console.log(`${string} "${type}" GC triggered.`);
});
