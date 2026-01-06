const quickjsvm = require('./quickjs-vm');
const nodevm = require('./node-vm');
const workervm = require('./worker-vm');

module.exports = {
    nodevm,
    quickjsvm,
    workervm
}