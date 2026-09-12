"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Output } from "./Output";
import { track } from "@/lib/analytics";
import { getTool } from "@/lib/tools";
import { ToolInput, ToolResult, Values } from "@/lib/tools/types";

function initialValues(inputs: ToolInput[]): Values {
  const values: Values = {};

  for (const input of inputs) {
    values[input.key] =
      input.value !== undefined
        ? input.value
        : input.type === "checkbox"
          ? false
          : input.type === "select"
            ? (input.options?.[0]?.value ?? "")
            : "";
  }

  return values;
}

const fieldClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm text-fg " +
  "placeholder:text-faint focus:border-accent focus:outline-none";

const buttonClass =
  "rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-dim transition-colors " +
  "hover:border-accent/50 hover:text-fg active:translate-y-0 hover:-translate-y-px disabled:opacity-50";

/**
 * `initial` is the example already run on the server. Seeding state with it
 * means the generated code is in the static HTML rather than appearing only
 * after hydration, which is what lets crawlers read it.
 */
export function ToolRunner({ slug, initial }: { slug: string; initial?: ToolResult }) {
  const tool = getTool(slug)!;

  // the example is loaded on arrival so the tool is already doing something
  const [values, setValues] = useState<Values>(() => ({
    ...initialValues(tool.inputs),
    ...tool.example,
  }));
  const [output, setOutput] = useState<{
    result: ToolResult | null;
    error: string | null;
    stamp: number;
  }>({ result: initial ?? null, error: null, stamp: 0 });

  const [toast, setToast] = useState<string | null>(null);

  // a slow async run must not overwrite the output of a newer one
  const runId = useRef(0);

  const run = useCallback(
    async (next: Values) => {
      const id = ++runId.current;

      try {
        const result = await tool.run(next);
        if (id !== runId.current) return;

        setOutput((current) => ({ result, error: null, stamp: current.stamp + 1 }));
      } catch (thrown) {
        if (id !== runId.current) return;

        setOutput((current) => ({
          result: null,
          error: (thrown as Error).message,
          stamp: current.stamp + 1,
        }));
      }
    },
    [tool],
  );

  useEffect(() => {
    track("tool_opened", { tool: tool.slug });
  }, [tool.slug]);

  // the server already ran the untouched example, so re-running it on mount
  // would only replace the output with an identical value and flash the panel
  const skipFirstRun = useRef(!!initial);

  useEffect(() => {
    if (tool.manual) return;

    if (skipFirstRun.current) {
      skipFirstRun.current = false;
      return;
    }

    const timer = setTimeout(() => run(values), 150);
    return () => clearTimeout(timer);
  }, [values, run, tool.manual]);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  };

  const copyText = useMemo(() => {
    const { result } = output;

    if (!result) return "";
    if (result.kind === "text") return result.text;
    if (result.kind === "blocks") return result.copy ?? "";
    return "";
  }, [output]);

  const set = (key: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  const copy = async () => {
    if (!copyText) return notify("Nothing to copy yet");

    try {
      await navigator.clipboard.writeText(copyText);
      notify("Copied");
      track("copy_clicked", { tool: tool.slug });
    } catch {
      notify("Your browser blocked the clipboard — select the text instead");
    }
  };

  const download = () => {
    if (!copyText || !tool.download) return;

    const name = typeof tool.download === "function" ? tool.download(values) : tool.download;
    const url = URL.createObjectURL(new Blob([copyText], { type: "text/plain" }));

    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();

    // revoking in the same tick cancels the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    notify(`Saved ${name}`);
    track("download_clicked", { tool: tool.slug });
  };

  const loadExample = () => {
    if (!tool.example) return;

    const next = { ...initialValues(tool.inputs), ...tool.example };

    setValues(next);
    if (tool.manual) run(next);

    notify("Example loaded");
    track("example_loaded", { tool: tool.slug });
  };

  const clear = () => {
    setValues(initialValues(tool.inputs));
    setOutput((current) => ({ result: null, error: null, stamp: current.stamp + 1 }));
  };

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) run(values);
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rise rounded-xl border border-line bg-panel p-4 transition-colors focus-within:border-accent/40">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Input</h2>
            {tool.example && (
              <button type="button" onClick={loadExample} className="text-xs text-accent hover:underline">
                Load example
              </button>
            )}
          </div>

          <div className="space-y-3">
            {tool.inputs.map((input) => (
              <Field key={input.key} input={input} value={values[input.key]} onChange={set} />
            ))}
          </div>
        </section>

        <section className="rise min-w-0 rounded-xl border border-line bg-panel p-4 [animation-delay:60ms]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{tool.outputLabel ?? "Output"}</h2>
            <button type="button" onClick={copy} className="text-xs text-accent hover:underline">
              Copy
            </button>
          </div>

          <div key={output.stamp} className="flash">
            <Result result={output.result} error={output.error} manual={!!tool.manual} />
          </div>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run(values)}
          className="rounded-lg bg-linear-135 from-accent to-[#4d78f0] px-4 py-2 text-sm font-medium text-white shadow-[0_3px_12px_rgba(91,140,255,0.26)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(91,140,255,0.38)]"
        >
          Run
        </button>

        <button type="button" onClick={copy} className={buttonClass}>
          Copy output
        </button>

        {tool.download && (
          <button type="button" onClick={download} className={buttonClass}>
            Download
          </button>
        )}

        <button type="button" onClick={clear} className={buttonClass}>
          Clear
        </button>

        <span className="text-xs text-faint">
          Runs in your browser. Press ⌘/Ctrl + Enter to run.
        </span>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Result({
  result,
  error,
  manual,
}: {
  result: ToolResult | null;
  error: string | null;
  manual: boolean;
}) {
  if (error) {
    return (
      <div className="text-sm">
        <h3 className="mb-2 font-semibold text-err">That did not work</h3>
        <p className="text-dim">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <p className="text-sm text-faint">
        {manual ? "Fill in the fields, then press Run." : "Output appears here as you type."}
      </p>
    );
  }

  if (result.kind === "empty") return <p className="text-sm text-faint">{result.message}</p>;

  if (result.kind === "blocks") return <Output blocks={result.blocks} />;

  return (
    <div>
      <pre className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {result.text}
      </pre>

      {result.notes?.length ? (
        <div className="mt-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-xs text-dim">
          <p className="mb-1 font-semibold text-warn">
            {result.notes.length === 1
              ? "1 option was not converted"
              : `${result.notes.length} options were not converted`}
          </p>
          <ul className="list-disc space-y-1 pl-4">
            {result.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  input,
  value,
  onChange,
}: {
  input: ToolInput;
  value: string | boolean;
  onChange: (key: string, value: string | boolean) => void;
}) {
  const id = `in-${input.key}`;

  if (input.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-sm text-dim">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(input.key, event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
        />
        {input.label}
      </label>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-dim">
        {input.label}
      </label>

      {input.type === "textarea" ? (
        <textarea
          id={id}
          value={String(value)}
          onChange={(event) => onChange(input.key, event.target.value)}
          placeholder={input.placeholder}
          spellCheck={false}
          className={`${fieldClass} resize-y ${input.tall ? "h-56" : "h-28"}`}
        />
      ) : input.type === "select" ? (
        <select
          id={id}
          value={String(value)}
          onChange={(event) => onChange(input.key, event.target.value)}
          className={fieldClass}
        >
          {input.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={String(value)}
          onChange={(event) => onChange(input.key, event.target.value)}
          placeholder={input.placeholder}
          spellCheck={false}
          autoComplete="off"
          className={fieldClass}
        />
      )}

      {input.hint && <p className="mt-1 text-xs text-faint">{input.hint}</p>}
    </div>
  );
}
