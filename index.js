

exports.performHpiCheck = function( reg, config, callback ){

	var self = this;
	var query = [
		'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ',
				'xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" ',
				'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
			'<soapenv:Body>',
				'<EnquiryRequest xmlns="http://webservices.hpi.co.uk/CoreEnquiryV1">',
					'<Authentication>',
						'<SubscriberDetails>',	
							'<CustomerCode>',config.code,'</CustomerCode>',
							'<Initials>RM</Initials>',
							'<Password>',config.password,'</Password>',
						'</SubscriberDetails>',
					'</Authentication>',
					'<Request>',
						'<Asset>',
							'<Vrm>',reg,'</Vrm>',
							'<Reference>REF1</Reference>',
						'</Asset>',
						'<PrimaryProduct>',
							'<Code>HPI75</Code>',
						'</PrimaryProduct>',
					'</Request>',
				'</EnquiryRequest>',
			'</soapenv:Body>',
		'</soapenv:Envelope>'].join('');

	require('request')({
		method : 'POST', 
		uri : config.url, 
		body : query
	}, function (error, response, body) {
		if ( response.statusCode >= 200 && response.statusCode < 300 ){
			exports.parse( body, callback );
		} else {
			console.log('error: '+ response.statusCode)
			console.log(body)
		}
	});

}

exports.parse = function( raw, callback ){
	
	var parser = new require('xml2js').Parser();
	parser.parseString( raw, function (err, result) {
		if ( err ) return callback(err);
		if ( !result ) return callback(new Error("Failed to parse JSON, not sure why this might happen"));
		
		try {
			var result = result['soapenv:Envelope']['soapenv:Body'][0]['ns1:EnquiryResponse'][0]['ns1:RequestResults'][0]['ns1:Asset'][0]['ns1:PrimaryAssetData'][0];
		
			var cleaned = {
				make : result['ns1:DVLA'][0]['ns1:Make'][0]['ns1:Description'][0],
				model : result['ns1:DVLA'][0]['ns1:Model'][0]['ns1:Description'][0],
				body : result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:Description'][0],
				colour : result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:Colour'][0]['ns1:Current'][0]['ns1:Description'][0], // also previous colours
				wheelplan : result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:WheelPlan'][0]['ns1:Description'][0],
				wheelplan_code : result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:WheelPlan'][0]['ns1:Code'][0],
				weight : result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:Weight'][0],
				engine_size : result['ns1:DVLA'][0]['ns1:Engine'][0]['ns1:Size'][0],
				engine_no : result['ns1:DVLA'][0]['ns1:Engine'][0]['ns1:Number'][0],
				fuel : result['ns1:DVLA'][0]['ns1:Engine'][0]['ns1:Fuel'][0]['ns1:Description'][0],
				keepers_changed : result['ns1:DVLA'][0]['ns1:Keepers'][0]['ns1:LastChangeOfKeeperDate'][0],
				//keepers : result['ns1:DVLA'][0]['ns1:Keepers'][0],
				//keydates : result['ns1:DVLA'][0]['ns1:KeyDates'][0],
				northernIreland : result['ns1:DVLA'][0]['ns1:IsFromNorthernIreland'][0],
				checks : {
					plate_transfers : result['ns1:FullCheck'][0]result['ns1:PlateTransfers'][0]['$']['xsi:nil'] == "1",
					security_watch : result['ns1:FullCheck'][0]result['ns1:SecurityWatch'][0]['$']['xsi:nil'] == "1",
					finance_agreements : result['ns1:FullCheck'][0]result['ns1:FinanceAgreements'][0]['$']['xsi:nil'] == "1",
					vcar : result['ns1:FullCheck'][0]result['ns1:VCAR'][0]['$']['xsi:nil'] == "1",
					stolen_incidents : result['ns1:FullCheck'][0]result['ns1:StolenIncidents'][0]['$']['xsi:nil'] == "1"	
				}
			};
			
			console.log(JSON.stringify(result,null,'\t'));
			
			// Default case - Assume one car at a time
			return callback( undefined, result ); 
		
		} catch (err){
			return callback(err);
		}
    });
	
}

//HpiClient.prototype

var conf = {
	code : '0601092',
	password : 'T3ST0314',
	url : 'http://pat-wss.hpi.co.uk/TradeSoap/services/CoreEnquiryV1/'
};
	
	
//var client = new HpiClient("http://wss.hpi.co.uk/TradeSoap/services/CoreEnquiryV1?wsdl");

exports.performHpiCheck("GU11OGD", conf, function( err ){
	console.log(arguments)
});


