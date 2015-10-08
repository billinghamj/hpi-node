const fs = require('fs');
const path = require('path');
const XML2JS = require('xml2js');
const Request = require('request');
const Handlebars = require('handlebars');

const tplPath = path.join(__dirname, 'request.xml.hbs');
const genRequest = Handlebars.compile(fs.readFileSync(tplPath, 'utf8'));

const xmlParser = new XML2JS.Parser({
	ignoreAttrs: true,
	emptyTag: void 0,
	tagNameProcessors: [XML2JS.processors.stripPrefix, XML2JS.processors.firstCharLowerCase],
	valueProcessors: [XML2JS.processors.parseNumbers, XML2JS.processors.parseBooleans],
});

exports.query = function (query, config) {
	return makeRequest(query, config)
	.then(handleResponse)
	.then(parseXml)
	.then(cleanupXml)
	.then(processSoapResponse);
};

exports.queryVrm = function (vrm, config) {
	return exports.query({ vrm: vrm }, config);
};

function makeRequest(query, config) {
	const request = genRequest({
		query: query,
		config: config,
	});

	return ninvoke(Request, null, {
		method: 'POST',
		uri: config.url,
		body: request,
	});
}

function handleResponse(response) {
	const status = response.statusCode;
	const body = response.body || '';

	if (status >= 300) {
		if (body.indexOf('VRM is invalid') !== -1)
			throw new Error('invalid vrm');

		throw new Error('status code ' + status + ': ' + JSON.stringify(body));
	}

	return body;
}

function parseXml(xml) {
	return ninvoke(xmlParser, 'parseString', xml);
}

function cleanupXml(result) {
	// yes, this really can happen
	if (!result)
		return null;

	// makes it more palatable
	const clean = {};
	cleanXmlNode(result, clean);
	return clean;
}

function processSoapResponse(response) {
	const body = tryGet(response, 'envelope.body');

	if (!body)
		throw new Error('invalid response: ' + JSON.stringify(response));

	const fault = tryGet(body, 'fault');
	const results = tryGet(body, 'enquiryResponse.requestResults');

	if (fault) {
		const info = tryGet(fault, 'detail.hpiSoapFault.error');

		if (!info)
			throw new Error('fault unknown: ' + JSON.stringify(fault));

		throw new Error('fault ' + info.code + ': ' + info.description);
	}

	if (!results)
		throw new Error('missing results: ' + JSON.stringify(body));

	const warning = tryGet(results, 'warning');
	const asset = tryGet(results, 'asset');

	// currently treating warnings as fatal
	if (warning)
		throw new Error('warning ' + warning.code + ': ' + warning.description);

	return asset;
}

function ninvoke(obj, method) {
	const args = Array.prototype.slice.call(arguments, 2);
	const func = method ? obj[method] : obj;

	return new Promise(function (resolve, reject) {
		args.push(function (error, result) {
			if (error) reject(error);
			else resolve(result);
		});

		func.apply(obj, args);
	});
}

function cleanXmlNode(dirtyNode, cleanNode, cleanParent, parentProp) {
	if (dirtyNode instanceof Array)
		dirtyNode = dirtyNode[0];

	if (typeof dirtyNode !== 'object')
		return (cleanParent[parentProp] = dirtyNode);

	for (var prop in dirtyNode) {
		cleanNode[prop] = {};
		cleanXmlNode(dirtyNode[prop], cleanNode[prop], cleanNode, prop);
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
