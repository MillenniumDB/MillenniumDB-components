import { useState } from "react";
import clsx from "clsx";
import classes from "./tab-panel.module.css";

export type LogEntry = {
  id: number;
  timestamp: Date;
  title: string;
  message: string;
  color: "green" | "red";
};

type TabPanelProps = {
  colorScheme?: "light" | "dark";
  logs: LogEntry[];
  resultsSlot: React.ReactNode;
};

export const TabPanel = ({ colorScheme = "light", logs, resultsSlot }: TabPanelProps) => {
  const [activeTab, setActiveTab] = useState<"results" | "log">("results");
  const isDark = colorScheme === "dark";

  return (
    <div className={clsx(classes.root, isDark ? classes.rootDark : classes.rootLight)}>
      <div className={classes.tabBar}>
        <button
          className={clsx(classes.tab, activeTab === "results" && classes.tabActive)}
          onClick={() => setActiveTab("results")}
        >
          Results
        </button>
        <button
          className={clsx(classes.tab, activeTab === "log" && classes.tabActive)}
          onClick={() => setActiveTab("log")}
        >
          Log
          {logs.some((l) => l.color === "red") && <span className={classes.errorDot} />}
        </button>
      </div>

      <div className={classes.content}>
        <div className={clsx(classes.pane, activeTab === "results" && classes.paneVisible)}>
          {resultsSlot}
        </div>
        <div className={clsx(classes.pane, activeTab === "log" && classes.paneVisible)}>
          {logs.length === 0 ? (
            <div className={classes.empty}>No logs yet.</div>
          ) : (
            <div className={classes.logList}>
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={clsx(classes.logEntry, entry.color === "red" ? classes.logError : classes.logSuccess)}
                >
                  <span className={classes.logTime}>
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={classes.logTitle}>{entry.title}</span>
                  <span className={classes.logMessage}>{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
