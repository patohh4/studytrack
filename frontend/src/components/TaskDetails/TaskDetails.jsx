import { useState } from "react";
import { tasksApi } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";

function parseSubtasksFromDescription(description) {
  if (!description) return [];
  // Шукаємо нумеровані пункти: "1. ...", "2. ..." тощо
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const match = line.match(/^\d+[.)]\s+(.+)/);
    if (match) items.push({ text: match[1].trim(), completed: false });
  }
  return items;
}

export default function TaskDetails({ task, onBack, onComplete, onTaskUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.desc || task?.description || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [isImportant, setIsImportant] = useState(Boolean(task?.isImportant || task?.is_important));

  const initialSubtasks = task?.subtasks?.length
    ? task.subtasks
    : parseSubtasksFromDescription(task?.desc || task?.description);
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!task) return null;

  const toggleSubtask = (index) => {
    setSubtasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, completed: !item.completed } : item));
  };

  const saveChanges = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Назва та опис не можуть бути порожніми.");
      return;
    }

    setSaving(true);
    setError("");
    const cleanSubtasks = subtasks.filter((s) => s.text.trim() !== "");
    const changes = { title: title.trim(), description: description.trim(), notes: notes.trim() || null, subtasks: cleanSubtasks, is_important: isImportant };
    if (supabase) {
      const { error: saveError } = await tasksApi.update(task.id, changes);
      if (saveError) {
        setError(saveError.message);
        setSaving(false);
        return;
      }
    }

    onTaskUpdate?.({ ...task, ...changes, desc: changes.description });
    setSubtasks(cleanSubtasks);
    setIsEditing(false);
    setSaving(false);
  };

  const saveNote = async () => {
    setSaving(true);
    setError("");
    if (supabase) {
      const { error: saveError } = await tasksApi.update(task.id, { notes: notes.trim() || null });
      if (saveError) {
        setError(saveError.message);
        setSaving(false);
        return;
      }
    }
    onTaskUpdate?.({ ...task, notes: notes.trim() });
    setSaving(false);
  };

  const completeTask = async () => {
    const changes = { completed_at: new Date().toISOString() };
    if (supabase) {
      const { error: completeError } = await tasksApi.update(task.id, changes);
      if (completeError) {
        setError(completeError.message);
        return;
      }
    }
    onComplete?.({ ...task, ...changes });
  };

  const toggleImportant = async () => {
    const nextValue = !isImportant;
    setIsImportant(nextValue);
    setError("");
    if (supabase) {
      const { error: importantError } = await tasksApi.update(task.id, { is_important: nextValue });
      if (importantError) {
        setIsImportant(!nextValue);
        setError(importantError.message);
        return;
      }
    }
    onTaskUpdate?.({ ...task, isImportant: nextValue, is_important: nextValue });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8 text-[#1d1d1f] md:px-12">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={onBack} className="mb-8 flex items-center gap-2 text-sm font-medium text-[#6e6e73] transition-colors hover:text-[#1d4ed8]"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>Усі завдання</button>
        <article className="rounded-xl border border-[#e5e5ea] bg-white p-7 shadow-sm md:p-10">
          <header className="flex flex-col gap-4 border-b border-[#e5e5ea] pb-7 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-[#b7791f]">{task.course}</p>
                {isImportant && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700"><span className="material-symbols-outlined" style={{ fontSize: 15 }}>star</span>Важливе</span>}
              </div>
              {isEditing ? <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-3xl font-semibold outline-none focus:border-blue-400" /> : <h1 className="max-w-3xl break-words text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>}
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs text-[#8a6d3b]"><span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>{task.deadline}</span>
          </header>

          <section className="mt-8 rounded-xl bg-[#f5f5f7] p-5 md:p-6">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined text-[#d69e2e]" style={{ fontSize: 18 }}>description</span>Опис завдання</div>
            {isEditing ? <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-sm leading-7 outline-none focus:border-blue-400" /> : <p className="whitespace-pre-wrap text-sm leading-7 text-[#4b4b4f]">{description || "Опис не додано."}</p>}
          </section>

          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold"><span className="material-symbols-outlined text-[#d69e2e]" style={{ fontSize: 18 }}>checklist</span>Підзадачі</h2>{isEditing && <button type="button" onClick={() => setSubtasks((items) => [...items, { text: "", completed: false }])} className="text-xs font-medium text-blue-600">+ Додати підзадачу</button>}</div>
            <div className="space-y-1">
              {subtasks.map((subtask, index) => (
                <div key={index} className="rounded-lg px-2 py-1 hover:bg-[#f5f5f7]">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={Boolean(subtask.completed)} onChange={() => toggleSubtask(index)} className="h-4 w-4 accent-[#2563eb]" />
                    {isEditing ? (
                      <input
                        value={subtask.text}
                        onChange={(event) => setSubtasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 ${subtask.text.trim() === "" ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                        placeholder="Введіть текст підзадачі..."
                      />
                    ) : (
                      <span className={subtask.completed ? "text-[#9a9a9f] line-through" : "text-[#3a3a3c]"}>{subtask.text}</span>
                    )}
                    {isEditing && <button type="button" onClick={() => setSubtasks((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-500">Видалити</button>}
                  </div>
                  {isEditing && subtask.text.trim() === "" && (
                    <p className="ml-7 mt-1 text-xs text-red-500">Підзадача не заповнена</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><span className="material-symbols-outlined text-[#d69e2e]" style={{ fontSize: 18 }}>edit_note</span>Особисті нотатки студента</h2>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Додайте важливу нотатку до цього завдання..." className="min-h-28 w-full resize-y rounded-xl border border-transparent bg-[#f5f5f7] p-4 text-sm leading-6 outline-none transition focus:border-[#93c5fd] focus:bg-white" />
            <button type="button" onClick={saveNote} disabled={saving} className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60">{saving ? "Збереження..." : "Зберегти нотатку"}</button>
          </section>

          {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <footer className="mt-8 flex flex-wrap gap-3 border-t border-[#e5e5ea] pt-6">{isEditing ? <><button type="button" onClick={saveChanges} disabled={saving} className="rounded-lg bg-[#1d1d1f] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Збереження..." : "Зберегти зміни"}</button><button type="button" onClick={() => setIsEditing(false)} className="rounded-lg px-5 py-3 text-sm font-medium text-[#6e6e73] hover:bg-[#f5f5f7]">Скасувати</button></> : <><button type="button" onClick={toggleImportant} className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium ${isImportant ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isImportant ? "star" : "star_outline"}</span>{isImportant ? "Важливе завдання" : "Позначити важливим"}</button><button type="button" onClick={() => setIsEditing(true)} className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200">Редагувати завдання</button><button type="button" onClick={completeTask} className="inline-flex items-center gap-2 rounded-lg bg-[#1d1d1f] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2563eb]"><span className="material-symbols-outlined" style={{ fontSize: 17 }}>check</span>Позначити завдання виконаним</button><button type="button" onClick={onBack} className="rounded-lg px-5 py-3 text-sm font-medium text-[#6e6e73] hover:bg-[#f5f5f7]">Назад</button></>}</footer>
        </article>
      </div>
    </div>
  );
}
