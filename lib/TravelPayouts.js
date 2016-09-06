/* eslint no-param-reassign: 0 */
'use strict';

const got = require('got');
const VError = require('verror');
const signature = require('./signature');

const isEqual = require('lodash.isequal');
const unionWith = require('lodash.unionwith');

const DEFAULT_SEARCH_PARAMS = {
  host: 'example.com',
  user_ip: '127.0.0.1',
  locale: 'ru',
  trip_class: 'Y',
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  know_english: true,
};

function delay(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

function formatDate(date) {
  const ISOString = new Date(date).toISOString();
  return ISOString.substr(0, ISOString.indexOf('T'));
}

function concat(a, b) {
  return unionWith(a, b, isEqual);
}

class TravelPayouts {
  /**
   * Create TravelPayouts API instance
   *
   * @constructor
   * @this  {TravelPayouts}
   * @param {string} token - TravelPayouts API token
   * @param {string} marker - TravelPayouts marker
   * @param {object} options
   * @param {string} options.url - TravelPayouts API Base URL
   * @param {number} options.timeout - Timeout for all requests in total
   */
  constructor(token, marker, options) {
    if (!token) {
      throw new Error('token is required');
    }
    if (!marker) {
      throw new Error('marker is required');
    }
    options = options || {};
    this.token = token;
    this.marker = marker;
    this.url = options.url || 'http://api.travelpayouts.com';
    // 60 seconds
    this.timeout = options.timeout || 60 * 1000;
  }

  endpoint(method) {
    return `${this.url}/${method}`;
  }

  /**
   * Flights search
   *
   * @param  {object|object[]} segments
   * @param  {string} segments.origin - origin IATA or string "City, Country (IATA)".
   * IATA code is shown by uppercase letters
   * @param  {string} segments.destination - destination IATA or string "City, Country (IATA)".
   * IATA code is shown by uppercase letters (for example: "Berlin, Germany (BER)");
   * @param  {date|string} segments.date - departure date
   * Date object or string in format yyyy-mm-dd
   * @param  {object} options
   * @param  {string} options.host - host's request (must be replaced by the address of your
   * website where API will be used)
   * @param  {string} options.user_ip - user's ip address
   * @param  {string} options.locale - the language of the search result (en, ru, de, es, fr, pl)
   * @param  {string} options.trip_class - flight class (Y – Economy, C – Business)
   * @param  {string} options.passengers - passenger Information
   * @param  {number} options.passengers.adults -  the number of adult passengers (from 1 to 9)
   * @param  {number} options.passengers.children - the number of children (from 0 to 6)
   * @param  {number} options.passengers.infants - the number of infants (from 0 to 6)
   * @param  {boolean} options.know_english - include English-speaking gates in search results
   * @return {promise}
   */
  search(segments, options) {
    if (!Array.isArray(segments)) {
      segments = [segments];
    }

    segments = segments.map(segment => {
      if (typeof segment.date != 'string') {
        segment.date = formatDate(segment.date);
      }
      return segment;
    });

    return this.flightSearch(segments, options)
      .then(data => {
        if (!data.search_id) {
          throw new VError('wrong search_id %j', data);
        }
        return delay(1000)
          .then(() => this.flightSearchAllResults(data.search_id));
      });
  }

  flightSearch(segments, options) {
    const params = Object.assign(
      { segments },
      DEFAULT_SEARCH_PARAMS,
      options,
      { marker: this.marker });
    // hacks for TravelPayouts API
    params.know_english = params.know_english.toString();
    // end hacks
    params.signature = signature(this.token, params);

    return got.post(this.endpoint('v1/flight_search'), {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
    .then(res => {
      if (res.statusCode !== 200) {
        throw new VError('flight_search status: "%s" %j', res.statusCode, params);
      }
      return JSON.parse(res.body);
    })
    .catch(err => {
      throw new VError(err, 'flight_search');
    });
  }

  flightSearchResults(id) {
    return got.get(this.endpoint('v1/flight_search_results'), {
      query: { uuid: id },
    })
    .then(res => {
      if (res.statusCode !== 200) {
        throw new VError('flight_search_results status: "%s" search_id "%s"', res.statusCode, id);
      }
      return JSON.parse(res.body);
    })
    .catch(err => {
      throw new VError(err, 'flight_search_results');
    });
  }

  flightSearchAllResults(id, prevResults, startTime) {
    if (!startTime) {
      startTime = new Date();
    }

    return this.flightSearchResults(id)
      .then(results => {
        if (results.length === 0) {
          // console.log('results is empty - force retry');
          return this.flightSearchAllResults(id, prevResults, startTime);
        }
        const allResults = concat(prevResults || [], results);

        if (results[results.length - 1].search_id && !results[results.length - 1].meta) {
          return {
            results: allResults,
            reason: 'normal',
          };
        }

        if (this.timeout) {
          const spent = (new Date()) - startTime;
          if (spent >= this.timeout) {
            return {
              results: allResults,
              reason: `timeout '${spent}'`,
            };
          }
        }

        return delay(1000)
          .then(() => this.flightSearchAllResults(id, allResults, startTime));
      });
  }
}

module.exports = TravelPayouts;
