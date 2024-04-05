import * as os from "node:os";

export const getLevel = (json: any) => {
  if (json.level == 10) {
    return "Trace";
  } else if (json.level == 20) {
    return "Debug";
  } else if (json.level == 30) {
    return "Info";
  } else if (json.level == 40) {
    return "Warn";
  } else if (json.level == 50) {
    return "Error";
  } else if (json.level == 60) {
    return "Fatal";
  }
};

export const getStreamName = (prefix?: string) => {
  const hn = os.hostname();
  const pi = process.pid;
  const ti = new Date().getTime();
  const pf = prefix ? prefix + "-" : "";
  return pf + hn + "-" + pi + "-" + ti;
};
