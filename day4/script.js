const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

function updateCounts() {
  const text = noteText.value;
  const characterCount = text.length;

  const words = text.trim() === ""
    ? []
    : text.trim().split(/\s+/);

  const numberOfWords = words.length;

  charCount.textContent = `${characterCount} / 200 characters`;
  wordCount.textContent = `${numberOfWords} words`;

  charCount.classList.remove("warning", "over");

  if (characterCount > 200) {
    charCount.classList.add("over");
  } else if (characterCount > 180) {
    charCount.classList.add("warning");
  }
}

function clearNote() {
  noteText.value = "";
  updateCounts();
  localStorage.removeItem("noteDraft");
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("noteDraft", noteText.value);
});

clearBtn.addEventListener("click", () => {
  clearNote();
});

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";

  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Restore saved draft
const savedDraft = localStorage.getItem("noteDraft");

if (savedDraft !== null) {
  noteText.value = savedDraft;
}

// Restore saved theme
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "Light mode";
} else {
  themeToggle.textContent = "Dark mode";
}

updateCounts();
