const fs                      = require('fs')

module.exports = (file, ref) => {
    return {
        get: () => {
            this.data = require(file),
            fs.watch(file, (filename) => {
                if (filename) {
                    try { var newData = require(file) }
                    catch (e) { 
                        console.log(`Failed to reload config file ${file}: ${e.toString()}`); return }

                    this.data = newData
                    console.log(`Reloaded config file ${file}`)
                }
            })
            return this.data
        }
    }
}