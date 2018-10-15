const fs = require('fs');
const path = require('path');
const http = require('http');
const XML2JS = require('xml2js');
const Request = require('request');
const Handlebars = require('handlebars');

const tplPath = path.join(__dirname, 'request.xml.hbs');
const genRequest = Handlebars.compile(fs.readFileSync(tplPath, 'utf8'));

const xmlParser = new XML2JS.Parser({
	ignoreAttrs: true,
	emptyTag: void 0,
	tagNameProcessors: [XML2JS.processors.stripPrefix, normalizeTagName],
	valueProcessors: [XML2JS.processors.parseNumbers, XML2JS.processors.parseBooleans],
});

exports.query = function (query, config) {
	return makeRequest(query, config)
	.then(handleResponse)
	.then(processSoapResult);
};

exports.queryVrm = function (vrm, config) {
	return exports.query({ Vrm: vrm }, config);
};

exports.queryVin = function (vin, config) {
	return exports.query({ Vin: vin }, config);
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

	return ninvoke(xmlParser, 'parseString', body)
	.then(cleanupXml)
	.then(function (result) {
		const body = tryGet(result, 'envelope.body');
		if (!body) throw new Error();
		return body;
	})
	.catch(function () {
		const codeFriendly = http.STATUS_CODES[status] || 'Unknown';
		const codeStr = codeFriendly.toLowerCase().replace(/\s+/g, '_');

		const error = new Error('HTTP ' + status + ': ' + codeFriendly);
		error.code = codeStr;
		error.statusCode = status;
		error.meta = { httpStatus: status, data: body };
		throw error;
	});
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

function processSoapResult(body) {
	const fault = tryGet(body, 'fault');
	const results = tryGet(body, 'enquiryResponse.requestResults');

	var error;

	if (fault) {
		const info = tryGet(fault, 'detail.hpiSoapFault.error');

		if (!info) {
			error = new Error('fault unknown: ' + JSON.stringify(fault));
			error.code = 'fault_unknown';
			error.meta = fault;
			throw error;
		}

		error = new Error('fault ' + info.code + ': ' + info.description);
		error.code = 'fault_' + info.code;
		error.meta = info;
		throw error;
	}

	if (!results) {
		error = new Error('missing results: ' + JSON.stringify(body));
		error.code = 'missing_results';
		error.meta = body;
		throw error;
	}

	const warn = tryGet(results, 'warning');
	const asset = tryGet(results, 'asset');

	// currently treating warnings as fatal
	if (warn) {
		error = new Error('warning ' + warn.code + ': ' + warn.description);
		error.code = 'warning_' + warn.code;
		error.meta = warn;
		throw error;
	}

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

// could be more efficient?
function normalizeTagName(name) {
	return name
	.replace(/([a-z])([A-Z])/g, '$1 $2')
	.replace(/([A-Z])([a-z])/g, ' $1$2')
	.split(' ')
	.filter(function (s) { return !!s; })
	.reduce(function (a, b, i) {
		if (i === 0)
			return a + b.toLowerCase();
		return a + b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
	}, '');
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
