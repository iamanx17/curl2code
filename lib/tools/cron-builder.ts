import { Block, Cell, Tool, Values, blocks, empty } from "./types";
import { str } from "./shared";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MONTH_ALIASES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const DAY_ALIASES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const PRESETS = [
  { value: "", label: "— keep the expression above —" },
  { value: "* * * * *", label: "Every minute" },
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "0 * * * *", label: "Every hour, on the hour" },
  { value: "30 * * * *", label: "Every hour at half past" },
  { value: "0 */6 * * *", label: "Every 6 hours" },
  { value: "0 0 * * *", label: "Every day at midnight" },
  { value: "0 9 * * *", label: "Every day at 09:00" },
  { value: "0 9 * * 1-5", label: "Weekdays at 09:00" },
  { value: "0 3 * * 0", label: "Every Sunday at 03:00" },
  { value: "0 0 1 * *", label: "First day of the month at midnight" },
  { value: "0 0 1 1 *", label: "Every 1 January at midnight" },
];

type FieldMeta = {
  label: string;
  min: number;
  max: number;
  aliases?: Record<string, number>;
  wrap?: (value: number) => number;
};

const FIELDS: Record<string, FieldMeta> = {
  second: { label: "second", min: 0, max: 59 },
  minute: { label: "minute", min: 0, max: 59 },
  hour: { label: "hour", min: 0, max: 23 },
  dom: { label: "day-of-month", min: 1, max: 31 },
  month: { label: "month", min: 1, max: 12, aliases: MONTH_ALIASES },
  // 0 and 7 both mean Sunday, so 7 folds back to 0
  dow: { label: "day-of-week", min: 0, max: 7, aliases: DAY_ALIASES, wrap: (value) => value % 7 },
};

type Field = {
  list: number[];
  all: boolean;
  step: number | null;
  /** True when a step runs across the whole range, so it reads as "every N". */
  covers: boolean;
  spec: string;
};

type Cron = {
  expression: string;
  macro: string | null;
  hasSeconds: boolean;
  second: Field | null;
  minute: Field;
  hour: Field;
  dom: Field;
  month: Field;
  dow: Field;
};

const ordinal = (value: number) => {
  const rest = value % 100;
  if (rest >= 11 && rest <= 13) return `${value}th`;

  return value + ({ 1: "st", 2: "nd", 3: "rd" }[value % 10] || "th");
};

function joinWords(items: string[]) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

const range = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

/** Month and day names are removed first so the L in JUL is not read as an extension. */
function withoutNames(raw: string, field: FieldMeta) {
  if (!field.aliases) return raw;

  return raw.replace(new RegExp(Object.keys(field.aliases).join("|"), "gi"), "");
}

function readValue(token: string, field: FieldMeta) {
  const name = token.trim();
  if (!name) throw new Error(`A value is missing from the ${field.label} field.`);

  let value: number;

  if (field.aliases && field.aliases[name.toUpperCase()] !== undefined) {
    value = field.aliases[name.toUpperCase()];
  } else if (/^\d+$/.test(name)) {
    value = Number(name);
  } else {
    const hint = field.aliases
      ? ` Use a number from ${field.min} to ${field.max}, or a name such as ${Object.keys(field.aliases).slice(0, 3).join(", ")}.`
      : ` Use a number from ${field.min} to ${field.max}.`;

    throw new Error(`"${name}" is not a valid ${field.label} value.${hint}`);
  }

  if (value < field.min || value > field.max) {
    throw new Error(`The ${field.label} field accepts ${field.min} to ${field.max} — got ${value}.`);
  }

  return value;
}

