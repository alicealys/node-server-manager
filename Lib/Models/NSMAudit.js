module.exports = (sequelize, DataTypes) => {
    const NSMAudit = sequelize.define('NSMAudit', 
    {
        Id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        Origin: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        Type: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        Description: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        Date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })
    NSMAudit.sync()
    
    return NSMAudit
}