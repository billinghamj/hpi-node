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

	if (status >= 200 && status < 300)
		return parse(body);

	if (body && body.indexOf('VRM is invalid') !== -1)
		throw new Error('VRM is invalid');

	throw new Error('HPI returned status code ' + status, body);
}

function parse(raw) {
	return new Promise(function (resolve, reject) {
		const parser = new XmlParser();
		parser.parseString(raw, function (error, result) {
			if (error) reject(error);
			else resolve(result);
		});
	})
	.then(function (result) {
		if (!result)
			throw new Error('Failed to parse XML, not sure why this might happen');

		const clean = {};
		xmlCleanup(result['soapenv:Envelope']['soapenv:Body'][0], clean);

		if (clean.Fault) {
			const desc = get(clean.Fault, 'detail.HpiSoapFault.Error.Description');

			if (!desc)
				throw new Error('Unknown HPI error: ' + JSON.stringify(clean.Fault));

			throw new Error(desc);
		}

		const results = get(clean, 'EnquiryResponse.RequestResults');

		if (!results)
			throw new Error('Missing data: ' + JSON.stringify(clean));

		const data = get(results, 'Asset.PrimaryAssetData');
		const warning = get(results, 'Warning');
		const dvla = get(data, 'DVLA');

		if (warning && !dvla)
			throw new Error(warning.Description);

		if (!dvla)
			throw new Error('Missing DVLA data: ' + JSON.stringify(data));

		return data;
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

function xmlCleanup(dirtyNode, cleanNode, cleanParent, parentProp) {
	if (dirtyNode instanceof Array)
		dirtyNode = dirtyNode[0];

	if (typeof dirtyNode === 'string')
		return (cleanParent[parentProp] = dirtyNode);

	for (var prop in dirtyNode) {
		const cleanProp = prop.split(':')[1] || prop; // namespaces
		cleanNode[cleanProp] = {};
		xmlCleanup(dirtyNode[prop], cleanNode[cleanProp], cleanNode, cleanProp);
	}
}

function get(obj, fields) {
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