function parseField(spec: string, field: FieldMeta): Field {
  const raw = spec.trim();
  if (!raw) throw new Error(`The ${field.label} field is empty.`);

  const extension = /[LW#]/i.exec(withoutNames(raw, field));

  if (extension) {
    throw new Error(
      `The ${field.label} field uses "${extension[0].toUpperCase()}", which only Quartz and Spring understand. Standard crontab does not accept it. Ranges, lists and steps all work here.`,
    );
  }

  // ? means "no particular value" in Quartz; treat it as *
  if (raw === "*" || raw === "?") {
    return { list: range(field.min, field.max), all: true, step: 1, covers: false, spec: raw };
  }

  const values = new Set<number>();

  let step: number | null = null;
  let covers = false;

  for (const part of raw.split(",")) {
    const [body, stepText] = part.split("/");
    let partStep = 1;

    if (stepText !== undefined) {
      partStep = Number(stepText);

      if (!Number.isInteger(partStep) || partStep < 1) {
        throw new Error(`The step in "${part}" (${field.label}) must be a whole number of 1 or more.`);
      }
    }

    let from: number;
    let to: number;

    if (body === "*" || body === "?") {
      from = field.min;
      to = field.max;
      if (stepText !== undefined) covers = true;
    } else if (body.includes("-")) {
      const [start, end] = body.split("-");
      from = readValue(start, field);
      to = readValue(end, field);

      if (from > to) {
        throw new Error(
          `The range ${body} in the ${field.label} field runs backwards — write it as ${to}-${from}, or as two entries separated by a comma.`,
        );
      }

      if (stepText !== undefined && from === field.min && to === field.max) covers = true;
    } else {
      from = readValue(body, field);
      to = stepText === undefined ? from : field.max;
      if (stepText !== undefined && from === field.min) covers = true;
    }

    for (let value = from; value <= to; value += partStep) {
      values.add(field.wrap ? field.wrap(value) : value);
    }

    step = raw.includes(",") ? null : partStep;
  }

  return {
    list: [...values].sort((a, b) => a - b),
    all: false,
    step,
    covers: covers && step !== null && step > 1,
    spec: raw,
  };
}

function parseCron(input: string): Cron {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) throw new Error("Enter a cron expression, or choose a preset.");

  const macro = MACROS[cleaned.toLowerCase()];

  if (cleaned.startsWith("@") && !macro) {
    if (cleaned.toLowerCase() === "@reboot") {
      throw new Error("@reboot runs once when the machine starts, so it has no schedule to describe.");
    }

    throw new Error(
      `"${cleaned}" is not a shorthand cron understands. The recognised ones are @yearly, @monthly, @weekly, @daily and @hourly.`,
    );
  }

  const expression = macro || cleaned;
  const parts = expression.split(" ");

  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(
      `A cron expression needs 5 fields — minute, hour, day-of-month, month, day-of-week — or 6 when the first is seconds. This has ${parts.length}.`,
    );
  }

  const hasSeconds = parts.length === 6;
  const rest = hasSeconds ? parts.slice(1) : parts;

  return {
    expression,
    macro: macro ? cleaned.toLowerCase() : null,
    hasSeconds,
    second: hasSeconds ? parseField(parts[0], FIELDS.second) : null,
    minute: parseField(rest[0], FIELDS.minute),
    hour: parseField(rest[1], FIELDS.hour),
    dom: parseField(rest[2], FIELDS.dom),
    month: parseField(rest[3], FIELDS.month),
    dow: parseField(rest[4], FIELDS.dow),
  };
}

const isContiguous = (list: number[]) =>
  list.length > 1 && list[list.length - 1] - list[0] === list.length - 1;

/** Phrased to follow an interval: "every 15 minutes between 09:00 and 17:59". */
function hourWindow(hour: Field) {
  if (hour.all) return "";
  if (hour.covers) return `of every ${ordinal(hour.step!)} hour`;

  if (hour.list.length === 1 || isContiguous(hour.list)) {
    return `between ${pad(hour.list[0])}:00 and ${pad(hour.list[hour.list.length - 1])}:59`;
  }

  if (hour.list.length > 6) return `during ${hour.list.length} hours of the day`;

  return `during ${joinWords(hour.list.map((value) => `${pad(value)}:00`))}`;
}

/** Phrased to follow "past": "at minute 5 past every 2nd hour". */
function hourClause(hour: Field) {
  if (hour.all) return "every hour";
  if (hour.covers) return `every ${ordinal(hour.step!)} hour`;

  if (isContiguous(hour.list)) {
    return `the hours ${pad(hour.list[0])}:00 to ${pad(hour.list[hour.list.length - 1])}:00`;
  }

  if (hour.list.length > 6) return `${hour.list.length} hours of the day`;

  return joinWords(hour.list.map((value) => `${pad(value)}:00`));
}

/**
 * Seconds only earn a mention when they change the schedule, so the 0 in a
 * six-field expression stays out of the sentence.
 */
function secondClause(second: Field | null) {
  if (!second) return "";
  if (second.all) return "every second";
  if (second.covers) return `every ${second.step} seconds`;
  if (second.list.length > 1) return `at seconds ${joinWords(second.list.map(String))}`;

  return "";
}

