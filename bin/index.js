#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import pm2 from "pm2";
import path from "path";
import { fileURLToPath } from "url";
import Table from "cli-table3";
import { existsSync } from "fs";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add near the beginning of your file for better error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Main program definition
program
  .name("n-serve")
  .version("1.0.0")
  .description("Serve static files with PM2 background persistence")
  .option("-d, --dir <path>", "Directory to serve", process.cwd())
  .option("-p, --port <number>", "Server port", "3000")
  .option(
    "-n, --name <string>",
    "Process name",
    (val) => val || `static-serve-${Date.now()}`
  );

// List command
program
  .command("list")
  .description("List all running static servers")
  .action(listServers);

// Restart command
program
  .command("restart <name>")
  .description("Restart a process (use 'all' to restart all)")
  .action(restartServer);

// delete command
program
  .command("delete <name>")
  .description("delete a process (use 'all' to delete all)")
  .action(deleteServer);

// save process list
program
  .command("save")
  .description("save the current process list")
  .action(saveServer);

// automatically start process after reboot
program
  .command("autostart")
  .description("automatically start the process after reboot")
  .action(autostartServer);

// Define a default action for the main command
program.action(function () {
  startServer(program.opts());
});

// Parse arguments
program.parse();

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function startServer(options) {
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
        script: path.join(__dirname, "../lib/server.js"),
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

function listServers() {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.list((err, list) => {
      if (err) {
        console.error(chalk.red("Failed to retrieve process list"), err);
        pm2.disconnect();
        process.exit(1);
      }

      // Filter to get only our static servers
      const servers = list.filter((p) => {
        const args = p.pm2_env?.args || [];
        return args.some((arg) => arg.startsWith("--dir="));
      });

      if (servers.length === 0) {
        console.log(chalk.yellow("No static servers are currently running"));
        pm2.disconnect();
        return;
      }

      // Create table
      const table = new Table({
        head: [
          chalk.cyan("Name"),
          chalk.cyan("Status"),
          chalk.cyan("Port"),
          chalk.cyan("Directory"),
          chalk.cyan("Uptime"),
          chalk.cyan("Restarts"),
        ],
        colWidths: [20, 10, 10, null, 15, 10],
      });

      // Add data to table
      servers.forEach((server) => {
        const args = server.pm2_env?.args || [];
        const port =
          args.find((arg) => arg.startsWith("--port="))?.split("=")[1] || "N/A";
        const dir =
          args.find((arg) => arg.startsWith("--dir="))?.split("=")[1] || "N/A";

        const status = server.pm2_env?.status || "unknown";
        const statusColor = status === "online" ? chalk.green : chalk.red;

        // Format uptime
        let uptime = "N/A";
        if (server.pm2_env?.pm_uptime) {
          const uptimeSeconds = Math.floor(
            (Date.now() - server.pm2_env.pm_uptime) / 1000
          );
          if (uptimeSeconds < 60) uptime = `${uptimeSeconds}s`;
          else if (uptimeSeconds < 3600)
            uptime = `${Math.floor(uptimeSeconds / 60)}m`;
          else if (uptimeSeconds < 86400)
            uptime = `${Math.floor(uptimeSeconds / 3600)}h`;
          else uptime = `${Math.floor(uptimeSeconds / 86400)}d`;
        }

        table.push([
          server.name,
          statusColor(status),
          port,
          dir,
          uptime,
          server.pm2_env?.restart_time || 0,
        ]);
      });

      console.log(table.toString());
      pm2.disconnect();
    });
  });
}

function restartServer(name) {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.list((err, list) => {
      if (err) {
        console.error(chalk.red("Failed to list PM2 processes"), err);
        pm2.disconnect();
        process.exit(1);
      }

      const staticServers = list.filter((proc) => {
        const args = proc.pm2_env?.args || [];
        return args.some((arg) => arg.startsWith("--dir="));
      });

      if (staticServers.length === 0) {
        console.log(chalk.yellow("No static servers are currently running"));
        pm2.disconnect();
        return;
      }

      if (name !== "all") {
        const targetServer = staticServers.find((proc) => proc.name === name);
        if (!targetServer) {
          console.error(chalk.red(`Server '${name}' not found`));
          pm2.disconnect();
          process.exit(1);
        }
        staticServers.length = 0;
        staticServers.push(targetServer);
      }

      // Keep track of pending restarts
      let pendingRestarts = staticServers.length;
      let hasError = false;

      staticServers.forEach((server) => {
        pm2.restart(server.pm_id, (err) => {
          if (err) {
            hasError = true;
            console.error(
              chalk.red(`Failed to restart server '${server.name}'`),
              err
            );
          } else {
            console.log(
              chalk.green(`✅ Successfully restarted server '${server.name}'`)
            );
          }

          // Decrease pending restarts and disconnect when all are done
          pendingRestarts--;
          if (pendingRestarts === 0) {
            pm2.disconnect();
            if (hasError) process.exit(1);
          }
        });
      });
    });
  });
}

function deleteServer(name) {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.list((err, list) => {
      if (err) {
        console.error(chalk.red("Failed to list PM2 processes"), err);
        pm2.disconnect();
        process.exit(1);
      }

      const staticServers = list.filter((proc) => {
        const args = proc.pm2_env?.args || [];
        return args.some((arg) => arg.startsWith("--dir="));
      });

      if (staticServers.length === 0) {
        console.log(chalk.yellow("No static servers are currently running"));
        pm2.disconnect();
        return;
      }

      if (name !== "all") {
        const targetServer = staticServers.find((proc) => proc.name === name);
        if (!targetServer) {
          console.error(chalk.red(`Static server '${name}' not found`));
          pm2.disconnect();
          process.exit(1);
        }
        // Delete specific server
        pm2.delete(targetServer.pm_id, (err) => {
          if (err) {
            console.error(chalk.red(`Failed to delete server '${name}'`), err);
            pm2.disconnect();
            process.exit(1);
          }
          console.log(chalk.green(`✅ Successfully deleted server '${name}'`));
          pm2.disconnect();
        });
      } else {
        // Delete all static servers
        let pendingDeletes = staticServers.length;
        let hasError = false;

        staticServers.forEach((server) => {
          pm2.delete(server.pm_id, (err) => {
            if (err) {
              hasError = true;
              console.error(
                chalk.red(`Failed to delete server '${server.name}'`),
                err
              );
            } else {
              console.log(
                chalk.green(`✅ Successfully deleted server '${server.name}'`)
              );
            }

            pendingDeletes--;
            if (pendingDeletes === 0) {
              pm2.disconnect();
              if (hasError) process.exit(1);
            }
          });
        });
      }
    });
  });
}

function saveServer() {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.save((err) => {
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

// automatically start process after reboot using pm2 startup
function autostartServer() {
  pm2.connect((err) => {
    if (err) {
      console.error(chalk.red("Failed to connect to PM2"), err);
      process.exit(1);
    }

    pm2.startup((err) => {
      if (err) {
        console.error(chalk.red("Failed to start PM2 startup"), err);
        pm2.disconnect();
        process.exit(1);
      }

      console.log(chalk.green("✅ PM2 startup successfully started!"));
      pm2.disconnect();
    });
  });
}
