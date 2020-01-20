/**
 * Modernized & further improved version of;
 * https://github.com/joeferner/node-http-mitm-proxy/blob/master/lib/ca.js
 *
 * node-forge based certificate creation utility.
 */
const util = require('util');
const crypto = require('crypto');
const forge = require('node-forge');

const {promisify} = util;
const {pki} = forge;

const randomBytes = promisify(crypto.randomBytes);
const generateKeyPair = promisify(pki.rsa.generateKeyPair);

class CertAuth {
  static async randomSerialNumber() {
    const buffer = await randomBytes(32);
    return buffer.toString('hex');
  }

  static getValidityDates(certValidityPeriodYear) {
    const notBefore = new Date();
    const notAfter = new Date();

    notBefore.setDate(notBefore.getDate() - 1);
    notAfter.setFullYear(notBefore.getFullYear() + certValidityPeriodYear);

    return {
      notBefore,
      notAfter
    }
  }

  static fromPem(certPem, privateKeyPem, publicKeyPem) {
    return {
      cert: pki.certificateFromPem(certPem),
      privateKey: pki.privateKeyFromPem(privateKeyPem),
      publicKey: pki.publicKeyFromPem(publicKeyPem)
    };
  }

  static toPem(cert, privateKey, publicKey) {
    return {
      certPem: pki.certificateToPem(cert),
      privateKeyPem: pki.privateKeyToPem(privateKey),
      publicKeyPem: pki.publicKeyToPem(publicKey)
    };
  }

  static async generateCertAuth({
    certValidityPeriodYear,
    CertAuthAttributes,
    CertAuthExtensions
  }) {
    const keys = await generateKeyPair({bits: 2048});
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = await CertAuth.randomSerialNumber();

    const {notAfter, notBefore} = CertAuth.getValidityDates(certValidityPeriodYear);

    cert.validity.notBefore = notBefore;
    cert.validity.notAfter = notAfter;

    cert.setSubject(CertAuthAttributes);
    cert.setIssuer(CertAuthAttributes);
    cert.setExtensions(CertAuthExtensions);
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const certauth = {
      cert,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    };

    const pem = CertAuth.toPem(cert, keys.privateKey, keys.publicKey);

    return {certauth, pem};
  }

  static async generateServerCertKeys({
    certauth,
    hostnames,
    certValidityPeriodYear,
    ServerAttributes,
    ServerExtensions
  }) {
    hostnames = typeof hostnames === 'string' ? [hostnames] : hostnames;

    const mainHostname = hostnames[0];
    const serverKeys = pki.rsa.generateKeyPair(2048);
    const serverCert = pki.createCertificate();

    serverCert.publicKey = serverKeys.publicKey;
    serverCert.serialNumber = await CertAuth.randomSerialNumber();

    const {notAfter, notBefore} = CertAuth.getValidityDates(certValidityPeriodYear);
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
    serverCert.setIssuer(certauth.cert.issuer.attributes);
    serverCert.setExtensions(serverExtensions);
    serverCert.sign(certauth.privateKey, forge.md.sha256.create());

    const serverauth = {
      cert: serverCert,
      privateKey: serverKeys.privateKey,
      publicKey: serverKeys.publicKey,
    };

    const pem = CertAuth.toPem(serverCert, serverKeys.privateKey, serverKeys.publicKey);

    return {serverauth, pem};
  }
}

module.exports = CertAuth;