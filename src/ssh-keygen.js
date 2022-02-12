const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');
const _ = require('./utils');

const log = (() => {
  return process.env.VERBOSE
    ? //
      (msg) => console.log('ssh-keygen: ' + msg)
    : () => {}; // Do nothing if logging is not enabled
})();

/**
 * @throws {Error} If the platform is not supported.
 * @returns Path to the binary `ssh-keygen` program.
 */
const binPath = () => {
  if (process.platform !== 'win32') return 'ssh-keygen';

  switch (process.arch) {
    case 'ia32':
      return path.join(__dirname, '..', 'bin', 'ssh-keygen-32.exe');
    case 'x64':
      return path.join(__dirname, '..', 'bin', 'ssh-keygen-64.exe');
  }

  throw new Error('Unsupported platform');
};

/**
 *
 * @param {string} location
 * @param {boolean} force
 * @param {(err?: any) => void} callback
 */
const checkAvailability = (location, force, callback) => {
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
};

/**
 *
 * @param {string} filePath The path to the file that sould be read.
 * @param {boolean} shouldRemove Whether or not the file located at `filePath`
 * should be removed before calling `doneCallback`.
 * @param {(err?: NodeJS.ErrnoException, content?: string) => void} doneCallback
 */
const readFileAndRemove = (filePath, shouldRemove, doneCallback) => {
  log('reading file ' + filePath);
  fs.readFile(filePath, 'utf8', (errorOnReading, fileContent) => {
    if (errorOnReading) return doneCallback(errorOnReading);
    if (!shouldRemove) return doneCallback(undefined, fileContent);

    log('removing file ' + filePath);
    fs.unlink(filePath, (errorOnRemoving) => {
      if (errorOnRemoving) return doneCallback(errorOnRemoving);

      doneCallback(undefined, fileContent);
    });
  });
};

/**
 *
 * @param {string} location
 * @param { {read:boolean, destroy: boolean, size:string, comment:string, password:string, format:string} } opts
 * @param {(err?: any, out?: {key:string, pubKey:string}) => void} callback
 */
const execSshKeygen = (location, opts, callback) => {
  const pubkeyLocation = location + '.pub';
  let shouldReadFiles = opts.read;
  let shouldRemoveFiles = opts.destroy;
  let stderrMsg = '';

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
    stderrMsg += chunk.toString();
    log('stderr:' + chunk);
  });

  keygen.once('exit', () => {
    log('exited');

    // The ssh-keygen errored-out, thus it has not created the files. Then
    // we could skip file read & deletion operations.
    if (stderrMsg) {
      shouldReadFiles = false;
      shouldRemoveFiles = false;
    }

    if (!shouldReadFiles) return callback(stderrMsg ? stderrMsg : undefined, undefined);

    readFileAndRemove(location, shouldRemoveFiles, (errorOnReadingKey, key) => {
      if (errorOnReadingKey) return callback(errorOnReadingKey);

      readFileAndRemove(pubkeyLocation, shouldRemoveFiles, (errorOnReadingPubKey, pubKey) => {
        if (errorOnReadingPubKey) return callback(errorOnReadingPubKey);

        callback(undefined, {
          key: key.substring(0, key.lastIndexOf('\n')).trim(),
          pubKey: pubKey.substring(0, pubKey.lastIndexOf('\n')).trim(),
        });
      });
    });
  });
};

module.exports = function sshKeygen(opts = {}, callback = undefined) {
  const location = opts.location || path.join(require('os').tmpdir(), 'id_rsa');

  if (_.isUndefined(opts.read)) opts.read = true;
  if (_.isUndefined(opts.force)) opts.force = true;
  if (_.isUndefined(opts.destroy)) opts.destroy = false;
  if (!opts.comment) opts.comment = '';
  if (!opts.password) opts.password = '';
  if (!opts.size) opts.size = '2048';
  if (!opts.format) opts.format = 'RFC4716';

  if (_.isUndefined(callback)) {
    const util = require('util');
    return util.promisify(runSshKeygen)();
  } else {
    runSshKeygen(callback);
  }

  /**
   * @param {Function} onDoneErrorFirstCallback
   */
  function runSshKeygen(onDoneErrorFirstCallback) {
    checkAvailability(location, opts.force, (err) => {
      if (err) {
        log('availability err ' + err);
        onDoneErrorFirstCallback(err);
        return;
      }

      execSshKeygen(location, opts, onDoneErrorFirstCallback);
    });
  }
};
