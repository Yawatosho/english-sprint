(() => {
  "use strict";

  const STORAGE_KEY = "als_scores";
  const CHUNK_STORAGE_KEY = "als_chunk_scores";
  const STORAGE_SCHEMA_KEY = "als_scores_schema";
  const STORAGE_SCHEMA = "2";
  const VALID_RATINGS = new Set(["easy", "ok", "hard"]);

  const elements = {
    screens: Array.from(document.querySelectorAll(".screen")),
    home: document.getElementById("home-screen"),
    practice: document.getElementById("practice-screen"),
    completion: document.getElementById("completion-screen"),
    homeButton: document.getElementById("home-button"),
    headerStats: document.getElementById("header-stats"),
    recordTotal: document.getElementById("record-total"),
    recordEasy: document.getElementById("record-easy"),
    recordOk: document.getElementById("record-ok"),
    recordHard: document.getElementById("record-hard"),
    resetProgress: document.getElementById("reset-progress"),
    sentenceSelector: document.getElementById("select-sentences"),
    chunkSelector: document.getElementById("select-chunks"),
    introCopy: document.getElementById("intro-copy"),
    introNote: document.getElementById("intro-note"),
    allModeDescription: document.getElementById("all-mode-description"),
    categorySelect: document.getElementById("category-select"),
    shuffleOption: document.getElementById("shuffle-option"),
    homeMessage: document.getElementById("home-message"),
    sessionName: document.getElementById("session-name"),
    shuffleSession: document.getElementById("shuffle-session"),
    questionCard: document.getElementById("question-card"),
    questionCategory: document.getElementById("question-category"),
    questionCounter: document.getElementById("question-counter"),
    prompt: document.getElementById("practice-prompt"),
    promptLabel: document.getElementById("prompt-label"),
    reveal: document.getElementById("reveal-answer"),
    revealIcon: document.querySelector("#reveal-answer .reveal-icon"),
    revealText: document.querySelector("#reveal-answer .reveal-text"),
    answerPanel: document.getElementById("answer-panel"),
    answerEnglish: document.getElementById("answer-english"),
    answerLabel: document.getElementById("answer-label"),
    chunkExample: document.getElementById("chunk-example"),
    chunkExampleText: document.getElementById("chunk-example-text"),
    answerNoteWrap: document.getElementById("answer-note-wrap"),
    answerNote: document.getElementById("answer-note"),
    audioButton: document.getElementById("audio-button"),
    audioIcon: document.querySelector("#audio-button .audio-icon"),
    audioLabel: document.querySelector("#audio-button .audio-label"),
    audioState: document.querySelector("#audio-button .audio-state"),
    previous: document.getElementById("previous-question"),
    next: document.getElementById("next-question"),
    completionMessage: document.getElementById("completion-message"),
    sessionEasy: document.getElementById("session-easy"),
    sessionOk: document.getElementById("session-ok"),
    sessionHard: document.getElementById("session-hard"),
    sessionSkip: document.getElementById("session-skip"),
    completionNote: document.getElementById("completion-message-note")
  };

  let sentenceProgress = loadProgress();
  let chunkProgress = loadChunkProgress();
  let material = "sentences";
  let progress = sentenceProgress;
  let session = null;
  let currentAudio = null;
  let audioStatus = "idle";

  function currentItems() {
    return material === "chunks" ? CHUNKS : QUESTIONS;
  }

  function sanitiseProgress(value, total = QUESTIONS.length) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    return Object.fromEntries(
      Object.entries(value).filter(([id, rating]) => {
        const numericId = Number(id);
        return Number.isInteger(numericId)
          && numericId >= 1
          && numericId <= total
          && VALID_RATINGS.has(rating);
      })
    );
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const schema = localStorage.getItem(STORAGE_SCHEMA_KEY);

      if (schema !== STORAGE_SCHEMA && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const migrated = {};
        Object.entries(parsed).forEach(([oldIndex, rating]) => {
          const oldNumericIndex = Number(oldIndex);
          if (
            Number.isInteger(oldNumericIndex)
            && oldNumericIndex >= 0
            && oldNumericIndex < QUESTIONS.length
            && VALID_RATINGS.has(rating)
          ) {
            migrated[String(oldNumericIndex + 1)] = rating;
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA);
        return migrated;
      }

      return sanitiseProgress(parsed);
    } catch (error) {
      return {};
    }
  }

  function loadChunkProgress() {
    try {
      return sanitiseProgress(JSON.parse(localStorage.getItem(CHUNK_STORAGE_KEY) || "{}"), CHUNKS.length);
    } catch (error) {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(material === "chunks" ? CHUNK_STORAGE_KEY : STORAGE_KEY, JSON.stringify(progress));
      if (material === "sentences") localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA);
    } catch (error) {
      // The session continues in memory when storage is unavailable.
    }
  }

  function countRatings(ratings) {
    const values = Array.isArray(ratings) ? ratings : Object.values(ratings);
    return {
      easy: values.filter((rating) => rating === "easy").length,
      ok: values.filter((rating) => rating === "ok").length,
      hard: values.filter((rating) => rating === "hard").length,
      skip: values.filter((rating) => rating === "skip").length
    };
  }

  function renderProgress() {
    const counts = countRatings(progress);
    const practiced = Object.keys(progress).length;
    const totalText = `Practiced ${practiced} / ${currentItems().length}`;

    elements.headerStats.textContent = totalText;
    elements.recordTotal.textContent = totalText;
    elements.recordEasy.textContent = counts.easy;
    elements.recordOk.textContent = counts.ok;
    elements.recordHard.textContent = counts.hard;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function showScreen(screen) {
    elements.screens.forEach((candidate) => {
      const isActive = candidate === screen;
      candidate.hidden = !isActive;
      candidate.classList.toggle("is-active", isActive);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showMessage(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  function hideMessage(element) {
    element.hidden = true;
    element.textContent = "";
  }

  function startSession(items, name, mode) {
    if (!items.length) {
      showMessage(elements.homeMessage, "まだ「出なかった」と記録された問題はありません。");
      return;
    }

    hideMessage(elements.homeMessage);
    hideMessage(elements.completionNote);
    session = {
      items: [...items],
      index: 0,
      name,
      mode,
      ratings: new Map()
    };
    elements.sessionName.textContent = name;
    elements.shuffleSession.hidden = mode === "ten";
    showScreen(elements.practice);
    renderQuestion(true);
  }

  function startTen() {
    startSession(shuffle(currentItems()).slice(0, 10), "10問だけ", "ten");
  }

  function startAll() {
    const items = elements.shuffleOption.checked ? shuffle(currentItems()) : [...currentItems()];
    startSession(items, "すべて", "all");
  }

  function startCategory() {
    const category = elements.categorySelect.value;
    const selected = currentItems().filter((question) => question.category === category);
    const items = elements.shuffleOption.checked ? shuffle(selected) : selected;
    startSession(items, category, "category");
  }

  function startHard(messageElement = elements.homeMessage) {
    const selected = currentItems().filter((question) => progress[String(question.id)] === "hard");
    if (!selected.length) {
      showMessage(messageElement, "まだ「出なかった」と記録された問題はありません。");
      return;
    }
    const items = elements.shuffleOption.checked ? shuffle(selected) : selected;
    startSession(items, "苦手だけ", "hard");
  }

  function stopAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
      currentAudio = null;
    }
    audioStatus = "idle";
    renderAudioButton();
  }

  function renderAudioButton() {
    const states = {
      idle: { disabled: true, icon: "▶", label: "Listen", state: "" },
      loading: { disabled: true, icon: "…", label: "音声を確認中", state: "" },
      ready: { disabled: false, icon: "▶", label: "Listen", state: "" },
      playing: { disabled: false, icon: "■", label: "Playing", state: "再生中" },
      unavailable: { disabled: true, icon: "—", label: "音声は準備中です", state: "" }
    };
    const state = states[audioStatus];
    elements.audioButton.disabled = state.disabled;
    elements.audioButton.classList.toggle("is-playing", audioStatus === "playing");
    elements.audioButton.setAttribute("aria-pressed", String(audioStatus === "playing"));
    elements.audioButton.setAttribute(
      "aria-label",
      audioStatus === "playing" ? "例文の音声を最初から再生" : state.label
    );
    elements.audioIcon.textContent = state.icon;
    elements.audioLabel.textContent = state.label;
    elements.audioState.textContent = state.state;
  }

  function prepareAudio() {
    if (!session || currentAudio || audioStatus === "unavailable") return;

    const question = session.items[session.index];
    if (!question.audio) return;
    const audio = new Audio();
    currentAudio = audio;
    audioStatus = "loading";
    renderAudioButton();

    audio.preload = "metadata";
    audio.src = question.audio;

    const markReady = () => {
      if (currentAudio !== audio || audioStatus === "playing") return;
      audioStatus = "ready";
      renderAudioButton();
    };

    const markUnavailable = () => {
      if (currentAudio !== audio) return;
      audioStatus = "unavailable";
      renderAudioButton();
    };

    audio.addEventListener("loadedmetadata", markReady);
    audio.addEventListener("canplay", markReady);
    audio.addEventListener("error", markUnavailable);
    audio.addEventListener("playing", () => {
      if (currentAudio !== audio) return;
      audioStatus = "playing";
      renderAudioButton();
    });
    audio.addEventListener("ended", () => {
      if (currentAudio !== audio) return;
      audioStatus = "ready";
      renderAudioButton();
    });
    audio.load();
  }

  function playAudio() {
    if (!currentAudio || audioStatus === "unavailable" || audioStatus === "loading") return;

    currentAudio.pause();
    currentAudio.currentTime = 0;
    const playRequest = currentAudio.play();
    if (playRequest && typeof playRequest.catch === "function") {
      playRequest.catch(() => {
        if (!currentAudio) return;
        audioStatus = "unavailable";
        renderAudioButton();
      });
    }
  }

  function setAnswerVisible(visible) {
    elements.answerPanel.hidden = !visible;
    elements.reveal.setAttribute("aria-expanded", String(visible));
    elements.reveal.classList.toggle("is-open", visible);
    elements.revealIcon.textContent = visible ? "−" : "＋";
    elements.revealText.textContent = visible ? "例を閉じる" : "例を見る";
    if (visible && session.items[session.index].audio) {
      prepareAudio();
    } else {
      stopAudio();
    }
  }

  function renderQuestion(focusPrompt = false) {
    if (!session) return;

    stopAudio();
    const question = session.items[session.index];
    elements.questionCategory.textContent = question.category;
    elements.questionCounter.textContent = `${session.index + 1} / ${session.items.length}`;
    elements.prompt.textContent = question.ja;
    elements.answerEnglish.textContent = question.en;
    elements.chunkExampleText.textContent = question.example || "";
    elements.chunkExample.hidden = !question.example;
    elements.answerNote.textContent = question.note || "";
    elements.answerNoteWrap.hidden = !question.note;
    elements.audioButton.hidden = !question.audio;
    elements.previous.disabled = session.index === 0;
    elements.next.textContent = session.index === session.items.length - 1 ? "終了 →" : "次へ →";
    setAnswerVisible(false);

    elements.questionCard.classList.remove("question-card--entering");
    void elements.questionCard.offsetWidth;
    elements.questionCard.classList.add("question-card--entering");
    if (focusPrompt) elements.prompt.focus({ preventScroll: true });
  }

  function moveQuestion(direction, recordSkip = false) {
    if (!session) return;
    if (direction > 0 && recordSkip) {
      const question = session.items[session.index];
      if (!session.ratings.has(question.id)) {
        session.ratings.set(question.id, "skip");
      }
    }
    const nextIndex = session.index + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= session.items.length) {
      completeSession();
      return;
    }
    session.index = nextIndex;
    renderQuestion();
  }

  function rateCurrentQuestion(rating) {
    if (!session || !VALID_RATINGS.has(rating)) return;
    const question = session.items[session.index];
    progress[String(question.id)] = rating;
    session.ratings.set(question.id, rating);
    saveProgress();
    renderProgress();
    moveQuestion(1, false);
  }

  function completeSession() {
    if (!session) return;
    stopAudio();
    session.items.forEach((question) => {
      if (!session.ratings.has(question.id)) {
        session.ratings.set(question.id, "skip");
      }
    });
    const counts = countRatings(Array.from(session.ratings.values()));
    elements.completionMessage.textContent = `${session.items.length}問、おつかれさまでした。`;
    elements.sessionEasy.textContent = counts.easy;
    elements.sessionOk.textContent = counts.ok;
    elements.sessionHard.textContent = counts.hard;
    elements.sessionSkip.textContent = counts.skip;
    showScreen(elements.completion);
    document.getElementById("completion-title").focus?.({ preventScroll: true });
  }

  function showHome() {
    stopAudio();
    session = null;
    hideMessage(elements.homeMessage);
    hideMessage(elements.completionNote);
    renderProgress();
    showScreen(elements.home);
  }

  function resetProgress() {
    const materialName = material === "chunks" ? "チャンク" : "文章";
    if (!window.confirm(`${materialName}の学習記録をリセットしますか？`)) return;
    progress = {};
    if (material === "chunks") chunkProgress = progress;
    else sentenceProgress = progress;
    try {
      localStorage.removeItem(material === "chunks" ? CHUNK_STORAGE_KEY : STORAGE_KEY);
      if (material === "sentences") localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA);
    } catch (error) {
      // The in-memory record has still been reset.
    }
    if (session) session.ratings.clear();
    renderProgress();
  }

  function shouldIgnoreShortcut(event) {
    const target = event.target;
    return event.metaKey
      || event.ctrlKey
      || event.altKey
      || target instanceof HTMLAnchorElement
      || target instanceof HTMLButtonElement
      || target instanceof HTMLInputElement
      || target instanceof HTMLSelectElement
      || target instanceof HTMLTextAreaElement
      || target.isContentEditable;
  }

  function populateCategories() {
    elements.categorySelect.replaceChildren();
    const categories = [...new Set(currentItems().map((question) => question.category))];
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      elements.categorySelect.appendChild(option);
    });
  }

  function selectMaterial(nextMaterial) {
    material = nextMaterial;
    progress = material === "chunks" ? chunkProgress : sentenceProgress;
    elements.sentenceSelector.setAttribute("aria-pressed", String(material === "sentences"));
    elements.chunkSelector.setAttribute("aria-pressed", String(material === "chunks"));
    elements.introCopy.textContent = material === "chunks"
      ? "大学図書館やオープンアクセスの話題で使える短い英語のかたまりを練習します。"
      : "大学図書館・オープンアクセス・機関リポジトリについて、短く英語で話す練習です。";
    elements.introNote.textContent = material === "chunks"
      ? "日本語を見て、英語のチャンクを声に出してみましょう。チャンクに音声はありません。"
      : "正解を暗記する必要はありません。まず、自分の英語で声に出してみましょう。";
    elements.allModeDescription.textContent = `全${currentItems().length}問を通して`;
    elements.resetProgress.textContent = material === "chunks"
      ? "チャンクの学習記録をリセット"
      : "文章の学習記録をリセット";
    elements.promptLabel.textContent = material === "chunks" ? "Say this in English." : "Speak this in English.";
    elements.answerLabel.textContent = material === "chunks" ? "English chunk" : "Example answer";
    populateCategories();
    hideMessage(elements.homeMessage);
    renderProgress();
  }

  elements.sentenceSelector.addEventListener("click", () => selectMaterial("sentences"));
  elements.chunkSelector.addEventListener("click", () => selectMaterial("chunks"));
  document.getElementById("start-ten").addEventListener("click", startTen);
  document.getElementById("start-all").addEventListener("click", startAll);
  document.getElementById("start-hard").addEventListener("click", () => startHard());
  document.getElementById("start-category").addEventListener("click", startCategory);
  elements.homeButton.addEventListener("click", showHome);
  document.getElementById("exit-session").addEventListener("click", showHome);
  document.getElementById("completion-home").addEventListener("click", showHome);
  document.getElementById("another-ten").addEventListener("click", startTen);
  document.getElementById("review-hard").addEventListener("click", () => startHard(elements.completionNote));
  elements.resetProgress.addEventListener("click", resetProgress);
  elements.reveal.addEventListener("click", () => {
    setAnswerVisible(elements.answerPanel.hidden);
  });
  elements.audioButton.addEventListener("click", playAudio);
  elements.previous.addEventListener("click", () => moveQuestion(-1));
  elements.next.addEventListener("click", () => moveQuestion(1, true));
  elements.shuffleSession.addEventListener("click", () => {
    if (!session) return;
    session.items = shuffle(session.items);
    session.index = 0;
    renderQuestion();
  });
  document.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => rateCurrentQuestion(button.dataset.rating));
  });

  document.addEventListener("keydown", (event) => {
    if (!session || elements.practice.hidden || shouldIgnoreShortcut(event)) return;
    if (event.code === "Space") {
      event.preventDefault();
      setAnswerVisible(elements.answerPanel.hidden);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveQuestion(1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveQuestion(-1);
    }
  });

  selectMaterial("sentences");
  showHome();
})();