function timeClause(cron: Cron) {
  const { minute, hour } = cron;
  const seconds = secondClause(cron.second);
  const prefix = seconds ? seconds + " " : "";

  if (minute.all && hour.all) return seconds || "every minute";
  if (minute.covers && hour.all) return `${prefix}every ${minute.step} minutes`;
  if (minute.covers) return `${prefix}every ${minute.step} minutes ${hourWindow(hour)}`;
  if (minute.all && !hour.all) return `${prefix}every minute ${hourWindow(hour)}`;

  if (minute.list.length === 1 && hour.all) {
    return (
      prefix +
      (minute.list[0] === 0
        ? "every hour, on the hour"
        : `at ${minute.list[0]} minutes past every hour`)
    );
  }

  if (minute.list.length === 1 && hour.covers) {
    return (
      prefix +
      (minute.list[0] === 0
        ? `every ${hour.step} hours`
        : `at ${minute.list[0]} minutes past every ${ordinal(hour.step!)} hour`)
    );
  }

  if (minute.list.length === 1 && hour.list.length <= 6) {
    return (
      prefix + "at " + joinWords(hour.list.map((value) => `${pad(value)}:${pad(minute.list[0])}`))
    );
  }

  return `${prefix}at minute ${joinWords(minute.list.map(String))} past ${hourClause(hour)}`;
}

function dateClause(cron: Cron) {
  const { dom, month, dow } = cron;
  const bits: string[] = [];

  if (!dow.all) {
    bits.push(
      "on " +
        (dow.covers
          ? `every ${ordinal(dow.step!)} day of the week`
          : joinWords(dow.list.map((value) => DAYS[value]))),
    );
  }

  if (!dom.all) {
    // "of the month" only needs saying while the month itself is open
    const suffix = month.all ? " of the month" : "";

    const phrase = dom.covers
      ? `every ${ordinal(dom.step!)} day${suffix}`
      : `the ${joinWords(dom.list.map(ordinal))}${suffix}`;

    bits.push((bits.length ? "and on " : "on ") + phrase);
  }

  if (!month.all) {
    bits.push(
      "in " +
        (month.covers
          ? `every ${ordinal(month.step!)} month`
          : joinWords(month.list.map((value) => MONTHS[value - 1]))),
    );
  }

  return bits.length ? bits.join(" ") : "every day";
}

function describe(cron: Cron) {
  const time = timeClause(cron).trim();
  const date = dateClause(cron);

  // "every 5 minutes every day" says the same thing twice
  const sentence = date === "every day" && time.startsWith("every ") ? time : `${time} ${date}`;

  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

function dayMatches(cron: Cron, date: Date) {
  if (!cron.month.list.includes(date.getMonth() + 1)) return false;

  const dom = cron.dom.list.includes(date.getDate());
  const dow = cron.dow.list.includes(date.getDay());

  // with both day fields restricted, cron runs on either — not both
  if (!cron.dom.all && !cron.dow.all) return dom || dow;
  if (!cron.dom.all) return dom;
  if (!cron.dow.all) return dow;

  return true;
}

/** Walks days and only opens up the matching ones, so a yearly job is still cheap. */
function nextRuns(cron: Cron, count: number) {
  const now = new Date();
  const seconds = cron.second ? cron.second.list : [0];
  const runs: Date[] = [];

  for (let offset = 0; offset < 1500 && runs.length < count; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!dayMatches(cron, day)) continue;

    for (const hour of cron.hour.list) {
      for (const minute of cron.minute.list) {
        for (const second of seconds) {
          const when = new Date(
            day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, second,
          );

          if (when <= now) continue;

          runs.push(when);
          if (runs.length >= count) return runs;
        }
      }
    }
  }

  return runs;
}

const formatRun = (date: Date) =>
  `${DAYS[date.getDay()].slice(0, 3)} ${pad(date.getDate())} ${MONTHS[date.getMonth()].slice(0, 3)} ` +
  `${date.getFullYear()} at ${pad(date.getHours())}:${pad(date.getMinutes())}` +
  (date.getSeconds() ? `:${pad(date.getSeconds())}` : "");

