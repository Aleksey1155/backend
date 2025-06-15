import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';

class ProjectStatus extends Model {}

ProjectStatus.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status_name: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  {
    sequelize,
    modelName: 'ProjectStatus',
    tableName: 'project_statuses',
    timestamps: false, // якщо немає createdAt/updatedAt в таблиці
  }
);

export default ProjectStatus;

