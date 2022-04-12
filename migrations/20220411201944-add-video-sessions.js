'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('video_sessions', {
    session_uuid: {
      type: 'varchar(128)', 
      primaryKey: true,
      unique: true
    },
    user_id: {
      type: 'int', 
      foreignKey: {
        name: 'video_sessions_user_id_fk',
        table: 'users',
        rules:{
          onDelete: 'CASCADE',
          onUpdate: 'RESTRICT'
        },
        mapping: 'id'
      }
    },
    current_sequence: 'int',
  });};

exports.down = function(db) {
  return db.dropTable('video_sessions');
};

exports._meta = {
  "version": 1
};
