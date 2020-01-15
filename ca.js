/**
 * Mostyl modernized version of;
 * https://github.com/joeferner/node-http-mitm-proxy/blob/master/lib/ca.js
 *
 * node-forge based certificate creation utility.
 */
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const forge = require('node-forge');

const fsp = fs.promises;
const {promisify} = util;
const {pki} = forge;

const randomBytes = promisify(crypto.randomBytes);
const generateKeyPair = promisify(pki.rsa.generateKeyPair);

const CertAuthAttributes = [
  {
    name: 'commonName',
    value: 'FoqusProxyCA'
  },
  {
    name: 'countryName',
    value: 'Internet'
  },
  {
    shortName: 'ST',
    value: 'Internet'
  },
  {
    name: 'localityName',
    value: 'Internet'
  },
  {
    name: 'organizationName',
    value: 'Foqus Proxy CA'
  },
  {
    shortName: 'OU',
    value: 'CA'
  }
];

const CertAuthExtensions = [
  {
    name: 'basicConstraints',
    cA: true
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
  },
  {
    name: 'subjectKeyIdentifier'
  }
];

const ServerAttributes = [
  {
    name: 'countryName',
    value: 'Internet'
  },
  {
    shortName: 'ST',
    value: 'Internet'
  },
  {
    name: 'localityName',
    value: 'Internet'
  },
  {
    name: 'organizationName',
    value: 'Foqus Proxy CA'
  },
  {
    shortName: 'OU',
    value: 'Foqus Proxy Server Certificate'
  }
];

const ServerExtensions = [
  {
    name: 'basicConstraints',
    cA: false
  },
  {
    name: 'keyUsage',
    keyCertSign: false,
    digitalSignature: true,
    nonRepudiation: false,
    keyEncipherment: true,
    dataEncipherment: true
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: false,
    emailProtection: false,
    timeStamping: false
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: false,
    objsign: false,
    sslCA: false,
    emailCA: false,
    objCA: false
  },
  {
    name: 'subjectKeyIdentifier'
  }
];

const defaultConfig = {
  certsSubpath: 'certs',
  keysSubpath: 'keys',
  caFileName: 'ca',
  certValidityPeriodYear: 100,
};

class CertAuth {
  static async create(config) {
    if (!config) {
      throw new Error('Missing config!');
    }

    const certAuth = new CertAuth(config);

    await fsp.mkdir(certAuth.persistPath, {recursive: true});
    await fsp.mkdir(certAuth.certsPath, {recursive: true});
    await fsp.mkdir(certAuth.keysPath, {recursive: true});

    try {
      await fsp.access(certAuth.caPemPath, fs.constants.R_OK | fs.constants.W_OK);
      await certAuth.loadCertAuth();
    } catch (err) {
      await certAuth.generateCertAuth();
    }

    return certAuth;
  }

  constructor({
    persistPath,
    certsSubpath = defaultConfig.certsSubpath,
    keysSubpath = defaultConfig.keysSubpath,
    caFileName = defaultConfig.caFileName,
    certValidityPeriodYear = defaultConfig.certValidityPeriodYear
  }) {
    this.persistPath = persistPath;
    this.certsPath = path.join(persistPath, certsSubpath);
    this.keysPath = path.join(persistPath, keysSubpath);

    this.caPemName = `${caFileName}.pem`;
    this.caPrivateKeyName = `${caFileName}.private.key`;
    this.caPublicKeyName = `${caFileName}.public.key`;

    this.caPemPath = path.join(this.certsPath, this.caPemName);
    this.caPrivateKeyPath = path.join(this.keysPath, this.caPrivateKeyName);
    this.caPublicKeyPath = path.join(this.keysPath, this.caPublicKeyName);

    this.certValidityPeriodYear = certValidityPeriodYear;

    this.CACert = null;
    this.CAKeys = null;
  }

