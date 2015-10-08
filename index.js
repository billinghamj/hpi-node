const XmlParser = require('xml2js').Parser;
const Request = require('request');

module.exports = function (reg, config) {
	const query = serialise(reg, config);

	return new Promise(function (resolve, reject) {
		Request({
			method: 'POST',
			uri: config.url,
			body: query,
		}, function (error, response, body) {
			if (error) {
				reject(error);
				return;
			}

			response.body = body;
			resolve(response);
		});
	})
	.then(handleResponse);
};

function handleResponse(response) {
	const status = response.statusCode;
	const body = response.body;

	if (status >= 300) {
		if (body && body.indexOf('VRM is invalid') !== -1)
			throw new Error('VRM is invalid');

		throw new Error('HPI returned status code ' + status, body);
	}

	return parse(body);
}

function parse(raw) {
	return new Promise(function (resolve, reject) {
		const parser = new XmlParser();
		parser.parseString(raw, function (error, result) {
			if (error) reject(error);
			else resolve(result);
		});
	})
	.then(function (response) {
		const body = tryGet(response, 'Envelope.Body');

		if (!body)
			throw new Error('invalid soap response: ' + JSON.stringify(response));

		const fault = tryGet(body, 'Fault');
		const results = tryGet(body, 'EnquiryResponse.RequestResults');

		if (fault) {
			const info = tryGet(fault, 'detail.HpiSoapFault.Error');

			if (!info)
				throw new Error('unknown soap fault: ' + JSON.stringify(fault));

			throw new Error('fault ' + info.Code + ': ' + info.Description);
		}

		if (!results)
			throw new Error('missing results: ' + JSON.stringify(body));

		const warning = tryGet(results, 'Warning');
		const asset = tryGet(results, 'Asset');

		// currently treating warnings as fatal
		if (warning)
			throw new Error('warning ' + warning.Code + ': ' + warning.Description);

		return asset;
  });
}

function serialise(reg, config) {
	return [
		'<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
			'<soap:Body>',
				'<EnquiryRequest xmlns="http://webservices.hpi.co.uk/CoreEnquiryV1">',
					'<Authentication>',
						'<SubscriberDetails>',
							'<CustomerCode>', config.customer, '</CustomerCode>',
							'<Initials>', config.initials, '</Initials>',
							'<Password>', config.password, '</Password>',
						'</SubscriberDetails>',
					'</Authentication>',
					'<Request>',
						'<Asset>',
							'<Vrm>', reg, '</Vrm>',
						'</Asset>',
						'<PrimaryProduct>',
							'<Code>', config.product, '</Code>',
						'</PrimaryProduct>',
					'</Request>',
				'</EnquiryRequest>',
			'</soap:Body>',
		'</soap:Envelope>'].join('');
}

function cleanXmlNode(dirtyNode, cleanNode, cleanParent, parentProp) {
	if (dirtyNode instanceof Array)
		dirtyNode = dirtyNode[0];

	if (typeof dirtyNode === 'string')
		return (cleanParent[parentProp] = dirtyNode);

	for (var prop in dirtyNode) {
		const cleanProp = prop.split(':')[1] || prop; // remove namespaces
		cleanNode[cleanProp] = {};
		cleanXmlNode(dirtyNode[prop], cleanNode[cleanProp], cleanNode, cleanProp);
	}
}

function tryGet(obj, fields) {
	if (!obj)
		return null;

	const props = fields.split('.');

	for (var i in props) {
		obj = obj[props[i]];

		if (!obj)
			return null;
	}

	return obj;
}
