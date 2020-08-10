module.exports = (sequelize, DataTypes) => {
    const NSMClients = sequelize.define('NSMClients', 
    {
        ClientId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        Description: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        Password: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        Guid: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },
        PermissionLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        FirstConnection: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        },
        LastConnection: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })
    NSMClients.sync()
    
    return NSMClients
}