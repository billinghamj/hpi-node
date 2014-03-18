

# Installation

		npm install hpi		

# Usage

		var conf = {
			customer : '[your customer ID]',
			product : '[your product code]',
			password : '[your password]',
			url : '[URL to send SOAP requests]'
		};

		require('hpi').performHpiCheck( "GU11OGD", conf, function( err ){
			console.log(arguments)
			if ( err ) throw err;
		});