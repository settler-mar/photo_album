'use strict';

let mongoose = require('mongoose'),
  config = require('./../config/server.config.json'),
  photoModel=require('./photoModel'),
  path = require('path'),
  fs = require('fs');
  require('./../models_db/album');

let getPath = function(userId,albomId) {
  let dirName='upload/'+Math.ceil(userId/100);

  let uploadDir = path.resolve(config.http.publicRoot,dirName);
  if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
  }

  dirName+='/'+(userId % 100);
  uploadDir = path.resolve(config.http.publicRoot,dirName);
  if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
  }

  dirName+='/'+albomId;
  uploadDir = path.resolve(config.http.publicRoot,dirName);
  if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
  }

  let thumbsDir = path.resolve(config.http.publicRoot,dirName+'/_thumbs');
  if(!fs.existsSync(thumbsDir)){
    fs.mkdirSync(thumbsDir);
  }

  return {
    server: uploadDir,
    browser: dirName
  };
};

let  getAlbum = function(filter, user) {
  if (!filter)filter={};
  var userId=user;
  return  new Promise(function(resolve, reject) {
    let resolveCallback = resolve;
    let Album = mongoose.model('album');
    let startParametr={
      title:1,
      description:1,
      user:1,
      dir:1,
      cover:'$photos',
      photos_count:'$photos'
    };
    let baseParametr={
      title:1,
      description:1,
      user:1,
      dir:1,
      cover:'$cover._id',
      photos_count:{
        count: {$add: [1]},
        _id:1
      }
    };
    let groupParametr={
      _id:{
        _id:'$_id',
        title:'$title',
        description:'$description',
        user:'$user',
        dir:'$dir',
        cover:'$cover'
      },
      photos_count:{$sum: "$photos_count.count"}
    };
    let finishParametr={
      _id:'$_id._id',
      title:'$_id.title',
      description:'$_id.description',
      user:'$_id.user',
      dir:'$_id.dir',
      cover:'$_id.cover',
      photos_count:1
    };
    Album.aggregate(
      {$match: filter},
      {$sort: {_id:-1}},
      {$limit: 60},
      {$project: startParametr},
      {$unwind: "$cover"},
      {$unwind: "$photos_count"},
      {$match: {"cover.is_cover":true}},
      {$project: baseParametr},
      {$group: groupParametr},
      {$project: finishParametr}
    ).then(albums => {
      var cover_list = [];
      albums.map(album=> {
        album.canEdit = (album.user == userId);
        cover_list.push(album.cover);
      });
      let filter = {
        _id: {
          $in: cover_list
        }
      };
      photoModel.get(filter, userId).then(covers => {
        cover_list={};
        covers.map(cover=> {
         cover_list[cover._id]=cover;
        });
        albums.map(album=> {
          album.cover=cover_list[album.cover];
          return album;
        });
        resolveCallback(albums);
      })
    })
  })
};

module.exports = {
  get: getAlbum,
  getPath: getPath
};