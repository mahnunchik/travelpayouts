'use strict';

const got = require('got');
const VError = require('verror');
const moment = require('moment');
const signature = require('./signature');

class TravelPayouts {
  constructor(token, marker, options) {
    if (!token) {
      throw new Error('token is required');
    }
    if (!marker) {
      throw new Error('marker is required');
    }
    this._token = token;
    this._marker = marker;
    this.options = options;
  }

  set options (options) {
    options = options || {};
    this._options = {};

    this._base = options.base || 'http://api.travelpayouts.com';

    this._options.host = options.host || 'example.com';
    this._options.user_ip = options.user_ip || '127.0.0.1';
    this._options.locale = options.locale || 'ru';
    this._options.trip_class = options.trip_class || 'Y';
    this._options.passengers = options.passengers || {
      adults: 1,
      children: 0,
      infants: 0
    };
    this._options.know_english = options.know_english != null ? options.know_english : true;
  }

  search (segments, options, cb) {
    if (!cb) {
      cb = options;
      options = {};
    }
    if (!Array.isArray(segments)) {
      segments = [segments];
    }

    segments = segments.map(function(segment) {
      if (typeof segment.date != 'string') {
        segment.date = moment(segment.date).format('YYYY-MM-DD');
      }
      return segment;
    });

    this.flightSearch(segments, options, (err, data) => {
      if (err) {
        return cb(err);
      }
      if (!data.search_id) {
        return cb(new VError('wrong search_id %j', data));
      }
      let id = data.search_id;
      data.results = [];

      const resultsHandler = (err, results) => {
        if (err) {
          return cb(err);
        }
        results.forEach(function(result) {
          if (result.meta) {
            data.results.push(result);
          }
        });
        if (results.length === 0) {
          data.reason = 'array is empty';
          return cb(null, data);
        }
        if (results.length === 1 && results[0].search_id && !results[0].meta) {
          data.reason = 'array with one element search_id';
          return cb(null, data);
        }
        if (results[results.length-1].search_id && !results[results.length-1].meta) {
          console.log('result contain only search_id');
        }
        this.flightSearchResults(id, options, resultsHandler);
      };

      this.flightSearchResults(id, options, resultsHandler);
    });
  }

  flightSearch (segments, options, cb) {
    let params = {
      marker: this._marker,
      host: options.host || this._options.host,
      user_ip: options.user_ip || this._options.user_ip,
      locale: options.locale || this._options.locale,
      trip_class: options.trip_class || this._options.trip_class,
      passengers: options.passengers || this._options.passengers,
      know_english: options.know_english != null ? options.know_english : this._options.know_english,
      segments: segments
    };
    params.signature = signature(this._token, params);
    // hack for TravelPayouts API
    params.know_english = params.know_english.toString();

    got.post(`${options.base || this._base}/v1/flight_search`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      json: true
    }, function(err, data, res) {
      if (err) {
        return cb(new VError(err, 'flight_search'));
      }
      if (res.statusCode !== 200) {
        return new VError('flight_search statusCode: "%s" %j', res.statusCode, params);
      }
      cb(null, data);
    });
  }

  flightSearchResults (id, options, cb) {
    got.get(`${options.base || this._base}/v1/flight_search_results`, {
      query: {
        uuid: id
      },
      json: true
    }, function(err, data, res) {
      if (err) {
        return cb(new VError(err, 'flight_search_results'));
      }
      if (res.statusCode !== 200) {
        return new VError('flight_search_results statusCode: "%s" search_id "%s"', res.statusCode, id);
      }
      cb(null, data);
    });
  }
}

module.exports = TravelPayouts;
