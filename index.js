const XmlParser = require('xml2js').Parser;
const Request = require('request');

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

module.exports = function (reg, config, callback) {
	const query = serialise(reg, config);

	const request = Request({
		method: 'POST',
		uri: config.url,
		body: query,
	}, function (error, res, body) {
		if (error)
			return callback(error);

		handleResponse(res.statusCode, body, config, callback);
	});
};

function handleResponse(status, body, config, callback) {
	if (status >= 200 && status < 300) {
		parse(body, config, callback);
	} else if (body && body.indexOf('VRM is invalid') > -1) {
		return callback(new Error('VRM is invalid'));
	} else {
		return callback(new Error('HPI returned status code ' + status, body));
	}
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

function parse(raw, config, callback) {
	const parser = new XmlParser();

	parser.parseString(raw, function (error, res) {
		if (error)
			return callback(error);

		if (!res)
			return callback(new Error('Failed to parse XML, not sure why this might happen'));

		const clean = {};
		xmlCleanup(res['soapenv:Envelope']['soapenv:Body'][0], clean);

		if (clean.Fault) {
			const desc = get(clean.Fault, 'detail.HpiSoapFault.Error.Description');

			if (!desc)
				return callback(new Error('Unknown HPI error: ' + JSON.stringify(clean.Fault)));

			if (desc === 'VRM is invalid')
				return callback(new Error(desc));

			return callback(new Error(desc));
		}

		const results = get(clean, 'EnquiryResponse.RequestResults');

		if (!results)
			return callback(new Error('Missing data: ' + JSON.stringify(clean)));

		const data = get(results, 'Asset.PrimaryAssetData');
		const warning = get(results, 'Warning');
		const dvla = get(data, 'DVLA');

		if (warning && !dvla)
			return callback(new Error(warning.Description));

		if (!dvla)
			return callback(new Error('Missing DVLA data: ' + JSON.stringify(data)));

		return callback(null, data);
  });
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
