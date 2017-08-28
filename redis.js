'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');
var torrentParser = require('torrent-parser');

// 1.引入redis模块
var redis = require("redis"),
    client = redis.createClient();
// 监听数据库错误信息
client.on("error", function (err) {
    console.log("Error " + err);
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
            
            // 定义mysql数据对象
            var torlists = {
                ID: parsedTorrent.infoHash,
                NAME: parsedTorrent.name,
                FILES: JSON.stringify(parsedTorrent.files)
            };
            
            client.multi([
                ["incr", "id"]
            ]).exec(function (error, res) {
                console.log(res[0]);
                // 保存对象
                if (res.length > 0) {
                    client.hmset(torlists.ID, torlists, function (error, res) {
                        if (error) {
                            console.log(error);
                        } else {
                            // console.log(res);
                            client.sadd("torlists", torlists.ID);
                        }
                    });
                }
            });
        }
    });
});

p2p.listen(6881, '0.0.0.0');
