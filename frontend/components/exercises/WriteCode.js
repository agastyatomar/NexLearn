"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { runCode } from "@/lib/runner";

export function WriteCode({ exercise, value, onChange, showResult }) {
  const starter = exercise.content?.starterCode ?? "";
  const code = value ?? starter;
  const tests = exercise.content?.tests ?? [{ expected: "" }];
  const expected = tests[0]?.expected ?? "";

  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    setError(null);
    const res = await runCode({ code, language: "javascript", timeout: 2000 });
    setOutput(res.output);
    setError(res.error || (res.timedOut ? res.error : null));
    setRunning(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-body text-[19px] font-bold leading-[1.4] text-ink">{exercise.prompt}</h2>

      <div className="overflow-hidden rounded-[12px] border-2 border-dim-steel bg-night">
        <div className="flex items-center justify-between border-b-2 border-dim-steel bg-dim-steel/10 px-3 py-2">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-steel">Your code</p>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-[10px] border-2 border-dim-steel bg-night px-3 py-1 font-body text-[12px] font-bold text-ink hover:border-graphite disabled:opacity-60"
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
        <div className="h-[200px]">
          <Editor
            height="200px"
            language="javascript"
            value={code}
            onChange={(v) => !showResult && onChange(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              scrollBeyondLastLine: false,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      </div>

      {(output || error) && (
        <div className="rounded-[12px] border-2 border-dim-steel bg-night p-3">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-steel">Console</p>
          <pre className="mt-1 max-h-[120px] overflow-auto whitespace-pre-wrap font-mono text-[13px] leading-[1.5] text-ink">
            {error ? <span className="text-destructive">{error}</span> : output || "(no output)"}
            {expected ? <span className="text-steel">{"\n→ expected: " + expected}</span> : null}
          </pre>
        </div>
      )}

      {showResult ? (
        <p className="rounded-[12px] border-2 border-nex-blue bg-soft-violet px-4 py-3 font-body text-[14px] font-bold text-ink">
          Great! {exercise.explanation}
        </p>
      ) : null}
    </div>
  );
}
