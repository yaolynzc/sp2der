'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');
var torrentParser = require('./lib/torrent-parser');    // 自行修改了一个throw：25
const _ = require('lodash')
var torlistarr = [];

// 1.引入mysql模块
var mysql = require('mysql');
// 2.设置mysql连接参数
var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '*36801589!Fla#',
  database: 'sp2web'
});

var p2p = P2PSpider({
  nodesMaxSize: 400,
  maxConnections: 800,
  timeout: 10000
});

p2p.ignore(function (infohash, rinfo, callback) {
  var torrentFilePathSaveTo = path.join(__dirname, "tts", infohash);
  fs.exists(torrentFilePathSaveTo, function (exists) {
    callback(exists); //if is not exists, download the metadata.
  });
});

// 只保存中文资源的infohash信息解析
p2p.on('metadata', function (metadata) {
  // console.log(metadata)

  let infohash = metadata.infohash ? metadata.infohash : ''
  let filename = metadata.info.name ? metadata.info.name.toString() : ''
  let chineseTest = /([\u4e00-\u9fa5]+)/

  // 有name且包含中文，长度小于500，则保存
  if (infohash && filename && filename.length < 500 && chineseTest.test(filename)) {
    // console.log(infohash, filename)
    connection.query({
      sql: 'SELECT ID FROM `torlists` WHERE `ID` = "' + infohash + '" OR `NAME` LIKE "%' + filename + '%"',
      timeout: 40000, // 40s
    }, function (error, results, fields) {
      if (error) {
        console.log(error);
      } else {
        // console.log(torlistarr.length)
        // 数据库中未查询到类似信息
        if (results.length == 0) {
          // 在当前内存变量torlistarr中再次查找，不存在时才保存信息
          var torlistarr1 = _.flatten(torlistarr)
          var existsInfohash = _.indexOf(torlistarr1, infohash)
          var existsFilename = _.indexOf(torlistarr1, filename)
          if (existsInfohash < 0 && existsFilename < 0) {
            // 定义mysql数据数组
            var torlist = [infohash, filename];
            torlistarr.push(torlist);

            // 信息写入日志文件
            fs.writeFile('./sp2der.log', `${new Date().toLocaleString('chinese', { hour12: false })}\t${torlistarr.length}\t${infohash}\t${filename}`, function (err) {
              if (err) {
                console.log('write log fail')
              }
            })
          }

          // 匹配到300个文件时才执行批量保存到后台mysql数据库操作
          if (torlistarr.length >= 300) {
            var query = connection.query('INSERT INTO torlists(ID,NAME) VALUES ?', [torlistarr], function (error, rows, fields) {
              // if (error) throw error;
              if (error) {
                console.log(error)
              } else {
                // console.log('save success')
                torlistarr = [];
              }
            });
          }
        }
      }
    });
  }
})

// 保存torrent文件的解析操作
// p2p.on('metadata', function (metadata) {
//   var torrentFilePathSaveTo = path.join(__dirname, "tts", metadata.infohash);

//   fs.writeFile(torrentFilePathSaveTo, bencode.encode({ 'info': metadata.info }), function (err) {
//     if (err) {
//       return console.error(err);
//     } else {
//       if (fs.existsSync(torrentFilePathSaveTo)) {
//         var parsedTorrent = torrentParser.decodeTorrentFile(torrentFilePathSaveTo);
//         // console.log("Name:" + parsedTorrent.name);
//         // 如果解析到正确格式的tts文件，则执行以下保存操作
//         if (parsedTorrent) {
//           var filelist = JSON.stringify(parsedTorrent.files);
//           // 常见几种文件类型的检测
//           var videoRegEx = new RegExp("^.+\.(mkv)|(mp4)|(avi)|(rmvb)|(wmv)$");

//           // 如果包含以上5种文件类型，则保存
//           if (videoRegEx.test(filelist)) {
//             // 定义mysql数据数组
//             var torlist = [parsedTorrent.infoHash, parsedTorrent.name];
//             torlistarr.push(torlist);
//             // console.log(metadata.infohash + " has saved.");
//             // console.log(torlistarr.length);

//             // 匹配到300个文件时才执行批量保存到后台mysql数据库操作
//             if (torlistarr.length === 300) {
//               var query = connection.query('INSERT INTO torlists(ID,NAME) VALUES ?', [torlistarr], function (error, rows, fields) {
//                 // if (error) throw error;
//                 if (error) {
//                   // console.log("invalid files string");
//                   // 删除类型有问题的文件
//                   for (var validitem of torlistarr) {
//                     fs.unlink(path.join(__dirname, "tts", validitem.infoHash), function (error) {
//                       console.log('del-not-valid:tts file delete error!');
//                     });
//                   }
//                   torlistarr = [];
//                 } else {
//                   torlistarr = [];
//                 }
//               });
//             }
//           } else {
//             // 删除非以上5种类型的文件
//             fs.unlink(torrentFilePathSaveTo, function (error) {
//               // if (error) throw error;
//               if (error) {
//                 console.log('del-not-type:tts file delete error!');
//               }
//             });
//           }
//         }
//       }
//     }
//   });
// });

// 全局捕获nodejs异常防止程序退出
process.on('uncaughtException', function (err) {
  console.log(err);
})

p2p.listen(6881, '0.0.0.0');
