module.exports = (sequelize, DataTypes) => {
    const NSMPenalties = sequelize.define('NSMPenalties', 
    {
        Id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        TargetId: {
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
        },
        PenaltyType: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        Date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP')
        },
        Active:  {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        Duration: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        Reason: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        timestamps: false
    })
    NSMPenalties.sync()
    return NSMPenalties
}