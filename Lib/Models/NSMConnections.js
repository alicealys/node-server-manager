module.exports = (sequelize, DataTypes) => {
    const NAMConnections = sequelize.define('NSMConnections', 
    {
        Id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        ClientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'NSMClients',
                key: 'ClientId'
            }
        },
        Name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        Guid: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        IPAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        Date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })
    NAMConnections.sync()
    return NAMConnections
}