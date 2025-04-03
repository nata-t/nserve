import chalk from "chalk";
import pm2 from "pm2";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

export function autostartServer() {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    try {
      // Get PM2 path using which command
      const pm2Path = execSync("which pm2").toString().trim();
      console.log(chalk.blue(`Using PM2 at: ${pm2Path}`));

      const startupOptions = {
        command: pm2Path,
        platform: process.platform,
      };

      pm2.startup(startupOptions, (err, result) => {
        if (err) {
          console.error(chalk.red("Failed to generate startup script"), err);
          pm2.disconnect();
          process.exit(1);
        }

        console.log(chalk.green("✅ PM2 startup configuration generated!"));
        console.log(
          chalk.yellow(
            "To complete setup, you may need to run the following command with sudo:"
          )
        );
        console.log(chalk.cyan(result));

        // Now save the current process list
        pm2.dump((dumpErr) => {
          if (dumpErr) {
            console.error(chalk.red("Failed to save process list"), dumpErr);
          } else {
            console.log(chalk.green("✅ Current process list saved!"));
          }
          pm2.disconnect();
        });
      });
    } catch (error) {
      console.error(chalk.red("Error setting up PM2 autostart:"), error);
      pm2.disconnect();
      process.exit(1);
    }
  });
}
