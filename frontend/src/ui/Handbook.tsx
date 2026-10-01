/**
 * Fagboka (B-025, B-234): innholdet med fremdrift og «neste steg», kapitler som korte sider med «Kort fortalt»
 * øverst, og quiz ett spørsmål om gangen med svar med én gang. Mye tekst på én gang skremte folk bort – nå leses
 * boka en bit om gangen, og hvert kapittel har tre steg: les, quiz og oppdrag. Ikoner fra designsystemet, ikke emoji (B-236).
 */
import { Component, useState, type ReactNode } from "react";
import { Callout, SheetHead } from "./ds";
import { KNOWLEDGE, KNOWLEDGE_PARTS, knowledgeCard, readSeconds, type KnowledgeCard } from "../game/knowledge";
import { missionFor, missionProgress, type Mission } from "../game/missions";
import { answerQuizQuestion, QUIZ, quizAvailable, quizReward } from "../game/quiz";
import { RESEARCH } from "../game/research";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar } from "./common";
import { fmtKr, fmtNum } from "./format";
import { buzz } from "./haptics";
import { Icon } from "./icons";

type Act = GameApi["act"];

/** Fast, men blandet rekkefølge på svaralternativene, så riktig svar ikke alltid står på samme plass */
function order(q: string, n: number): number[] {
  const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: n }, (_, j) => j).sort((a, b) => hash(q + a) - hash(q + b));
}

function fmtRead(s: number): string {
  return s < 60 ? `${s} sek` : `${Math.round(s / 60)} min`;
}

/** Hvor langt spilleren har kommet i et kapittel: lest, quiz og oppdrag */
function chapterSteps(g: GameState, id: string) {
  const mission = missionFor(id);
  const read = g.readChapters.includes(id);
  const hasQuiz = !!QUIZ[id];
  const quiz = hasQuiz && !quizAvailable(g, id);
  const missionDone = !!mission && !!g.missions[mission.id]?.done;
  const total = 1 + (hasQuiz ? 1 : 0) + (mission ? 1 : 0);
  const done = (read ? 1 : 0) + (quiz ? 1 : 0) + (missionDone ? 1 : 0);
  return { mission, read, hasQuiz, quiz, missionDone, total, done };
}

function Stars({ correct, total }: { correct: number; total: number }) {
  return (
    <span className="g-book-stars" aria-label={`${correct} av ${total} riktige`}>
      {Array.from({ length: total }, (_, i) => (
        <Icon key={i} name="star" className={i < correct ? "is-on" : ""} />
      ))}
    </span>
  );
}

