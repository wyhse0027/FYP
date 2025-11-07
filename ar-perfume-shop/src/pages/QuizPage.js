import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import http from "../lib/http";

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ─── Fetch all quizzes ───────────────────────────────
  useEffect(() => {
    http
      .get("/quizzes/")
      .then((res) => setQuizzes(res.data))
      .catch((err) => console.error("Failed to load quizzes:", err))
      .finally(() => setLoading(false));
  }, []);

  // ─── Start selected quiz ─────────────────────────────
  async function startQuiz(quiz) {
    setSelectedQuiz(quiz);
    setLoading(true);
    try {
      const res = await http.get(`/quizzes/${quiz.id}/`);
      setQuestions(res.data.questions);
      setAnswers({});
      setSubmitted(false);
      setResults([]);
      setCategory("");
    } catch (err) {
      console.error("Failed to load quiz:", err);
    } finally {
      setLoading(false);
    }
  }

  const allAnswered =
    questions.length > 0 && Object.keys(answers).length === questions.length;

  // ─── Submit quiz ─────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const res = await http.post("/quiz-submit/", {
        quiz: selectedQuiz.id,
        answers: Object.values(answers),
      });
      setCategory(res.data.recommended_category || "");
      setResults(res.data.recommended_products || []);
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting quiz:", err);
    }
  };

  // ─── UI ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16 py-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Fragrance Quiz" />

        {/* ─── Loading ─── */}
        {loading && <div className="text-center py-12 opacity-80">Loading...</div>}

        {/* ─── Quiz Selection ─── */}
        {!loading && !selectedQuiz && (
          <div className="text-center mt-12">
            <p className="mb-6 opacity-80 text-lg">
              Choose a quiz to find perfumes that match your style.
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {quizzes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => startQuiz(q)}
                  className="bg-white/10 hover:bg-white/20 transition px-6 py-5 rounded-xl text-lg font-semibold shadow-md border border-white/10"
                >
                  {q.title}
                </button>
              ))}
              {quizzes.length === 0 && (
                <p className="opacity-70 col-span-full">No quizzes available yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Quiz Questions ─── */}
        {!loading && selectedQuiz && !submitted && (
          <>
            <div className="mt-8 mb-6 text-center opacity-80 text-lg">
              Answer a few quick questions and we’ll suggest perfumes you’ll probably love.
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white/5 rounded-2xl p-5 shadow border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl md:text-2xl font-bold">{q.text}</h3>
                    <div className="text-sm opacity-70">
                      {idx + 1} / {questions.length}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {q.answers.map((opt) => {
                      const active = answers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            setAnswers((a) => ({ ...a, [q.id]: opt.id }))
                          }
                          className={`text-left rounded-xl px-4 py-3 border font-medium transition
                            ${
                              active
                                ? "bg-sky-600 border-sky-400"
                                : "bg-white/10 border-white/10 hover:bg-white/15"
                            }`}
                        >
                          {opt.answer_text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                disabled={!allAnswered}
                onClick={handleSubmit}
                className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-lg transition
                  ${
                    allAnswered
                      ? "bg-sky-500 hover:bg-sky-600"
                      : "bg-gray-600 cursor-not-allowed opacity-70"
                  }`}
              >
                See My Matches
              </button>

              <div className="mt-4">
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="px-4 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/20 transition"
                >
                  ← Choose Another Quiz
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─── Results ─── */}
        {submitted && (
          <div className="mt-10">
            <h3 className="text-2xl md:text-3xl font-extrabold mb-4 text-center">
              Your Matches{" "}
              {category ? (
                <span className="text-sky-400">({category})</span>
              ) : (
                ""
              )}
            </h3>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {results.length > 0 ? (
                results.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="bg-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition border border-white/10"
                  >
                    <div className="rounded-xl overflow-hidden bg-black/10 aspect-[4/5] mb-3 flex items-center justify-center">
                      <img
                        src={
                          product.card_image ||
                          product.promo_image ||
                          product.media_gallery?.[0]?.file
                        }
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="font-bold text-xl">{product.name}</div>
                    <div className="mt-2 opacity-80">
                      Price: RM {Number(product.price).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center opacity-70">
                  No products found for this category.
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setResults([]);
                  setCategory("");
                }}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
              >
                Retake Quiz
              </button>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 transition"
              >
                Choose Another Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
