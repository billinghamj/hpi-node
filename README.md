# hpi-node

## installation

```bash
npm install @billinghamj/hpi
```

## usage

```js
var hpi = require('@billinghamj/hpi');

var config = {
  url: 'https://wss.hpi.co.uk/TradeSoap/services/SupplementaryEnquiryV1',
  action: 'http://webservices.hpi.co.uk/SupplementaryEnquiryV1',
  customer: 'SomeCustomerId',
  password: 'hunter2',
  initials: 'FOO',
  product: 'HPI75',
  supplementaryProducts: ['ADSMT'],
};

var vrm = 'LB07SEO';
var vin = 'WVWZZZ9NZ7Y235732';

// by VRM and/or VIN
hpi.query({ vrm: vrm, vin: vin }, config)
  .then(function (data) {
    console.log(data);
  })
  .catch(function (error) {
    console.warn(error);
  });

// by VRM
hpi.queryVrm(vrm, config)
  .then(function (data) {
    console.log(data);
  })
  .catch(function (error) {
    console.warn(error);
  });

// by VIN
hpi.queryVin(vin, config)
  .then(function (data) {
    console.log(data);
  })
  .catch(function (error) {
    console.warn(error);
  });
```
