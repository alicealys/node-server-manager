module.exports = (sequelize, DataTypes) => {
    const NSMSettings = sequelize.define('NSMSettings', 
    {
        ClientId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'NSMClients',
                key: 'ClientId'
            }
        },
        TwoFactor: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        InGameLogin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        TokenLogin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        timestamps: false
    })
    NSMSettings.sync()
    
    return NSMSettings
}