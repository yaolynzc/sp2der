'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');
var torrentParser = require('torrent-parser');

// 1.引入mysql模块
var mysql = require('mysql');
// 2.设置mysql连接参数
var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : 'flame',
    database : 'sp2web'
  });

var p2p = P2PSpider({
    nodesMaxSize: 400,
    maxConnections: 800,
    timeout: 10000
});

p2p.ignore(function (infohash, rinfo, callback) {
    var torrentFilePathSaveTo = path.join(__dirname, "tts", infohash);
    fs.exists(torrentFilePathSaveTo, function(exists) {
        callback(exists); //if is not exists, download the metadata.
    });
});

p2p.on('metadata', function (metadata) {
    var torrentFilePathSaveTo = path.join(__dirname, "tts", metadata.infohash);

    fs.writeFile(torrentFilePathSaveTo, bencode.encode({'info': metadata.info}), function(err) {
        if (err) {
            return console.error(err);
        }else{
            console.log(metadata.infohash + " has saved.");
            var parsedTorrent =  torrentParser.decodeTorrentFile(torrentFilePathSaveTo);
            // console.log("Name:" + parsedTorrent.name);
            
            /// 定义mysql数据对象
            var torlists = {
                ID: parsedTorrent.infoHash,
                NAME: parsedTorrent.name,
                FILES: JSON.stringify(parsedTorrent.files)
            };
            
            var query = connection.query('INSERT INTO torlists SET ?', torlists, function (error, results, fields) {
                if (error) throw error;
                // console.log(fields);
              });
        }
    });
});

p2p.listen(6881, '0.0.0.0');
