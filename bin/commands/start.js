import chalk from "chalk";
import pm2 from "pm2";

// start stopped server with name or all command
export function startServer(name) {
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

      // Filter to get only our static servers
      const staticServers = list.filter((proc) => {
        const args = proc.pm2_env?.args || [];
        return args.some((arg) => arg.startsWith("--dir="));
      });

      if (staticServers.length === 0) {
        console.log(chalk.yellow("No static servers are currently registered"));
        pm2.disconnect();
        return;
      }

      // Filter stopped servers
      const stoppedServers = staticServers.filter(
        (proc) => proc.pm2_env?.status !== "online"
      );

      if (name !== "all") {
        const targetServer = staticServers.find((proc) => proc.name === name);
        if (!targetServer) {
          console.error(chalk.red(`Static server '${name}' not found`));
          pm2.disconnect();
          process.exit(1);
        }

        if (targetServer.pm2_env?.status === "online") {
          console.log(chalk.yellow(`Server '${name}' is already running`));
          pm2.disconnect();
          return;
        }

        // Start specific server - using restart instead of start
        pm2.restart(targetServer.name, (err) => {
          if (err) {
            console.error(chalk.red(`Failed to start server '${name}'`), err);
            pm2.disconnect();
            process.exit(1);
          }
          console.log(chalk.green(`✅ Successfully started server '${name}'`));
          pm2.disconnect();
        });
      } else {
        // Start all stopped servers
        if (stoppedServers.length === 0) {
          console.log(chalk.yellow("No stopped servers to start"));
          pm2.disconnect();
          return;
        }

        // Keep track of pending starts
        let pendingStarts = stoppedServers.length;
        let hasError = false;

        stoppedServers.forEach((server) => {
          // Use restart with server name instead of pm_id
          pm2.restart(server.name, (err) => {
            if (err) {
              hasError = true;
              console.error(
                chalk.red(`Failed to start server '${server.name}'`),
                err
              );
            } else {
              console.log(
                chalk.green(`✅ Successfully started server '${server.name}'`)
              );
            }

            // Decrease pending starts and disconnect when all are done
            pendingStarts--;
            if (pendingStarts === 0) {
              pm2.disconnect();
              if (hasError) process.exit(1);
            }
          });
        });
      }
    });
  });
}
