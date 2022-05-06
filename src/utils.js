/**
 * (c) https://github.com/jashkenas/underscore/blob/b713f5a6d75b12c8c57fb3f410df029497c2a43f/modules/isUndefined.js
 *
 * @param {any} value
 * @returns {boolean} `true` if `value` is `undefined`
 */
module.exports.isUndefined = (value) => value === void 0;

/** @type {(context: string) => (msg: string) => void} */
module.exports.makeLogger = (context = 'ssh-keygen-lite') => {
  return process.env.VERBOSE
    ? //
      (msg) => console.log(`${context}: ${msg}`)
    : () => {}; // Do nothing if logging is not enabled
};
