var bodyParser = require('body-parser');
var fs = require('fs');
var express = require('express');
var mongoose = require('mongoose');
var amoebic = require('amoebictemplating');
var csv = require("fast-csv");
mongoose.connect('mongodb://localhost/blcvsc');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', function(req, res) {
	res.sendFile(__dirname+'/public/index.html');
});
app.get('/sheets/:id', function(req, res) {
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet) {
		if(err) return handleError(err);
		if(!sheet) return res.send("no");
		fs.readFile(__dirname+"/public/sheet.html", "utf8", function(err, html) {
			if(err) return console.log(err);
			var data = [{name:"id", value:id},{name: "details", value: sheet.details},{name: "limits", value: sheet.limits}, {name:"columns",value:sheet.columns},{name:"name",value:sheet.name}, {name:"rows", value:sheet.rows},{name:"questions",value:sheet.questions}];
			res.send(amoebic.render(html, data));
		});
	});
});
app.post('/create', function(req, res) {
	console.log(req.body);
	var i=0;
	var limits = [];
	var columns = [];
	var rows = [];
	csv
		.fromString(req.body.csv)
		.on("data", function(data){
			if(i==0) {
				for(var k=1;k<data.length;k++) {
					columns.push(data[k]);
				}
			}
			else {
				rows.push(data[0]);
				for(var k=1; k<data.length;k++) {
					limits.push({row: i-1, col: k-1, max: data[k], current: 0});
				}
			}
		    i++;
		})
		.on("end", function(){
			var sheet = new Sheet({name: req.body.name, limits: limits, details:req.body.details, columns:columns, rows:rows, questions:[{text:"What is your name?", type:"text"}, {text:"What is your email?", type:"text"},{text:"Comments:", type:"text"}]});
			sheet.save();
			console.log(sheet);
			res.send(sheet.id);
		});
});
app.get('/create', function(req, res) {
	res.sendFile(__dirname+'/public/create.html');
});
app.post('/signup/:id', function(req, res) {
	var obj = req.body;
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet) {
		if(err) return handleError(err);
		if(!sheet) return res.send("no");
		console.log(obj);
		var answers = Object.keys(obj.answers).map(function(key) {return obj.answers[key]});
		var rowCols = Object.keys(obj.rowCols).map(function(key) {return obj.rowCols[key]});
		var limits = [];
		for(var i=0;i<rowCols.length;i++) {
			var row = sheet.rows.indexOf(obj.rowCols[i].row);
			var col = sheet.columns.indexOf(obj.rowCols[i].col);
			var counter = sheet.limits.filter(function( ob ) {
				return ob.row == row&&ob.col == col;
			});
			rowCols[i].room = counter[0].id;
			limits.push(counter[0]);
		}
		var person = new People({form: id, rowCols: rowCols, answers: answers});
		fs.readFile(__dirname+"/public/thanks.html", function read(err, html) {
			person.save(function(err) {
				if(err) return handleError(err);
				res.send((html+"").replace("{{Replace}}",person.id));
				for(var i=0;i<limits.length;i++) {
					counter[0].people.push(person.id);
				}
				sheet.save();
			});
		});
	});
});
app.get('/getsignups/:id', function(req, res) {
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet) {
		if(err) return handleError(err);
		if(!sheet) return res.send("no");
		fs.readFile(__dirname+"/public/sheet.html", "utf8", function(err, html) {
			if(err) return console.log(err);
			var data = [{name:"id", value:id},{name: "details", value: sheet.details},{name: "limits", value: sheet.limits}, {name:"columns",value:sheet.columns},{name:"name",value:sheet.name}, {name:"rows", value:sheet.rows},{name:"questions",value:sheet.questions}];
			res.send(amoebic.render(html, data));
		});
	});
});
app.get('/getroom/:id/:room', function(req, res) {
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet) {
		if(err) return handleError(err);
		if(!sheet) return res.send("no");
		fs.readFile(__dirname+"/public/sheet.html", "utf8", function(err, html) {
			if(err) return console.log(err);
			
		});
	});
});
app.get('/getsheet/:id', function(req, res) {
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet) {
		console.log(sheet);
	});
});
var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Listening at http://'+host+':'+port);
});
function syntaxHighlight(json) {
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
function deleteRecursive(data, key) {
    for(var property in data) {
        if(data.hasOwnProperty(property)) {
            if(property == key) {
                delete data[key];
            }

            else {
                if(typeof data[property] === "object") {
                    deleteRecursive(data[property], key);
                }
            }
        }         
    }
}
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
	console.log("Mongoose Connected!");
	var sheetSchema = mongoose.Schema({
		name: String,
		columns: [String],
		rows: [String],
		limits: [{row: Number, col: Number, max: Number, people:[String]}],
		questions: [],
		details: String
	});
	var peopleSchema = mongoose.Schema({
		form: String,
		rowCols: [{row: String, col: String, room: String}],
		answers: [{question: String, answer: String}]
	});
	Sheet = mongoose.model("Sheet", sheetSchema);
	People = mongoose.model("People", peopleSchema);
});
var Sheet;
var People;