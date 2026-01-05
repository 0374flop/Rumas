const quickjsvm = require('./quickjs-vm').evalinsandbox;
const nodevm = require('./node-vm').evalinsandbox;

module.exports = {
    nodevm,
    quickjsvm
}