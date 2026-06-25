// src/pages/QuizPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import http from "../lib/http";

const QuizPage = () => {
  const [stage, setStage] = useState("select"); // "select" | "questions" | "result"

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [category, setCategory] = useState("");

  const [persona, setPersona] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    http
      .get("/quizzes/")
      .then((res) => setQuizzes(res.data || []))
      .catch(() => setError("Failed to load quizzes"))
      .finally(() => setLoading(false));
  }, []);

  const progress =
    questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  async function startQuiz(quiz) {
    setSelectedQuiz(quiz);
    setStage("questions");
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setResults([]);
    setCategory("");
    setPersona(null);
    setError("");

    setLoading(true);
    try {
      const res = await http.get(`/quizzes/${quiz.id}/`);
      setQuestions(res.data.questions || []);
    } catch {
      setError("Failed to load quiz details");
      setStage("select");
      setSelectedQuiz(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz(finalAnswers) {
    if (!selectedQuiz) return;
    setError("");
    setLoading(true);

    try {
      const answersArray = questions.map((q) => finalAnswers[q.id]);

      const res = await http.post("/quiz-submit/", {
        quiz: selectedQuiz.id,
        answers: answersArray,
      });

      const recommendedCategory = res.data.recommended_category || "";
      const recommendedProducts = res.data.recommended_products || [];

      setCategory(recommendedCategory);
      setResults(recommendedProducts);
      setSubmitted(true);
      setStage("result");

      if (res.data.persona) {
        setPersona(res.data.persona);
      } else if (recommendedCategory) {
        try {
          const personaRes = await http.get(
            `/scent-personas/by-category/${recommendedCategory}/`
          );
          setPersona(personaRes.data);
        } catch {
          setPersona(null);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Please log in to see your recommendations.");
      } else {
        setError("Failed to submit quiz.");
      }
      setStage("questions");
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(optionId) {
    const q = questions[currentQuestion];
    if (!q) return;

    const nextAnswers = { ...answers, [q.id]: optionId };
    setAnswers(nextAnswers);

    const isLast = currentQuestion === questions.length - 1;
    if (!isLast) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      submitQuiz(nextAnswers);
    }
  }

  function resetQuizCompletely() {
    setStage("select");
    setSelectedQuiz(null);
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setResults([]);
    setCategory("");
    setPersona(null);
    setError("");
  }

  function retakeSameQuiz() {
    setStage("questions");
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setResults([]);
    setCategory("");
    setPersona(null);
    setError("");
  }

  function buildFallbackPersona() {
    if (!category) return null;
    return {
      persona_name: category,
      tagline: "This category reflects your current fragrance preference.",
      scent_notes: [],
      occasions: [],
      image_url: null,
      cover_image_url: null,
    };
  }

  const effectivePersona = persona || buildFallbackPersona();
  const personaMainImage = effectivePersona?.image_url || effectivePersona?.image || null;
  const personaCoverImage =
    effectivePersona?.cover_image_url || effectivePersona?.cover_image || personaMainImage;

  const goBackOnQuestion = () => {
    if (currentQuestion > 0) setCurrentQuestion((p) => p - 1);
    else resetQuizCompletely();
  };

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 50% at 50% 0%,rgba(212,175,55,0.14),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 py-12 md:py-16">
        {/* Title */}
        <div className="text-center mb-10">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-4">The Atelier</p>
          <h1 className="font-serif text-4xl sm:text-6xl text-white mb-4">
            Discover Your
            <br />
            Signature Scent
          </h1>
          <p className="font-cormorant italic text-xl sm:text-2xl text-luxury-champagne/75">
            Six questions, composed into one fragrance.
          </p>
        </div>

        {error && (
          <div className="mb-6 max-w-xl mx-auto bg-red-500/15 border border-red-500/50 text-sm px-4 py-3 rounded-xl text-red-100 text-center">
            {error}
          </div>
        )}

        {loading && stage === "select" && (
          <p className="text-center py-10 text-luxury-mut text-sm">Loading…</p>
        )}

        <AnimatePresence mode="wait">
          {/* ─── Stage 1: select ─── */}
          {stage === "select" && !loading && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex flex-wrap justify-center gap-5">
                {quizzes.map((q, index) => (
                  <motion.button
                    key={q.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => startQuiz(q)}
                    className="card glass rounded-2xl p-7 text-left w-full sm:w-[calc(50%-0.625rem)] max-w-md"
                  >
                    <div className="w-12 h-12 rounded-xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center mb-4 text-luxury-gold2 text-xl">
                      ✦
                    </div>
                    <h3 className="font-serif text-2xl text-white mb-2">{q.title}</h3>
                    {q.label && (
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] label uppercase bg-luxury-gold/15 text-luxury-champagne border border-luxury-gold/40 mb-2">
                        {q.label}
                      </span>
                    )}
                    {q.audience && q.audience !== "ANY" && (
                      <p className="text-[10px] label uppercase text-luxury-gold/80 mb-2">
                        Target: {q.audience}
                      </p>
                    )}
                    <p className="text-sm text-luxury-mut mt-1">
                      Curated recommendations based on your answers.
                    </p>
                  </motion.button>
                ))}
                {quizzes.length === 0 && (
                  <p className="text-center text-luxury-mut col-span-full">
                    No quizzes available yet.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Stage 2: questions ─── */}
          {stage === "questions" && selectedQuiz && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-3 mb-3 max-w-md mx-auto">
                <span className="text-[10px] label uppercase text-luxury-mut whitespace-nowrap">
                  {String(currentQuestion + 1).padStart(2, "0")} /{" "}
                  {String(questions.length || 0).padStart(2, "0")}
                </span>
                <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-luxury-gold to-luxury-gold2 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {questions.length > 0 && (
                  <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="glass rounded-3xl p-8 sm:p-12 mt-8 text-left"
                  >
                    <p className="label uppercase text-[11px] text-luxury-gold/80 mb-3">
                      Question {String(currentQuestion + 1).padStart(2, "0")}
                    </p>
                    <h2 className="font-serif text-3xl sm:text-4xl text-white mb-8 leading-snug">
                      {questions[currentQuestion].text}
                    </h2>

                    <div className="flex flex-wrap justify-center gap-4">
                      {questions[currentQuestion].answers.map((opt) => {
                        const selected = answers[questions[currentQuestion].id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleAnswer(opt.id)}
                            className={`w-full sm:w-[calc(50%-0.5rem)] rounded-2xl p-6 text-left flex items-center justify-between border transition ${
                              selected
                                ? "border-luxury-gold/80 bg-luxury-gold/12"
                                : "border-luxury-champagne/20 hover:border-luxury-gold/50"
                            }`}
                          >
                            <span className="font-serif text-xl sm:text-2xl text-white">
                              {opt.answer_text}
                            </span>
                            {selected && (
                              <span className="w-7 h-7 rounded-full bg-luxury-gold text-luxury-bg flex items-center justify-center text-sm shrink-0 ml-3">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-10">
                      <button
                        onClick={goBackOnQuestion}
                        className="text-[11px] label uppercase text-luxury-mut hover:text-white transition inline-flex items-center gap-2"
                      >
                        Back
                      </button>
                      {loading && (
                        <span className="text-[11px] label uppercase text-luxury-mut">Submitting…</span>
                      )}
                    </div>
                  </motion.div>
                )}

                {questions.length === 0 && !loading && (
                  <p className="text-center text-luxury-mut mt-8">
                    This quiz has no questions configured yet.
                  </p>
                )}
              </AnimatePresence>

              <div className="text-center mt-6">
                <button
                  onClick={resetQuizCompletely}
                  className="text-[11px] label uppercase text-luxury-mut hover:text-white transition"
                >
                  Choose Another Quiz
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Stage 3: result ─── */}
          {stage === "result" && submitted && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-5xl mx-auto text-left"
            >
              {effectivePersona && (
                <div className="glass rounded-3xl p-6 md:p-10 mb-10 overflow-hidden relative">
                  {personaCoverImage && (
                    <div className="absolute inset-0 -z-10">
                      <img
                        src={personaCoverImage}
                        alt={`${effectivePersona.persona_name} cover`}
                        className="w-full h-full object-cover blur-md scale-110 opacity-40"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-luxury-bg/90 via-luxury-bg/60 to-transparent" />
                    </div>
                  )}

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6 items-center">
                    <div className="text-center md:text-left">
                      <span className="inline-block px-4 py-1 rounded-full border border-luxury-gold/30 text-luxury-gold2 text-[10px] label uppercase mb-5">
                        Your Fragrance Personality
                      </span>
                      <h2 className="font-serif text-5xl md:text-7xl text-white leading-[0.95] mb-4">
                        {effectivePersona.persona_name}
                      </h2>
                      {category && (
                        <p className="text-[11px] label uppercase text-luxury-gold2 mb-4">
                          Category · {category}
                        </p>
                      )}
                      {(effectivePersona.description || effectivePersona.tagline) && (
                        <p className="font-cormorant italic text-xl md:text-2xl text-luxury-champagne max-w-2xl mx-auto md:mx-0 mb-6">
                          {effectivePersona.description || effectivePersona.tagline}
                        </p>
                      )}
                      {effectivePersona.scent_notes?.length > 0 && (
                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                          {effectivePersona.scent_notes.map((note) => (
                            <span
                              key={note}
                              className="px-4 py-1.5 rounded-full text-[10px] label uppercase text-luxury-mut border border-white/12"
                            >
                              {note}
                            </span>
                          ))}
                        </div>
                      )}
                      {effectivePersona.occasions?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] label uppercase text-luxury-mut mb-1">Best For</p>
                          <p className="text-sm text-luxury-text">
                            {effectivePersona.occasions.join(" · ")}
                          </p>
                        </div>
                      )}
                    </div>

                    {personaMainImage && (
                      <div className="flex justify-center md:justify-end">
                        <div className="relative aspect-[3/4] w-full max-w-xs rounded-3xl overflow-hidden border border-luxury-gold/40 bg-luxury-panel2">
                          <img
                            src={personaMainImage}
                            alt={effectivePersona.persona_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-5 mb-8">
                <h3 className="font-serif text-3xl text-white">Recommended for You</h3>
                <div className="flex-1 rule" />
              </div>

              <div className="flex flex-wrap justify-center gap-6 mb-10">
                {results.length > 0 ? (
                  results.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="card glass rounded-2xl p-5 block w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-[320px]"
                    >
                      <div className="rounded-xl overflow-hidden aspect-[4/5] mb-5 bg-luxury-panel2">
                        <img
                          src={
                            product.card_image ||
                            product.promo_image ||
                            product.media_gallery?.[0]?.file
                          }
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700"
                        />
                      </div>
                      {product.target && (
                        <p className="label uppercase text-[10px] text-luxury-gold/90 mb-1">
                          {product.target}
                        </p>
                      )}
                      <h4 className="font-serif text-xl text-white">{product.name}</h4>
                      <p className="mt-2 font-cormorant text-xl text-luxury-champagne">
                        RM {Number(product.price).toFixed(2)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="w-full text-center text-luxury-mut">
                    No products matched this quiz configuration.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={retakeSameQuiz}
                  className="ghost px-8 py-3.5 rounded-full text-[12px] font-medium label uppercase"
                >
                  Retake This Quiz
                </button>
                <button
                  onClick={resetQuizCompletely}
                  className="btn-lux px-8 py-3.5 rounded-full text-[12px] font-medium label uppercase"
                >
                  Choose Another Quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default QuizPage;
