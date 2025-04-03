import chalk from "chalk";
import pm2 from "pm2";

export function stopServer(name) {
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
        // No static servers running
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
        // Stop specific server
        pm2.stop(targetServer.pm_id, (err) => {
          if (err) {
            console.error(chalk.red(`Failed to stop server '${name}'`), err);
            pm2.disconnect();
            process.exit(1);
          }
          console.log(chalk.green(`✅ Successfully stopped server '${name}'`));
          pm2.disconnect();
        });
      } else {
        // Stop all static servers
        let pendingStops = staticServers.length;
        let hasError = false;

        staticServers.forEach((server) => {
          pm2.stop(server.pm_id, (err) => {
            if (err) {
              hasError = true;
              console.error(
                chalk.red(`Failed to stop server '${server.name}'`),
                err
              );
            } else {
              console.log(
                chalk.green(`✅ Successfully stopped server '${server.name}'`)
              );
            }

            pendingStops--;
            if (pendingStops === 0) {
              pm2.disconnect();
              if (hasError) process.exit(1);
            }
          });
        });
      }
    });
  });
}