// ------------------------------------------------------------------ //
// Quiz: ett spørsmål om gangen
// ------------------------------------------------------------------ //
function Quiz({ g, chapter, act, onDone }: { g: GameState; chapter: string; act: Act; onDone: () => void }) {
  const questions = QUIZ[chapter];
  // Spørsmålet som viser svaret akkurat nå (etter at det er besvart)
  const [showing, setShowing] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: number; reward: number } | null>(null);
  // Svarene så langt: fra spillet (en påbegynt quiz), og lokalt, så det siste svaret vises etter at quizen er rettet.
  // En kopi (B-280): før var det samme liste som spillet la svarene i, så et svar i en påbegynt quiz ble talt to ganger
  const [local, setAnswers] = useState<number[]>(() => [...(g.quizPartial[chapter] ?? [])]);
  if (!questions) return null;
  // Har spillet flere svar enn her (f.eks. fra en annen enhet), gjelder spillets
  const saved = g.quizPartial[chapter] ?? [];
  const answers = saved.length > local.length ? [...saved] : local;

  // Quizen er tatt (nå eller før): resultatet
  if (showing === null && (result || !quizAvailable(g, chapter))) {
    const correct = result?.correct ?? g.quizScores[chapter] ?? 0;
    const all = correct === questions.length;
    return (
      <div className={`g-book-result${all ? " is-all" : ""}`}>
        <Stars correct={correct} total={questions.length} />
        <strong>{all ? "Alt riktig!" : correct > 0 ? "Godt forsøk!" : "Ikke denne gangen"}</strong>
        <span className="g-muted">
          {correct} av {questions.length} riktige
          {result ? ` · +${result.reward} fagpoeng` : ""}
        </span>
        {result && (
          <button className="g-primary" onClick={onDone}>
            Tilbake til innholdet
          </button>
        )}
      </div>
    );
  }

  const i = Math.min(showing ?? answers.length, questions.length - 1);
  const q = questions[i];
  const picked = answers[i];
  const answered = picked !== undefined;
  const right = answered && picked === q.correct;
  const last = i === questions.length - 1;
  return (
    <div className="g-book-quiz">
      <div className="g-book-quiz-top">
        <span className="g-muted">
          Spørsmål {i + 1} av {questions.length}
        </span>
        <span className="g-book-dots" aria-hidden="true">
          {questions.map((_, j) => (
            <span
              key={j}
              className={
                j < answers.length
                  ? answers[j] === questions[j].correct
                    ? "is-right"
                    : "is-wrong"
                  : j === i
                    ? "is-now"
                    : ""
              }
            />
          ))}
        </span>
      </div>
      <h3>{q.q}</h3>
      <div className="g-book-options">
        {order(q.q, q.options.length).map((j) => {
          const mark = !answered ? "" : j === q.correct ? " is-right" : j === picked ? " is-wrong" : " is-dim";
          return (
            <button
              key={q.options[j]}
              className={`g-book-option${mark}`}
              disabled={answered}
              onClick={() => {
                const r = act((gg) => answerQuizQuestion(gg, chapter, i, j));
                setAnswers([...answers, j]);
                setShowing(i);
                if (r.done) setResult(r.done);
                buzz(r.right ? 30 : 10);
              }}
            >
              {q.options[j]}
            </button>
          );
        })}
      </div>
      {answered && (
        <>
          <Callout tone={right ? "ok" : "heat"}>
            <strong>{right ? "Riktig! " : "Ikke helt. "}</strong>
            {q.why}
          </Callout>
          <button className="g-primary g-book-next" onClick={() => setShowing(null)}>
            {last ? "Se resultatet" : "Neste spørsmål ›"}
          </button>
        </>
      )}
      {!answered && i === 0 && (
        <p className="g-muted g-small-text">Ett forsøk per spørsmål. Alt riktig gir {quizReward(g)} fagpoeng.</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Et kapittel: sider, quiz og oppdrag
// ------------------------------------------------------------------ //
function MissionBox({ g, mission }: { g: GameState; mission: Mission }) {
  const done = !!g.missions[mission.id]?.done;
  const progress = missionProgress(g, mission);
  return (
    <div className={`g-book-mission${done ? " is-done" : ""}`}>
      <span className="g-book-mission-icon" aria-hidden="true">
        <Icon name="target" />
      </span>
      <div>
        <strong>Oppdrag: {mission.title}</strong>
        {done ? (
          <span className="g-muted">Fullført ✓</span>
        ) : (
          <>
            <Bar value={progress / mission.goal} tone="ok" label="Fremdrift" />
            <span className="g-muted">
              {fmtNum(progress, mission.unit === "stjerner" ? 1 : 0)} av {mission.goal} {mission.unit ?? ""} ·{" "}
              {mission.fp} fagpoeng
              {mission.cash > 0 ? ` og ${fmtKr(mission.cash)}` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Chapter({ g, card, act, onBack }: { g: GameState; card: KnowledgeCard; act: Act; onBack: () => void }) {
  const steps = chapterSteps(g, card.id);
  // En quiz som er påbegynt, fortsetter der den slapp
  const [mode, setMode] = useState<"les" | "quiz">(g.quizPartial[card.id]?.length ? "quiz" : "les");
  const [page, setPage] = useState(0);
  const research = RESEARCH.filter((r) => r.reads === card.id && !g.researched.includes(r.id));
  const pages = card.pages;
  const p = pages[page];
  const lastPage = page === pages.length - 1;
  const quizOpen = quizAvailable(g, card.id);

  return (
    <div className="g-book-chapter">
      <button className="g-link g-book-back" onClick={onBack}>
        ‹ Alle kapitler
      </button>
      <header className="g-book-chapter-head">
        <span className="g-book-icon" aria-hidden="true">
          <Icon name={card.icon} />
        </span>
        <div>
          <h3>{card.title}</h3>
          <span className="g-muted g-small-text">
            {pages.length} korte sider · {fmtRead(readSeconds(card))}
          </span>
        </div>
      </header>

      {/* Stegene i kapitlet: les → quiz (→ oppdraget står under) */}
      {steps.hasQuiz && (
        <div className="g-book-steps" role="tablist" aria-label="Kapitlet">
          <button
            role="tab"
            aria-selected={mode === "les"}
            className={mode === "les" ? "is-active" : ""}
            onClick={() => setMode("les")}
          >
            <Icon name="book" /> Les {steps.read && <Icon name="check" />}
          </button>
          <button
            role="tab"
            aria-selected={mode === "quiz"}
            className={mode === "quiz" ? "is-active" : ""}
            onClick={() => setMode("quiz")}
          >
            <Icon name="circle-help" /> Quiz {steps.quiz ? <Icon name="check" /> : `+${quizReward(g)}`}
          </button>
        </div>
      )}

      {mode === "les" ? (
        <>
          <div className="g-book-short">
            <span className="g-book-label">Kort fortalt</span>
            <p>{card.short}</p>
          </div>
          {research.length > 0 && (
            <Callout tone="ok">Lest! Nå kan du forske på: {research.map((r) => r.name).join(", ")}.</Callout>
          )}
          <article className="g-book-page" aria-live="polite">
            <span className="g-book-label">
              Side {page + 1} av {pages.length}
            </span>
            <h4>{p.head}</h4>
            <p>{p.text}</p>
          </article>
          <div className="g-book-pager">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Forrige side">
              ‹
            </button>
            <span className="g-book-dots">
              {pages.map((pg, j) => (
                <button
                  key={pg.head}
                  className={j === page ? "is-now" : j < page ? "is-read" : ""}
                  onClick={() => setPage(j)}
                  aria-label={`Side ${j + 1}: ${pg.head}`}
                />
              ))}
            </span>
            {!lastPage ? (
              <button className="g-primary" onClick={() => setPage(page + 1)}>
                Neste ›
              </button>
            ) : quizOpen ? (
              <button className="g-primary" onClick={() => setMode("quiz")}>
                Ta quizen ›
              </button>
            ) : (
              <button onClick={onBack}>Ferdig</button>
            )}
          </div>
        </>
      ) : (
        <Quiz g={g} chapter={card.id} act={act} onDone={onBack} />
      )}

      {steps.mission && <MissionBox g={g} mission={steps.mission} />}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Innholdet
// ------------------------------------------------------------------ //
/** Det lureste å gjøre i boka nå: lese et nytt kapittel, ta en quiz, eller følge et oppdrag */
function nextStep(g: GameState): { id: string; text: string; action: string } | null {
  const unread = g.knowledge.find((k) => !g.readChapters.includes(k) && knowledgeCard(k));
  if (unread) return { id: unread, text: `Nytt kapittel: «${knowledgeCard(unread)!.title}»`, action: "Les" };
  const quiz = g.knowledge.find((k) => quizAvailable(g, k) && knowledgeCard(k));
  if (quiz)
    return {
      id: quiz,
      text: `Quizen i «${knowledgeCard(quiz)!.title}» gir ${quizReward(g)} fagpoeng`,
      action: "Ta quizen",
    };
  return null;
}

function Contents({ g, onOpen }: { g: GameState; onOpen: (id: string) => void }) {
  const cards = g.knowledge.map((id) => knowledgeCard(id)).filter((c): c is KnowledgeCard => !!c);
  const all = cards.map((c) => chapterSteps(g, c.id));
  const done = all.reduce((s, x) => s + x.done, 0);
  const total = all.reduce((s, x) => s + x.total, 0);
  const read = all.filter((x) => x.read).length;
  const quizzes = all.filter((x) => x.hasQuiz);
  const missions = all.filter((x) => x.mission);
  const locked = KNOWLEDGE.length - g.knowledge.length;
  const next = nextStep(g);
  const fresh = cards.filter((c) => !g.readChapters.includes(c.id));
  const row = (c: KnowledgeCard) => {
    const s = chapterSteps(g, c.id);
    const complete = s.done === s.total;
    return (
      <li key={c.id}>
        <button className={`g-book-row${complete ? " is-complete" : ""}`} onClick={() => onOpen(c.id)}>
          <span className="g-book-icon" aria-hidden="true">
            <Icon name={c.icon} />
          </span>
          <span className="g-book-row-text">
            <strong>{c.title}</strong>
            <span className="g-muted g-small-text">
              {!s.read
                ? `${fmtRead(readSeconds(c))} å lese`
                : s.hasQuiz && !s.quiz
                  ? `Quiz klar · +${quizReward(g)} fagpoeng`
                  : s.mission && !s.missionDone
                    ? "Oppdrag i gang"
                    : "Ferdig"}
            </span>
          </span>
          {/* Linja under tittelen sier hva som gjenstår; til høyre bare «Ny», stegene eller en hake (B-241) */}
          {!s.read ? (
            <span className="g-badge g-badge-new">Ny</span>
          ) : complete ? (
            <span className="g-book-row-done" aria-label="Ferdig">
              <Icon name="check" />
            </span>
          ) : (
            <span className="g-book-row-steps">
              {s.done} av {s.total}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <>
      <div className="g-book-progress">
        <div className="g-book-progress-top">
          <strong>{total ? Math.floor((done / total) * 100) : 0} % av boka</strong>
          {/* Ordene står ved tallene (B-241): ikonene alene – bok, spørsmålstegn og blink – var ikke til å forstå */}
          <span className="g-muted g-small-text g-book-counts">
            <span>
              <Icon name="book" /> Lest {read}/{cards.length}
            </span>
            <span>
              <Icon name="circle-help" /> Quiz {quizzes.filter((x) => x.quiz).length}/{quizzes.length}
            </span>
            {missions.length > 0 && (
              <span>
                <Icon name="target" /> Oppdrag {missions.filter((x) => x.missionDone).length}/{missions.length}
              </span>
            )}
          </span>
        </div>
        <Bar value={total ? done / total : 0} tone="ok" label="Fagboka" />
      </div>

      {/* Det nye øverst (B-413): uleste kapitler under «Nytt for deg», så temaene med det man har lest. Uten dem
          forsvant et nytt kapittel i en lang liste på støperiet */}
      {fresh.length > 0 ? (
        <section className="g-book-part g-book-fresh">
          <h3>Nytt for deg</h3>
          <ul>{fresh.map(row)}</ul>
        </section>
      ) : next ? (
        <button className="g-book-next-step" onClick={() => onOpen(next.id)}>
          <span className="g-book-icon" aria-hidden="true">
            <Icon name={knowledgeCard(next.id)!.icon} />
          </span>
          <span className="g-book-next-text">
            <span className="g-book-label">Neste</span>
            {next.text}
          </span>
          <span className="g-book-next-action">{next.action} ›</span>
        </button>
      ) : (
        <p className="g-muted g-small-text">
          Du har lest alt og tatt alle quizene.
          {locked > 0 ? " Nye kapitler kommer når verket vokser." : ""}
        </p>
      )}

      {KNOWLEDGE_PARTS.map((part) => {
        const inPart = cards.filter((c) => c.part === part.id);
        const shown = inPart.filter((c) => g.readChapters.includes(c.id));
        if (!shown.length) return null;
        return (
          <section key={part.id} className="g-book-part">
            <h3>
              {part.title}{" "}
              <span className="g-book-part-count">
                · {shown.length} av {inPart.length} lest
              </span>
            </h3>
            <ul>{shown.map(row)}</ul>
          </section>
        );
      })}

      {locked > 0 && (
        <p className="g-muted g-small-text g-book-locked">
          {locked === 1 ? "Ett kapittel til" : `${locked} kapitler til`} låses opp når verket vokser.
        </p>
      )}
    </>
  );
}

/**
 * Går noe galt i boka, vises en beskjed i stedet for at hele spillet stopper (B-280). Uten den tok en feil i quizen med
 * seg hele skjermen, og spillet så ut til å fryse.
 */
class BookGuard extends Component<{ onReset: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Fagboka:", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Callout tone="heat">
        Noe gikk galt i fagboka. Spillet går som før.{" "}
        <button
          className="g-link"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onReset();
          }}
        >
          Tilbake til innholdet
        </button>
      </Callout>
    );
  }
}

export function Handbook({
  g,
  act,
  initial,
  onClose,
}: {
  g: GameState;
  act: Act;
  initial: string | null;
  onClose: () => void;
}) {
  // Kapitlet det åpnes på, er allerede merket som lest av den som åpnet boka
  const [open, setOpen] = useState<string | null>(initial);
  const openChapter = (id: string) => {
    if (!g.readChapters.includes(id)) act((gg) => void gg.readChapters.push(id));
    setOpen(id);
  };
  const card = open ? knowledgeCard(open) : undefined;

  return (
    <div className="g-modal g-side-sheet" role="dialog" aria-modal="true" aria-label="Fagboka" onClick={onClose}>
      <div className="g-modal-card g-book-sheet" onClick={(e) => e.stopPropagation()}>
        <SheetHead title="Fagboka" icon="book" onClose={onClose} />
        <BookGuard onReset={() => setOpen(null)}>
          {card ? (
            <Chapter key={card.id} g={g} card={card} act={act} onBack={() => setOpen(null)} />
          ) : (
            <Contents g={g} onOpen={openChapter} />
          )}
        </BookGuard>
      </div>
    </div>
  );
}
