module.exports = (sequelize, DataTypes) => {
    const NSMMeta = sequelize.define('NSMMeta', 
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
        Key: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        Value: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        Date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })
    NSMMeta.sync()
    
    return NSMMeta
}