const spawn = require('child_process').spawn;
const fs = require('fs');
const os = require('os');
const path = require('path');
const _ = require('./utils');

function log(msg) {
  if (process.env.VERBOSE) console.log('ssh-keygen: ' + msg);
}

/**
 * @throws {Error} If the platform is not supported.
 * @returns Path to the binary `ssh-keygen` program.
 */
function binPath() {
  if (process.platform !== 'win32') return 'ssh-keygen';

  switch (process.arch) {
    case 'ia32':
      return path.join(__dirname, '..', 'bin', 'ssh-keygen-32.exe');
    case 'x64':
      return path.join(__dirname, '..', 'bin', 'ssh-keygen-64.exe');
  }

  throw new Error('Unsupported platform');
}

/**
 *
 * @param {string} location
 * @param {boolean} force
 * @param {(err?: any) => void} callback
 */
function checkAvailability(location, force, callback) {
  const pubLocation = location + '.pub';

  log('checking availability: ' + location);
  fs.access(location, fs.constants.R_OK | fs.constants.W_OK, (keyAccessErr) => {
    const keyExists = !keyAccessErr;

    log('checking availability: ' + pubLocation);
    fs.access(pubLocation, fs.constants.R_OK | fs.constants.W_OK, (pubKeyAccessErr) => {
      const pubKeyExists = !pubKeyAccessErr;
      doForce(keyExists, pubKeyExists);
    });
  });

  /**
   *
   * @param {boolean} keyExists
   * @param {boolean} pubKeyExists
   */
  function doForce(keyExists, pubKeyExists) {
    if (!force && keyExists) return callback(location + ' already exists');
    if (!force && pubKeyExists) return callback(pubLocation + ' already exists');
    if (!keyExists && !pubKeyExists) return callback();
    if (keyExists) {
      log('removing ' + location);
      fs.unlink(location, (errorOnRemovingKey) => {
        if (errorOnRemovingKey) return callback(errorOnRemovingKey);
        keyExists = false;
        if (!pubKeyExists) callback();
      });
    }
    if (pubKeyExists) {
      log('removing ' + pubLocation);
      fs.unlink(pubLocation, (errorOnPubKey) => {
        if (errorOnPubKey) return callback(errorOnPubKey);
        pubKeyExists = false;
        if (!keyExists) callback();
      });
    }
  }
}

/**
 *
 * @param {string} location
 * @param { {read:boolean, destroy: boolean, size:string, comment:string, password:string, format:string} } opts
 * @param {(err?: any, out?: {key:string, pubKey:string}) => void} callback
 */
function execSshKeygen(location, opts, callback) {
  const pubLocation = location + '.pub';
  const read = opts.read;
  const destroy = opts.destroy;

  /**
   * @param {string} key Private key found
   */
  const readPublicKeyAndFinish = (key) => {
    log('reading pub key ' + pubLocation);
    fs.readFile(pubLocation, 'utf8', (errorOnReadingPubKey, pubKey) => {
      if (errorOnReadingPubKey) return callback(errorOnReadingPubKey);

      if (!destroy) return callback(undefined, { key: key, pubKey: pubKey });

      log('destroying pub key ' + pubLocation);
      fs.unlink(pubLocation, (errorOnRemovingPubKey) => {
        if (errorOnRemovingPubKey) return callback(errorOnRemovingPubKey);

        key = key.toString();
        key = key.substring(0, key.lastIndexOf('\n')).trim();
        pubKey = pubKey.toString();
        pubKey = pubKey.substring(0, pubKey.lastIndexOf('\n')).trim();

        callback(undefined, { key: key, pubKey: pubKey });
      });
    });
  };

  const keygen = spawn(binPath(), [
    '-t',
    'rsa',
    '-b',
    opts.size,
    '-C',
    opts.comment,
    '-N',
    opts.password,
    '-f',
    location,
    '-m',
    opts.format,
  ]);

  keygen.stdout.on('data', (chunk) => {
    log('stdout:' + chunk);
  });

  keygen.stderr.on('data', (chunk) => {
    log('stderr:' + chunk);
  });

  keygen.once('exit', () => {
    log('exited');

    if (!read) return callback();

    log('reading key ' + location);
    fs.readFile(location, 'utf8', (errorOnReadingKey, key) => {
      if (errorOnReadingKey) return callback(errorOnReadingKey);

      if (!destroy) return readPublicKeyAndFinish(key);

      log('destroying key ' + location);
      fs.unlink(location, (errorOnRemovingKey) => {
        if (errorOnRemovingKey) return callback(errorOnRemovingKey);
        readPublicKeyAndFinish(key);
      });
    });
  });
}

module.exports = function sshKeygen(opts = {}, callback = undefined) {
  const location = opts.location || path.join(os.tmpdir(), 'id_rsa');

  if (_.isUndefined(opts.read)) opts.read = true;
  if (_.isUndefined(opts.force)) opts.force = true;
  if (_.isUndefined(opts.destroy)) opts.destroy = false;
  if (!opts.comment) opts.comment = '';
  if (!opts.password) opts.password = '';
  if (!opts.size) opts.size = '2048';
  if (!opts.format) opts.format = 'RFC4716';

  /**
   * @param {Function} onDoneErrorFirstCallback
   */
  function run(onDoneErrorFirstCallback) {
    checkAvailability(location, opts.force, (err) => {
      if (err) {
        log('availability err ' + err);
        onDoneErrorFirstCallback(err);
        return;
      }

      execSshKeygen(location, opts, onDoneErrorFirstCallback);
    });
  }

  if (_.isUndefined(callback)) {
    const util = require('util');
    return util.promisify(run)();
  } else {
    run(callback);
  }
};
