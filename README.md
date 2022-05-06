# ssh-keygen

[![npm](https://img.shields.io/npm/v/ssh-keygen-lite.svg)](https://www.npmjs.com/package/ssh-keygen-lite)
[![npm downloads](https://img.shields.io/npm/dt/ssh-keygen-lite.svg)](https://www.npmjs.com/package/ssh-keygen-lite)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/ssh-keygen-lite.svg)](https://www.npmjs.com/package/ssh-keygen-lite)

Generates a SSH key-pair using.

### Install

1. Make sure you have [`ssh-keygen`](https://linux.die.net/man/1/ssh-keygen) installed in your machine. Try `$ ssh-keygen` if you aren't sure
2. Run `npm install ssh-keygen-lite` if you're using NPM

### Usage

> **TIP**: If you set a non-empty string to the environment variable `VERBOSE`, you'll enable the verbose mode.  
> Logs from the lib are prefixed by `ssh-keygen-lie:` while logs from the binary `ssh-keygen` are emitted with the prefix `ssh-keygen:`

```js
// With CommonJS
const path = require('path');
const keygen = require('ssh-keygen-lite');

keygen(
  {
    // sshKeygenPath: 'ssh-keygen',
    location: path.join(__dirname, 'foo_rsa'),
    read: true,
    force: true,
    destroy: false,
    comment: 'joe@foobar.com',
    password: 'keypassword',
    size: '2048',
    format: 'PEM',
  },
  // If you omit this callback function, a Promise will be returned instead!
  function onDoneCallback(err, out) {
    // The error could be related to ssh-keygen binary or file system errors.
    if (err) return console.error('Something went wrong:', err);
    console.log('Keys created!');
    console.log('private key:', out.key);
    console.log('public key:', out.pubKey);
  },
);
```

Read about the expected types [here](./index.d.ts).

#### Parameters

- **`location`**: desired location for the key. The public key will be at the location + `.pub`. Defaults to a file called `id_rsa` inside a temporary directory
- **`read`**: should the callback have the key files read into it. Defaults to `true`
- **`force`**: destroy pre-existing files with the location name and the public key name. Defaults to `true`
- **`destroy`**: destroy the key files once they have been read. Defaults to `false`
- **`comment`**: the comment that should be embedded into the key. Defaults to an empty `string`
- **`password`**: the password for the key. Falsy values will turn this into an empty string. Defaults to an empty `string`
- **`size`**: Specifies the number of bits (as `string`) in the key to create. Defaults to `'2048'`
- **`format`**: Specify a key format for key generation. Defaults to `'RFC4716'`

#### Promise-based API

> **NOTE:** You'll need NodeJS version 8 or later because it's rely on [`util.promisify`](https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original) utility.

If you don't supply the second parameter to `keygen` (ie., the callback), then it will return a Promise that resolves to an plain object with `key` and `pubkey` properties.

### How it works

The following shell command will get executed:

```bash
$ ssh-keygen -t rsa -b 2048 -C "joe@foobar.com" -N "keypassword" -m PEM -f ./foo_rsa
Generating public/private rsa key pair.
Your identification has been saved in ./foo_rsa.
Your public key has been saved in ./foo_rsa.pub.
The key fingerprint is:
02:f7:40:b6:c7:b3:a3:68:16:53:dd:86:63:df:b5:33 joe@foobar.com
The key's randomart image is:
+--[ RSA 2048]----+
|      o          |
|     o + o       |
|    . = O o   .  |
|     + = * . . . |
|    o . S . . E  |
|     + o .     o |
|    + .          |
|   o             |
|                 |
+-----------------+
```

### Note

It is advisable to generate your keys on a machine with a significant random source like one with a mouse/trackpad.

### License

`ssh-keygen-lite` is [open source](./LICENSE.md) under the MIT license.

All credits go to [**Eric Vicenti**](https://github.com/ericvicenti).

### Windows

This package bundles binaries for windows. The current version is: `2.4.4.2-rc3`
