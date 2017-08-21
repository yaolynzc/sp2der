'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');
var torrentParser = require('torrent-parser');

// 1.引入mongoose模块
var mongoose = require('mongoose');
// 2.设置mongoose的promise，连接服务器
mongoose.Promise = global.Promise;
var db = mongoose.connect('mongodb://admin:flame@127.0.0.1:27017/sp2web',{useMongoClient: true});
// 3.创建模型
var listModel = mongoose.model('torlist',
      {
        name:String,
        file:String,
        memo:JSON,
        ctime:Date
      }
    );

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
            
            // 定义mongoose实例对象
            var list = new listModel({
                name:parsedTorrent.name,
                file: parsedTorrent.infoHash,
                memo: parsedTorrent.files,
                ctime: Date.now()
            });

            // 保存对象
            list.save(function(err, res) {
                // 如果错误，打印错误信息
                if (err) {
                console.log(err);
                }
                // 返回插入的数据对象
                // console.log(res);
            });
        }
    });
});

p2p.listen(6881, '0.0.0.0');
