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

    // How many beats have elapsed since start
    const beatsElapsed = Math.floor((audioCtx.currentTime - startTime) / secondsPerBeat);


    // Beat inside 4/4 bar
    const beatInBar = beatsElapsed % 4;
    const isAccent = beatInBar === 0;

    // Play metronome click
    playClick(isAccent ? clickAccentBuffer : clickBuffer, nextBeatTime);

    // Compute which chord should be active
    const chordIndex = Math.floor(beatsElapsed / 4) % currentChords.length;

    // Only update DOM if chord actually changed
    if (currentIndex !== chordIndex) {

      // Randomize previous chord if needed (only when moving to new chord)
      const prevChordIndex =
        (chordIndex - 1 + currentChords.length) % currentChords.length;

      if (changeFlags[prevChordIndex]) {
        currentChords[prevChordIndex] = generateRandomChord();
      }

      currentIndex = chordIndex;
      renderChords();
    }

    nextBeatTime += secondsPerBeat;
  }

  metronomeTimer = requestAnimationFrame(scheduler);
}


function startMetronome() {
  if (!clickBuffer || !clickAccentBuffer) return;

  bpm = parseInt(document.getElementById("bpm").value);
  scheduler();
}


function stopMetronome() {
  cancelAnimationFrame(metronomeTimer);
  metronomeTimer = null;
}

// ----- SAVE / LOAD SETTINGS -----
function saveSettings() {
  const bpm = document.getElementById("bpm").value;
  const nbChords = document.getElementById("nbChords").value;
  const roots = [...document.querySelectorAll("#rootSelection input:checked")].map(cb => cb.value);
  const qualities = [...document.querySelectorAll("#qualitySelection input:checked")].map(cb => cb.value);
  const changeFlagsJson = JSON.stringify(changeFlags);

  localStorage.setItem("chordTrainerSettings", JSON.stringify({
    bpm, 
    nbChords, 
    roots, 
    qualities, 
    changeFlags
  }));

}
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("chordTrainerSettings"));
  if (!saved) return;

  document.getElementById("bpm").value = saved.bpm;
  document.getElementById("nbChords").value = saved.nbChords;

  // Restore roots
  document.querySelectorAll("#rootSelection input").forEach(cb => {
    cb.checked = saved.roots.includes(cb.value);
  });

  // Restore qualities
  document.querySelectorAll("#qualitySelection input").forEach(cb => {
    cb.checked = saved.qualities.includes(cb.value);
  });

  // Restore changeFlags
  if (saved.changeFlags) {
    changeFlags = saved.changeFlags;
  }
}

// Call on page load
loadSettings();


// ----- PLAY / STOP BUTTONS -----
document.getElementById("playBtn").addEventListener("click", async () => {
  if (audioCtx.state === "suspended") await audioCtx.resume();

  stopMetronome();

  saveSettings();

  const nbChords = parseInt(document.getElementById("nbChords").value);

  if (currentChords.length !== nbChords) {
    currentChords = [];

    // Only recreate changeFlags if size mismatch
    if (!changeFlags || changeFlags.length !== nbChords) {
      changeFlags = new Array(nbChords).fill(false);
    }

    for (let i = 0; i < nbChords; i++) {
      currentChords.push(generateRandomChord());
    }
  }


  currentIndex = 0;
  renderChords();

  // ✅ Initialize startTime for AudioContext-based tracking
  startTime = audioCtx.currentTime;
  
  nextBeatTime = audioCtx.currentTime + 0.1;
  startMetronome();
});

document.addEventListener("keydown", (e) => {
  // Only trigger on spacebar
  if (e.code === "Space") {
    e.preventDefault(); // prevent page scrolling

    const playBtn = document.getElementById("playBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (metronomeTimer) {
      // Metronome is running → stop it
      stopBtn.click();
    } else {
      // Metronome is stopped → start it
      playBtn.click();
    }
  }
});



document.getElementById("bpm").addEventListener("change", saveSettings);
document.getElementById("nbChords").addEventListener("change", saveSettings);

document.getElementById("stopBtn").addEventListener("click", stopMetronome);
