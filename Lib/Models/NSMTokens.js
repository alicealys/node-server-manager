module.exports = (sequelize, DataTypes) => {
    const NSMTokens = sequelize.define('NSMTokens', 
    {
        TokenId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        ClientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        Token: {
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
    NSMTokens.sync()
    
    return NSMTokens
}