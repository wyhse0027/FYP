// src/pages/QuizPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IoArrowBack, IoSparkles } from "react-icons/io5";
import { Progress } from "../components/ui/progress";
import http from "../lib/http";

const SHOP_ROUTE = "/shop"; // ✅ change if your shop route differs

const QuizPage = () => {
  const [stage, setStage] = useState("select"); // "select" | "questions" | "result"

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: answerId }

  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [category, setCategory] = useState("");

  // persona from backend (ScentPersona)
  const [persona, setPersona] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ─── Load all quizzes on mount ──────────────────────────────────────────────
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

  // ─── Start quiz: load questions from backend ───────────────────────────────
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

  // ─── Submit quiz answers to backend ────────────────────────────────────────
  async function submitQuiz(finalAnswers) {
    if (!selectedQuiz) return;
    setError("");
    setLoading(true);

    try {
      // preserve order of questions
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

      // persona may come directly from this response
      if (res.data.persona) {
        setPersona(res.data.persona);
      } else if (recommendedCategory) {
        // OPTIONAL: separate API to fetch ScentPersona by category
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

  // ─── Answer one question, move to next or submit ──────────────────────────
  function handleAnswer(optionId) {
    const q = questions[currentQuestion];
    if (!q) return;

    const nextAnswers = {
      ...answers,
      [q.id]: optionId,
    };
    setAnswers(nextAnswers);

    const isLast = currentQuestion === questions.length - 1;
    if (!isLast) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      submitQuiz(nextAnswers);
    }
  }

  // ✅ This resets to quiz selection (NOT shop)
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

  // ─── Persona fallback if API not configured ───────────────────────────────
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

  const personaMainImage =
    effectivePersona?.image_url || effectivePersona?.image || null;

  const personaCoverImage =
    effectivePersona?.cover_image_url ||
    effectivePersona?.cover_image ||
    personaMainImage;

  return (
    <div className="min-h-screen w-full bg-[#020617] relative overflow-hidden">
      {/* subtle background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.18),_transparent)] pointer-events-none" />
      <div className="absolute -right-32 top-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-32 bottom-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 px-6 md:px-12 lg:px-16 py-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-[auto_1fr_auto] items-center mb-10"
          >
            {/* Back button – fixed size so title can center perfectly */}
            <Link
              to={SHOP_ROUTE}
              className="flex items-center justify-start text-slate-300 hover:text-white transition-colors"
            >
              <div className="w-10 h-10 rounded-full border border-yellow-500/30 flex items-center justify-center hover:border-yellow-400 transition-colors">
                <IoArrowBack className="w-5 h-5" />
              </div>
            </Link>

            {/* Center title */}
            <div className="flex justify-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-wide text-center">
                Fragrance <span className="text-yellow-400">Quiz</span>
              </h1>
            </div>

            {/* Spacer: mirrors back button size for perfect centering */}
            <div className="w-10 h-10" aria-hidden="true" />
          </motion.header>

          {error && (
            <div className="mt-2 mb-4 bg-red-500/15 border border-red-500/60 text-sm px-4 py-2 rounded-lg text-red-100">
              {error}
            </div>
          )}

          {loading && stage === "select" && (
            <div className="text-center py-10 text-slate-300 text-sm">
              Loading...
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ─── Stage 1: Quiz selection ─────────────────────────────────── */}
            {stage === "select" && !loading && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="text-center mb-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400/25 to-yellow-500/10 border border-yellow-400/40 mb-5"
                  >
                    <IoSparkles className="w-9 h-9 text-yellow-300" />
                  </motion.div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Discover Your Signature Scent
                  </h2>
                  <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto">
                    Choose a quiz and we&apos;ll only recommend perfumes that
                    pass your quiz rules and targeting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quizzes.map((q, index) => (
                    <motion.button
                      key={q.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      onClick={() => startQuiz(q)}
                      className="group relative p-6 rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-sm hover:border-yellow-400/50 hover:shadow-[0_0_30px_rgba(250,204,21,0.18)] transition-all duration-300 text-left overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 flex flex-col gap-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 text-yellow-300 mb-2">
                          <IoSparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {q.title}
                        </h3>
                        {q.label && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-pink-500/15 text-pink-200 border border-pink-400/40">
                            {q.label}
                          </span>
                        )}
                        {q.audience && q.audience !== "ANY" && (
                          <span className="text-[10px] uppercase tracking-wide text-sky-300/80">
                            Target: {q.audience}
                          </span>
                        )}
                        <p className="text-xs text-slate-300/90 mt-1">
                          Curated recommendations based on your answers and this
                          quiz&apos;s product rules.
                        </p>
                      </div>
                    </motion.button>
                  ))}
                  {quizzes.length === 0 && (
                    <p className="text-center text-slate-300 col-span-full">
                      No quizzes available yet.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Stage 2: Questions ──────────────────────────────────────── */}
            {stage === "questions" && selectedQuiz && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs md:text-sm text-slate-300 mb-2">
                    <span>
                      {selectedQuiz.title} • Question {currentQuestion + 1} of{" "}
                      {questions.length || 0}
                    </span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-slate-800" />
                </div>

                <AnimatePresence mode="wait">
                  {questions.length > 0 && (
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-purple-500/5 to-transparent rounded-3xl blur-xl" />
                      <div className="relative p-7 md:p-9 rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-9 h-9 rounded-full bg-yellow-500/25 flex items-center justify-center">
                            <span className="text-yellow-300 text-sm font-bold">
                              {currentQuestion + 1}
                            </span>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-yellow-400/40 to-transparent" />
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed">
                          {questions[currentQuestion].text}
                        </h3>

                        <div className="space-y-3">
                          {questions[currentQuestion].answers.map((opt, index) => (
                            <motion.button
                              key={opt.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.05 * index }}
                              onClick={() => handleAnswer(opt.id)}
                              className="w-full group p-4 rounded-2xl border border-slate-700/70 bg-slate-900/60 hover:bg-slate-800/80 hover:border-yellow-400/50 transition-all duration-200 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-300 flex items-center justify-center text-xs font-semibold group-hover:bg-yellow-400 group-hover:text-slate-900 transition-colors">
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <span className="text-sm md:text-base text-slate-100 group-hover:text-yellow-100 transition-colors">
                                  {opt.answer_text}
                                </span>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {questions.length === 0 && !loading && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-slate-300"
                    >
                      This quiz has no questions configured yet.
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-6 flex justify-between items-center text-xs md:text-sm text-slate-300">
                  {/* ✅ stays inside quiz: go back to select quiz */}
                  <button
                    onClick={resetQuizCompletely}
                    className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-xs md:text-sm"
                  >
                    ← Choose Another Quiz
                  </button>

                  {loading && (
                    <span className="text-slate-400 text-xs">Submitting...</span>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Stage 3: Result ─────────────────────────────────────────── */}
            {stage === "result" && submitted && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="max-w-5xl mx-auto"
              >
                {/* Personality / persona card */}
                {effectivePersona && (
                  <div className="relative mb-10">
                    {/* Outer glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/25 via-purple-500/25 to-transparent rounded-3xl blur-2xl opacity-70" />

                    <div className="relative p-6 md:p-8 lg:p-10 rounded-3xl border border-yellow-400/40 bg-transparent backdrop-blur-sm overflow-hidden">
                      {/* 🔥 Cover image as card background */}
                      {personaCoverImage && (
                        <div className="absolute inset-0 -z-10">
                          <img
                            src={personaCoverImage}
                            alt={`${effectivePersona.persona_name} cover`}
                            className="w-full h-full object-cover blur-md scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-[#020617]/85 via-[#020617]/55 to-transparent" />
                        </div>
                      )}

                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6 md:gap-4 items-center">
                        {/* LEFT: text */}
                        <div className="flex-1 text-center md:text-left">
                          <span className="inline-block px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-200 text-[11px] md:text-xs font-medium mb-4">
                            Your Fragrance Personality
                          </span>

                          {/* Main title only – no ghost word */}
                          <div className="inline-block md:block mb-4">
                            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[0.95] break-words">
                              {effectivePersona.persona_name}
                            </h2>
                          </div>

                          {category && (
                            <p className="text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.35em] text-yellow-300 mb-4">
                              Category: {category}
                            </p>
                          )}

                          {(effectivePersona.description ||
                            effectivePersona.tagline) && (
                            <p className="text-slate-100 text-sm sm:text-base md:text-lg max-w-2xl mx-auto md:mx-0 mb-6">
                              {effectivePersona.description ||
                                effectivePersona.tagline}
                            </p>
                          )}

                          {effectivePersona.scent_notes &&
                            effectivePersona.scent_notes.length > 0 && (
                              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                                {effectivePersona.scent_notes.map((note) => (
                                  <span
                                    key={note}
                                    className="px-3 py-1 rounded-full border border-white/10 bg-black/30 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-50"
                                  >
                                    {note}
                                  </span>
                                ))}
                              </div>
                            )}

                          {effectivePersona.occasions &&
                            effectivePersona.occasions.length > 0 && (
                              <div className="mt-4">
                                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.25em] text-slate-300 mb-1">
                                  Best For
                                </p>
                                <p className="text-xs sm:text-sm text-slate-100">
                                  {effectivePersona.occasions.join(" • ")}
                                </p>
                              </div>
                            )}
                        </div>

                        {/* RIGHT: main persona portrait */}
                        {personaMainImage && (
                          <div className="flex justify-center md:justify-end mt-4 md:mt-0">
                            <div className="relative aspect-[3/4] w-full max-w-xs md:max-w-sm rounded-3xl overflow-hidden border border-yellow-400/40 bg-slate-950/60 shadow-[0_0_35px_rgba(250,204,21,0.25)]">
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
                  </div>
                )}

                {/* Recommended products */}
                <div className="mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
                    Recommended <span className="text-yellow-400">For You</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {results.length > 0 ? (
                      results.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * index }}
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="group cursor-pointer p-4 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900/80 to-slate-900/50 hover:border-yellow-400/60 hover:shadow-[0_0_25px_rgba(250,204,21,0.18)] transition-all duration-200"
                        >
                          <div className="aspect-[4/5] rounded-xl overflow-hidden bg-black/30 mb-3 flex items-center justify-center">
                            <img
                              src={
                                product.card_image ||
                                product.promo_image ||
                                product.media_gallery?.[0]?.file
                              }
                              alt={product.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <h4 className="text-white font-semibold text-sm md:text-base group-hover:text-yellow-200 transition-colors">
                            {product.name}
                          </h4>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-sky-300/80">
                            {product.target}
                          </div>
                          <div className="mt-1 text-sm text-yellow-300 font-semibold">
                            RM {Number(product.price).toFixed(2)}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full text-center text-slate-300 text-sm">
                        No products matched this quiz configuration.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={retakeSameQuiz}
                    className="px-6 py-3 rounded-full border border-slate-700 bg-slate-900/70 text-sm md:text-base text-slate-100 hover:bg-slate-800 transition-colors"
                  >
                    Retake This Quiz
                  </button>

                  {/* ✅ stays inside quiz: go back to select quiz */}
                  <button
                    onClick={resetQuizCompletely}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 font-semibold text-sm md:text-base hover:shadow-lg hover:shadow-yellow-400/30 transition-all"
                  >
                    Choose Another Quiz
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
