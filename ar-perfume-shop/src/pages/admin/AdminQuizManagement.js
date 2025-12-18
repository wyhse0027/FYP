import React, { useEffect, useState, useMemo } from "react";
import http from "../../lib/http";
import {
  IoAdd,
  IoTrashOutline,
  IoRefresh,
  IoChevronDown,
  IoClose,
} from "react-icons/io5";
import PageHeader from "../../components/PageHeader";

const AUDIENCE_OPTIONS = ["ANY", "MEN", "WOMEN", "UNISEX"];

export default function AdminQuizManagement() {
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizLabel, setNewQuizLabel] = useState("");
  const [newQuizAudience, setNewQuizAudience] = useState("ANY");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [qz, qs, ans, cats, prods] = await Promise.all([
        http.get("admin/quizzes/"),
        http.get("admin/quiz-questions/"),
        http.get("admin/quiz-answers/"),
        http.get("admin/categories/"),
        http.get("admin/products/"),
      ]);
      setQuizzes(qz.data);
      setQuestions(qs.data);
      setAnswers(ans.data);
      setCategories(cats.data);
      setProducts(prods.data);

      if (!selectedQuizId && qz.data.length > 0) {
        setSelectedQuizId(qz.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load quiz data:", err);
      showToast("error", "Failed to load data");
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function confirm(message, onConfirm) {
    setConfirmAction({ message, onConfirm });
  }

  // ─── Derived helpers ─────────────────────
  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.id === selectedQuizId) || null,
    [quizzes, selectedQuizId]
  );

  const quizQuestions = useMemo(
    () => questions.filter((q) => q.quiz === selectedQuizId),
    [questions, selectedQuizId]
  );

  const selectedQuestion = useMemo(
    () => quizQuestions.find((q) => q.id === selectedQuestionId) || null,
    [quizQuestions, selectedQuestionId]
  );

  const questionAnswers = useMemo(
    () => answers.filter((a) => a.question === selectedQuestionId),
    [answers, selectedQuestionId]
  );

  // ─── Quiz CRUD ───────────────────────────
  async function addQuiz() {
    if (!newQuizTitle.trim()) return;
    try {
      const res = await http.post("admin/quizzes/", {
        title: newQuizTitle,
        label: newQuizLabel || "",
        audience: newQuizAudience || "ANY",
      });
      setNewQuizTitle("");
      setNewQuizLabel("");
      setNewQuizAudience("ANY");
      await fetchAll();
      setSelectedQuizId(res.data.id);
      showToast("success", "Quiz added successfully");
    } catch (err) {
      console.error(err.response?.data || err);
      showToast("error", "Failed to add quiz");
    }
  }

  async function updateQuizField(id, patch) {
    try {
      await http.patch(`admin/quizzes/${id}/`, patch);
      await fetchAll();
      showToast("success", "Quiz updated");
    } catch (err) {
      console.error(err.response?.data || err);
      showToast("error", "Failed to update quiz");
    }
  }

  async function deleteQuiz(id) {
    confirm("Delete this quiz?", async () => {
      try {
        await http.delete(`admin/quizzes/${id}/`);
        if (selectedQuizId === id) {
          setSelectedQuizId(null);
          setSelectedQuestionId(null);
        }
        await fetchAll();
        showToast("success", "Quiz deleted");
      } catch {
        showToast("error", "Failed to delete quiz");
      }
    });
  }

  // ─── Question CRUD ───────────────────────
  async function addQuestion() {
    if (!selectedQuiz || !newQuestionText.trim()) return;
    try {
      const res = await http.post("admin/quiz-questions/", {
        quiz: selectedQuiz.id,
        text: newQuestionText,
      });
      setNewQuestionText("");
      await fetchAll();
      setSelectedQuestionId(res.data.id);
      showToast("success", "Question added");
    } catch {
      showToast("error", "Failed to add question");
    }
  }

  async function deleteQuestion(id) {
    confirm("Delete this question?", async () => {
      try {
        await http.delete(`admin/quiz-questions/${id}/`);
        if (selectedQuestionId === id) {
          setSelectedQuestionId(null);
        }
        await fetchAll();
        showToast("success", "Question deleted");
      } catch {
        showToast("error", "Failed to delete question");
      }
    });
  }

  // ─── Answer CRUD ─────────────────────────
  async function addAnswer() {
    if (!selectedQuestion || !newAnswerText.trim() || !selectedCategory.trim())
      return;
    try {
      await http.post("admin/quiz-answers/", {
        question: selectedQuestion.id,
        answer_text: newAnswerText,
        category: selectedCategory,
      });
      setNewAnswerText("");
      setSelectedCategory("");
      await fetchAll();
      showToast("success", "Answer added");
    } catch (err) {
      console.error(err.response?.data || err);
      showToast(
        "error",
        err.response?.status === 401
          ? "Unauthorized. Please log in again."
          : "Failed to add answer"
      );
    }
  }

  async function deleteAnswer(id) {
    confirm("Delete this answer?", async () => {
      try {
        await http.delete(`admin/quiz-answers/${id}/`);
        await fetchAll();
        showToast("success", "Answer deleted");
      } catch {
        showToast("error", "Failed to delete answer");
      }
    });
  }

  // ─── Allowed products toggle ─────────────
  function toggleAllowedProduct(quiz, productId) {
    const current = quiz.allowed_products || [];
    const exists = current.includes(productId);
    const next = exists
      ? current.filter((id) => id !== productId)
      : [...current, productId];

    updateQuizField(quiz.id, { allowed_products: next });
  }

  // Utility for audience label text
  function formatAudienceLabel(aud) {
    const a = (aud || "ANY").toUpperCase();
    if (a === "ANY") return "Any";
    return a.charAt(0) + a.slice(1).toLowerCase();
  }

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-4 md:px-8 lg:px-12 py-8 relative">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Quiz Management" />

        {/* Top bar: Add quiz + refresh */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl mb-6 grid md:grid-cols-[2fr,1.5fr,1fr,auto,auto] gap-3 items-center shadow-md shadow-black/40 border border-white/10">
          <input
            className="px-3 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="Quiz title"
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg bg-white/10 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Label (optional, e.g. For Women)"
            value={newQuizLabel}
            onChange={(e) => setNewQuizLabel(e.target.value)}
          />
          <select
            className="px-3 py-2 rounded-lg bg-white/90 text-gray-900 outline-none text-sm"
            value={newQuizAudience}
            onChange={(e) => setNewQuizAudience(e.target.value)}
          >
            {AUDIENCE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {formatAudienceLabel(a)}
              </option>
            ))}
          </select>
          <button
            onClick={addQuiz}
            disabled={!newQuizTitle.trim()}
            className="bg-pink-500 hover:bg-pink-600 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-pink-900/40"
          >
            <IoAdd /> Add
          </button>
          <button
            onClick={fetchAll}
            className="bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-md shadow-sky-900/40"
          >
            <IoRefresh /> Refresh
          </button>
        </div>

        {/* Main grid: quizzes | details | questions+answers */}
        <div className="grid gap-4 md:grid-cols-[1.2fr,2fr,2fr]">
          {/* ─── Left: Quiz list ─────────────────────────── */}
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 max-h-[70vh] overflow-y-auto shadow-lg shadow-black/40">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200">
                Quizzes
              </h2>
              <span className="text-[11px] text-gray-400">
                {quizzes.length} total
              </span>
            </div>
            {quizzes.length === 0 && (
              <p className="text-xs text-gray-300">
                No quizzes yet. Create one above.
              </p>
            )}
            <div className="space-y-2">
              {quizzes.map((quiz) => {
                const active = quiz.id === selectedQuizId;
                return (
                  <div
                    key={quiz.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer border text-xs transition-transform ${
                      active
                        ? "bg-pink-500/25 border-pink-400 shadow-sm shadow-pink-900/60 scale-[1.01]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-sm"
                    }`}
                    onClick={() => {
                      setSelectedQuizId(quiz.id);
                      setSelectedQuestionId(null);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[13px]">
                        {quiz.title}
                      </span>
                      <span className="text-[10px] text-gray-300 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <span className="opacity-80">
                          {quiz.label || "No label"}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-sky-500/20 border border-sky-400/60 uppercase tracking-wide">
                          {formatAudienceLabel(quiz.audience)}
                        </span>
                        <span>•</span>
                        <span className="opacity-80">
                          {quiz.allowed_products?.length
                            ? `${quiz.allowed_products.length} products`
                            : "All products"}
                        </span>
                      </span>
                    </div>
                    <button
                      className="text-red-400 hover:text-red-500 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuiz(quiz.id);
                      }}
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Middle: Selected quiz details ───────────── */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 max-h-[70vh] overflow-y-auto shadow-lg shadow-black/40">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200 mb-3">
              Quiz Details
            </h2>

            {!selectedQuiz && (
              <p className="text-xs text-gray-300">
                Select a quiz from the left to view/edit details.
              </p>
            )}

            {selectedQuiz && (
              <div className="space-y-4">
                {/* Basic fields */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Title</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    defaultValue={selectedQuiz.title}
                    onBlur={(e) =>
                      e.target.value !== selectedQuiz.title &&
                      updateQuizField(selectedQuiz.id, {
                        title: e.target.value,
                      })
                    }
                  />
                  <label className="text-xs text-gray-300">Label</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="e.g. For Women, For Beginners"
                    defaultValue={selectedQuiz.label || ""}
                    onBlur={(e) =>
                      e.target.value !== (selectedQuiz.label || "") &&
                      updateQuizField(selectedQuiz.id, {
                        label: e.target.value,
                      })
                    }
                  />
                  <label className="text-xs text-gray-300">Audience</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg bg-white/90 text-gray-900 text-sm outline-none"
                    defaultValue={selectedQuiz.audience || "ANY"}
                    onChange={(e) =>
                      updateQuizField(selectedQuiz.id, {
                        audience: e.target.value,
                      })
                    }
                  >
                    {AUDIENCE_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {formatAudienceLabel(a)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-gray-300">
                    <span>Assigned audience</span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/60 uppercase tracking-wide">
                      {formatAudienceLabel(selectedQuiz.audience)}
                    </span>
                  </div>
                </div>

                {/* Allowed products */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-300">
                      Allowed Products (whitelist, optional)
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {selectedQuiz.allowed_products?.length
                        ? `${selectedQuiz.allowed_products.length} selected`
                        : "All products"}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-white/5 border border-white/10 rounded-lg p-2 grid md:grid-cols-2 gap-1 text-xs">
                    {products.map((p) => {
                      const active =
                        selectedQuiz.allowed_products?.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                            active ? "bg-sky-500/30" : "hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!active}
                            onChange={() =>
                              toggleAllowedProduct(selectedQuiz, p.id)
                            }
                          />
                          <span>
                            {p.name}{" "}
                            <span className="text-[9px] text-gray-300">
                              ({p.category} / {p.target})
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {products.length === 0 && (
                      <div className="text-gray-400 text-xs">
                        No products found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Right: Questions + Answers ───────────────── */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 flex flex-col max-h-[70vh] overflow-y-auto shadow-lg shadow-black/40">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200 mb-3">
              Questions &amp; Answers
            </h2>

            {!selectedQuiz && (
              <p className="text-xs text-gray-300">
                Select a quiz to manage its questions and answers.
              </p>
            )}

            {selectedQuiz && (
              <>
                {/* Add Question */}
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 text-sm outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="Enter new question"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                  />
                  <button
                    onClick={addQuestion}
                    className="bg-green-500 hover:bg-green-600 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm shadow-md shadow-green-900/40"
                  >
                    <IoAdd /> Add
                  </button>
                </div>

                {/* Questions list + Answers */}
                <div className="flex-1 flex flex-col gap-3 overflow-visible">
                  <div className="flex gap-3 flex-1 min-h-0">
                    {/* Questions column */}
                    <div className="w-1/2 bg-white/5 rounded-lg p-2 border border-white/10 overflow-y-auto">
                      <div className="text-[11px] text-gray-300 mb-1">
                        {quizQuestions.length} question
                        {quizQuestions.length !== 1 ? "s" : ""}
                      </div>
                      {quizQuestions.length === 0 && (
                        <p className="text-xs text-gray-400">
                          No questions yet. Add one above.
                        </p>
                      )}
                      <div className="space-y-2">
                        {quizQuestions.map((q) => {
                          const active = q.id === selectedQuestionId;
                          return (
                            <div
                              key={q.id}
                              className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-start justify-between gap-2 transition-transform ${
                                active
                                  ? "bg-sky-500/40 border border-sky-400 shadow-sm shadow-sky-900/60 scale-[1.01]"
                                  : "bg-white/5 border border-white/10 hover:bg-white/10"
                              }`}
                              onClick={() => setSelectedQuestionId(q.id)}
                            >
                              <span>{q.text}</span>
                              <button
                                className="text-red-400 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteQuestion(q.id);
                                }}
                              >
                                <IoTrashOutline size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Answers column */}
                    <div className="w-1/2 bg-white/5 rounded-lg p-2 border border-white/10 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-gray-300">
                          Answers
                        </span>
                        {selectedQuestion && (
                          <span className="text-[10px] text-gray-400 line-clamp-1">
                            Q: {selectedQuestion.text}
                          </span>
                        )}
                      </div>

                      {!selectedQuestion && (
                        <p className="text-xs text-gray-400">
                          Select a question on the left to view/add answers.
                        </p>
                      )}

                      {selectedQuestion && (
                        <>
                          {/* Add answer */}
                          <div className="mb-3 space-y-2">
                            {/* Row 1: answer text */}
                            <input
                              className="w-full px-3 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 text-xs outline-none"
                              placeholder="Enter answer text"
                              value={newAnswerText}
                              onChange={(e) => setNewAnswerText(e.target.value)}
                            />

                            {/* Row 2: category + add button */}
                            <div className="flex gap-2">
                              <select
                                className="flex-1 bg-white/90 text-gray-900 px-2 py-2 rounded-lg text-xs outline-none"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                              >
                                <option value="">Category</option>
                                {categories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={addAnswer}
                                className="bg-sky-600 hover:bg-sky-700 transition px-3 py-2 rounded-lg font-semibold flex items-center gap-1 text-xs shadow-md shadow-sky-900/40"
                              >
                                <IoAdd /> Add
                              </button>
                            </div>
                          </div>

                          {/* Answer list */}
                          <div className="flex-1 overflow-y-auto space-y-2">
                            {questionAnswers.length === 0 && (
                              <p className="text-xs text-gray-400">
                                No answers yet. Add one above.
                              </p>
                            )}
                            {questionAnswers.map((a) => (
                              <div
                                key={a.id}
                                className="flex justify-between items-center bg-white/10 px-3 py-2 rounded-lg text-xs"
                              >
                                <p>
                                  {a.answer_text}{" "}
                                  <span className="text-[11px] text-gray-300">
                                    ({a.category})
                                  </span>
                                </p>
                                <button
                                  onClick={() => deleteAnswer(a.id)}
                                  className="text-red-400 hover:text-red-500"
                                >
                                  <IoTrashOutline size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center max-w-sm border border-white/20 shadow-xl shadow-black/70">
            <h3 className="text-lg font-semibold mb-3">
              {confirmAction.message}
            </h3>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <span>{toast.message}</span>
          <IoClose
            className="cursor-pointer"
            onClick={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
