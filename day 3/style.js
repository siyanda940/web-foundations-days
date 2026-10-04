let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. Search notes
function searchNotes(word) {
  return notes.filter(note =>
    note.text.toLowerCase().includes(word.toLowerCase())
  );
}

// Test searchNotes
console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("pizza"));
// Expected: []


// 2. Find longest note
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > longest.text.length) {
      longest = notes[i];
    }
  }

  return longest;
}

// Test longestNote
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }


// Test longestNote with an empty array
let originalNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = originalNotes;


// 3. Count notes by category
function countByCategory() {
  let counts = {};

  for (let note of notes) {
    if (counts[note.category] === undefined) {
      counts[note.category] = 0;
    }

    counts[note.category]++;
  }

  return counts;
}

// Test countByCategory
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

console.log(countByCategory().work);
// Expected: 1


// 4. Get summary
function getSummary() {
  let counts = countByCategory();
  let noteWord = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

// Test getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

console.log(getSummary().includes("5 notes"));
// Expected: true


// 5. Check for duplicates
function isDuplicate(text) {
  let cleanedText = text.trim().toLowerCase();

  return notes.some(note =>
    note.text.trim().toLowerCase() === cleanedText
  );
}

// Test isDuplicate
console.log(isDuplicate("  CALL MUM  "));
// Expected: true

console.log(isDuplicate("Go to the gym"));
// Expected: false


// 6. Add a note
function addNote(text, category) {
  if (text.length < 1 || text.length > 200) {
    console.log("Note must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Note is a duplicate.");
    return false;
  }

  if (!["personal", "work", "study"].includes(category)) {
    console.log("Invalid category.");
    return false;
  }

  let newNote = {
    id: notes.length + 1,
    text: text,
    category: category
  };

  notes.push(newNote);

  console.log("Note added successfully.");
  return true;
}

// Test addNote - normal case
console.log(addNote("Walk the dog", "personal"));
// Expected: Note added successfully. / true

// Test addNote - duplicate
console.log(addNote("  call mum  ", "personal"));
// Expected: Note is a duplicate. / false