function warnings(cron: Cron) {
  const notes: string[] = [];

  if (!cron.dom.all && !cron.dow.all) {
    notes.push(
      "Both day-of-month and day-of-week are restricted. Cron treats that as OR, not AND, so the job runs on a matching day of the month or a matching weekday — more often than it looks.",
    );
  }

  if (cron.hasSeconds) {
    notes.push(
      "Six fields means the first one is seconds. Quartz and Spring accept that; Unix crontab does not and will reject the line.",
    );
  }

  if (cron.dom.list.some((day) => day > 28) && cron.dow.all) {
    notes.push(
      "A day of the month above 28 is skipped in months that are too short, so a job on the 31st runs seven times a year rather than twelve.",
    );
  }

  if (cron.minute.covers && cron.minute.step && 60 % cron.minute.step !== 0) {
    notes.push(
      `A step of ${cron.minute.step} does not divide 60 evenly, so the interval restarts at the top of every hour instead of repeating cleanly.`,
    );
  }

  if (cron.dow.spec.includes("7")) {
    notes.push("Day 7 means Sunday here, the same as 0. Some schedulers reject 7, so 0 is safer.");
  }

  return notes;
}

function summary(field: Field, meta: FieldMeta) {
  if (field.all) return `every ${meta.label}`;
  if (field.covers) return `every ${ordinal(field.step!)} ${meta.label}`;
  if (field.list.length > 12) return `${field.list.length} values`;

  if (meta.aliases === MONTH_ALIASES) return field.list.map((value) => MONTHS[value - 1]).join(", ");
  if (meta.aliases === DAY_ALIASES) return field.list.map((value) => DAYS[value]).join(", ");

  return field.list.join(", ");
}

