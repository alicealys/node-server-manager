module.exports = (sequelize, DataTypes) => {
    const NSMPlayerStats = sequelize.define('NSMPlayerStats', 
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
        PlayedTime: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        Kills: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        Deaths: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        Performance: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100,
        }
    }, {
        timestamps: false
    })
    NSMPlayerStats.sync()
    return NSMPlayerStats
}