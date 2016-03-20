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
    console.log('start', segments);
    const start = new Date();

    return this.flightSearch(segments, options)
      .then(data => {
        if (!data.search_id) {
          throw new VError('wrong search_id %j', data);
        }
        return delay(1000)
          .then(() => this.flightSearchAllResults(data.search_id))
          .then((results) => {
            console.log('done!', (new Date() - start) / 1000, segments);
            return results;
          });
      });
  }

  flightSearch(segments, options) {
    const params = Object.assign(
      { segments },
      options,
      DEFAULT_SEARCH_PARAMS,
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
          console.log('results is empty - force retry');
          return this.flightSearchAllResults(id, prevResults, startTime);
        }
        const allResults = concat(prevResults || [], results);

        console.log('results length:', results.length,
          '\nproposals length:', results.map((item) => {
            if (item.proposals) {
              // if (item.proposals.length == 0) {console.log(item)}
              return item.proposals.length;
            }
            return undefined;
          }));

        if (results[results.length - 1].search_id && !results[results.length - 1].meta) {
          console.log('last item of results contains only search_id');
          return allResults;
        }

        console.log((new Date()) - startTime, this.timeout);
        if (this.timeout && (new Date) - startTime >= this.timeout) {
          console.log('timeout!!!!');
          return allResults;
        }

        // console.log(results)
        // console.log('------------------')
        // results.map(res => res.proposals.map(proposal => console.log(proposal.terms)));
        return delay(1000)
          .then(() => this.flightSearchAllResults(id, allResults, startTime));
      });
  }
}

module.exports = TravelPayouts;
