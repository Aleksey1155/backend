import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('project_management', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
});

export default sequelize;