// ----- ROOTS -----

const roots = [
  "C", "C♯", "D♭", "D", "D♯", "E♭", "E",
  "F", "F♯", "G♭", "G", "G♯", "A♭", "A",
  "A♯", "B♭", "B"
];

const rootContainer = document.getElementById("rootSelection");

roots.forEach(root => {
  const label = document.createElement("label");
  label.innerHTML = `<input type="checkbox" value="${root}" checked> ${root}`;
  rootContainer.appendChild(label);
});

// ----- QUALITIES -----

const qualities = [
  "",
  "-",
  "7",
  "Δ",
  "-7",
];

const qualityContainer = document.getElementById("qualitySelection");

qualities.forEach(q => {
  const label = document.createElement("label");
  label.innerHTML = `<input type="checkbox" value="${q}" checked> ${q}`;
  qualityContainer.appendChild(label);
});


// ----- STATE -----

let currentChords = [];
let changeFlags = [];
let currentIndex = 0;
let intervalId = null;
let beatCount = 0;

// ----- METRONOME SOUNDS -----

const click = new Audio("click.mp3");
const clickAccent = new Audio("click1.mp3");


// ----- HELPERS -----

function getSelectedRoots() {
  return [...document.querySelectorAll("#rootSelection input:checked")]
    .map(cb => cb.value);
}

function getSelectedQualities() {
  return [...document.querySelectorAll("#qualitySelection input:checked")]
    .map(cb => cb.value);
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomChord() {
  const roots = getSelectedRoots();
  const qualities = getSelectedQualities();

  if (roots.length === 0 || qualities.length === 0) {
    return "—";
  }

  return randomItem(roots) + randomItem(qualities);
}

// ----- DISPLAY -----

function renderChords() {
  const container = document.getElementById("chordContainer");
  container.innerHTML = "";

  currentChords.forEach((chord, index) => {
    const box = document.createElement("div");
    box.classList.add("chord-box");
    if (index === currentIndex) box.classList.add("active");

    const isChecked = changeFlags[index] ? "checked" : "";

    box.innerHTML = `
      <div>${chord}</div>
      <div>
        <label>
          🔀
          <input type="checkbox" data-index="${index}" ${isChecked}>
        </label>
      </div>
    `;

    container.appendChild(box);
  });

  document.querySelectorAll("#chordContainer input").forEach(cb => {
    cb.addEventListener("change", e => {
      const idx = parseInt(e.target.dataset.index);
      changeFlags[idx] = e.target.checked;
    });
  });
}


// ----- PLAY LOGIC -----

function startMetronome() {
  const bpm = parseInt(document.getElementById("bpm").value);
  const interval = (60 / bpm) * 1000;

  beatCount = 0;
  currentIndex = 0;

  intervalId = setInterval(() => {
    beatCount++;

    // Determine beat inside 4/4 bar
    const beatInBar = ((beatCount - 1) % 4) + 1;

    // Play sound
    if (beatInBar === 1) {
      clickAccent.currentTime = 0;
      clickAccent.play();
    } else {
      click.currentTime = 0;
      click.play();
    }

    // Change chord every 4 beats (after finishing previous one)
    if (beatInBar === 1 && beatCount !== 1) {
      advanceChord();
    }

    renderChords();

  }, interval);
}

function advanceChord() {
  // before switching, check if current chord must change
  if (changeFlags[currentIndex]) {
    currentChords[currentIndex] = generateRandomChord();
  }

  currentIndex = (currentIndex + 1) % currentChords.length;
}

function stopMetronome() {
  clearInterval(intervalId);
  intervalId = null;
}

// ----- INIT -----

document.getElementById("playBtn").addEventListener("click", () => {
  stopMetronome();

  const nbChords = parseInt(document.getElementById("nbChords").value);

  // Only regenerate if first time OR number changed
  if (currentChords.length !== nbChords) {
    currentChords = [];
    changeFlags = [];

    for (let i = 0; i < nbChords; i++) {
      currentChords.push(generateRandomChord());
      changeFlags.push(false);
    }
  }

  renderChords();
  startMetronome();
  saveSettings();
  
});

function saveSettings() {
  const bpm = document.getElementById("bpm").value;
  const nbChords = document.getElementById("nbChords").value;
  const rootsSelected = getSelectedRoots();
  const qualitiesSelected = getSelectedQualities();

  const settings = {
    bpm,
    nbChords,
    rootsSelected,
    qualitiesSelected
  };

  localStorage.setItem("chordTrainerSettings", JSON.stringify(settings));
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem("chordTrainerSettings"));
  if (!settings) return;

  document.getElementById("bpm").value = settings.bpm;
  document.getElementById("nbChords").value = settings.nbChords;

  // Set roots
  document.querySelectorAll("#rootSelection input").forEach(cb => {
    cb.checked = settings.rootsSelected.includes(cb.value);
  });

  // Set qualities
  document.querySelectorAll("#qualitySelection input").forEach(cb => {
    cb.checked = settings.qualitiesSelected.includes(cb.value);
  });
}

loadSettings();


document.getElementById("stopBtn").addEventListener("click", stopMetronome);
