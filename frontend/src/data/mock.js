export const tasks = [
  {
    id: 1,
    title: "Лабораторна №3: git-hooks",
    course: "Веб-технології",
    due: "10 жовт",
    overdue: true,
    important: true,
  },
  {
    id: 2,
    title: "Лабораторна №4: верстка",
    course: "Веб-технології",
    due: "12 жовт",
    important: true,
  },
  { id: 3, title: "Практична з ООП", course: "ООП", due: "14 жовт" },
  {
    id: 4,
    title: "Реферат з дискретної математики",
    course: "Дискретна математика",
    due: "18 жовт",
  },
  { id: 5, title: "Тест з англійської", course: "Англійська мова", due: "9 жовт", done: true },
];

export const courses = [
  { id: 1, name: "Веб-технології", teacher: "Доц. Іваненко І. І.", progress: 60, tasks: 4 },
  { id: 2, name: "ООП", teacher: "Доц. Петренко П. П.", progress: 45, tasks: 3 },
  { id: 3, name: "Дискретна математика", teacher: "Проф. Коваль О. О.", progress: 30, tasks: 2 },
  { id: 4, name: "Англійська мова", teacher: "Ст. викл. Мельник М. М.", progress: 80, tasks: 1 },
];

export const calendarEvents = {
  10: ["Здача лаб. 3"],
  12: ["Дедлайн лаб. 4"],
  14: ["Практична ООП"],
  18: ["Реферат"],
  25: ["Контрольна"],
};
