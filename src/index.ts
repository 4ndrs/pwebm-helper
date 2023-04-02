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

  command.push(...timestampsArray);
  command.push("-i", path);

  if (burnSubs) {
    command.push("-subs");
  }

  command.push(...cropboxArray);
  command.push(...paramsArray);

  print(`Executing: ${command.join(" ")}`);

  mp.command_native({
    name: "subprocess",
    args: command,
    detach: true,
  });
};

const toggleBurnSubs = () => {
  burnSubs = !burnSubs;

  mp.osd_message(`Burn subtitles: ${burnSubs ? "yes" : "no"}`);
};

let burnSubs = false;

const options = {
  executable: "purewebm",
  params1: "",
  params2: '-ep "-map 0 -c copy -c:v libx264 -crf 18 -preset veryslow"',
  keybinding1: "ctrl+o",
  keybinding2: "ctrl+shift+o",
};

mp.options.read_options(options, "pwebm-helper");

mp.add_key_binding("ctrl+v", "burn-subtitles", toggleBurnSubs);

mp.add_key_binding(options.keybinding1, "pwebm-encode1", () =>
  encode(options.params1)
);

mp.add_key_binding(options.keybinding2, "pwebm-encode2", () =>
  encode(options.params2)
);
