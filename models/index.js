import Project from './projectModel.js';
import ProjectStatus from './projectStatusModel.js';
import ProjectImage from './projectImageModel.js';
import sequelize from '../config/db.js';

// Ассоціації
// Project
Project.belongsTo(ProjectStatus, { foreignKey: 'status_id', as: 'status' });
Project.hasMany(ProjectImage, { foreignKey: 'project_id', as: 'images' });
// ProjectStatus
ProjectStatus.hasMany(Project, { foreignKey: 'status_id', as: 'projects' });
// ProjectImage
ProjectImage.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

const model = {
    sequelize,
    ProjectStatus,
    Project,
    ProjectImage,
  };
  
  export default model;