  async randomSerialNumber() {
    const buffer = await randomBytes(32);
    return buffer.toString('hex');
  }

  getValidityDates() {
    const notBefore = new Date();
    const notAfter = new Date();

    notBefore.setDate(notBefore.getDate() - 1);
    notAfter.setFullYear(notBefore.getFullYear() + this.certValidityPeriodYear);

    return {
      notBefore,
      notAfter
    }
  }

  async generateCertAuth() {
    const keys = await generateKeyPair({bits: 2048});
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = this.randomSerialNumber();

    const {notAfter, notBefore} = this.getValidityDates();
    cert.validity.notBefore = notBefore;
    cert.validity.notAfter = notAfter;

    cert.setSubject(CertAuthAttributes);
    cert.setIssuer(CertAuthAttributes);
    cert.setExtensions(CertAuthExtensions);
    cert.sign(keys.privateKey, forge.md.sha256.create());

    this.CACert = cert;
    this.CAKeys = keys;

    await fsp.writeFile(this.caPemPath, pki.certificateToPem(cert));
    await fsp.writeFile(this.caPrivateKeyPath, pki.privateKeyToPem(keys.privateKey));
    await fsp.writeFile(this.caPublicKeyPath, pki.publicKeyToPem(keys.publicKey));
  }

  async loadCertAuth() {
    const caCertPem = await fsp.readFile(this.caPemPath, 'utf-8');
    const caPrivateKeyPem = await fsp.readFile(this.caPrivateKeyPath, 'utf-8');
    const caPublicKeyPem = await fsp.readFile(this.caPublicKeyPath, 'utf-8');

    this.CACert = pki.certificateFromPem(caCertPem);
    this.CAKeys = {
      privateKey: pki.privateKeyFromPem(caPrivateKeyPem),
      publicKey: pki.publicKeyFromPem(caPublicKeyPem)
    };
  }

  async generateServerCertKeys(hostnames) {
    hostnames = typeof hostnames === 'string' ? [hostnames] : hostnames;

    const mainHostname = hostnames[0];
    const serverKeys = pki.rsa.generateKeyPair(2048);
    const serverCert = pki.createCertificate();

    serverCert.publicKey = serverKeys.publicKey;
    serverCert.serialNumber = this.randomSerialNumber();

    const {notAfter, notBefore} = this.getValidityDates();
    serverCert.validity.notBefore = notBefore;
    serverCert.validity.notAfter = notAfter;

    const serverAttributes = [
      {name: 'commonName', value: mainHostname},
      ...ServerAttributes
    ];

    const serverExtensions = [
      ...ServerExtensions,
      {
        name: 'subjectAltName',
        altNames: hostnames.map(host =>
          host.match(/^[\d\.]+$/) ?
            {type: 7, ip: host} :
            {type: 2, value: host}
        )
      }
    ];

    serverCert.setSubject(serverAttributes);
    serverCert.setIssuer(this.CACert.issuer.attributes);
    serverCert.setExtensions(serverExtensions);
    serverCert.sign(this.CAKeys.privateKey, forge.md.sha256.create());

    const serverCertPem = pki.certificateToPem(serverCert);
    const serverPrivateKeyPem = pki.privateKeyToPem(serverKeys.privateKey);
    const serverPublicKeyPem = pki.publicKeyToPem(serverKeys.publicKey);

    const fileName = mainHostname.replace(/\*/g, '_');

    await fsp.writeFile(path.join(this.certsPath, `${fileName}.pem`), serverCertPem);
    await fsp.writeFile(path.join(this.keysPath, `${fileName}.private.key`), serverPrivateKeyPem);
    await fsp.writeFile(path.join(this.keysPath, `${fileName}.public.key`), serverPublicKeyPem);

    return {
      cert: serverCertPem,
      keys: {
        private: serverPrivateKeyPem,
        public: serverPublicKeyPem
      }
    };
  }
}

module.exports = CertAuth;