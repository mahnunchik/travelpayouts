'use strict';

const crypto = require('crypto');

function makeSignatureString(params) {
  let signature = '';
  if (Array.isArray(params)) {
    for (const val of params) {
      signature += makeSignatureString(val);
    }
  } else if (typeof params === 'object') {
    const keys = Object.keys(params).sort();
    for (const key of keys) {
      signature += makeSignatureString(params[key]);
    }
  } else {
    signature = `:${params}`;
  }
  return signature;
}

function makeSignature(token, params) {
  const signature = makeSignatureString(params);
  return crypto.createHash('md5')
    .update(token + signature)
    .digest('hex');
}

module.exports = makeSignature;
