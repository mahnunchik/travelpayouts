# TravelPayouts API

> [TravelPayouts](https://www.travelpayouts.com/) Affiliate Network for Your Travel Traffic Monetization

## Installation

```bash
$ npm install --save travelpayouts-api
```
## Usage

All methods are [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)-based.

```js
const TravelPayouts = require('travelpayouts-api');
const api = new TravelPayouts('YOUR_TOKEN', 'YOUR_MARKER');

return api.search({
  origin: 'NYC',
  destination: 'HKT',
  date: new Date(),
})
.then(res => {
  console.log(res.results);
})
.catch(err => {
  console.error(err.stack || err.message);
});

```

## API

### Class: TravelPayouts

#### new TravelPayouts(token, marker, options)

Create TravelPayouts API instance

**Parameters**

**token**: `string` - TravelPayouts API token

**marker**: `string` - TravelPayouts marker

**options**: `object`

 - **options.url**: `string` - TravelPayouts API Base URL

 - **options.timeout**: `number` - Timeout for all requests in total


#### TravelPayouts.search(segments, options)

Flights search

**Parameters**

**segments**: `object | Array[object]`

- **segments.origin**: `string` - origin IATA or string "City, Country (IATA)". IATA code is shown by uppercase letters

- **segments.destination**: `string` - destination IATA or string "City, Country (IATA)". IATA code is shown by uppercase letters (for example: "Berlin, Germany (BER)");

- **segments.date**: `date | string` - departure date, Date object or string in format yyyy-mm-dd

**options**: `object`

- **options.host**: `string` - host's request (must be replaced by the address of your website where API will be used)

- **options.user_ip**: `string` - user's ip address

- **options.locale**: `string` - the language of the search result (en, ru, de, es, fr, pl)

- **options.trip_class**: `string` - flight class (Y – Economy, C – Business)

- **options.passengers**: `string` - passenger Information

- **options.passengers.adults**: `number` - the number of adult passengers (from 1 to 9)

- **options.passengers.children**: `number` - the number of children (from 0 to 6)

- **options.passengers.infants**: `number` - the number of infants (from 0 to 6)

- **options.know_english**: `boolean` - include English-speaking gates in search results

- **options.[...]** - any additional [got](https://www.npmjs.com/package/got) options

**Returns**: `promise`

## About

`travelpayouts-api` module is used in production on the [avia.ml](https://avia.ml/) website.

## License

MIT © [Evgeny Vlasenko](https://github.com/mahnunchik)
