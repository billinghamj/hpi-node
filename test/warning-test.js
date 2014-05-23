
var hpi = require('../index'),
	fs = require('fs'),
	assert = require('assert');


describe('partial success', function(){
	
	it("should handle 75 with no ABI code because of a missing model", function(done){
		fs.readFile( "./test/resources/warn-no-abi.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( err, result ){
				if ( err ) throw err;
				assert.ok(result);
				done();
			});
		});
	});
});
