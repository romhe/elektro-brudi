import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { api } from "./lib/api.ts";
import type {
  Capture,
  HealthReport,
  ModelRun,
  RuntimeRecord,
} from "./lib/api.ts";
import {
  describeWebGpu,
  generateProofJson,
  loadModel,
  unloadModel,
  webGpuAvailable,
} from "./lib/model-client.ts";
import type { LoadedModel, ModelId } from "./lib/model-client.ts";
import { initialProofState, proofReducer, proofSummary } from "./lib/proof.ts";
import type { StepId } from "./lib/proof.ts";

export const PROOF_CAPTURE_URL = "https://example.com/";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatMs(value: number | null): string {
  return value === null ? "–" : `${(value / 1000).toFixed(1)} s`;
}

export function App() {
  const [proof, dispatch] = useReducer(proofReducer, initialProofState);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [records, setRecords] = useState<RuntimeRecord[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [modelRuns, setModelRuns] = useState<ModelRun[]>([]);
  const [note, setNote] = useState("Doppelklick-Nachweis");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    modelId: ModelId | null;
    text: string;
    value: number;
  }>({ modelId: null, text: "", value: 0 });
  const loadedModel = useRef<LoadedModel | null>(null);
  // One model operation at a time: manual buttons and the full proof share
  // this lock, so two Workers can never be created for overlapping loads.
  const modelLock = useRef(false);

  const withModelLock = useCallback(
    async (work: () => Promise<void>): Promise<boolean> => {
      if (modelLock.current) {
        return false;
      }
      modelLock.current = true;
      setBusy(true);
      try {
        await work();
        return true;
      } finally {
        modelLock.current = false;
        setBusy(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const [nextHealth, nextRecords, nextCaptures, nextRuns] =
        await Promise.all([
          api.health(),
          api.listRecords(),
          api.listCaptures(),
          api.listModelRuns(),
        ]);
      setHealth(nextHealth);
      setHealthError(null);
      setRecords(nextRecords);
      setCaptures(nextCaptures);
      setModelRuns(nextRuns);
    } catch (error) {
      setHealthError(errorText(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(
    () => () => {
      const loaded = loadedModel.current;
      if (loaded) {
        loadedModel.current = null;
        void unloadModel(loaded);
      }
    },
    [],
  );

  const runStep = useCallback(
    async (id: StepId, work: () => Promise<string>): Promise<boolean> => {
      dispatch({ type: "start", id });
      const startedAt = performance.now();
      try {
        const detail = await work();
        dispatch({
          type: "done",
          id,
          detail,
          durationMs: Math.round(performance.now() - startedAt),
        });
        return true;
      } catch (error) {
        dispatch({ type: "fail", id, detail: errorText(error) });
        return false;
      }
    },
    [],
  );

  const checkHealth = () =>
    runStep("health", async () => {
      const report = await api.health();
      setHealth(report);
      const browser =
        report.browser.status === "AVAILABLE"
          ? `Chromium ${report.browser.chromiumVersion}`
          : `Browser fehlt: ${report.browser.error}`;
      return `Server ${report.version}, PID ${report.pid}, Migrationen ${report.database.migrations.join(",")}, ${browser}`;
    });

  const writeRecord = () =>
    runStep("record", async () => {
      const record = await api.createRecord(note);
      setRecords(await api.listRecords());
      return `Datensatz ${record.id} um ${record.createdAt}`;
    });

  const capturePage = () =>
    runStep("capture", async () => {
      const capture = await api.createCapture(PROOF_CAPTURE_URL);
      setCaptures(await api.listCaptures());
      if (capture.outcome !== "FETCHED") {
        throw new Error(`${capture.outcome}: ${capture.error ?? "unbekannt"}`);
      }
      return `HTTP ${capture.httpStatus}, ${capture.contentBytes} Bytes, SHA-256 ${capture.contentSha256?.slice(0, 12)}…, Chromium ${capture.chromiumVersion}, ${formatMs(capture.durationMs)}`;
    });

  const checkWebGpu = () => runStep("webgpu", async () => describeWebGpu());

  const releaseModel = async () => {
    const loaded = loadedModel.current;
    loadedModel.current = null;
    if (loaded) {
      await unloadModel(loaded);
    }
  };

  const loadStep = (modelId: ModelId, stepId: StepId) =>
    runStep(stepId, async () => {
      await releaseModel();
      const webgpu = webGpuAvailable();
      setProgress({ modelId, text: "Start…", value: 0 });
      try {
        const loaded = await loadModel(modelId, (report) => {
          setProgress({ modelId, text: report.text, value: report.progress });
        });
        loadedModel.current = loaded;
        await api.createModelRun({
          browserUserAgent: navigator.userAgent,
          modelId,
          phase: "LOAD",
          cacheHit: loaded.cacheHit,
          webgpuAvailable: webgpu,
          durationMs: loaded.durationMs,
          outputJson: null,
          error: null,
        });
        setModelRuns(await api.listModelRuns());
        return `${loaded.cacheHit ? "Cache-Treffer" : "Download"}; geladen in ${formatMs(loaded.durationMs)}`;
      } catch (error) {
        await api.createModelRun({
          browserUserAgent: navigator.userAgent,
          modelId,
          phase: "LOAD",
          cacheHit: null,
          webgpuAvailable: webgpu,
          durationMs: 0,
          outputJson: null,
          error: errorText(error).slice(0, 1_000),
        });
        setModelRuns(await api.listModelRuns());
        throw error;
      }
    });

  const generateStep = (modelId: ModelId, stepId: StepId) =>
    runStep(stepId, async () => {
      const loaded = loadedModel.current;
      if (!loaded || loaded.modelId !== modelId || loaded.disposed) {
        throw new Error(`${modelId} ist nicht geladen`);
      }
      const constrained =
        new URLSearchParams(window.location.search).get("constrained") !== "0";
      setProgress({
        modelId,
        text: constrained ? "Generierung (Grammatik)…" : "Generierung (frei)…",
        value: 1,
      });
      try {
        const result = await generateProofJson(loaded, {
          constrained,
          onPartial: (partial) =>
            setProgress({ modelId, text: `Ausgabe: ${partial}`, value: 1 }),
        });
        const outputJson = JSON.stringify(result.parsed);
        await api.createModelRun({
          browserUserAgent: navigator.userAgent,
          modelId,
          phase: "GENERATE",
          cacheHit: null,
          webgpuAvailable: true,
          durationMs: result.durationMs,
          outputJson,
          error: null,
        });
        setModelRuns(await api.listModelRuns());
        return `${outputJson} in ${formatMs(result.durationMs)}${constrained ? "" : " (ohne Grammatik)"}`;
      } catch (error) {
        await api.createModelRun({
          browserUserAgent: navigator.userAgent,
          modelId,
          phase: "GENERATE",
          cacheHit: null,
          webgpuAvailable: true,
          durationMs: 0,
          outputJson: null,
          error: errorText(error).slice(0, 1_000),
        });
        setModelRuns(await api.listModelRuns());
        throw error;
      }
    });

  const runAll = useCallback(async () => {
    await withModelLock(async () => {
      dispatch({ type: "reset" });
      await checkHealth();
      await writeRecord();
      await capturePage();
      if (await checkWebGpu()) {
        if (await loadStep("Qwen3-1.7B-q4f16_1-MLC", "load-1.7b")) {
          await generateStep("Qwen3-1.7B-q4f16_1-MLC", "generate-1.7b");
        }
        if (await loadStep("Qwen3-4B-q4f16_1-MLC", "load-4b")) {
          await generateStep("Qwen3-4B-q4f16_1-MLC", "generate-4b");
        }
      }
      await releaseModel();
    });
    // The step callbacks close over stable state setters.
  }, [note, withModelLock]);

  const manualLoad = (modelId: ModelId, stepId: StepId) =>
    withModelLock(async () => {
      await loadStep(modelId, stepId);
    });
  const manualGenerate = (modelId: ModelId, stepId: StepId) =>
    withModelLock(async () => {
      await generateStep(modelId, stepId);
    });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autorun") === "1") {
      void runAll();
    }
    // Run once on mount.
  }, []);

  const summary = proofSummary(proof);

  return (
    <main>
      <h1>ElektroBrudi Phase 0</h1>
      <p className="muted">
        Laufzeit-Durchstich: Launcher, Loopback-Server, PWA, SQLite, gebündeltes
        Chromium, WebLLM-Worker. Keine Produktoberfläche.
      </p>

      <section>
        <h2>Nachweis</h2>
        <p>
          <button onClick={() => void runAll()} disabled={busy}>
            Nachweis starten
          </button>
          <span className="muted" data-testid="proof-summary">
            {summary.done} erledigt, {summary.failed} fehlgeschlagen,{" "}
            {summary.pending} offen
          </span>
        </p>
        <table data-testid="proof-table">
          <thead>
            <tr>
              <th>Schritt</th>
              <th>Status</th>
              <th>Dauer</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {proof.map((step) => (
              <tr key={step.id} data-step={step.id} data-status={step.status}>
                <td>{step.label}</td>
                <td>
                  <span className={`status ${step.status}`}>{step.status}</span>
                </td>
                <td>{formatMs(step.durationMs)}</td>
                <td className={step.status === "failed" ? "error" : ""}>
                  {step.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {progress.modelId ? (
          <p data-testid="model-progress">
            <span className="muted">{progress.modelId}: </span>
            {progress.text}
            <progress max={1} value={progress.value} />
          </p>
        ) : null}
      </section>

      <section>
        <h2>Health</h2>
        {healthError ? <p className="error">{healthError}</p> : null}
        {health ? (
          <table data-testid="health">
            <tbody>
              <tr>
                <th>Server</th>
                <td>
                  Version {health.version}, PID {health.pid}, gestartet{" "}
                  {health.startedAt}
                </td>
              </tr>
              <tr>
                <th>Listen</th>
                <td>
                  {health.listen.host}:{health.listen.port}
                </td>
              </tr>
              <tr>
                <th>Datenbank</th>
                <td>
                  {health.database.status}, Migrationen{" "}
                  {health.database.migrations.join(", ")},{" "}
                  <code>{health.database.path}</code>
                </td>
              </tr>
              <tr>
                <th>Browser</th>
                <td data-testid="health-browser">
                  {health.browser.status === "AVAILABLE"
                    ? `AVAILABLE, Chromium ${health.browser.chromiumVersion}`
                    : `MISSING: ${health.browser.error}`}
                </td>
              </tr>
            </tbody>
          </table>
        ) : null}
        <p>
          <button className="secondary" onClick={() => void checkHealth()}>
            Health prüfen
          </button>
        </p>
      </section>

      <section>
        <h2>SQLite-Datensätze</h2>
        <p>
          <input
            aria-label="Notiz"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button className="secondary" onClick={() => void writeRecord()}>
            Datensatz schreiben
          </button>
        </p>
        <table data-testid="records">
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.createdAt}</td>
                <td>{record.note}</td>
                <td>
                  <code>{record.id}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Seitenabruf über gebündeltes Chromium</h2>
        <p>
          <button className="secondary" onClick={() => void capturePage()}>
            {PROOF_CAPTURE_URL} abrufen
          </button>
        </p>
        <table data-testid="captures">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Ergebnis</th>
              <th>HTTP</th>
              <th>Bytes</th>
              <th>SHA-256</th>
              <th>Chromium</th>
              <th>Dauer</th>
            </tr>
          </thead>
          <tbody>
            {captures.map((capture) => (
              <tr key={capture.id}>
                <td>{capture.createdAt}</td>
                <td>
                  {capture.outcome}
                  {capture.error ? ` (${capture.error})` : ""}
                </td>
                <td>{capture.httpStatus ?? "–"}</td>
                <td>{capture.contentBytes ?? "–"}</td>
                <td>
                  <code>{capture.contentSha256?.slice(0, 16) ?? "–"}</code>
                </td>
                <td>{capture.chromiumVersion ?? "–"}</td>
                <td>{formatMs(capture.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>WebLLM im Web Worker</h2>
        <p>
          <button className="secondary" onClick={() => void checkWebGpu()}>
            WebGPU prüfen
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void manualLoad("Qwen3-1.7B-q4f16_1-MLC", "load-1.7b")
            }
          >
            Qwen3-1.7B laden
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void manualGenerate("Qwen3-1.7B-q4f16_1-MLC", "generate-1.7b")
            }
          >
            1.7B: JSON erzeugen
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void manualLoad("Qwen3-4B-q4f16_1-MLC", "load-4b")}
          >
            Qwen3-4B laden
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void manualGenerate("Qwen3-4B-q4f16_1-MLC", "generate-4b")
            }
          >
            4B: JSON erzeugen
          </button>
        </p>
        <table data-testid="model-runs">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Modell</th>
              <th>Phase</th>
              <th>Cache</th>
              <th>WebGPU</th>
              <th>Dauer</th>
              <th>Ausgabe / Fehler</th>
            </tr>
          </thead>
          <tbody>
            {modelRuns.map((run) => (
              <tr key={run.id}>
                <td>{run.createdAt}</td>
                <td>{run.modelId}</td>
                <td>{run.phase}</td>
                <td>
                  {run.cacheHit === null
                    ? "–"
                    : run.cacheHit
                      ? "Treffer"
                      : "Download"}
                </td>
                <td>{run.webgpuAvailable ? "ja" : "nein"}</td>
                <td>{formatMs(run.durationMs)}</td>
                <td className={run.error ? "error" : ""}>
                  <code>{run.outputJson ?? run.error ?? ""}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
