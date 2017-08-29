'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');
var torrentParser = require('torrent-parser');
var torlistsarr = [];

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
            
            var filelist = JSON.stringify(parsedTorrent.files);
            // 常见几种文件类型的检测
            var videoRegEx = new RegExp("^.+\.(mkv)|(mp4)|(avi)|(rmvb)|(wmv)|(rm)|(mpeg)|(ts)$");
            
            // 如果包含以上8种文件类型，则保存
            if (videoRegEx.test(filelist.toLowerCase())) {
                // // 定义mysql数据对象
                // var torlists = {
                //     ID: parsedTorrent.infoHash,
                //     NAME: parsedTorrent.name,
                //     FILES: filelist
                // };

                // var query = connection.query('INSERT INTO torlists SET ?', torlists, function (error, results, fields) {
                //     if (error) throw error;
                // // console.log(fields);
                // });

                var torlists = [parsedTorrent.infoHash,parsedTorrent.name,filelist];
                torlistsarr.push(torlists);
                // 匹配到300个文件时才执行批量保存到后台mysql数据库操作
                if(torlistsarr.length == 300){
                    var query = connection.query('INSERT INTO torlists(ID,NAME,FILES) VALUES ?', [torlistsarr], function (error, rows, fields) {
                        if (error) throw error;
                        torlistsarr = [];
                    });
                }
            }else{
                // 删除非以上8种类型的文件
                fs.unlink(torrentFilePathSaveTo,function(error){
                    if(error) throw error;
                });
            }
        }
    });
});

p2p.listen(6881, '0.0.0.0');
