var fs = require('fs');

module.exports = (app, db, Webfront) => {
    fs.readdirSync(__dirname).forEach(function(file) {
        if (file == "index.js") return;
        var name = file.substr(0, file.indexOf('.'));
        require('./' + name)(app, db, Webfront);
    });
}