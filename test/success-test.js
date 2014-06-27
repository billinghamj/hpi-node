
var hpi = require('../index'),
	fs = require('fs'),
	assert = require('assert');


describe('response parsing', function(){
	
	it("should handle 63", function(done){
		fs.readFile( "./test/resources/success-hpi63.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( sysErr, datErr, result ){
				if ( err ) throw err;
				assert.ok(result);
				done();
			});
		});
	});
	
	it("should handle 64", function(done){
		fs.readFile( "./test/resources/success-hpi64.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( sysErr, datErr, result ){
				if ( err ) throw err;
				assert.ok(result);
				done();
			});
		});
	});
	
	it("should handle 75", function(done){
		fs.readFile( "./test/resources/success-hpi75.soap.xml", "utf8", function( err, body ){
			hpi.parse( body, {}, function( sysErr, datErr, result ){
				if ( err ) throw err;
				assert.ok(result);
				done();
			});
		});
	});
});
