const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { boot } = require("./harness.cjs");
const key = fs
  .readFileSync(path.join(__dirname, "../app.js"), "utf8")
  .match(/const (?:STORAGE_KEY|STORE|KEY) = "([^"]+)"/)[1];
const fixture = async (t, options) => {
  const h = await boot(options);
  t.after(() => {
    const errors = [...h.errors];
    h.close();
    assert.deepEqual(errors, []);
  });
  return h;
};
const submit = (h, selector) =>
  h
    .$(selector)
    .dispatchEvent(
      new h.window.Event("submit", { bubbles: true, cancelable: true }),
    );
const readBlob = (h, blob) =>
  new Promise((resolve, reject) => {
    const r = new h.window.FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(blob);
  });
async function roundTrip(t, h) {
  await h.wait(450);
  const raw = h.window.localStorage.getItem(key);
  assert.ok(raw, "Interaction should persist workspace data");
  assert.equal(
    h.window.validateWorkspace(JSON.parse(raw)),
    true,
    "Generated state must satisfy its schema",
  );
  const reloaded = await fixture(t, { saved: { [key]: raw } });
  assert.equal(
    reloaded.$("#storage-notice"),
    null,
    "Valid edits must not be discarded on reload",
  );
}
test("routing advances tasks through review to completion with durable state", async (t) => {
  const h = await fixture(t);
  for (let i = 0; i < 28; i++) h.click("#stepButton");
  const state = JSON.parse(h.window.localStorage.getItem(key));
  assert.equal(
    state.tasks.filter((task) => task.status === "done").length,
    state.tasks.length,
  );
  await roundTrip(t, h);
});
test("custom task text cannot inject timeline markup", async (t) => {
  const h = await fixture(t);
  h.click("#newTaskButton");
  h.input("#taskTitle", "<img src=x onerror=alert(1)>");
  h.input("#taskBrief", "Test the review queue");
  submit(h, "#taskForm");
  assert.equal(h.$("#timeline img"), null);
  assert.equal(h.$("#taskDialog").open, false);
  assert.match(h.$("#queuedList").textContent, /img src=x/);
});
