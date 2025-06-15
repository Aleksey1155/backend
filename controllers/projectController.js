import Project from "../models/projectModel.js";
import ProjectStatus from "../models/projectStatusModel.js";
import ProjectImage from "../models/projectImageModel.js";


const projectController = {
  getAllProjects: async (req, res) => {
    try {
      const projects = await Project.findAll({
        include: [
          {
            model: ProjectStatus,
            as: "status",
            attributes: ["status_name"],
          },
          {
            model: ProjectImage,
            as: "images",
            attributes: ["url"],
            separate: true,
            limit: 1, 
            order: [["id", "ASC"]], 
          },
        ],
      });

      const formattedProjects = projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        start_date: project.start_date,
        end_date: project.end_date,
        actual_end_date: project.actual_end_date,
        status_name: project.status?.status_name || null, 
        image_url: project.images?.[0]?.url || null, 
      }));
      // console.log("projects", formattedProjects);
      return res.json(formattedProjects);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  },

  getProjectById: async (req, res) => {
    const { id } = req.params;
    try {
      const project = await Project.findByPk(id, {
        include: [
          { model: ProjectStatus, as: "status", attributes: ["status_name"] },
        ],
      });
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const formattedProject = {
        id: project.id,
        title: project.title,
        description: project.description,
        start_date: project.start_date,
        end_date: project.end_date,
        actual_end_date: project.actual_end_date,
        status_name: project.status.status_name,
      
      };
      console.log("project  ById", formattedProject);
      res.json(formattedProject);
    } catch (error) {
      console.error(`Error fetching project with ID ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  },

  getProjectDetails: async (req, res) => {
    const { id } = req.params;
    try {
      const project = await Project.findByPk(id, {
        include: [
          {
            model: Task,
            as: "tasks",
            attributes: ["title", "start_date", "end_date", "actual_end_date"],
          },
        ],
        attributes: ["id", "title", "start_date", "actual_end_date"],
      });
      if (!project) {
        return res
          .status(404)
          .json({ message: "No tasks found for this project" });
      }
      res.json(project);
    } catch (error) {
      console.error(`Error fetching details for project with ID ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch project details" });
    }
  },

  getAllStatuses: async (req, res) => {
    try {
      const statuses = await ProjectStatus.findAll();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching project statuses:", error);
      res.status(500).json({ error: "Failed to fetch project statuses" });
    }
  },

  getAllImages: async (req, res) => {
    try {
      const images = await ProjectImage.findAll();
      const formattedImages = images.map((image) => ({
        id: image.id,
        project_id: image.project_id,
        url: image.url,
      }));
      console.log("images", formattedImages);
      res.json(formattedImages);
    } catch (error) {
      console.error("Error fetching project images:", error);
      res.status(500).json({ error: "Failed to fetch project images" });
    }
  },

  createProject: async (req, res) => {
    try {
      const newProject = await Project.create(req.body);
      res.json({ insertId: newProject.id });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  },

  deleteImage: async (req, res) => {
    const { id } = req.params;
    try {
      const deletedRows = await ProjectImage.destroy({ where: { id } });
      if (deletedRows > 0) {
        res.json("Image has been deleted");
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      console.error(`Error deleting image with ID ${id}:`, error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  },

  deleteProject: async (req, res) => {
    const { id } = req.params;
    try {
      const deletedRows = await Project.destroy({ where: { id } });
      if (deletedRows > 0) {
        res.json("Project has been deleted");
      } else {
        res.status(404).json({ message: "Project not found" });
      }
    } catch (error) {
      console.error(`Error deleting project with ID ${id}:`, error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  },

  updateProject: async (req, res) => {
    const { id } = req.params;
    try {
      const [updatedRows] = await Project.update(req.body, { where: { id } });
      if (updatedRows > 0) {
        res.json("Project has been updated");
      } else {
        res.status(404).json({ message: "Project not found" });
      }
    } catch (error) {
      console.error(`Error updating project with ID ${id}:`, error);
      res.status(500).json({ error: "Failed to update project" });
    }
  },

  uploadProjectImages: async (req, res) => {
    if (!req.files || !req.files.files) {
      return res.status(400).json({ msg: "No files uploaded" });
    }

    const files = Array.isArray(req.files.files)
      ? req.files.files
      : [req.files.files];
    const { project_id } = req.body;

    try {
      const uploadedFiles = [];
      for (const file of files) {
        const newFileName = encodeURI(
          Date.now() +
            `-${Math.random().toString(36).substring(7)}-` +
            file.name
        );
        const filePath = `/images/${newFileName}`;
        const uploadPath = path.join(
          __dirname,
          "../../client/public/images",
          newFileName
        );

        await file.mv(uploadPath);

        await ProjectImage.create({ project_id, url: filePath });
        uploadedFiles.push({ fileName: file.name, filePath });
      }
      res.json({ uploadedFiles });
    } catch (error) {
      console.error("Error uploading and saving images:", error);
      res.status(500).json({ msg: "Failed to upload and save images" });
    }
  },
};

export default projectController;
