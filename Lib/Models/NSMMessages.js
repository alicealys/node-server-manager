module.exports = (sequelize, DataTypes) => {
    const NSMKills = sequelize.define('NSMMessages', 
    {
        Id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        OriginId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'NSMClients',
                key: 'ClientId'
            }
        },
        Message: {
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
    NSMKills.sync()
    return NSMKills
}