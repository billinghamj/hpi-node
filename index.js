

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
							'<CustomerCode>',config.customer,'</CustomerCode>',
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
							'<Code>',config.product,'</Code>',
						'</PrimaryProduct>',
					'</Request>',
				'</EnquiryRequest>',
			'</soapenv:Body>',
		'</soapenv:Envelope>'].join('');

	require('request')({
		method : 'POST', 
		uri : config.url, 
		body : query
	}, function ( err, res, body) {
		if ( err ) return callback(err);
		
		var status = res.statusCode;
		if ( status >= 200 && status < 300 ){
			exports.parse( body, config, callback );
		} else {
			console.log('error: '+ status)
			console.log(body)
			callback(new Error("HPI returned status code "+status));
		}
	});

}

exports.parse = function( raw, config, callback ){
	
	var parser = new require('xml2js').Parser();
	parser.parseString( raw, function (err, result) {
		if ( err ) return callback(err);
		if ( !result ) return callback(new Error("Failed to parse JSON, not sure why this might happen"));
		
		try {
			
			if ( config.debug ) config.debug( result );
			
			try{
				
				result =  result['soapenv:Envelope']['soapenv:Body'][0]['ns1:EnquiryResponse'][0]['ns1:RequestResults'][0]['ns1:Asset'][0]['ns1:PrimaryAssetData'][0];
			
				var cleaned = {
					make : get(result,['DVLA','Make','Description']),
					model : get(result,['DVLA','Model','Description']),
					body : get(result,['DVLA','Body','Description']),
					colour : get(result,['DVLA','Body','Colour','Current','Description']), // also previous colours
					wheelplan : get(result,['DVLA','Body','WheelPlan','Description']),
					wheelplan_code : get(result,['DVLA','Body','WheelPlan','Code']),
					weight : get(result,['DVLA','Body','Weight']),
					engine_size : get(result,['DVLA','Engine','Size']),
					engine_no : get(result,['DVLA','Engine','Number']),
					fuel : get(result,['DVLA','Engine','Fuel','Description']),
					year : get(result,['DVLA','KeyDates','Manufactured','Year']),
					doors : get(result,['SMMT','Body','Description']),
					transmission : get(result,['SMMT','Transmission','Description']),
					//keepers_changed : result['ns1:DVLA'][0]['ns1:Keepers'][0]['ns1:LastChangeOfKeeperDate'][0],
					//keepers : result['ns1:DVLA'][0]['ns1:Keepers'][0],
					//keydates : result['ns1:DVLA'][0]['ns1:KeyDates'][0],
					isImported : get(result,['DVLA','KeyDates','IsImported']),
					northernIreland : get(result,['DVLA','IsFromNorthernIreland']),
					/*checks : {
						plate_transfers : result['ns1:FullCheck'][0]['ns1:PlateTransfers'][0]['$']['xsi:nil'] == "1",
						security_watch : result['ns1:FullCheck'][0]['ns1:SecurityWatch'][0]['$']['xsi:nil'] == "1",
						finance_agreements : result['ns1:FullCheck'][0]['ns1:FinanceAgreements'][0]['$']['xsi:nil'] == "1",
						vcar : result['ns1:FullCheck'][0]['ns1:VCAR'][0]['$']['xsi:nil'] == "1",
						stolen_incidents : result['ns1:FullCheck'][0]['ns1:StolenIncidents'][0]['$']['xsi:nil'] == "1"	
					}*/
					abi : get(result,['TranslatePlus','Instep','Code']),
					group50 : get(result,['TranslatePlus','InsuranceGroup']),
					groupSuffix : get(result,['TranslatePlus','InsuranceGroupSuffix']),
					securityCode : get(result,['TranslatePlus','SecurityCode']),
				};
			
				// Default case - Assume one car at a time
				return callback( undefined, cleaned ); 
			} catch (err) {
				console.error(err.stack);
				console.error( JSON.stringify( get(result,['DVLA','KeyDates']), null, '\t' ));
				return callback(err);
			}
		
		} catch (err){
			return callback(err);
		}
    });
	
}

// Helper to make it easy to traverse the object returned by xml2js
// e.g. result['ns1:DVLA'][0]['ns1:Body'][0]['ns1:Colour'][0]['ns1:Current'][0]['ns1:Description'][0]
function get( obj, propChain, ns ){
	var ref = obj,
		ns = ns ? ns+":" : "ns1:";
	for ( var i in propChain ){
		ref = ref[ns+propChain[i]][0];
	}
	return ref;
}


