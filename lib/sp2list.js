var mongoose = require('mongoose');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
    
var listSchema = new Schema({
    id:ObjectId,
    title:String,
    body:String,
    date:Date
});