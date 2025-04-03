import chalk from "chalk";
import pm2 from "pm2";
import path from "path";
import { existsSync } from "fs";
import { isPortAvailable } from "../utils/port.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function addServer(options) {
  console.log("Starting server with options:", options);

  //validate name. name can not be "all"
  if (options.name === "all") {
    console.error(chalk.red("Name cannot be 'all'"));
    process.exit(1);
  }

  // Validate directory exists
  const directory = path.resolve(options.dir);
  console.log("Resolved directory:", directory);
  if (!existsSync(directory)) {
    console.error(chalk.red(`Directory not found: ${directory}`));
    process.exit(1);
  }

  // Validate port
  const port = parseInt(options.port, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    console.error(chalk.red("Port must be a number between 1024 and 65535"));
    process.exit(1);
  }

  // Check if port is available
  const portAvailable = await isPortAvailable(port);
  if (!portAvailable) {
    console.error(chalk.red(`Port ${port} is already in use`));
    process.exit(1);
  }

  const name = options.name || `static-serve-${port}`;

  // Connect to PM2
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    // Start the server
    pm2.start(
      {
        script: path.join(__dirname, "../../lib/server.js"),
        name: name,
        args: [`--port=${port}`, `--dir=${directory}`],
        autorestart: true,
        env: {
          NODE_ENV: "production",
        },
      },
      (err) => {
        if (err) {
          console.error(chalk.red("Failed to start server"), err);
          pm2.disconnect();
          process.exit(1);
        }

        console.log(chalk.green(`🚀 Server '${name}' started successfully!`));
        console.log(chalk.blue(`   Serving: ${directory}`));
        console.log(chalk.blue(`   URL: http://localhost:${port}`));
        console.log(
          chalk.blue(`   Process is running in the background with PM2`)
        );
        console.log(chalk.yellow(`   To view all servers: n-serve list`));
        console.log(chalk.yellow(`   To restart: n-serve restart ${name}`));

        pm2.disconnect();
      }
    );
  });
}
