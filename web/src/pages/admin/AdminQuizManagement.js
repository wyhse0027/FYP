import React, { useEffect, useMemo, useState } from "react";
import http from "../../lib/http";
import { IoAdd, IoRefresh, IoTrashOutline } from "react-icons/io5";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminField,
  AdminToast,
  adminInput,
} from "../../components/admin";
import Dropdown from "../../components/ui/Dropdown";

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

  useAdminChrome({ title: "Quizzes", backTo: "/admin/dashboard", actions: null });

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

  function toggleAllowedProduct(quiz, productId) {
    const current = quiz.allowed_products || [];
    const exists = current.includes(productId);
    const next = exists
      ? current.filter((id) => id !== productId)
      : [...current, productId];

    updateQuizField(quiz.id, { allowed_products: next });
  }

  function formatAudienceLabel(aud) {
    const a = (aud || "ANY").toUpperCase();
    if (a === "ANY") return "Any";
    return a.charAt(0) + a.slice(1).toLowerCase();
  }

  const audienceDropdownOptions = useMemo(
    () => AUDIENCE_OPTIONS.map((a) => ({ value: a, label: formatAudienceLabel(a) })),
    []
  );

  const categoryDropdownOptions = useMemo(
    () => [
      { value: "", label: "Category" },
      ...categories.map((c) => ({ value: c, label: c })),
    ],
    [categories]
  );

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-4 grid md:grid-cols-[2fr_1.5fr_1fr_auto_auto] gap-3 items-center">
        <input
          className={adminInput}
          placeholder="Quiz title"
          value={newQuizTitle}
          onChange={(e) => setNewQuizTitle(e.target.value)}
        />
        <input
          className={adminInput}
          placeholder="Label (optional, e.g. For Women)"
          value={newQuizLabel}
          onChange={(e) => setNewQuizLabel(e.target.value)}
        />
        <Dropdown
          value={newQuizAudience}
          onChange={setNewQuizAudience}
          options={audienceDropdownOptions}
          className="fld w-full rounded-lg px-4 py-2.5 text-sm"
          align="right"
        />
        <button
          onClick={addQuiz}
          disabled={!newQuizTitle.trim()}
          className="btn-lux rounded-full px-5 py-2.5 text-[11px] label uppercase font-medium inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IoAdd />
          Add
        </button>
        <button
          onClick={fetchAll}
          className="ghost rounded-full px-5 py-2.5 text-[11px] label uppercase inline-flex items-center gap-2"
        >
          <IoRefresh />
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_2fr_2fr] gap-5">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="label uppercase text-[10px] text-luxury-mut">Quizzes</p>
            <span className="text-[11px] text-luxury-mut">
              {quizzes.length} total
            </span>
          </div>
          {quizzes.length === 0 && (
            <p className="text-xs text-luxury-mut">
              No quizzes yet. Create one above.
            </p>
          )}
          <div className="space-y-2">
            {quizzes.map((quiz) => {
              const active = quiz.id === selectedQuizId;
              return (
                <div
                  key={quiz.id}
                  className={`rounded-xl px-4 py-3 cursor-pointer flex items-start justify-between gap-2 border transition ${
                    active
                      ? "border-luxury-gold/60 bg-luxury-gold/12"
                      : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.04]"
                  }`}
                  onClick={() => {
                    setSelectedQuizId(quiz.id);
                    setSelectedQuestionId(null);
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-serif text-base text-white">
                      {quiz.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-luxury-mut">
                      <span>{quiz.label || "No label"}</span>
                      <span>·</span>
                      <span className="inline-flex rounded-full px-2 py-0.5 border border-luxury-gold/50 text-luxury-gold2 uppercase tracking-wide">
                        {formatAudienceLabel(quiz.audience)}
                      </span>
                      <span>·</span>
                      <span>
                        {quiz.allowed_products?.length
                          ? `${quiz.allowed_products.length} products`
                          : "All products"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-red-300/70 hover:text-red-300 ml-2 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuiz(quiz.id);
                    }}
                    aria-label={`Delete ${quiz.title}`}
                  >
                    <IoTrashOutline size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-5">
          <p className="label uppercase text-[10px] text-luxury-mut">Quiz Details</p>

          {!selectedQuiz && (
            <p className="text-xs text-luxury-mut">
              Select a quiz from the left to view/edit details.
            </p>
          )}

          {selectedQuiz && (
            <>
              <div className="space-y-3">
                <AdminField label="Title">
                  <input
                    className={adminInput}
                    defaultValue={selectedQuiz.title}
                    onBlur={(e) =>
                      e.target.value !== selectedQuiz.title &&
                      updateQuizField(selectedQuiz.id, {
                        title: e.target.value,
                      })
                    }
                  />
                </AdminField>
                <AdminField label="Label">
                  <input
                    className={adminInput}
                    placeholder="e.g. For Women, For Beginners"
                    defaultValue={selectedQuiz.label || ""}
                    onBlur={(e) =>
                      e.target.value !== (selectedQuiz.label || "") &&
                      updateQuizField(selectedQuiz.id, {
                        label: e.target.value,
                      })
                    }
                  />
                </AdminField>
                <AdminField label="Audience">
                  <Dropdown
                    value={selectedQuiz.audience || "ANY"}
                    onChange={(value) =>
                      updateQuizField(selectedQuiz.id, {
                        audience: value,
                      })
                    }
                    options={audienceDropdownOptions}
                    className="fld w-full rounded-lg px-4 py-2.5 text-sm"
                    align="right"
                  />
                </AdminField>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="label uppercase text-[10px] text-luxury-mut">
                    Allowed Products{" "}
                    <span className="normal-case tracking-normal text-luxury-mut">
                      (whitelist, optional)
                    </span>
                  </p>
                  <span className="text-[10px] text-luxury-mut">
                    {selectedQuiz.allowed_products?.length
                      ? `${selectedQuiz.allowed_products.length} selected`
                      : "All products"}
                  </span>
                </div>
                <div className="rounded-xl p-3 grid sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-white/[0.03] border border-white/[0.07]">
                  {products.map((p) => {
                    const active = selectedQuiz.allowed_products?.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleAllowedProduct(selectedQuiz, p.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs text-left transition ${
                          active
                            ? "border border-luxury-gold/60 bg-luxury-gold/15 text-luxury-champagne"
                            : "border border-luxury-mut/40 text-luxury-mut hover:bg-white/[0.04]"
                        }`}
                      >
                        {active && <span className="text-luxury-gold2 mr-2">✓</span>}
                        {p.name}
                        <span className="block text-[9px] text-luxury-mut mt-0.5">
                          {p.category} / {p.target}
                        </span>
                      </button>
                    );
                  })}
                  {products.length === 0 && (
                    <div className="text-luxury-mut text-xs">
                      No products found.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col">
          <p className="label uppercase text-[10px] text-luxury-mut mb-3">
            Questions | Answers
          </p>

          {!selectedQuiz && (
            <p className="text-xs text-luxury-mut">
              Select a quiz to manage its questions and answers.
            </p>
          )}

          {selectedQuiz && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  className={`${adminInput} flex-1`}
                  placeholder="Enter new question"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                />
                <button
                  onClick={addQuestion}
                  className="btn-lux rounded-full px-4 py-2.5 text-[11px] label uppercase font-medium inline-flex items-center gap-2"
                >
                  <IoAdd />
                  Add
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-2.5 bg-white/[0.03] border border-white/[0.07]">
                  <p className="text-[10px] text-luxury-mut mb-2 px-1">
                    {quizQuestions.length} question
                    {quizQuestions.length !== 1 ? "s" : ""}
                  </p>
                  {quizQuestions.length === 0 && (
                    <p className="text-xs text-luxury-mut">
                      No questions yet. Add one above.
                    </p>
                  )}
                  <div className="space-y-2">
                    {quizQuestions.map((q) => {
                      const active = q.id === selectedQuestionId;
                      return (
                        <div
                          key={q.id}
                          className={`rounded-lg px-3 py-2 text-xs cursor-pointer flex items-start justify-between gap-2 border transition ${
                            active
                              ? "border-luxury-gold/60 bg-luxury-gold/12"
                              : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.04]"
                          }`}
                          onClick={() => setSelectedQuestionId(q.id)}
                        >
                          <span>{q.text}</span>
                          <button
                            type="button"
                            className="text-red-300/70 hover:text-red-300 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuestion(q.id);
                            }}
                            aria-label="Delete question"
                          >
                            <IoTrashOutline size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl p-2.5 flex flex-col bg-white/[0.03] border border-white/[0.07]">
                  <p className="text-[10px] text-luxury-mut mb-2 px-1 line-clamp-1">
                    {selectedQuestion ? `Q: ${selectedQuestion.text}` : "Answers"}
                  </p>

                  {!selectedQuestion && (
                    <p className="text-xs text-luxury-mut">
                      Select a question on the left to view/add answers.
                    </p>
                  )}

                  {selectedQuestion && (
                    <>
                      <div className="space-y-2 mb-3">
                        <input
                          className={`${adminInput} text-xs py-2`}
                          placeholder="Enter answer text"
                          value={newAnswerText}
                          onChange={(e) => setNewAnswerText(e.target.value)}
                        />

                        <div className="flex gap-2">
                          <Dropdown
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={categoryDropdownOptions}
                            className="fld flex-1 rounded-lg px-3 py-2 text-xs"
                            align="right"
                          />

                          <button
                            onClick={addAnswer}
                            className="btn-lux rounded-full px-3 py-2 text-[10px] label uppercase font-medium inline-flex items-center gap-1"
                          >
                            <IoAdd />
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {questionAnswers.length === 0 && (
                          <p className="text-xs text-luxury-mut">
                            No answers yet. Add one above.
                          </p>
                        )}
                        {questionAnswers.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-lg px-3 py-2 text-xs flex justify-between items-center gap-3 bg-white/[0.03] border border-white/[0.07]"
                          >
                            <p>
                              {a.answer_text}{" "}
                              <span className="text-luxury-mut">
                                ({a.category})
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() => deleteAnswer(a.id)}
                              className="text-red-300/70 hover:text-red-300 shrink-0"
                              aria-label="Delete answer"
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
            </>
          )}
        </div>
      </div>

      {confirmAction && (
        <AdminConfirm
          open
          title="Confirm Action"
          message={confirmAction.message}
          confirmText="Yes"
          cancelText="Cancel"
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {toast && (
        <AdminToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
