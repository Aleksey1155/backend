import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';

class ProjectImage extends Model {}

ProjectImage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ProjectImage',
    tableName: 'project_images',
    timestamps: false, // якщо немає createdAt/updatedAt в таблиці
  }
);

export default ProjectImage;
