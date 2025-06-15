import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';

class Task extends Model {}

Task.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: { 
      type: DataTypes.TEXT,
    },
    start_date: {
      type: DataTypes.DATE,
    },
    end_date: {
      type: DataTypes.DATE,
    },
    actual_end_date: {
      type: DataTypes.DATE,
    },
    status_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
    },
    priority_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
    },
    rating: { 
      type: DataTypes.INTEGER, 
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
  }
);

export default Task;
