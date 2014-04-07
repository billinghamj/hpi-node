
var hpi = require('../index'),
	fs = require('fs'),
	assert = require('assert');


describe('soap request generation', function(){
	
	it("should match the one in the test folder", function(done){
		
		
		fs.readFile( "./test/resources/example-request.soap.xml", "utf8", function( err, fileXml ){
			if ( err ) return done(err);
		
			var xml = hpi.serialise( "DG580PA", {
				customer : "customer-code",
				initials : "initials",
				password : "password",
				product : "HPI75"
			});
			
			// HACK - assumes exact string equality, which isn't a reliable assumption
			assert.equal( xml, fileXml.replace(/[\t\n]+/g,"") );
			
			done();
		
		});
	});
	
});
