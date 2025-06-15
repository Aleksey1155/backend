import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';

class Project extends Model {}

Project.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    start_date: { type: DataTypes.DATE },
    end_date: { type: DataTypes.DATE },
    actual_end_date: { type: DataTypes.DATE },
    status_id: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: false, 
  }
);

export default Project;
