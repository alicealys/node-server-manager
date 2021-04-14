const EventEmitter = require('events')

class Mutex extends EventEmitter {
    constructor() {
        super()
        this.locked = false
    }

    lock() {
        if (!this.locked) {
            this.locked = true
            return
        }

        return new Promise((resolve, reject) => {
            const onRelease = () => {
                if (this.locked) {
                    return
                }
    
                this.locked = true
                resolve()

                this.removeListener('release', onRelease)
            }
    
            this.on('release', onRelease)
        })
    }

    unlock() {
        this.locked = false
        this.emit('release')
    }
}

module.exports = Mutex