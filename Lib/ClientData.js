class ClientData {
    constructor() {
        this.clientData = {}
    }
    getData(ClientId) {
        if (this.clientData[ClientId]) {
            return this.clientData[ClientId]
        }

        this.clientData[ClientId] = {}

        return this.clientData[ClientId]
    }
}

module.exports = ClientData