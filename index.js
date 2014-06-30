

// Main API
// This is broken up for unit testing
exports.performHpiCheck = function( reg, config, callback ){

	var self = this;
	var query = exports.serialise( reg, config );

	var r = require('request')({
		method : 'POST', 
		uri : config.url, 
		body : query,
	}, function ( err, res, body) {
		if ( err ) return callback(err);
		
		exports.handleResponse( res.statusCode, body, config, callback );
	});
	
	r.on('error', function (err){
		callback(err);
	});
}

// Deal with status codes, and parsing
exports.handleResponse = function( status, body, config, callback ){
	if ( status >= 200 && status < 300 ){
		exports.parse( body, config, callback );
	} else if ( body && body.indexOf("VRM is invalid") > -1 ) {
		return callback( undefined, new Error("VRM is invalid") );
	} else {
		return callback(new Error("HPI returned status code "+status,body));
	}
};

// Serialise to a SOAP request. Love that SOAP
exports.serialise = function( reg, config ){
	return [
		'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ',
				'xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" ',
				'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
			'<soapenv:Body>',
				'<EnquiryRequest xmlns="http://webservices.hpi.co.uk/CoreEnquiryV1">',
					'<Authentication>',
						'<SubscriberDetails>',	
							'<CustomerCode>',config.customer,'</CustomerCode>',
							'<Initials>',config.initials,'</Initials>',
							'<Password>',config.password,'</Password>',
						'</SubscriberDetails>',
					'</Authentication>',
					'<Request>',
						'<Asset>',
							'<Vrm>',reg,'</Vrm>',
							'<Reference>REF1</Reference>',
						'</Asset>',
						'<PrimaryProduct>',
							'<Code>',config.product,'</Code>',
						'</PrimaryProduct>',
					'</Request>',
				'</EnquiryRequest>',
			'</soapenv:Body>',
		'</soapenv:Envelope>'].join('');
};


// Parse the body of a response and return in a readable format
exports.parse = function( raw, config, callback ){
	
	var parser = new require('xml2js').Parser();
	parser.parseString( raw, function (err, envelope ) {
		if ( err ) return callback(err);
		if ( !envelope ) return callback(new Error("Failed to parse XML, not sure why this might happen"));
		
		
		//try{
			
			// This cleans up the mess left by XML so we can traverse the resulting object without getting a hernia
			var clean = {};
			cleanUpXmlRubbish( envelope['soapenv:Envelope']['soapenv:Body'][0], clean );
			
		console.log(clean)
			if ( config.debug ) config.debug( clean );
		
			// report faults
			if ( clean.Fault ) {
				var fault = clean.Fault;
				// report a clean error if we have one
				if ( fault.detail && fault.detail.HpiSoapFault && fault.detail.HpiSoapFault ){
					var desc = clean.Fault.detail.HpiSoapFault.Error.Description;
					if ( desc === "VRM is invalid" ) return callback( undefined, new Error(desc) );
					return callback( new Error(desc));
				}
				// otherwise just dump the lot for now
				return callback( new Error("Unknown HPI error: "+JSON.stringify(fault)) );
			}
			
			// catch all if there's no RequestResults segment
			if ( !clean.EnquiryResponse || !clean.EnquiryResponse.RequestResults ) {
				return callback( undefined, new Error("Missing data: "+JSON.stringify(clean)) );
			}
			
			// catch warnings
			if ( clean.EnquiryResponse.RequestResults.Warning && !clean.EnquiryResponse.RequestResults.Asset ){
				return callback( undefined, new Error(clean.EnquiryResponse.RequestResults.Warning.Description));
			}
			
			return callback( undefined, undefined, clean.EnquiryResponse.RequestResults.Asset ); 
			
		//} catch (err) {
		//	console.log(err.stack)
		//	return callback(err);
		//}
    });
	
}

// Cleans up all the XML hangover garbage returned by xml2js
// e.g. result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:Colour'][0]['ns1:Current']  becomes: result.DVLA.Body.Colour.Current
function cleanUpXmlRubbish( dirtyNode, cleanNode, cleanParent, parentProp ){
	
	// serves arrays nested within objects
	if ( dirtyNode instanceof Array ) dirtyNode = dirtyNode[0];
	if ( typeof dirtyNode == "string" ) return cleanParent[parentProp] = dirtyNode;
	
	// serves objects nested within objects
	for ( var prop in dirtyNode ) {
		var cleanProp = prop.split(":")[1] || prop; // get rid of XML namespaces
		cleanNode[cleanProp] = {};
		//console.log(dirtyNode);
		cleanUpXmlRubbish( dirtyNode[prop], cleanNode[cleanProp], cleanNode, cleanProp );
	}
}
