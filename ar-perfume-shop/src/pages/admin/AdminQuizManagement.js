import React, { useEffect, useState } from "react";
import http from "../../lib/http";
import {
  IoAdd,
  IoTrashOutline,
  IoRefresh,
  IoChevronDown,
  IoClose,
} from "react-icons/io5";

export default function AdminQuizManagement() {
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const [newQuiz, setNewQuiz] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm }
  const [toast, setToast] = useState(null); // { type, message }

  // ─── Load Data ────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [qz, qs, ans, cats] = await Promise.all([
        http.get("admin/quizzes/"),
        http.get("admin/quiz-questions/"),
        http.get("admin/quiz-answers/"),
        http.get("admin/categories/"),
      ]);
      setQuizzes(qz.data);
      setQuestions(qs.data);
      setAnswers(ans.data);
      setCategories(cats.data);
    } catch (err) {
      console.error("Failed to load quiz data:", err);
      showToast("error", "Failed to load data");
    }
  }

  // ─── Toast Utility ────────────────────────────────────────────
  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Confirmation Utility ─────────────────────────────────────
  function confirm(message, onConfirm) {
    setConfirmAction({ message, onConfirm });
  }

  // ─── CRUD: Quiz ───────────────────────────────────────────────
  async function addQuiz() {
    if (!newQuiz.trim()) return;
    try {
      await http.post("admin/quizzes/", { title: newQuiz });
      setNewQuiz("");
      fetchAll();
      showToast("success", "Quiz added successfully!");
    } catch {
      showToast("error", "Failed to add quiz");
    }
  }

  async function deleteQuiz(id) {
    confirm("Delete this quiz?", async () => {
      try {
        await http.delete(`admin/quizzes/${id}/`);
        fetchAll();
        showToast("success", "Quiz deleted successfully!");
      } catch {
        showToast("error", "Failed to delete quiz");
      }
    });
  }

  // ─── CRUD: Question ───────────────────────────────────────────
  async function addQuestion(quizId) {
    if (!newQuestion.trim()) return;
    try {
      await http.post("admin/quiz-questions/", {
        quiz: quizId,
        text: newQuestion,
      });
      setNewQuestion("");
      fetchAll();
      showToast("success", "Question added successfully!");
    } catch {
      showToast("error", "Failed to add question");
    }
  }

  async function deleteQuestion(id) {
    confirm("Delete this question?", async () => {
      try {
        await http.delete(`admin/quiz-questions/${id}/`);
        fetchAll();
        showToast("success", "Question deleted successfully!");
      } catch {
        showToast("error", "Failed to delete question");
      }
    });
  }

  // ─── CRUD: Answer ─────────────────────────────────────────────
  async function addAnswer(questionId) {
    if (!newAnswer.trim() || !selectedCategory.trim()) return;
    try {
      await http.post("admin/quiz-answers/", {
        question: questionId,
        answer_text: newAnswer,
        category: selectedCategory,
      });
      setNewAnswer("");
      setSelectedCategory("");
      fetchAll();
      showToast("success", "Answer added successfully!");
    } catch (err) {
      if (err.response?.status === 401)
        showToast("error", "Unauthorized. Please log in again.");
      else showToast("error", "Failed to add answer");
    }
  }

  async function deleteAnswer(id) {
    confirm("Delete this answer?", async () => {
      try {
        await http.delete(`admin/quiz-answers/${id}/`);
        fetchAll();
        showToast("success", "Answer deleted successfully!");
      } catch {
        showToast("error", "Failed to delete answer");
      }
    });
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16 py-8 relative">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          <span className="text-pink-400">💬</span> Quiz Management
        </h1>

        {/* ─── Add New Quiz ───────────────────────────── */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl mb-8 flex items-center gap-3 shadow-md">
          <input
            className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="Enter quiz title"
            value={newQuiz}
            onChange={(e) => setNewQuiz(e.target.value)}
          />
          <button
            onClick={addQuiz}
            disabled={!newQuiz.trim()}
            className="bg-pink-500 hover:bg-pink-600 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <IoAdd /> Add
          </button>
          <button
            onClick={fetchAll}
            className="bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <IoRefresh /> Refresh
          </button>
        </div>

        {/* ─── Quiz List ─────────────────────────────── */}
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white/10 rounded-xl shadow-md transition hover:bg-white/15"
            >
              <div
                className="flex justify-between items-center p-4 cursor-pointer"
                onClick={() =>
                  setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)
                }
              >
                <h2 className="text-lg font-semibold">{quiz.title}</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuiz(quiz.id);
                    }}
                    className="text-red-400 hover:text-red-500 transition"
                  >
                    <IoTrashOutline size={18} />
                  </button>
                  <IoChevronDown
                    className={`transition-transform ${
                      expandedQuiz === quiz.id ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              {expandedQuiz === quiz.id && (
                <div className="border-t border-white/20 p-4 space-y-4">
                  {/* ─── Add Question ─── */}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-green-400"
                      placeholder="Enter new question"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                    />
                    <button
                      onClick={() => addQuestion(quiz.id)}
                      className="bg-green-500 hover:bg-green-600 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                      <IoAdd /> Add Question
                    </button>
                  </div>

                  {/* ─── Question List ─── */}
                  {questions
                    .filter((q) => q.quiz === quiz.id)
                    .map((q) => (
                      <div
                        key={q.id}
                        className="ml-4 bg-white/5 rounded-lg p-3 border border-white/10"
                      >
                        <div
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() =>
                            setExpandedQuestion(
                              expandedQuestion === q.id ? null : q.id
                            )
                          }
                        >
                          <p className="font-medium">{q.text}</p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteQuestion(q.id);
                              }}
                              className="text-red-400 hover:text-red-500 transition"
                            >
                              <IoTrashOutline size={16} />
                            </button>
                            <IoChevronDown
                              className={`transition-transform ${
                                expandedQuestion === q.id ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* ─── Answers ─── */}
                        {expandedQuestion === q.id && (
                          <div className="mt-3 border-t border-white/20 pt-3 space-y-3">
                            <div className="flex gap-2">
                              <input
                                className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none"
                                placeholder="Enter answer text"
                                value={newAnswer}
                                onChange={(e) =>
                                  setNewAnswer(e.target.value)
                                }
                              />
                              <select
                                className="bg-white/90 text-gray-900 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-sky-400"
                                value={selectedCategory}
                                onChange={(e) =>
                                  setSelectedCategory(e.target.value)
                                }
                              >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => addAnswer(q.id)}
                                className="bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                              >
                                <IoAdd /> Add
                              </button>
                            </div>

                            {answers
                              .filter((a) => a.question === q.id)
                              .map((a) => (
                                <div
                                  key={a.id}
                                  className="flex justify-between items-center bg-white/10 px-3 py-2 rounded-lg"
                                >
                                  <p>
                                    {a.answer_text}{" "}
                                    <span className="text-sm text-gray-300">
                                      ({a.category})
                                    </span>
                                  </p>
                                  <button
                                    onClick={() => deleteAnswer(a.id)}
                                    className="text-red-400 hover:text-red-500 transition"
                                  >
                                    <IoTrashOutline size={16} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Confirmation Panel ───────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center max-w-sm">
            <h3 className="text-lg font-semibold mb-3">
              {confirmAction.message}
            </h3>
            <div className="flex justify-center gap-4">
              <button
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Yes
              </button>
              <button
                className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast Notification ───────────────────── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
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
