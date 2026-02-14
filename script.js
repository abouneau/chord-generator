// ----- ROOTS -----
const roots = [
  "C", "C♯", "D♭", "D", "D♯", "E♭", "E",
  "F", "F#", "G♭", "G", "G♯", "A♭", "A",
  "A♯", "B♭", "B"
];

const rootContainer = document.getElementById("rootSelection");
roots.forEach(root => {
  const label = document.createElement("label");
  label.innerHTML = `<input type="checkbox" value="${root}" checked> ${root}`;
  rootContainer.appendChild(label);
});

// ----- QUALITIES -----
const qualities = ["", "-", "7", "Δ", "-7"];
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
let startTime = 0; // when the metronome/play started


// ----- WEB AUDIO METRONOME -----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let clickBuffer, clickAccentBuffer;
let nextBeatTime = 0;
let beatInBar = 0;
let metronomeTimer = null;
let bpm = 90;

// Load click sounds
async function loadClicks() {
  async function loadBuffer(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  }

  clickBuffer = await loadBuffer("click.mp3");
  clickAccentBuffer = await loadBuffer("click1.mp3");
}
loadClicks();

// Play buffer at precise time
function playClick(buffer, time) {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(time);
}

// ----- CHORD LOGIC -----
function getSelectedRoots() {
  return [...document.querySelectorAll("#rootSelection input:checked")].map(cb => cb.value);
}
function getSelectedQualities() {
  return [...document.querySelectorAll("#qualitySelection input:checked")].map(cb => cb.value);
}
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function generateRandomChord() {
  const roots = getSelectedRoots();
  const qualities = getSelectedQualities();
  if (roots.length === 0 || qualities.length === 0) return "—";
  return randomItem(roots) + randomItem(qualities);
}
function advanceChord() {
  if (changeFlags[currentIndex]) {
    currentChords[currentIndex] = generateRandomChord();
  }
  currentIndex = (currentIndex + 1) % currentChords.length;
}

// ----- RENDER CHORDS -----
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

// ----- METRONOME SCHEDULER -----
const scheduleAheadTime = 0.1; // seconds

function scheduler() {
  const secondsPerBeat = 60 / bpm;

  while (nextBeatTime < audioCtx.currentTime + scheduleAheadTime) {
    // Play click
    const beatsElapsed = Math.floor((nextBeatTime - startTime) / secondsPerBeat);
    const beatInBar = beatsElapsed % 4;
    const isAccent = beatInBar === 0;

    playClick(isAccent ? clickAccentBuffer : clickBuffer, nextBeatTime);

    // ✅ Compute which chord should be highlighted
    const chordIndex = Math.floor(beatsElapsed / 4) % currentChords.length;
    currentIndex = chordIndex;

    // ✅ Randomize previous chord when leaving it
    const prevChordIndex = (chordIndex - 1 + currentChords.length) % currentChords.length;
    if (isAccent && changeFlags[prevChordIndex]) {
      currentChords[prevChordIndex] = generateRandomChord();
    }

    renderChords();

    nextBeatTime += secondsPerBeat;
  }

  metronomeTimer = requestAnimationFrame(scheduler);
}






function startMetronome() {
  if (!clickBuffer || !clickAccentBuffer) return;

  bpm = parseInt(document.getElementById("bpm").value);
  nextBeatTime = audioCtx.currentTime + 0.1;
  beatInBar = 0;

  scheduler();
}

function stopMetronome() {
  cancelAnimationFrame(metronomeTimer);
  metronomeTimer = null;
}

// ----- PLAY / STOP BUTTONS -----
document.getElementById("playBtn").addEventListener("click", async () => {
  if (audioCtx.state === "suspended") await audioCtx.resume();

  stopMetronome();

  const nbChords = parseInt(document.getElementById("nbChords").value);

  if (currentChords.length !== nbChords) {
    currentChords = [];
    changeFlags = [];
    for (let i = 0; i < nbChords; i++) {
      currentChords.push(generateRandomChord());
      changeFlags.push(false);
    }
  }

  currentIndex = 0;
  beatInChord = 0;
  renderChords();

  // ✅ Initialize startTime for AudioContext-based tracking
  startTime = audioCtx.currentTime;

  nextBeatTime = audioCtx.currentTime + 0.1;
  startMetronome();
});



document.getElementById("stopBtn").addEventListener("click", stopMetronome);
