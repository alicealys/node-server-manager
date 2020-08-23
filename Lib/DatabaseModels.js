const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const directoryPath = path.join(__dirname, './Models')
const Sequelize = require('sequelize')
var Models = {}

new sqlite3.Database(path.join(__dirname, '../Database/Database1.db'), (err) => {
    var sequelize = new Sequelize({
        host: 'localhost',
        dialect: 'sqlite',
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        },
        logging: false,
        storage: path.join(__dirname, '../Database/Database1.db')
    })
    Models.DB = sequelize
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        } 
        files.forEach( (file) => {
            file = path.join(__dirname, `./Models/${file}`)
            var Model = require(file)(sequelize, Sequelize)
            Models[path.basename(file, path.extname(file))] = Model
        });
    });
})

module.exports = Models