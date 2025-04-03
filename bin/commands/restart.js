import chalk from "chalk";
import pm2 from "pm2";

export function restartServer(name) {
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
