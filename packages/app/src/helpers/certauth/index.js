const fs = require('fs');
const path = require('path');
const CertAuth = require('./certauth');

const {
  CertAuthAttributes,
  CertAuthExtensions,
  ServerAttributes,
  ServerExtensions
} = require('./config');

const fsp = fs.promises;

const CERT_VALIDITY_YEAR = 20;
const CA_FILENAME = 'ca';
const FILE_CERT_SUFFIX = '.cert.pem';
const FILE_PRIVATE_KEY_SUFFIX = '.private.key';
const FILE_PUBLIC_KEY_SUFFIX = '.public.key';

class CertAuthManager {
  static async use(persistPath) {
    console.log(`Initializing to use ${persistPath}...`);

    const manager = new CertAuthManager(persistPath);

    await fsp.mkdir(manager.persistPath, {recursive: true});

    try {
      await manager._isCAFileAccessible(); // will throw if not
      await manager._loadCertAuthFromFile();
    } catch (err) {
      await manager._generateCertAuth();
    }

    return manager;
  }

  constructor(persistPath) {
    this.persistPath = persistPath;
    this.certauth = null;
    this.serverauths = {};
  }

  getPaths(fileName) {
    fileName = fileName.replace(/\*/g, '_');

    return {
      cert: path.join(this.persistPath, fileName + FILE_CERT_SUFFIX),
      privateKey: path.join(this.persistPath, fileName + FILE_PRIVATE_KEY_SUFFIX),
      publicKey: path.join(this.persistPath, fileName + FILE_PUBLIC_KEY_SUFFIX)
    }
  }

  async _saveToFile(fileName, certPem, privateKeyPem, publicKeyPem) {
    console.log(`Saving to file ${fileName}...`);

    const paths = this.getPaths(fileName);

    await fsp.writeFile(paths.cert, certPem);
    await fsp.writeFile(paths.privateKey, privateKeyPem);
    await fsp.writeFile(paths.publicKey, publicKeyPem);
  }

  async _loadFromFile(fileName) {
    console.log(`Loading from file ${fileName}...`);

    const paths = this.getPaths(fileName);

    const certPem = await fsp.readFile(paths.cert, 'utf-8');
    const privateKeyPem = await fsp.readFile(paths.privateKey, 'utf-8');
    const publicKeyPem = await fsp.readFile(paths.publicKey, 'utf-8');

    return {certPem, privateKeyPem, publicKeyPem};
  }

  async _isFileAccesible(filePath) {
    await fsp.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
  }

  async _isCAFileAccessible() {
    await this._isFileAccesible(this.getPaths(CA_FILENAME).cert);
  }

  async _loadCertAuthFromFile() {
    const {certPem, privateKeyPem, publicKeyPem} = await this._loadFromFile(CA_FILENAME);

    this.certauth = CertAuth.fromPem(certPem, privateKeyPem, publicKeyPem);
  }

  async _generateCertAuth() {
    console.log(`Generating Certificate Authority...`);

    const {certauth, pem} = await CertAuth.generateCertAuth({
      certValidityPeriodYear: CERT_VALIDITY_YEAR,
      CertAuthAttributes,
      CertAuthExtensions
    });

    await this._saveToFile(CA_FILENAME, pem.certPem, pem.privateKeyPem, pem.publicKeyPem);

    this.certauth = certauth;
  }

  async _generateServerCertKeys(hostname) {
    console.log(`Generating server cert and keys for ${hostname}...`);

    const {pem} = await CertAuth.generateServerCertKeys({
      hostnames: hostname,
      certauth: this.certauth,
      certValidityPeriodYear: CERT_VALIDITY_YEAR,
      ServerAttributes,
      ServerExtensions
    });

    await this._saveToFile(hostname, pem.certPem, pem.privateKeyPem, pem.publicKeyPem);

    return pem;
  }

  async getServerCertKeys(hostname) {
    console.log(`Getting server cert and keys for ${hostname}...`);

    let pem = this.serverauths[hostname];

    if (!pem) {
      try {
        await this._isFileAccesible(this.getPaths(hostname).cert);
        pem = await this._loadFromFile(hostname);
        await CertAuth.fromPem(pem.certPem, pem.privateKeyPem, pem.publicKeyPem); // check if files are ok
      } catch (err) {
        pem = await this._generateServerCertKeys(hostname);
      }

      if (!pem) {
        throw new Error(`Cannot get or create pem for ${hostname}`);
      }

      this.serverauths[hostname] = pem;
    }

    return pem;
  };
}

module.exports = CertAuthManager;