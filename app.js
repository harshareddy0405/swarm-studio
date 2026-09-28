(() => {
  "use strict";

  const STORAGE_KEY = "swarm-studio-v1";
  const STATUS_ORDER = ["queued", "running", "review", "done"];
  const TYPE_LABELS = {
    research: "Research",
    design: "Design",
    engineering: "Engineering",
    quality: "Quality",
  };
  const STATUS_LABELS = {
    queued: "Queued",
    running: "In flight",
    review: "Review",
    done: "Resolved",
  };

  const seedAgents = [
    {
      id: "orion",
      name: "Orion",
      role: "Research strategist",
      initials: "OR",
      color: "#73e7d2",
      skills: ["research", "quality"],
    },
    {
      id: "mira",
      name: "Mira",
      role: "Product designer",
      initials: "MI",
      color: "#b9a0ff",
      skills: ["design", "research"],
    },
    {
      id: "forge",
      name: "Forge",
      role: "Systems builder",
      initials: "FO",
      color: "#ffc766",
      skills: ["engineering", "design"],
    },
    {
      id: "sentinel",
      name: "Sentinel",
      role: "Quality reviewer",
      initials: "SE",
      color: "#ff7f8c",
      skills: ["quality", "engineering"],
    },
  ];

  const seedTasks = [
    {
      id: "T-104",
      title: "Map competitor narratives",
      brief:
        "Distil positioning patterns from six launch pages and flag whitespace.",
      type: "research",
      priority: "high",
      status: "queued",
      progress: 0,
      agentId: null,
      created: 1,
    },
    {
      id: "T-105",
      title: "Design proof-point cards",
      brief:
        "Create a modular story pattern for evidence, metrics, and customer quotes.",
      type: "design",
      priority: "normal",
      status: "queued",
      progress: 0,
      agentId: null,
      created: 2,
    },
    {
      id: "T-106",
      title: "Instrument launch signals",
      brief: "Define the event taxonomy and a compact launch health payload.",
      type: "engineering",
      priority: "critical",
      status: "queued",
      progress: 0,
      agentId: null,
      created: 3,
    },
    {
      id: "T-103",
      title: "Synthesize interview notes",
      brief:
        "Cluster thirteen interview fragments into needs, anxieties, and triggers.",
      type: "research",
      priority: "high",
      status: "running",
      progress: 48,
      agentId: "orion",
      created: 0,
    },
    {
      id: "T-102",
      title: "Validate message hierarchy",
      brief:
        "Check the draft narrative against the messaging rubric and audience intent.",
      type: "quality",
      priority: "normal",
      status: "review",
      progress: 100,
      agentId: "sentinel",
      reviewAge: 0,
      created: -1,
    },
    {
      id: "T-101",
      title: "Frame launch hypothesis",
      brief:
        "Translate the product thesis into one measurable launch hypothesis.",
      type: "research",
      priority: "high",
      status: "done",
      progress: 100,
      agentId: "orion",
      created: -3,
      latency: 7,
    },
    {
      id: "T-100",
      title: "Define audience segments",
      brief:
        "Create a practical segmentation model for the first campaign cohort.",
      type: "research",
      priority: "normal",
      status: "done",
      progress: 100,
      agentId: "orion",
      created: -4,
      latency: 9,
    },
  ];

  const seedLogs = [
    {
      id: 1,
      tick: 0,
      time: "00:00:00",
      kind: "system",
      html: "Mission loaded with <strong>4 specialist agents</strong>.",
    },
    {
      id: 2,
      tick: 0,
      time: "00:00:01",
      kind: "route",
      html: "Router matched <strong>Synthesize interview notes</strong> to Orion.",
    },
    {
      id: 3,
      tick: 0,
      time: "00:00:02",
      kind: "work",
      html: "Sentinel opened a quality gate for <strong>message hierarchy</strong>.",
    },
  ];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value));

  let storageAvailable = true;
  let state = loadState();
  let timer = null;
  let selectedTaskId = null;
  let selectedAgentId = null;
  let draggedTaskId = null;
  let audioContext = null;

  function initialState() {
    return {
      tasks: clone(seedTasks),
      agents: clone(seedAgents),
      logs: clone(seedLogs),
      tick: 0,
      running: false,
      sound: false,
      theme: "dark",
      density: "comfortable",
      filter: "all",
      pulse: [11, 18, 15, 29, 25, 35, 22, 41, 33, 38, 28, 46, 36, 49],
    };
  }

  function loadState() {
    const fallback = initialState();
    try {
      const raw = WorkspaceStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.logs))
        return fallback;
      return {
        ...fallback,
        ...parsed,
        agents: clone(seedAgents),
        running: false,
      };
    } catch (error) {
      storageAvailable = false;
      return fallback;
    }
  }

  function persist() {
    if (!storageAvailable) return;
    try {
      WorkspaceStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks: state.tasks,
          logs: state.logs.slice(0, 80),
          tick: state.tick,
          sound: state.sound,
          theme: state.theme,
          density: state.density,
          filter: state.filter,
          pulse: state.pulse,
        }),
      );
    } catch (error) {
      storageAvailable = false;
      toast("Progress will stay in this tab; browser storage is unavailable.");
    }
  }

  function render() {
    document.documentElement.dataset.theme = state.theme;
    renderControls();
    renderMetrics();
    renderRoster();
    renderBoard();
    renderTimeline();
    renderPulse();
  }

  function renderControls() {
    const runButton = $("#runButton");
    runButton.classList.toggle("running", state.running);
    runButton.setAttribute("aria-pressed", String(state.running));
    $("#runLabel").textContent = state.running ? "Pause swarm" : "Run swarm";
    $("#systemState").classList.toggle("running", state.running);
    $("#systemState").lastChild.textContent = state.running
      ? " RUNNING"
      : " STANDBY";
    $("#soundButton").setAttribute("aria-pressed", String(state.sound));
    $("#soundButton").textContent = state.sound ? "♫" : "♪";
    $("#themeButton").textContent = state.theme === "dark" ? "☼" : "◐";
    $$(".view-switcher button").forEach((button) => {
      const active = button.dataset.density === state.density;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("#taskBoard").classList.toggle("compact", state.density === "compact");
  }

  function renderMetrics() {
    const done = state.tasks.filter((task) => task.status === "done");
    const active = state.tasks.filter(
      (task) => task.status === "running",
    ).length;
    const completion = state.tasks.length
      ? Math.round((done.length / state.tasks.length) * 100)
      : 0;
    const avgLatency = done.length
      ? Math.round(
          done.reduce((sum, task) => sum + (task.latency || 8), 0) /
            done.length,
        )
      : null;
    const syntheticTokens = state.tick * 684 + done.length * 1240;
    const efficiency = Math.min(
      99,
      Math.round(62 + done.length * 4 + active * 3),
    );
    $("#progressLabel").textContent = `${completion}%`;
    $("#progressBar").style.width = `${completion}%`;
    $("#throughputMetric").textContent = done.length;
    $("#latencyMetric").textContent = avgLatency ? `${avgLatency}s` : "—";
    $("#tokenMetric").textContent =
      syntheticTokens > 999
        ? `${(syntheticTokens / 1000).toFixed(1)}k`
        : syntheticTokens;
    $("#efficiencyMetric").textContent = `${efficiency}%`;
    $("#tickLabel").textContent = `tick ${String(state.tick).padStart(3, "0")}`;
  }

  function agentLoad(agentId) {
    return state.tasks.filter(
      (task) =>
        task.agentId === agentId && ["running", "review"].includes(task.status),
    ).length;
  }

  function renderRoster() {
    const roster = $("#agentRoster");
    roster.innerHTML = "";
    state.agents.forEach((agent) => {
      const load = agentLoad(agent.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `agent-card${selectedAgentId === agent.id ? " selected" : ""}`;
      card.setAttribute(
        "aria-label",
        `${agent.name}, ${agent.role}, ${load ? "busy" : "available"}`,
      );
      card.innerHTML = `
        <span class="agent-avatar" style="background:${agent.color}">${agent.initials}</span>
        <span class="agent-info"><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.role)}</small></span>
        <span class="agent-load" role="img" data-level="${Math.min(4, load + 1)}" aria-label="${load} active tasks"><i></i><i></i><i></i><i></i></span>
        <span class="agent-status ${load ? "busy" : ""}"></span>`;
      card.addEventListener("click", () => selectAgent(agent.id));
      roster.append(card);
    });
    $("#agentCount").textContent = `${state.agents.length} online`;
  }

  function renderBoard() {
    STATUS_ORDER.forEach((status) => {
      const list = $(`#${status}List`);
      list.innerHTML = "";
      const tasks = state.tasks
        .filter((task) => task.status === status)
        .sort(
          (a, b) =>
            priorityRank(b.priority) - priorityRank(a.priority) ||
            a.created - b.created,
        );
      $(`#${status}Count`).textContent = tasks.length;
      if (!tasks.length) {
        const copy =
          status === "done"
            ? "Resolved work will collect here."
            : status === "queued"
              ? "Queue clear. Add a new task."
              : "No work at this stage.";
        list.innerHTML = `<div class="empty-state"><span>${status === "done" ? "✓" : "·"}</span>${copy}</div>`;
      }
      tasks.forEach((task) => list.append(createTaskCard(task)));
    });
  }

  function createTaskCard(task) {
    const fragment = $("#taskTemplate").content.cloneNode(true);
    const card = $(".task-card", fragment);
    card.dataset.taskId = task.id;
    card.setAttribute(
      "aria-label",
      `${task.title}, ${STATUS_LABELS[task.status]}, ${task.progress}%`,
    );
    if (selectedAgentId && task.agentId !== selectedAgentId)
      card.style.opacity = ".28";
    $(".task-type", card).textContent = TYPE_LABELS[task.type] || task.type;
    const priority = $(".task-priority", card);
    priority.textContent = task.priority;
    priority.classList.add(task.priority);
    $("h4", card).textContent = task.title;
    $(".task-brief", card).textContent = task.brief || "No brief supplied.";
    const agent = state.agents.find((item) => item.id === task.agentId);
    $(".task-agent", card).innerHTML = agent
      ? `<i style="background:${agent.color}">${agent.initials}</i>${escapeHtml(agent.name)}`
      : "◇ auto-route";
    $(".task-progress", card).textContent =
      task.status === "done" ? "complete" : `${task.progress}%`;
    $(".micro-progress i", card).style.width = `${task.progress}%`;
    card.addEventListener("click", () => openTaskDetail(task.id));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTaskDetail(task.id);
      }
    });
    card.addEventListener("dragstart", () => {
      draggedTaskId = task.id;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      draggedTaskId = null;
      card.classList.remove("dragging");
      $$(".task-list").forEach((list) => list.classList.remove("drag-over"));
    });
    return fragment;
  }

  function renderTimeline() {
    const timeline = $("#timeline");
    timeline.innerHTML = "";
    const visible = state.logs
      .filter((event) => state.filter === "all" || event.kind === state.filter)
      .slice(0, 28);
    if (!visible.length) {
      timeline.innerHTML =
        '<li><time>—</time><span class="event-dot"></span><span>No events match this filter.</span></li>';
      return;
    }
    visible.forEach((event) => {
      const item = document.createElement("li");
      item.dataset.kind = event.kind;
      const safeLog = escapeHtml(event.html)
        .replaceAll("&lt;strong&gt;", "<strong>")
        .replaceAll("&lt;/strong&gt;", "</strong>");
      item.innerHTML = `<time>${escapeHtml(event.time)}</time><span class="event-dot"></span><span>${safeLog}</span>`;
      timeline.append(item);
    });
  }

  function renderPulse() {
    const points = state.pulse.slice(-24);
    const width = 640;
    const height = 54;
    const max = Math.max(...points, 55);
    const coords = points.map((value, index) => [
      points.length === 1 ? 0 : (index / (points.length - 1)) * width,
      height - (value / max) * (height - 9) - 4,
    ]);
    const line = coords
      .map(
        ([x, y], index) =>
          `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(" ");
    const fill = `${line} L${width},${height} L0,${height} Z`;
    $(".pulse-line").setAttribute("d", line);
    $(".pulse-fill").setAttribute("d", fill);
  }

  function toggleRun(force) {
    state.running = typeof force === "boolean" ? force : !state.running;
    if (state.running) {
      timer = window.setInterval(simulationStep, 1250);
      addLog(
        "system",
        "Swarm resumed. The router is evaluating <strong>capacity and skill fit</strong>.",
      );
      tone(520, 0.04);
    } else {
      window.clearInterval(timer);
      timer = null;
      addLog(
        "system",
        "Swarm paused. Board state is <strong>preserved locally</strong>.",
      );
      tone(300, 0.035);
    }
    persist();
    render();
  }

  function simulationStep() {
    state.tick += 1;
    let meaningfulEvent = false;

    state.tasks
      .filter((task) => task.status === "running")
      .forEach((task) => {
        const gain = 13 + ((state.tick + numericId(task.id)) % 11);
        task.progress = Math.min(100, task.progress + gain);
        if (task.progress >= 100) {
          task.status = "review";
          task.reviewAge = 0;
          addLog(
            "work",
            `<strong>${escapeHtml(task.title)}</strong> entered the quality gate.`,
          );
          meaningfulEvent = true;
          tone(660, 0.04);
        }
      });

    state.tasks
      .filter((task) => task.status === "review")
      .forEach((task) => {
        task.reviewAge = (task.reviewAge || 0) + 1;
        if (task.reviewAge >= 3) {
          task.status = "done";
          task.latency = Math.max(4, state.tick - task.created);
          addLog(
            "work",
            `<strong>${escapeHtml(task.title)}</strong> passed review and was resolved.`,
          );
          meaningfulEvent = true;
          tone(820, 0.055);
        }
      });

    const capacity = state.agents.length * 2;
    const inFlight = state.tasks.filter(
      (task) => task.status === "running",
    ).length;
    const queued = state.tasks
      .filter((task) => task.status === "queued")
      .sort(
        (a, b) =>
          priorityRank(b.priority) - priorityRank(a.priority) ||
          a.created - b.created,
      );
    if (queued.length && inFlight < capacity && state.tick % 2 === 1) {
      const task = queued[0];
      const agent = bestAgent(task);
      task.agentId = agent.id;
      task.status = "running";
      task.progress = Math.max(6, task.progress);
      addLog(
        "route",
        `Router assigned <strong>${escapeHtml(task.title)}</strong> to ${escapeHtml(agent.name)} (${TYPE_LABELS[task.type].toLowerCase()} affinity).`,
      );
      $("#routingNote").innerHTML =
        `<span>◎</span><p><strong>${escapeHtml(agent.name)} won the route.</strong><br>${TYPE_LABELS[task.type]} affinity + ${4 - Math.min(3, agentLoad(agent.id))}/4 available capacity.</p>`;
      meaningfulEvent = true;
      tone(460, 0.025);
    }

    const active = state.tasks.filter((task) =>
      ["running", "review"].includes(task.status),
    ).length;
    state.pulse.push(Math.min(54, 12 + active * 7 + ((state.tick * 9) % 14)));
    state.pulse = state.pulse.slice(-24);
    persist();
    render();

    if (!state.tasks.some((task) => task.status !== "done")) {
      toggleRun(false);
      toast("Mission complete — every task cleared the quality gate.");
    } else if (!meaningfulEvent && state.tick % 4 === 0) {
      addLog(
        "work",
        `Agents advanced <strong>${active} active task${active === 1 ? "" : "s"}</strong>.`,
      );
      persist();
      renderTimeline();
    }
  }

  function bestAgent(task) {
    return [...state.agents].sort((a, b) => {
      const scoreA =
        (a.skills.includes(task.type) ? 10 : 0) - agentLoad(a.id) * 3;
      const scoreB =
        (b.skills.includes(task.type) ? 10 : 0) - agentLoad(b.id) * 3;
      return scoreB - scoreA || a.name.localeCompare(b.name);
    })[0];
  }

  function moveTask(taskId, status, source = "manual") {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || !STATUS_ORDER.includes(status) || task.status === status)
      return;
    const previous = task.status;
    task.status = status;
    if (status === "queued") {
      task.progress = 0;
      task.agentId = null;
    }
    if (status === "running") {
      task.agentId = task.agentId || bestAgent(task).id;
      task.progress = Math.max(8, Math.min(task.progress, 92));
    }
    if (status === "review") {
      task.agentId = task.agentId || bestAgent(task).id;
      task.progress = 100;
      task.reviewAge = 0;
    }
    if (status === "done") {
      task.progress = 100;
      task.latency = task.latency || 8;
    }
    addLog(
      "route",
      `<strong>${escapeHtml(task.title)}</strong> moved from ${STATUS_LABELS[previous]} to ${STATUS_LABELS[status]} ${source === "manual" ? "by operator" : ""}.`,
    );
    persist();
    render();
    tone(410, 0.025);
  }

  function selectAgent(agentId) {
    selectedAgentId = selectedAgentId === agentId ? null : agentId;
    const agent = state.agents.find((item) => item.id === agentId);
    if (selectedAgentId) {
      const count = state.tasks.filter(
        (task) => task.agentId === agentId,
      ).length;
      $("#routingNote").innerHTML =
        `<span>◈</span><p><strong>Inspecting ${escapeHtml(agent.name)}.</strong><br>${count} assigned task${count === 1 ? "" : "s"}; click again to clear the focus.</p>`;
    }
    renderRoster();
    renderBoard();
  }

  function openTaskDetail(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    selectedTaskId = taskId;
    const agent = state.agents.find((item) => item.id === task.agentId);
    $("#detailContent").innerHTML = `
      <div class="detail-banner"><p>${escapeHtml(task.id)} · ${TYPE_LABELS[task.type]}</p><h2>${escapeHtml(task.title)}</h2></div>
      <p class="detail-brief">${escapeHtml(task.brief || "No brief supplied for this task.")}</p>
      <div class="detail-grid">
        <div><span>Status</span><strong>${STATUS_LABELS[task.status]}</strong></div>
        <div><span>Priority</span><strong>${titleCase(task.priority)}</strong></div>
        <div><span>Owner</span><strong>${agent ? escapeHtml(agent.name) : "Auto-route"}</strong></div>
        <div><span>Progress</span><strong>${task.progress}%</strong></div>
      </div>`;
    $("#detailDialog").showModal();
  }

  function createTask(event) {
    event.preventDefault();
    const title = $("#taskTitle").value.trim();
    if (!title) {
      $("#taskTitle").focus();
      return;
    }
    const nextNumber =
      Math.max(106, ...state.tasks.map((task) => numericId(task.id))) + 1;
    const id = `T-${String(nextNumber).padStart(3, "0")}`;
    state.tasks.push({
      id,
      title,
      brief:
        $("#taskBrief").value.trim() ||
        "Operator-created task awaiting a detailed brief.",
      type: $("#taskType").value,
      priority: $("#taskPriority").value,
      status: "queued",
      progress: 0,
      agentId: null,
      created: state.tick + Date.now() / 1e13,
    });
    addLog(
      "system",
      `<strong>${escapeHtml(title)}</strong> entered the mission queue.`,
    );
    $("#taskDialog").close();
    $("#taskForm").reset();
    persist();
    render();
    toast(`${title} queued for routing.`);
    tone(560, 0.03);
  }

  function deleteSelectedTask() {
    const task = state.tasks.find((item) => item.id === selectedTaskId);
    if (!task) return;
    state.tasks = state.tasks.filter((item) => item.id !== selectedTaskId);
    addLog(
      "system",
      `<strong>${escapeHtml(task.title)}</strong> was removed by the operator.`,
    );
    $("#detailDialog").close();
    selectedTaskId = null;
    persist();
    render();
    toast("Task removed from the mission.");
  }

  function resetDemo() {
    if (state.running) {
      window.clearInterval(timer);
      timer = null;
    }
    const preferences = {
      theme: state.theme,
      sound: state.sound,
      density: state.density,
    };
    state = { ...initialState(), ...preferences };
    selectedAgentId = null;
    persist();
    render();
    toast("Demo restored to its seeded mission.");
    tone(330, 0.04);
  }

  function exportLog() {
    const payload = {
      exportedAt: new Date().toISOString(),
      disclaimer:
        "Browser-only deterministic simulation; no real agents or model calls.",
      tick: state.tick,
      agents: state.agents.map(({ id, name, role, skills }) => ({
        id,
        name,
        role,
        skills,
      })),
      tasks: state.tasks,
      timeline: state.logs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `swarm-studio-run-${String(state.tick).padStart(3, "0")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Simulation log exported as JSON.");
  }

  function addLog(kind, html) {
    const elapsed = state.tick * 2 + state.logs.length;
    const time = `00:${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    state.logs.unshift({
      id: Date.now() + Math.random(),
      tick: state.tick,
      time,
      kind,
      html,
    });
    state.logs = state.logs.slice(0, 80);
  }

  function toast(message) {
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    $("#toastRegion").append(item);
    window.setTimeout(() => {
      item.classList.add("out");
      window.setTimeout(() => item.remove(), 220);
    }, 2800);
  }

  function tone(frequency, duration) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.025, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration,
      );
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      state.sound = false;
    }
  }

  function priorityRank(priority) {
    return { normal: 1, high: 2, critical: 3 }[priority] || 0;
  }
  function numericId(id) {
    return Number(String(id).replace(/\D/g, "")) || 0;
  }
  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function escapeHtml(value) {
    return String(value).replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char],
    );
  }

  function bindEvents() {
    $("#runButton").addEventListener("click", () => toggleRun());
    $("#stepButton").addEventListener("click", () => {
      if (!state.running) simulationStep();
      else toast("Pause the swarm before stepping manually.");
    });
    $("#resetButton").addEventListener("click", resetDemo);
    $("#newTaskButton").addEventListener("click", () => {
      $("#taskDialog").showModal();
      $("#taskTitle").focus();
    });
    $("#taskForm").addEventListener("submit", createTask);
    $$(".close-dialog").forEach((button) =>
      button.addEventListener("click", () => $("#taskDialog").close()),
    );
    $("#deleteTaskButton").addEventListener("click", deleteSelectedTask);
    $(".close-detail").addEventListener("click", () =>
      $("#detailDialog").close(),
    );
    $("#aboutButton").addEventListener("click", () =>
      $("#aboutDialog").showModal(),
    );
    $$(".close-about").forEach((button) =>
      button.addEventListener("click", () => $("#aboutDialog").close()),
    );
    $("#exportButton").addEventListener("click", exportLog);
    $("#themeButton").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      persist();
      render();
    });
    $("#soundButton").addEventListener("click", () => {
      state.sound = !state.sound;
      persist();
      renderControls();
      if (state.sound) {
        tone(620, 0.04);
        toast("Subtle interface sounds enabled.");
      }
    });
    $$(".view-switcher button").forEach((button) =>
      button.addEventListener("click", () => {
        state.density = button.dataset.density;
        persist();
        renderControls();
      }),
    );
    $$(".filter-group button").forEach((button) =>
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        $$(".filter-group button").forEach((item) =>
          item.classList.toggle("active", item === button),
        );
        persist();
        renderTimeline();
      }),
    );
    $$(".task-list").forEach((list) => {
      list.addEventListener("dragover", (event) => {
        event.preventDefault();
        list.classList.add("drag-over");
      });
      list.addEventListener("dragleave", () =>
        list.classList.remove("drag-over"),
      );
      list.addEventListener("drop", (event) => {
        event.preventDefault();
        list.classList.remove("drag-over");
        if (draggedTaskId) moveTask(draggedTaskId, list.dataset.dropzone);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.target.matches("input, textarea, select") || $("dialog[open]"))
        return;
      if (event.code === "Space") {
        event.preventDefault();
        toggleRun();
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        $("#taskDialog").showModal();
        $("#taskTitle").focus();
      }
      if (event.key.toLowerCase() === "r") resetDemo();
    });
    $$("dialog").forEach((dialog) =>
      dialog.addEventListener("click", (event) => {
        const rect = dialog.getBoundingClientRect();
        const outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        if (outside) dialog.close();
      }),
    );
  }

  bindEvents();
  render();
  $$(".filter-group button").forEach((button) =>
    button.classList.toggle("active", button.dataset.filter === state.filter),
  );
  if (!storageAvailable)
    window.setTimeout(
      () => toast("Local storage is unavailable; this session is temporary."),
      600,
    );
})();