export const cronBuilder: Tool = {
  slug: "cron-expression-generator",
  name: "Cron Expression Builder",
  category: "Utilities",
  summary: "Write a cron schedule from a preset, or paste one and read it in plain English.",
  title: "Cron Expression Generator and Explainer",
  description:
    'Cron schedules are five fields of numbers and asterisks, and it is very easy to write one that does not do what you meant. Paste an expression to get a plain-English description and its next five run times, or pick a preset and take the expression away. "0 0 * * *" simply means every day at midnight.',
  outputLabel: "Schedule",
  example: { expr: "0 9 * * 1-5", preset: "" },
  inputs: [
    {
      key: "expr",
      label: "Cron expression",
      type: "text",
      placeholder: "0 0 * * *",
      hint: "Five fields: minute hour day-of-month month day-of-week. Shorthands like @daily work too.",
    },
    {
      key: "preset",
      label: "Or pick a common schedule",
      type: "select",
      options: PRESETS,
      hint: "Choosing one of these replaces the expression above.",
    },
  ],
  run(values: Values) {
    const source = str(values, "preset") || str(values, "expr");
    if (!source.trim()) return empty("Enter a cron expression, or pick a preset, to see what it means.");

    const cron = parseCron(source);

    const rows: Cell[][] = [];

    if (cron.hasSeconds && cron.second) {
      rows.push(["Second", cron.second.spec, summary(cron.second, FIELDS.second)]);
    }

    rows.push(["Minute", cron.minute.spec, summary(cron.minute, FIELDS.minute)]);
    rows.push(["Hour", cron.hour.spec, summary(cron.hour, FIELDS.hour)]);
    rows.push(["Day of month", cron.dom.spec, summary(cron.dom, FIELDS.dom)]);
    rows.push(["Month", cron.month.spec, summary(cron.month, FIELDS.month)]);
    rows.push(["Day of week", cron.dow.spec, summary(cron.dow, FIELDS.dow)]);

    const runs = nextRuns(cron, 5);
    const notes = warnings(cron);

    const out: Block[] = [
      { kind: "heading", text: describe(cron), tone: "ok" },
      { kind: "code", text: cron.expression },
    ];

    if (cron.macro) {
      out.push({
        kind: "text",
        text: `${cron.macro} is shorthand for ${cron.expression}.`,
        muted: true,
      });
    }

    out.push({ kind: "heading", text: "Fields" });
    out.push({ kind: "table", head: ["Field", "Value", "Meaning"], rows });
    out.push({ kind: "heading", text: "Next 5 runs" });

    if (runs.length) {
      out.push({ kind: "list", items: runs.map(formatRun) });
      out.push({
        kind: "text",
        text: "Shown in your computer's time zone. A server running this schedule uses its own, which is usually UTC.",
        muted: true,
      });
    } else {
      out.push({
        kind: "text",
        text: "No run found in the next four years — check the day-of-month and month combination, which may never happen.",
        muted: true,
      });
    }

    if (notes.length) {
      out.push({ kind: "heading", text: "Worth knowing", tone: "warn" });
      out.push({ kind: "list", items: notes });
    }

    return blocks(out, cron.expression);
  },
  docs: [
    {
      heading: "The five fields",
      html: `<p>A crontab line is five values separated by spaces, each answering "when" in a different unit:</p>
      <table class="doc-table">
        <tr><th>Position</th><th>Field</th><th>Range</th><th>Example</th></tr>
        <tr><td>1</td><td>Minute</td><td>0–59</td><td><code>*/15</code> — every quarter hour</td></tr>
        <tr><td>2</td><td>Hour</td><td>0–23</td><td><code>9-17</code> — office hours</td></tr>
        <tr><td>3</td><td>Day of month</td><td>1–31</td><td><code>1</code> — the first</td></tr>
        <tr><td>4</td><td>Month</td><td>1–12 or JAN–DEC</td><td><code>*/3</code> — quarterly</td></tr>
        <tr><td>5</td><td>Day of week</td><td>0–7 or SUN–SAT</td><td><code>1-5</code> — weekdays</td></tr>
      </table>
      <p>Every field takes a single value, a list (<code>1,15</code>), a range (<code>9-17</code>) or a step (<code>*/15</code>). <code>*</code> means every value. That is the entire syntax — the hard part is predicting what a combination actually fires on.</p>`,
    },
    {
      heading: "The day-of-week trap",
      html: `<p>This is the mistake worth knowing about before you make it. <code>0 0 15 * 3</code> looks like "midnight on the 15th, if it is a Wednesday". It is not. When both day fields are restricted, cron joins them with <strong>OR</strong>: the job runs on the 15th <em>and</em> on every Wednesday — about five times a month instead of once.</p>
      <p>Restrict only one of the two day fields at a time. The tool warns you whenever both are set, and the next-run list shows the real frequency.</p>`,
    },
    {
      heading: "Where the dialects differ",
      html: `<ul class="list">
        <li><strong>Five fields or six.</strong> Unix crontab takes five, starting at minutes. Quartz and Spring take six, with seconds first. A six-field line pasted into a crontab is rejected.</li>
        <li><strong><code>L</code>, <code>W</code> and <code>#</code>.</strong> Last day of the month, nearest weekday and nth weekday are Quartz extensions. Plain cron has no equivalent — for "last day of the month", run daily and exit early unless tomorrow is the 1st.</li>
        <li><strong>Sunday is both 0 and 7.</strong> Most implementations take either; <code>0</code> is the portable choice.</li>
        <li><strong>Time zones.</strong> A cron expression has none. It runs in whatever zone the daemon uses, usually UTC on a server. That alone explains most "it ran at the wrong time" reports.</li>
        <li><strong>Daylight saving.</strong> On the spring-forward day a job inside the skipped hour may not run, and in autumn it may run twice. Anything that must not double-run needs its own guard.</li>
      </ul>`,
    },
    {
      heading: "Steps that do not divide evenly",
      html: `<p><code>*/7 * * * *</code> reads like "every seven minutes", and for most of the hour it is. But the step restarts at the top of each hour, so it fires at :00, :07 … :56, then :00 again — four minutes later, not seven. Choose a divisor of 60 if the interval really matters.</p>`,
    },
  ],
  faqs: [
    {
      q: "What does 0 0 * * * mean?",
      a: "Every day at midnight. The first 0 is the minute, the second is the hour, and the three asterisks leave the day, month and weekday unrestricted.",
    },
    {
      q: "How do I run something every 5 minutes?",
      a: "Use */5 * * * *. The */5 in the minute field means every fifth minute — :00, :05, :10 and so on.",
    },
    {
      q: "How do I schedule weekdays only?",
      a: "Set the day-of-week field to 1-5, as in 0 9 * * 1-5 for 09:00 Monday to Friday. Leave day-of-month as * — restricting both makes cron run on either.",
    },
    {
      q: "Which time zone does cron use?",
      a: "The machine's own, which on most servers is UTC. The expression carries no zone. The next-run times above use your computer's zone, so compare them against your server's before trusting them.",
    },
  ],
};
