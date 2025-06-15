import express from 'express';
import projectController from '../controllers/projectController.js';

const router = express.Router();

router.get('/projects', projectController.getAllProjects);
router.get('/projects/:id', projectController.getProjectById);
router.get('/projectdetails/:id', projectController.getProjectDetails);
router.get('/project_statuses', projectController.getAllStatuses);
router.get('/project_images', projectController.getAllImages);
router.post('/projects', projectController.createProject);
router.delete('/project_images/:id', projectController.deleteImage);
router.delete('/projects/:id', projectController.deleteProject);
router.put('/projects/:id', projectController.updateProject);
router.post('/upload_project', projectController.uploadProjectImages);

export default router;