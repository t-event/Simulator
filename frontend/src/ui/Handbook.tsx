import { useState } from "react";
import { KNOWLEDGE, knowledgeCard } from "../game/knowledge";
import { missionFor, missionProgress } from "../game/missions";
import { answerQuiz, QUIZ, quizAvailable, quizReward } from "../game/quiz";
import { RESEARCH } from "../game/research";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar } from "./common";
import { fmtKr, fmtNum } from "./format";
import { buzz } from "./haptics";

/** Kapitler som ikke er åpnet ennå */

/** Fast, men blandet rekkefølge på svaralternativene, så riktig svar ikke alltid står på samme plass */
function order(q: string, n: number): number[] {
  const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: n }, (_, j) => j).sort((a, b) => hash(q + a) - hash(q + b));
}

function Quiz({ g, chapter, act }: { g: GameState; chapter: string; act: GameApi["act"] }) {
  const questions = QUIZ[chapter];
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ correct: number; reward: number } | null>(null);
  if (!questions) return null;
  if (!quizAvailable(g, chapter) && result === null) {
    const score = g.quizScores[chapter] ?? 0;
    return (
      <p className={`g-quiz-done ${score === questions.length ? "g-badge-ok" : "g-muted"}`}>
        Quiz tatt: {score} av {questions.length} riktige
      </p>
    );
  }
  const ready = answers.filter((a) => a !== undefined).length === questions.length;

  return (
    <div className="g-quiz">
      <h3>Quiz – alt riktig gir {quizReward(g)} fagpoeng</h3>
      {result === null && (
        <p className="g-muted">Du har bare ett forsøk. Feil svar gir færre fagpoeng, så les kapitlet godt først.</p>
      )}
      {questions.map((q, i) => (
        <fieldset key={q.q} disabled={result !== null}>
          <legend>{q.q}</legend>
          {order(q.q, q.options.length).map((j) => {
            const o = q.options[j];
            const picked = answers[i] === j;
            const mark = result === null ? "" : j === q.correct ? " is-right" : picked ? " is-wrong" : "";
            return (
              <label key={o} className={`g-quiz-option${picked ? " is-picked" : ""}${mark}`}>
                <input
                  type="radio"
                  name={`${chapter}-${i}`}
                  checked={picked}
                  onChange={() => {
                    const next = [...answers];
                    next[i] = j;
                    setAnswers(next);
                  }}
                />
                {o}
              </label>
            );
          })}
          {result !== null && <p className="g-muted">{q.why}</p>}
        </fieldset>
      ))}
      {result === null ? (
        <button
          className="g-primary"
          disabled={!ready}
          onClick={() => {
            const r = act((gg) => answerQuiz(gg, chapter, answers));
            setResult(r);
            buzz(r.correct === questions.length ? 30 : 10);
          }}
        >
          Lever svarene
        </button>
      ) : (
        <p className={result.correct === questions.length ? "g-note" : "g-note g-warn"}>
          {result.correct === questions.length
            ? `Alt riktig! +${result.reward} fagpoeng.`
            : `${result.correct} av ${questions.length} riktige. ${result.reward > 0 ? `+${result.reward} fagpoeng.` : "Ingen fagpoeng denne gangen."} Forklaringene står under hvert spørsmål.`}
        </p>
      )}
    </div>
  );
}

function Chapter({ g, id, act }: { g: GameState; id: string; act: GameApi["act"] }) {
  const card = knowledgeCard(id)!;
  const mission = missionFor(id);
  const mState = mission ? g.missions[mission.id] : undefined;
  const research = RESEARCH.filter((r) => r.reads === id && !g.researched.includes(r.id));
  return (
    <>
      {card.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {research.length > 0 && (
        <p className="g-note">Lest! Nå kan du forske på: {research.map((r) => r.name).join(", ")}.</p>
      )}
      {mission && (
        <div className="g-mission">
          <strong>Oppdrag: {mission.title}</strong>
          {mState?.done ? (
            <span className="g-badge-ok">Fullført ✓</span>
          ) : (
            <>
              <Bar value={missionProgress(g, mission) / mission.goal} tone="ok" label="Fremdrift" />
              <span className="g-muted">
                {fmtNum(missionProgress(g, mission), mission.unit === "stjerner" ? 1 : 0)} av {mission.goal}{" "}
                {mission.unit ?? ""} · belønning {mission.fp} fagpoeng
                {mission.cash > 0 ? ` og ${fmtKr(mission.cash)}` : ""}
              </span>
            </>
          )}
        </div>
      )}
      <Quiz g={g} chapter={id} act={act} />
    </>
  );
}

export function Handbook({
  g,
  act,
  initial,
  onClose,
}: {
  g: GameState;
  act: GameApi["act"];
  initial: string | null;
  onClose: () => void;
}) {
  // Kapitlet det åpnes på, er allerede merket som lest av den som åpnet boka
  const [open, setOpen] = useState<string | null>(initial);
  const locked = KNOWLEDGE.length - g.knowledge.length;
  const toggle = (id: string) => {
    if (open === id) return setOpen(null);
    if (!g.readChapters.includes(id)) act((gg) => void gg.readChapters.push(id));
    setOpen(id);
  };

  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Fagboka" onClick={onClose}>
      <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="g-card-head">
          <h2>Fagboka</h2>
          <button onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </header>
        <p className="g-muted">
          Les kapitlene for å kunne forske, ta quizen for fagpoeng, og løs oppdragene for belønning.
          {locked > 0 && ` ${locked} kapitler gjenstår.`}
        </p>
        <div className="g-handbook">
          {g.knowledge.map((id) => {
            const card = knowledgeCard(id);
            if (!card) return null;
            const isOpen = open === id;
            const unread = !g.readChapters.includes(id);
            const quizOpen = quizAvailable(g, id);
            return (
              <article key={id} className={isOpen ? "is-open" : ""}>
                <button className="g-handbook-title" onClick={() => toggle(id)} aria-expanded={isOpen}>
                  {card.title}
                  {unread ? (
                    <span className="g-badge g-badge-new">Ny</span>
                  ) : (
                    quizOpen && <span className="g-handbook-tag">quiz</span>
                  )}
                </button>
                {isOpen && <Chapter g={g} id={id} act={act} />}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
