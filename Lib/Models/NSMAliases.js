module.exports = (sequelize, DataTypes) => {
    const NSMAliases = sequelize.define('NSMAliases', 
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
        OriginId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'NSMClients',
                key: 'ClientId'
            }
        }
    }, {
        timestamps: false,
        uniqueKeys: {
            AliasUnique: {
                fields: ['ClientId', 'OriginId']
            }
        }
    })
    
    NSMAliases.sync()
    return NSMAliases
}