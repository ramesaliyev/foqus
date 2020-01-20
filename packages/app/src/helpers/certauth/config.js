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

module.exports = {
  CertAuthAttributes,
  CertAuthExtensions,
  ServerAttributes,
  ServerExtensions
};