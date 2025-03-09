import { parser } from "./parser";

interface PureMPVData {
  cropbox: {
    w: number | null;
    h: number | null;
    x: number | null;
    y: number | null;
  };

  timestamps: {
    start: string | null;
    end: string | null;
  };
}

type Box = PureMPVData["cropbox"];

type SetBox = {
  [K in keyof Box]: NonNullable<Box[K]>;
};

const cropboxIsSet = (box: Box): box is SetBox =>
  typeof box.h === "number" && typeof box.w === "number";

const isPureMPVData = (value: unknown): value is PureMPVData =>
  value != null &&
  typeof value === "object" &&
  "cropbox" in value &&
  "timestamps" in value;

const fetchPureMPVData = (): PureMPVData => {
  const path = "user-data/PureMPV";
  const data = mp.get_property_native(path);

  if (!isPureMPVData(data)) {
    throw new Error("Unable to retrieve PureMPV data");
  }

  return data;
};

const getTimestampString = ({ start, end }: PureMPVData["timestamps"]) =>
  `${start ? "-ss " + start : ""}${
    end ? (start ? " " : "") + "-to " + end : ""
  }`;

const getCropboxString = (cropbox: PureMPVData["cropbox"]) =>
  cropboxIsSet(cropbox)
    ? `-lavfi crop=${cropbox.w}:${cropbox.h}:${cropbox.x}:${cropbox.y}`
    : "";

const encode = (params: string) => {
  const path = mp.get_property("path");

  if (typeof path !== "string") {
    throw new Error("Unable to retrieve the path");
  }

  const purempv = fetchPureMPVData();
  const timestamps = getTimestampString(purempv.timestamps);
  const cropbox = getCropboxString(purempv.cropbox);

  const splitRegex = /(?:[^\s"]+|"[^"]*")/g; // spaces in quotes won't be split

  let paramsArray: string[] = params.match(splitRegex) ?? [];

  paramsArray = paramsArray.map((param) => param.replace(/"/g, ""));

  const timestampsArray: string[] = timestamps.match(splitRegex) ?? [];
  const cropboxArray: string[] = cropbox.match(splitRegex) ?? [];

  const command = [options.executable];

  if (options.burnSubs) {
    command.push("-subs");
  }

  // burning the subs needs output seeking, otherwise they will be de-synced
  if (options.inputSeeking && !options.burnSubs) {
    command.push(...timestampsArray);
    command.push("-i", path);
  } else {
    command.push("-i", path);
    command.push(...timestampsArray);
  }

  command.push(...cropboxArray);
  command.push(...paramsArray);

  print(`Executing: ${command.join(" ")}`);

  mp.command_native({
    name: "subprocess",
    args: command,
    detach: true,
  });

  if (options.showEncodingStatus) {
    registerStatusChecker();
  }
};

const toggleBurnSubs = () => {
  options.burnSubs = !options.burnSubs;

  mp.osd_message(`Burn subtitles: ${options.burnSubs ? "yes" : "no"}`);
};

type AssertNever = (value: never) => never;

const assertNever: AssertNever = (value) => {
  throw new Error(`Unexpected value: ${value}`);
};

let statusCheckerId: number | undefined;

const registerStatusChecker = () => {
  if (statusCheckerId !== undefined) {
    return;
  }

  statusCheckerId = setInterval(showStatusInOSD, 500);
};

const unregisterStatusChecker = () => {
  clearInterval(statusCheckerId);

  statusCheckerId = undefined;
};

let encodingDetected = false;

const showStatusInOSD = () => {
  const COLORS = {
    BLUE: "{\\b1\\c&HF5B158&}",
    YELLOW: "{\\b1\\c&H059e3ff&}",
  };

  const process = mp.command_native({
    name: "subprocess",
    args: [options.executable, "-status"],
    capture_stdout: true,
    capture_stderr: true,
  });

  if (process.status !== 0) {
    unregisterStatusChecker();

    if (encodingDetected) {
      mp.osd_message("All encodings finished!", 3);

      encodingDetected = false;
    }

    return;
  }

  encodingDetected = true;

  const status = parser.parseStatus(process.stdout);

  let message: string;

  switch (status.stage) {
    case "IDLE":
      message = "Encoder is idling";
      break;
    case "SINGLE-PASS":
      if (status.percentage === undefined) {
        message = `Encoding ${status.current} of ${status.total}: ${COLORS.BLUE}Processing the single pass`;

        break;
      }

      message = `Encoding ${status.current} of ${status.total}: ${COLORS.BLUE}${status.percentage}%`;

      break;
    case "FIRST-PASS":
      message =
        `Encoding ${status.current} of ${status.total}: ${COLORS.BLUE}Processing the first pass` +
        (status.tries > 1 ? ` ${COLORS.YELLOW}(try ${status.tries})` : "");

      break;
    case "SECOND-PASS":
      if (status.percentage === undefined) {
        message =
          `Encoding ${status.current} of ${status.total}: ${COLORS.BLUE}Processing the second pass` +
          (status.tries > 1 ? ` ${COLORS.YELLOW}(try ${status.tries})` : "");

        break;
      }

      message =
        `Encoding ${status.current} of ${status.total}: ${COLORS.BLUE}${status.percentage}%` +
        (status.tries > 1 ? ` ${COLORS.YELLOW}(try ${status.tries})` : "");

      break;
    default:
      assertNever(status);
  }

  const assStop = mp.get_property("osd-ass-cc/1");
  const assStart = mp.get_property("osd-ass-cc/0");

  mp.osd_message(assStart + message + assStop, 3);
};

const options = {
  executable: "pwebm",
  params1: "",
  params2: "-c:v libx264 -crf 18",
  burnSubs: false,
  inputSeeking: true,
  showEncodingStatus: false,

  // keybindings
  keybinding1: "ctrl+o",
  keybinding2: "ctrl+shift+o",
  burnSubsKeybinding: "ctrl+v",
};

mp.options.read_options(options, "pwebm-helper");

if (options.showEncodingStatus) {
  // run the checker as soon as we open mpv
  // we want to show anything that is encoding when switching mpv windows
  registerStatusChecker();
}

mp.add_key_binding(
  options.burnSubsKeybinding,
  "burn-subtitles",
  toggleBurnSubs,
);

mp.add_key_binding("ctrl+s", "show-encoding-status", () => {
  options.showEncodingStatus = !options.showEncodingStatus;

  mp.osd_message(
    "Show encoding status: " + (options.showEncodingStatus ? "yes" : "no"),
  );

  if (options.showEncodingStatus) {
    registerStatusChecker();
  } else {
    unregisterStatusChecker();
  }
});

mp.add_key_binding(options.keybinding1, "pwebm-encode1", () =>
  encode(options.params1),
);

mp.add_key_binding(options.keybinding2, "pwebm-encode2", () =>
  encode(options.params2),
);
