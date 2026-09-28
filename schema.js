/* Validate persisted data before it reaches rendering or simulation. */
(() => {
  "use strict";
  const text = (v) => typeof v === "string" && v.length <= 100000;
  const id = (v) => text(v) && /^[a-zA-Z0-9_-]{1,120}$/.test(v);
  const number =
    (min = 0, max = 1e15) =>
    (v) =>
      Number.isFinite(v) && v >= min && v <= max;
  const bool = (v) => typeof v === "boolean";
  const one =
    (...values) =>
    (v) =>
      values.includes(v);
  const optional = (check) => (v) => v === undefined || check(v);
  const nullable = (check) => (v) => v === null || check(v);
  const array =
    (check, min = 0, max = 1000) =>
    (v) =>
      Array.isArray(v) && v.length >= min && v.length <= max && v.every(check);
  const object = (fields) => (v) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.entries(fields).every(([key, check]) => check(v[key]));
  const record = (check) => (v) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v).every(check);
  const unique = (items) =>
    new Set(items.map((item) => item.id)).size === items.length;
  const task = object({
    id,
    title: text,
    brief: text,
    type: one("research", "design", "engineering", "quality"),
    priority: one("normal", "high", "critical"),
    status: one("queued", "running", "review", "done"),
    progress: number(0, 100),
    agentId: nullable(one("orion", "mira", "forge", "sentinel")),
    created: number(-100, 1e15),
  });
  window.validateWorkspace = (v) =>
    object({
      tasks: array(task),
      logs: array(
        object({
          id: number(),
          tick: number(),
          time: text,
          kind: one(
            "system",
            "route",
            "work",
            "review",
            "complete",
            "error",
            "done",
          ),
          html: text,
        }),
      ),
      tick: number(),
      sound: bool,
      theme: one("dark", "light"),
      density: one("comfortable", "compact"),
      filter: one("all", "route", "work"),
      pulse: array(number(), 1, 100),
    })(v) && unique(v.tasks);
})();
