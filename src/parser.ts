type ParsedStatus =
  | {
      stage: "IDLE";
    }
  | {
      stage: "SINGLE-PASS";
      total: number;
      current: number;
      percentage?: number | undefined;
    }
  | {
      stage: "FIRST-PASS";
      total: number;
      current: number;
      tries: number;
    }
  | {
      stage: "SECOND-PASS";
      total: number;
      current: number;
      tries: number;
      percentage?: number | undefined;
    };

const parseStatus = (status: string) => {
  try {
    const parsed = JSON.parse(status);

    // just a simple check to make sure the parsed object is valid
    if (
      typeof parsed.stage !== "string" ||
      (parsed.stage !== "IDLE" &&
        parsed.stage !== "SINGLE-PASS" &&
        parsed.stage !== "FIRST-PASS" &&
        parsed.stage !== "SECOND-PASS")
    ) {
      throw new Error("Invalid status object");
    }

    return parsed as ParsedStatus;
  } catch {
    return { stage: "IDLE" } satisfies ParsedStatus;
  }
};

export const parser = {
  parseStatus,
};
