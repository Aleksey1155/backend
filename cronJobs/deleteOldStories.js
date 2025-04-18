import cron from "node-cron";
import fs from "fs";
import path from "path";
import { db } from "../connect/connect.js";

const deleteOldStories = () => {
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏳ Running story cleanup...");

    // 1. Отримуємо шляхи до старих відео
    db.query(
      `SELECT video FROM stories WHERE created_at < NOW() - INTERVAL 24 HOUR`,
      (err, results) => {
        if (err) {
          console.error("❌ Error fetching old stories:", err);
          return;
        }

        if (results.length === 0) {
          console.log("ℹ️ No old stories to delete.");
          return;
        }

        // 2. Видаляємо файли з диску
        const clientUploadsPath = path.join(process.cwd(), "../client/public/uploads/stories"); // ← переходить з backend до client

        results.forEach((row) => {
          const filePath = path.join(clientUploadsPath, path.basename(row.video)); // basename — витягує лише ім'я файлу
        
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error("⚠️ Error deleting file:", filePath, err.message);
              } else {
                console.log("🗑️ Deleted file:", filePath);
              }
            });
          } else {
            console.warn("🚫 File not found:", filePath);
          }
        });
        

        // 3. Видаляємо записи з бази
        db.query(
          `DELETE FROM stories WHERE created_at < NOW() - INTERVAL 24 HOUR`,
          (err, result) => {
            if (err) {
              console.error("❌ Error deleting old stories from DB:", err);
            } else {
              console.log(`✅ Deleted ${result.affectedRows} old stories from DB`);
            }
          }
        );
      }
    );
  });
};

export default deleteOldStories;
