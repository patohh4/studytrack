/**
 * Створює middleware для валідації тіла запиту через zod-схему.
 * @param {import("zod").ZodType} schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      return res.status(400).json({ message: messages });
    }
    req.body = result.data;
    next();
  };
}
