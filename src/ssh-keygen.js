const spawn = require('child_process').spawn;
const fs = require('fs');
const os = require('os');
const path = require('path');
const _ = require('./utils');

function log(a) {
  if (process.env.VERBOSE) console.log('ssh-keygen: ' + a);
}

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
    log('checking availability: ' + pubLocation);
    const keyExists = !keyAccessErr;
    fs.access(location, fs.constants.R_OK | fs.constants.W_OK, (pubKeyAccessErr) => {
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
      fs.unlink(location, (err) => {
        if (err) return callback(err);
        keyExists = false;
        if (!keyExists && !pubKeyExists) callback();
      });
    }
    if (pubKeyExists) {
      log('removing ' + pubLocation);
      fs.unlink(pubLocation, (err) => {
        if (err) return callback(err);
        pubKeyExists = false;
        if (!keyExists && !pubKeyExists) callback();
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

  keygen.on('exit', () => {
    log('exited');

    if (!read) {
      if (callback) callback();
      return;
    }

    log('reading key ' + location);
    fs.readFile(location, 'utf8', (_err, key) => {
      if (destroy) {
        log('destroying key ' + location);
        fs.unlink(location, (err) => {
          if (err) return callback(err);
          readPubKey();
        });
      } else {
        readPubKey();
      }

      function readPubKey() {
        log('reading pub key ' + pubLocation);
        fs.readFile(pubLocation, 'utf8', (_err, pubKey) => {
          if (!destroy) {
            callback(undefined, { key: key, pubKey: pubKey });
            return;
          }

          log('destroying pub key ' + pubLocation);
          fs.unlink(pubLocation, (err) => {
            if (err) return callback(err);

            key = key.toString();
            key = key.substring(0, key.lastIndexOf('\n')).trim();
            pubKey = pubKey.toString();
            pubKey = pubKey.substring(0, pubKey.lastIndexOf('\n')).trim();
            callback(undefined, { key: key, pubKey: pubKey });
          });
        });
      }
    });
  });

  keygen.stderr.on('data', (chunk) => {
    log('stderr:' + chunk);
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
