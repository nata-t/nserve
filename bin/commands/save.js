import chalk from "chalk";
import pm2 from "pm2";

export function saveServer() {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.dump((err) => {
      if (err) {
        console.error(chalk.red("Failed to save process list"), err);
        pm2.disconnect();
        process.exit(1);
      }

      console.log(chalk.green("✅ Process list saved successfully!"));
      pm2.disconnect();
    });
  });
}
