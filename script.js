/* ==========================================================
   script.js - Shared JavaScript for index.html and app.html
   Part 1: Team photo fallback (index.html)
   Part 2: Dictionary search using the Free Dictionary API (app.html)
   ========================================================== */

/* ----------------------------------------------------------
   PART 1: Hide broken team photos so the initials placeholder shows
   ---------------------------------------------------------- */
document.querySelectorAll(".avatar img").forEach(function (img) {
  // If the image file is missing or fails to load, hide it.
  img.addEventListener("error", function () {
    img.style.display = "none";
  });
});

/* ----------------------------------------------------------
   PART 2: Dictionary app
   Only runs when the search form exists (i.e. on app.html).
   ---------------------------------------------------------- */
const form = document.getElementById("search-form");

if (form) {
  // API endpoint format: BASE_URL + word
  const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

  // Grab the page elements we need
  const input = document.getElementById("word-input");
  const button = document.getElementById("search-btn");
  const loading = document.getElementById("loading");
  const messageBox = document.getElementById("message");
  const resultsBox = document.getElementById("results");

  // --- Small helper functions to show/hide parts of the page ---
  function showLoading(isLoading) {
    loading.classList.toggle("show", isLoading);
    button.disabled = isLoading; // prevent double clicks while loading
  }

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = "message show " + type; // type: "error" or "info"
  }

  function clearMessage() {
    messageBox.className = "message";
    messageBox.textContent = "";
  }

  function clearResults() {
    resultsBox.hidden = true;
    resultsBox.innerHTML = "";
  }

  // --- Main search function ---
  async function searchWord(word) {
    clearMessage();
    clearResults();

    // 1. Handle empty input
    if (word === "") {
      showMessage("Please type a word before searching.", "info");
      return;
    }

    // Only letters, apostrophes, hyphens and spaces are expected
    if (!/^[A-Za-z][A-Za-z' -]*$/.test(word)) {
      showMessage("Please enter a valid English word (letters only).", "info");
      return;
    }

    showLoading(true);

    try {
      // 2. Request data from the API (encodeURIComponent keeps the URL safe)
      const response = await fetch(API_URL + encodeURIComponent(word));

      // 3. Word not found (API returns HTTP 404)
      if (response.status === 404) {
        showMessage('Sorry, we could not find "' + word + '". Check the spelling and try again.', "error");
        return;
      }

      // 4. Other API errors (500, 429, etc.)
      if (!response.ok) {
        showMessage("The dictionary service returned an error (code " + response.status + "). Please try again later.", "error");
        return;
      }

      // 5. Success: convert the response to JavaScript data and show it
      const data = await response.json();
      displayResults(data);
    } catch (error) {
      // 6. Network failure (no internet, blocked request, etc.)
      showMessage("Could not reach the dictionary. Please check your internet connection and try again.", "error");
    } finally {
      // Always hide the loading indicator when done
      showLoading(false);
    }
  }

  // --- Build the results on the page ---
  // We use textContent (not innerHTML) for API data, which is safer.
  function displayResults(data) {
    const entry = data[0]; // the first entry holds the main word info

    // Word + phonetic spelling + audio
    const header = document.createElement("div");
    header.className = "word-header";

    const title = document.createElement("h2");
    title.className = "word-title";
    title.textContent = entry.word;
    header.appendChild(title);

    // Find a phonetic text: entry.phonetic, or the first phonetics item with text
    let phoneticText = entry.phonetic || "";
    let audioUrl = "";
    (entry.phonetics || []).forEach(function (p) {
      if (!phoneticText && p.text) phoneticText = p.text;
      if (!audioUrl && p.audio) audioUrl = p.audio;
    });

    if (phoneticText) {
      const ph = document.createElement("span");
      ph.className = "phonetic";
      ph.textContent = phoneticText;
      header.appendChild(ph);
    }

    if (audioUrl) {
      const audioBtn = document.createElement("button");
      audioBtn.type = "button";
      audioBtn.className = "audio-btn";
      audioBtn.textContent = "\u{1F50A} Listen";
      audioBtn.addEventListener("click", function () {
        new Audio(audioUrl).play().catch(function () {
          showMessage("Sorry, the audio could not be played.", "error");
        });
      });
      header.appendChild(audioBtn);
    }

    resultsBox.appendChild(header);

    // Combine meanings from all returned entries
    let meaningCount = 0;
    data.forEach(function (item) {
      (item.meanings || []).forEach(function (meaning) {
        resultsBox.appendChild(buildMeaning(meaning));
        meaningCount++;
      });
    });

    if (meaningCount === 0) {
      const none = document.createElement("p");
      none.textContent = "No definitions were provided for this word.";
      resultsBox.appendChild(none);
    }

    // Source link (if provided by the API)
    if (entry.sourceUrls && entry.sourceUrls.length > 0) {
      const src = document.createElement("p");
      src.className = "source";
      src.append("Source: ");
      const link = document.createElement("a");
      link.href = entry.sourceUrls[0];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = entry.sourceUrls[0];
      src.appendChild(link);
      resultsBox.appendChild(src);
    }

    resultsBox.hidden = false;
  }

  // Build one "part of speech" block with definitions, examples, synonyms
  function buildMeaning(meaning) {
    const block = document.createElement("div");
    block.className = "meaning";

    const pos = document.createElement("span");
    pos.className = "pos";
    pos.textContent = meaning.partOfSpeech || "unknown";
    block.appendChild(pos);

    const list = document.createElement("ol");
    list.className = "definitions";

    (meaning.definitions || []).forEach(function (def) {
      const li = document.createElement("li");
      li.textContent = def.definition;

      // Example sentence (only if the API provides one)
      if (def.example) {
        const ex = document.createElement("p");
        ex.className = "example";
        ex.textContent = "“" + def.example + "”";
        li.appendChild(ex);
      }
      list.appendChild(li);
    });
    block.appendChild(list);

    // Synonyms (only if provided) - clicking one searches for it
    if (meaning.synonyms && meaning.synonyms.length > 0) {
      const syn = document.createElement("div");
      syn.className = "synonyms";
      const label = document.createElement("strong");
      label.textContent = "Synonyms:";
      syn.appendChild(label);

      meaning.synonyms.slice(0, 10).forEach(function (word) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = word;
        chip.addEventListener("click", function () {
          input.value = word;
          searchWord(word);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        syn.appendChild(chip);
      });
      block.appendChild(syn);
    }

    return block;
  }

  // --- Events ---
  // Submitting the form handles BOTH the Search button and the Enter key.
  form.addEventListener("submit", function (event) {
    event.preventDefault(); // stop the page from reloading
    searchWord(input.value.trim());
  });
}
