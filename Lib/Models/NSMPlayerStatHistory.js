module.exports = (sequelize, DataTypes) => {
    const NSMPlayerStatHistory = sequelize.define('NSMPlayerStatHistory', 
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
        TotalPerformance: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100,
        },
        Performance: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100,
        },
        Date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false,
        freezeTableName: true
    })
    NSMPlayerStatHistory.sync()
    return NSMPlayerStatHistory
}