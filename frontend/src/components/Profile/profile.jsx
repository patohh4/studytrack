import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { loadProgress } from "../../lib/progress.js";

export default function StudentProfile({ user, onUserUpdate, profileLoadError }) {
  const progress = loadProgress(user?.id);
  const [completedTaskCount, setCompletedTaskCount] = useState(() => progress.completedIds.length);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(user?.full_name || "");
  const [draftEmail, setDraftEmail] = useState(user?.email || "");
  const [draftPhone, setDraftPhone] = useState(user?.phone || "");
  const [draftUniversity, setDraftUniversity] = useState(user?.university || "");
  const [draftCourse, setDraftCourse] = useState(user?.course || "");
  const [draftGroup, setDraftGroup] = useState(user?.group_name || "");
  const [draftAvatar, setDraftAvatar] = useState(user?.avatar_url || "");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Користувач";
  const displayEmail = user?.email || "email@domain.com";
  const initials = displayName.split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "К";

  useEffect(() => {
    if (!supabase || !user?.id) return;

    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("completed_at", "is", null)
      .then(({ count }) => setCompletedTaskCount(count || 0));
  }, [user?.id, progress.completedIds.length]);

  const completedCount = supabase ? completedTaskCount : progress.completedIds.length;

  const saveProfile = async () => {
    if (!user || !supabase) return;

    const nextName = draftName.trim();
    const nextEmail = draftEmail.trim();
    const nextPhone = draftPhone.trim();
    const nextUniversity = draftUniversity.trim();
    const nextCourse = draftCourse.trim();
    const nextGroup = draftGroup.trim();

    if (!nextName) {
      setSaveError("Введіть ім’я, щоб зберегти профіль.");
      return;
    }

    setSaving(true);
    setSaveError("");

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: nextName,
        email: nextEmail || user.email,
        phone: nextPhone || null,
        university: nextUniversity || null,
        course: nextCourse || null,
        group_name: nextGroup || null,
        avatar_url: draftAvatar.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    if (nextEmail && nextEmail !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail });
      if (emailError) {
        setSaveError(emailError.message);
        setSaving(false);
        return;
      }
    }

    const updatedUser = {
      ...user,
      email: nextEmail || user.email,
      phone: nextPhone || "",
      university: nextUniversity || "",
      course: nextCourse || "",
      group_name: nextGroup || "",
      full_name: nextName,
      avatar_url: draftAvatar.trim() || null,
    };

    onUserUpdate?.(updatedUser);
    setIsEditing(false);
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!supabase || !user) return;
    if (!newPassword || !confirmPassword) {
      setPasswordError("Введіть новий пароль та підтвердження.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Паролі не збігаються.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Пароль має містити принаймні 6 символів.");
      return;
    }

    setChangingPassword(true);
    setPasswordError("");
    setPasswordMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setChangingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPasswordMessage("Пароль успішно оновлено.");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDraftAvatar(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  // Дані для активностей за тиждень
  const weeklyTracker = [
    { day: 'Пн', count: '2 зд.', status: 'closed', title: 'Понеділок: 2 завдання здано', icon: 'check' },
    { day: 'Вт', count: '1 зд.', status: 'closed', title: 'Вівторок: 1 завдання здано', icon: 'check' },
    { day: 'Ср', count: '3 зд.', status: 'high', title: 'Середа: 3 завдання здано', icon: 'check' },
    { day: 'Чт', count: '1 зд.', status: 'closed', title: 'Четвер: 1 завдання здано', icon: 'check' },
    { day: 'Пт', count: '2 зд.', status: 'closed', title: 'П\'ятниця: 2 завдання здано', icon: 'check' },
    { day: 'Сб', count: 'відп.', status: 'rest', title: 'Субота: відпочинок' },
    { day: 'Сьогодні', count: '1 у роб.', status: 'active', title: 'Сьогодні: 1 завдання в процесі', icon: 'hourglass_top' },
  ];

  const badges = [
    {
      title: 'Рання пташка',
      description: 'Здав 5 завдань до дедлайну без поспіху в останню ніч.',
      icon: 'wb_sunny',
      colorClass: 'text-warm-amber',
      unlocked: completedCount >= 5,
      progress: `${Math.min(completedCount, 5)}/5`,
    },
    {
      title: 'Без хвостів',
      description: 'Тиждень поспіль активного закриття завдань за графіком.',
      icon: 'local_fire_department',
      colorClass: 'text-streak-orange',
      unlocked: progress.streak >= 7,
      progress: `${Math.min(progress.streak, 7)}/7 днів`,
    },
    {
      title: 'Глибоке занурення',
      description: 'Опрацьовано 10 практичних робіт підряд без пауз.',
      icon: 'menu_book',
      colorClass: 'text-secondary',
      unlocked: completedCount >= 10,
      progress: `${Math.min(completedCount, 10)}/10`,
    },
  ];
  const earnedBadges = badges.filter((badge) => badge.unlocked);

  // Майбутні цілі
  const futureGoals = [
      {
      title: 'Марафонець',
      description: 'Стрік 30 днів безперервної активності. (прогрес: 14/30)',
      icon: 'directions_run',
      status: `${Math.min(progress.streak, 30)}/30`,
    },
    {
      title: 'Ідеальний семестр',
      description: 'Жодної повторної перездачі заліків та модулів.',
      icon: 'verified',
      status: `${Math.min(completedCount, 20)}/20`,
    },
    {
      title: 'За 48 годин',
      description: 'Закрити курсову роботу за 2 доби до фіналу сесії.',
      icon: 'schedule',
      status: `${Math.min(completedCount, 10)}/10`,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      <header>
        <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">Особистий прогрес</p>
        <h1 className="text-3xl font-semibold tracking-tight">Профіль студента</h1>
        <p className="mt-2 text-sm text-gray-500">Твоя активність, відзнаки та наступні цілі.</p>
      </header>
      <section className="grid min-w-0 gap-6 lg:grid-cols-1">
        <div className="min-w-0 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex min-w-0 items-center gap-4">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-2xl font-semibold text-white">{initials}</div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-semibold leading-tight">{displayName}</h2>
              <p className="break-all text-sm leading-tight text-gray-500">{displayEmail}</p>
            </div>
          </div>

          {!isEditing && (user?.university || user?.course || user?.group_name || user?.phone) && (
            <div className="mt-6 grid gap-3 border-t border-gray-100 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {user?.university && <div><p className="text-xs uppercase tracking-wider text-gray-400">Університет</p><p className="mt-1 break-words font-medium text-gray-700">{user.university}</p></div>}
              {user?.course && <div><p className="text-xs uppercase tracking-wider text-gray-400">Курс</p><p className="mt-1 break-words font-medium text-gray-700">{user.course}</p></div>}
              {user?.group_name && <div><p className="text-xs uppercase tracking-wider text-gray-400">Група</p><p className="mt-1 break-words font-medium text-gray-700">{user.group_name}</p></div>}
              {user?.phone && <div><p className="text-xs uppercase tracking-wider text-gray-400">Телефон</p><p className="mt-1 break-words font-medium text-gray-700">{user.phone}</p></div>}
            </div>
          )}

          {isEditing ? (
            <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
              {profileLoadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Не вдалося завантажити дані профілю: {profileLoadError}</p>}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Ім’я</label>
                <input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Email</label>
                <input value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Телефон</label>
                <input value={draftPhone} onChange={(event) => setDraftPhone(event.target.value)} placeholder="+380..." className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Університет</label>
                  <input value={draftUniversity} onChange={(event) => setDraftUniversity(event.target.value)} placeholder="НУ " className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Курс</label>
                  <input value={draftCourse} onChange={(event) => setDraftCourse(event.target.value)} placeholder="2 курс" className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Група</label>
                <input value={draftGroup} onChange={(event) => setDraftGroup(event.target.value)} placeholder="КН-12" className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">URL аватара</label>
                <input value={draftAvatar} onChange={(event) => setDraftAvatar(event.target.value)} placeholder="https://..." className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Або завантажити файл</label>
                <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white" />
              </div>
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={saveProfile} disabled={saving} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">
                  {saving ? "Збереження..." : "Зберегти"}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">Скасувати</button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div><div className="text-xl font-semibold">{completedCount}</div><div className="text-xs text-gray-500">завдання</div></div>
                <div><div className="text-xl font-semibold">{progress.streak}</div><div className="text-xs text-gray-500">днів стріку</div></div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftName(user?.full_name || "");
                  setDraftEmail(user?.email || "");
                  setDraftPhone(user?.phone || "");
                  setDraftUniversity(user?.university || "");
                  setDraftCourse(user?.course || "");
                  setDraftGroup(user?.group_name || "");
                  setDraftAvatar(user?.avatar_url || "");
                  setIsEditing(true);
                }}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
              >
                Редагувати
              </button>
            </div>
          )}
        </div>
        <div className="min-w-0 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-4"><div className="min-w-0"><h2 className="font-semibold">Активність за тиждень</h2><p className="text-sm text-gray-500">Виконані та поточні завдання</p></div><span className="shrink-0 text-sm font-medium text-orange-500">14 днів поспіль</span></div>
          <div className="grid grid-cols-7 gap-2">
            {weeklyTracker.map((item) => <div key={item.day} className="text-center" title={item.title}><div className={`mx-auto flex h-20 items-end justify-center rounded-lg p-2 ${item.status === "rest" ? "bg-gray-100" : item.status === "high" ? "bg-orange-200" : item.status === "active" ? "bg-yellow-100" : "bg-gray-200"}`}><span className="text-xs font-medium text-gray-700">{item.count}</span></div><div className="mt-2 text-xs text-gray-500">{item.day}</div></div>)}
          </div>
        </div>
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Змінити пароль</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Новий пароль</label>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Підтвердити пароль</label>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-blue-400" />
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            {passwordMessage && <p className="text-xs text-green-600">{passwordMessage}</p>}
            <button type="button" onClick={handlePasswordChange} disabled={changingPassword} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60">
              {changingPassword ? "Оновлення..." : "Оновити пароль"}
            </button>
          </div>
        </div>

        <div><h2 className="mb-4 text-xl font-semibold">Здобуті відзнаки</h2><div className="space-y-3">{earnedBadges.map((badge) => <div key={badge.title} className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm"><span className={`material-symbols-outlined ${badge.colorClass}`}>{badge.icon}</span><div><h3 className="font-medium">{badge.title}</h3><p className="mt-1 text-sm text-gray-500">{badge.description}</p></div></div>)}</div></div>
      </section>

      <section className="grid gap-8 lg:grid-cols-1">
        <div><h2 className="mb-4 text-xl font-semibold">Наступні цілі</h2><div className="space-y-3">{futureGoals.map((goal) => <div key={goal.title} className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm"><span className="material-symbols-outlined text-gray-500">{goal.icon}</span><div className="flex-1"><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{goal.title}</h3><span className="text-xs text-gray-500">{goal.status}</span></div><p className="mt-1 text-sm text-gray-500">{goal.description}</p></div></div>)}</div></div>
      </section>
    </div>
  );
}