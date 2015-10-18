'use strict';

const crypto = require('crypto');

function makeSignatureString(params) {
  let signature = '';
  if (Array.isArray(params)) {
    for (let val of params) {
      signature += makeSignatureString(val);
    }
  } else if (typeof params === 'object') {
    let keys = Object.keys(params).sort();
    for (let key of keys) {
      signature += makeSignatureString(params[key]);
    }
  } else {
    signature = `:${params}`;
  }
  return signature;
}

function makeSignature(token, params) {
  let signature = makeSignatureString(params);
  return crypto.createHash('md5')
    .update(token + signature)
    .digest('hex');
}

module.exports = makeSignature;
