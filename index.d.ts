/// <reference types="node" />

interface Config {
  location?: string;
  read?: boolean;
  force?: boolean;
  destroy?: boolean;
  /**
   * Path to the executable `ssh-keygen`.
   * You will get an error if this path isn't valid.
   * @default 'ssh-keygen'
   */
  sshKeygenPath?: string;
}

interface SshKeygenOptions {
  /**
   * Provides the type of the key to be generated.
   * @default rsa
   */
  type?: string;
  /**
   * Provides a new comment to `shh-keygen` utility.
   * @default ''
   */
  comment?: string;
  /**
   * Provides the new passphrase.
   * @default ''
   */
  password?: string;
  /**
   * Specifies the number of bits in the key to create. The minimum size is
   * 1024 bits.
   * @default '2048'
   */
  size?: string;
  /**
   * Specify a key format for key generation. Setting a format of "PEM" when
   * generating a supported private key type will cause the key to be stored
   * in the legacy PEM private key format.
   * @default 'RFC4716'
   */
  format?: 'RFC4716' | 'PKCS8' | 'PEM';
}

/**
 * Generates SSH key-pairs.
 */
declare function keygen(
  opts: Config & SshKeygenOptions,
  callback: (
    errOrMessage?: string | NodeJS.ErrnoException,
    out?: { key: string; pubKey: string },
  ) => void,
): void;

/**
 * Generates SSH key-pairs.
 */
declare function keygen(opts: Config & SshKeygenOptions): Promise<{ key: string; pubKey: string }>;

export default keygen;
