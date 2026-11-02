/** Централізований обробник помилок — має бути підключений останнім. */
export function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({ message: err.message ?? "Внутрішня помилка сервера" });
}
