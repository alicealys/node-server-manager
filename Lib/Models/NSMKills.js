module.exports = (sequelize, DataTypes) => {
    const NSMKills = sequelize.define('NSMKills', 
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
        TargetId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'NSMClients',
                key: 'ClientId'
            }
        },
        BaseWeapon: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        Weapon: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        MOD: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        Damage: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        HitLoc: {
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