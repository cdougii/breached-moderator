// Role Configuration
const roles = [
    { name: "Bodyguard", order: 1, instructions: "Place a token of protection on a player's card. This card cannot be tampered with tonight." },
    { name: "Captain", order: 2, instructions: "Look at a player's card and swap it with a card from the centre of the opposite colour." },
    { name: "Scientist", order: 3, instructions: "Look at another player's card to learn their identity. Then return it face down." },
    { name: "Technician", order: 4, instructions: "From the cards in the center, flip a face down card face up and a face up card face down." },
    { name: "Saboteur", order: 5, instructions: "Flip over another player's card, revealing their identity to everyone." },
];

// State Management
let selectedRoles = [];
let nightPhaseRoles = [];
let allNightPhaseRoles = []; // Store all possible roles for filtering
let currentRoleIndex = 0;
let isNightPhaseActive = false;
let activeTeams = { human: true, alien: true }; // Track which teams are active

// Timer Settings
const DEFAULT_SETTINGS = {
    sfxVolume: 1,
    musicVolume: 0.5,
    autoplaySeconds: 30
};

const SETTINGS_STORAGE_KEY = 'breached_demo_settings_v1';

let settings = loadSettings() || { ...DEFAULT_SETTINGS };

let roleTimerSecondsRemaining = settings.autoplaySeconds;
let roleTimerIntervalId = null;
let isTransitioning = false;
let wasTimerRunningBeforeSettings = false;

// Audio Settings
// Put your audio files in: public/assets/audio/
const AUDIO_BASE_PATH = 'assets/audio';
const AUDIO_FILES = {
    nightStart: 'everyone_close_your_eyes_night_start.mp3',
    closeEyes: 'close_your_eyes_end_of_role.mp3',
    nightEnd: 'everyone_wake_up_night_end.mp3',
};

const MUSIC_FILE = 'background_music.mp3';
let backgroundMusicAudio = null;
let audioUnlocked = false;
let audioContext = null;
const cachedAudioElements = new Map();

// DOM Elements
const roleSelectionScreen = document.getElementById('role-selection-screen');
const nightPhaseScreen = document.getElementById('night-phase-screen');
const dayPhaseScreen = document.getElementById('day-phase-screen');
const roleSelectionContainer = document.getElementById('role-selection-container');
const startNightPhaseBtn = document.getElementById('start-night-phase-btn');
const progressIndicator = document.getElementById('progress-indicator');
const roleNameDisplay = document.getElementById('role-name');
const instructionTextDisplay = document.getElementById('instruction-text');
const nextRoleBtn = document.getElementById('next-role-btn');
const endNightPhaseBtn = document.getElementById('end-night-phase-btn');
const startNightPhaseFromDayBtn = document.getElementById('start-night-phase-from-day-btn');
const newGameBtn = document.getElementById('new-game-btn');
const humanTeamToggle = document.getElementById('human-team-toggle');
const alienTeamToggle = document.getElementById('alien-team-toggle');
const roleTimerDisplay = document.getElementById('role-timer');
const roleTeamDisplay = document.getElementById('role-team');
const roleTitleDisplay = document.getElementById('role-title');

// Settings UI
const settingsBtn = document.getElementById('settings-btn');
const settingsModalOverlay = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const sfxVolumeSlider = document.getElementById('sfx-volume');
const musicVolumeSlider = document.getElementById('music-volume');
const autoplaySecondsSlider = document.getElementById('autoplay-seconds');
const sfxVolumeValue = document.getElementById('sfx-volume-value');
const musicVolumeValue = document.getElementById('music-volume-value');
const autoplaySecondsValue = document.getElementById('autoplay-seconds-value');

// Close Eyes overlay
const closeEyesOverlay = document.getElementById('close-eyes-overlay');
const wakeUpOverlay = document.getElementById('wake-up-overlay');

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function saveSettingsToStorage() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
}

function clamp01(n) {
    return Math.max(0, Math.min(1, n));
}

function setVolumeOnAudioElement(audio, volume01) {
    try {
        if (audio) audio.volume = clamp01(volume01);
    } catch {
        // ignore
    }
}

function setCloseEyesVisible(isVisible) {
    if (!closeEyesOverlay) return;
    closeEyesOverlay.classList.toggle('active', isVisible);
    closeEyesOverlay.setAttribute('aria-hidden', String(!isVisible));
}

function setWakeUpVisible(isVisible) {
    if (!wakeUpOverlay) return;
    wakeUpOverlay.classList.toggle('active', isVisible);
    wakeUpOverlay.setAttribute('aria-hidden', String(!isVisible));
}

function updateSettingsUi() {
    if (sfxVolumeSlider) sfxVolumeSlider.value = Math.round(settings.sfxVolume * 100);
    if (musicVolumeSlider) musicVolumeSlider.value = Math.round(settings.musicVolume * 100);
    if (autoplaySecondsSlider) autoplaySecondsSlider.value = settings.autoplaySeconds;

    if (sfxVolumeValue) sfxVolumeValue.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
    if (musicVolumeValue) musicVolumeValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
    if (autoplaySecondsValue) autoplaySecondsValue.textContent = `${settings.autoplaySeconds}s`;
}

function updateSettingsUiFromSliders() {
    if (sfxVolumeSlider && sfxVolumeValue) sfxVolumeValue.textContent = `${Math.round(Number(sfxVolumeSlider.value))}%`;
    if (musicVolumeSlider && musicVolumeValue) musicVolumeValue.textContent = `${Math.round(Number(musicVolumeSlider.value))}%`;
    if (autoplaySecondsSlider && autoplaySecondsValue) autoplaySecondsValue.textContent = `${Number(autoplaySecondsSlider.value)}s`;
}

function applySettingsFromUi() {
    const sfx = Number(sfxVolumeSlider?.value ?? 100) / 100;
    const music = Number(musicVolumeSlider?.value ?? 50) / 100;
    const autoplaySeconds = Number(autoplaySecondsSlider?.value ?? 30);

    settings = {
        sfxVolume: clamp01(sfx),
        musicVolume: clamp01(music),
        autoplaySeconds: autoplaySeconds
    };

    saveSettingsToStorage();

    if (backgroundMusicAudio) {
        setVolumeOnAudioElement(backgroundMusicAudio, settings.musicVolume);
    }
}

function openSettingsModal() {
    if (!settingsModalOverlay) return;

    // Pause autoplay countdown while settings are open.
    wasTimerRunningBeforeSettings = roleTimerIntervalId !== null;
    if (wasTimerRunningBeforeSettings) {
        clearRoleTimer();
    }

    settingsModalOverlay.classList.add('active');
    settingsModalOverlay.setAttribute('aria-hidden', 'false');
}

function closeSettingsModal() {
    if (!settingsModalOverlay) return;
    settingsModalOverlay.classList.remove('active');
    settingsModalOverlay.setAttribute('aria-hidden', 'true');

    // Resume countdown if it was running.
    if (wasTimerRunningBeforeSettings && isNightPhaseActive && !isTransitioning) {
        resumeRoleTimerWithoutReset();
    }
}

function buildAudioUrl(filename) {
    return `${AUDIO_BASE_PATH}/${filename}`;
}

function sanitizeRoleNameForFilename(roleName) {
    return roleName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

function getRoleAudioCandidates(roleName, team) {
    const roleSlug = sanitizeRoleNameForFilename(roleName);
    const teamSlug = String(team || '').trim().toLowerCase();

    // Prefer team-specific, then generic.
    // Example: role_bodyguard_human.mp3 then role_bodyguard.mp3
    const candidates = [];
    if (teamSlug) {
        candidates.push(`role_${roleSlug}_${teamSlug}.mp3`);
    }
    candidates.push(`role_${roleSlug}.mp3`);
    return candidates;
}

function getCachedAudioElement(filename) {
    const key = filename.toLowerCase();
    if (cachedAudioElements.has(key)) {
        return cachedAudioElements.get(key);
    }

    const audio = new Audio(buildAudioUrl(filename));
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.volume = clamp01(settings.sfxVolume);
    cachedAudioElements.set(key, audio);
    return audio;
}

async function playAudioFile(filename) {
    if (!filename) return false;

    const candidates = [];
    candidates.push(filename);

    // If the user accidentally saved as "file.mp3.mp3", support it.
    if (filename.toLowerCase().endsWith('.mp3')) {
        candidates.push(`${filename}.mp3`);
    }
    // If it is already double-extended, also try the single extension.
    if (filename.toLowerCase().endsWith('.mp3.mp3')) {
        candidates.push(filename.slice(0, -4)); // drop the trailing ".mp3"
    }

    try {
        for (const candidate of candidates) {
            const audio = getCachedAudioElement(candidate);
            setVolumeOnAudioElement(audio, settings.sfxVolume);
            audio.pause();
            audio.currentTime = 0;

            try {
                await new Promise((resolve, reject) => {
                    audio.onended = resolve;
                    audio.onerror = () => reject(new Error('audio load error'));

                    const playPromise = audio.play();
                    if (playPromise && typeof playPromise.then === 'function') {
                        playPromise.catch(reject);
                    }
                });

                return true;
            } catch (err) {
                console.log('playAudioFile failed for', candidate, err);
                // Try the next candidate file name.
            }
        }

        return false;
    } catch (err) {
        console.log('playAudioFile unexpected failure', err);
        return false;
    }
}

async function playFirstAvailableAudio(filenames) {
    for (const f of filenames) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await playAudioFile(f);
        if (ok) return true;
    }
    return false;
}

function stopBackgroundMusic() {
    if (backgroundMusicAudio) {
        try {
            backgroundMusicAudio.pause();
            backgroundMusicAudio.currentTime = 0;
        } catch {
            // ignore
        }
    }
}

async function maybePlayBackgroundMusic() {
    // Only attempt playback if the user has set a non-zero music volume.
    if (settings.musicVolume <= 0) return;


    try {
        if (!backgroundMusicAudio) {
            backgroundMusicAudio = new Audio(buildAudioUrl(MUSIC_FILE));
            backgroundMusicAudio.loop = true;
        }

        setVolumeOnAudioElement(backgroundMusicAudio, settings.musicVolume);
        const playPromise = backgroundMusicAudio.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {});
        }
    } catch {
        // ignore
    }
}

// Initialize the app
function initializeApp() {
    initializeRoles();
    renderRoleSelection();
    setupEventListeners();
    updateSettingsUi();
}

// Some mobile browsers block audio playback unless initiated by a user gesture.
// Unlock audio playback by performing a one-time, silent user-initiated play
// when the user first interacts with the page (touch/click). This ensures
// later timer-driven audio.play() calls are allowed.
function unlockAudioOnUserGesture() {
    if (audioUnlocked) return;

    // Try to resume or create an AudioContext (helps iOS/Safari)
    try {
        if (!audioContext) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioContext = new AC();
        }

        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }

        // Play a tiny silent buffer to fully unlock the audio system
        if (audioContext) {
            try {
                const buffer = audioContext.createBuffer(1, 1, 22050);
                const src = audioContext.createBufferSource();
                src.buffer = buffer;
                src.connect(audioContext.destination);
                src.start(0);
                try { src.stop(); } catch {}
            } catch (e) {
                // ignore
            }
        }

        // Fallback: play/pause a few cached HTMLAudioElements silently.
        try {
            const filesToUnlock = [AUDIO_FILES.nightStart, AUDIO_FILES.closeEyes, AUDIO_FILES.nightEnd];
            for (const file of filesToUnlock) {
                try {
                    const a = getCachedAudioElement(file);
                    a.volume = 0;
                    a.pause();
                    a.currentTime = 0;
                    const p = a.play();
                    if (p && typeof p.then === 'function') {
                        p.then(() => { try { a.pause(); a.currentTime = 0; } catch {} }).catch(() => { try { a.pause(); a.currentTime = 0; } catch {} });
                    }
                } catch {
                    // ignore individual file unlock failures
                }
            }
        } catch {}

        audioUnlocked = true;
        console.log('Audio unlocked via user gesture');
    } catch (err) {
        console.log('Audio unlock attempt failed', err);
    }

    // Remove listeners after first use
    try { document.removeEventListener('touchstart', unlockAudioOnUserGesture, { passive: true }); } catch {}
    try { document.removeEventListener('click', unlockAudioOnUserGesture); } catch {}
}

// Also register early in case the user interacts before setupEventListeners runs
try { document.addEventListener('touchstart', unlockAudioOnUserGesture, { passive: true }); } catch {}
try { document.addEventListener('click', unlockAudioOnUserGesture); } catch {}

// Initialize roles (can be expanded to load from JSON or API)
function initializeRoles() {
    // Roles are already defined above
    // This function can be used to fetch roles from external source if needed
    console.log('Roles initialized:', roles.length);
}

// Render role selection UI
function renderRoleSelection() {
    roleSelectionContainer.innerHTML = '';
    
    roles.forEach((role, index) => {

        // 🔥 CHANGE: label is now the container
        const roleCheckbox = document.createElement('label');
        roleCheckbox.className = 'role-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `role-${index}`;
        checkbox.value = role.name;
        checkbox.addEventListener('change', handleRoleSelection);

        const text = document.createElement('span');
        text.className = 'role-label';
        text.textContent = role.name;

        roleCheckbox.appendChild(checkbox);
        roleCheckbox.appendChild(text);

        roleSelectionContainer.appendChild(roleCheckbox);
    });
}

// Handle role selection checkbox changes
function handleRoleSelection(event) {
    const roleName = event.target.value;
    const isChecked = event.target.checked;
    
    if (isChecked) {
        if (!selectedRoles.includes(roleName)) {
            selectedRoles.push(roleName);
        }
    } else {
        selectedRoles = selectedRoles.filter(name => name !== roleName);
    }
    
    // Enable/disable start button based on selection
    startNightPhaseBtn.disabled = selectedRoles.length === 0;
}

// Start night phase
async function startNightPhase() {
    if (selectedRoles.length === 0) {
        return;
    }
    
    // Filter roles to only include selected ones and sort by order
    const selectedRoleData = roles
        .filter(role => selectedRoles.includes(role.name))
        .sort((a, b) => a.order - b.order);
    
    // Create all night phase roles: alternate Human and Alien for each role
    // Store this for filtering later
    allNightPhaseRoles = [];
    const teams = ['Human', 'Alien'];
    
    selectedRoleData.forEach(role => {
        teams.forEach(team => {
            allNightPhaseRoles.push({
                name: role.name,
                team: team,
                order: role.order,
                instructions: role.instructions
            });
        });
    });
    
    // Filter based on active teams (both active by default on first start)
    filterNightPhaseRoles();
    
    currentRoleIndex = 0;
    isNightPhaseActive = true;
    
    // Switch screens
    roleSelectionScreen.classList.remove('active');
    nightPhaseScreen.classList.add('active');
    
    // Night start voice over
    setCloseEyesVisible(true);
    await playAudioFile(AUDIO_FILES.nightStart);
    setCloseEyesVisible(false);

    // Optional background music
    await maybePlayBackgroundMusic();

    // Show first role
    showCurrentRole();
}

// Filter night phase roles based on active teams
// Always includes Captain regardless of team selection
function filterNightPhaseRoles() {
    nightPhaseRoles = allNightPhaseRoles.filter(role => {
        const isCaptain = role.name === 'Captain';
        const isHuman = role.team === 'Human' && activeTeams.human;
        const isAlien = role.team === 'Alien' && activeTeams.alien;
        
        // Always include Captain, or include if team is active
        return isCaptain || isHuman || isAlien;
    });
}

function setTeam(container, team) {
    container.classList.remove('has-human-team', 'has-alien-team');
    container.classList.add(`has-${team.toLowerCase()}-team`);
}

// Show current role and instructions
async function showCurrentRole() {
    if (currentRoleIndex >= nightPhaseRoles.length) {
        return;
    }
    
    const currentRole = nightPhaseRoles[currentRoleIndex];
    
    // Update progress indicator
    progressIndicator.textContent = `Role ${currentRoleIndex + 1} of ${nightPhaseRoles.length}`;
    
    // Update role name with team indicator
    roleTeamDisplay.textContent = currentRole.team;
    roleTitleDisplay.textContent = currentRole.name;
    
    // Update role display container with team class
    const roleDisplayContainer = document.getElementById('current-role-display');
    setTeam(roleDisplayContainer, currentRole.team);
    
    // Update instructions with team context
    instructionTextDisplay.textContent = currentRole.instructions;
    
    // Show/hide buttons based on position
    if (currentRoleIndex === nightPhaseRoles.length - 1) {
        // Last role
        nextRoleBtn.style.display = 'none';
        endNightPhaseBtn.style.display = 'block';
    } else {
        // Not last role
        nextRoleBtn.style.display = 'block';
        endNightPhaseBtn.style.display = 'none';
    }

    // Role voice over (team-specific preferred, then generic)
    await playFirstAvailableAudio(
        getRoleAudioCandidates(currentRole.name, currentRole.team)
    );

    // Start the timer
    startRoleTimer();
}

function clearRoleTimer() {
    if (roleTimerIntervalId !== null) {
        clearInterval(roleTimerIntervalId);
        roleTimerIntervalId = null;
    }
}

function renderRoleTimer() {
    if (!roleTimerDisplay) return;
    roleTimerDisplay.textContent = `AUTO-ADVANCE IN: ${roleTimerSecondsRemaining}s`;
}

function startRoleTimer() {
    clearRoleTimer();

    roleTimerSecondsRemaining = settings.autoplaySeconds;
    renderRoleTimer();

    roleTimerIntervalId = setInterval(() => {
        roleTimerSecondsRemaining = Math.max(0, roleTimerSecondsRemaining - 1);
        renderRoleTimer();

        if (roleTimerSecondsRemaining <= 0) {
            clearRoleTimer();
            goToNextStep();
        }
    }, 1000);
}

function resumeRoleTimerWithoutReset() {
    clearRoleTimer();
    renderRoleTimer();

    roleTimerIntervalId = setInterval(() => {
        roleTimerSecondsRemaining = Math.max(0, roleTimerSecondsRemaining - 1);
        renderRoleTimer();

        if (roleTimerSecondsRemaining <= 0) {
            clearRoleTimer();
            goToNextStep();
        }
    }, 1000);
}

async function goToNextStep() {
    if (isTransitioning) return;
    isTransitioning = true;

    // Avoid double-advancing while audio/transition is running.
    if (nextRoleBtn) nextRoleBtn.disabled = true;
    if (endNightPhaseBtn) endNightPhaseBtn.disabled = true;

    // Between roles: prompt to close eyes (show card for the duration).
    setCloseEyesVisible(true);
    await playAudioFile(AUDIO_FILES.closeEyes);
    setCloseEyesVisible(false);

    // If we're at the last role, end the night phase; otherwise advance.
    if (currentRoleIndex >= nightPhaseRoles.length - 1) {
        setWakeUpVisible(true);
        await playAudioFile(AUDIO_FILES.nightEnd);
        setWakeUpVisible(false);
        endNightPhase();
        if (nextRoleBtn) nextRoleBtn.disabled = false;
        if (endNightPhaseBtn) endNightPhaseBtn.disabled = false;
        isTransitioning = false;
        return;
    }

    currentRoleIndex++;
    showCurrentRole();
    if (nextRoleBtn) nextRoleBtn.disabled = false;
    if (endNightPhaseBtn) endNightPhaseBtn.disabled = false;
    isTransitioning = false;
}

// Advance to next role
function nextRole() {
    if (isTransitioning) return;
    clearRoleTimer();
    goToNextStep();
}

// End night phase and go to day phase
function endNightPhase() {
    clearRoleTimer();
    isNightPhaseActive = false;
    currentRoleIndex = 0;
    
    // Don't reset selectedRoles or allNightPhaseRoles - keep them for looping
    // Reset role index for next night phase
    currentRoleIndex = 0;
    
    // Update toggles to reflect current active teams
    humanTeamToggle.checked = activeTeams.human;
    alienTeamToggle.checked = activeTeams.alien;
    
    // Switch to day phase screen
    nightPhaseScreen.classList.remove('active');
    dayPhaseScreen.classList.add('active');

    // Stop music during day.
    stopBackgroundMusic();
}

async function endNightPhaseFromButton() {
    clearRoleTimer();
    // Use the same “end of role” + “wake up” sequence, then transition to day phase.
    await goToNextStep();
}

// Start night phase from day phase (loops back)
async function startNightPhaseFromDay() {
    // Update active teams from toggles
    activeTeams.human = humanTeamToggle.checked;
    activeTeams.alien = alienTeamToggle.checked;
    
    // Ensure at least one team is selected
    if (!activeTeams.human && !activeTeams.alien) {
        // If both unchecked, default to both
        activeTeams.human = true;
        activeTeams.alien = true;
        humanTeamToggle.checked = true;
        alienTeamToggle.checked = true;
    }
    
    // Filter roles based on active teams
    filterNightPhaseRoles();
    
    // Reset to first role
    currentRoleIndex = 0;
    isNightPhaseActive = true;
    
    // Switch to night phase screen
    dayPhaseScreen.classList.remove('active');
    nightPhaseScreen.classList.add('active');
    
    // Night start voice over
    setCloseEyesVisible(true);
    await playAudioFile(AUDIO_FILES.nightStart);
    setCloseEyesVisible(false);

    // Optional background music
    await maybePlayBackgroundMusic();

    // Show first role
    showCurrentRole();
}

// New game - return to role selection
function newGame() {
    isNightPhaseActive = false;
    currentRoleIndex = 0;
    nightPhaseRoles = [];
    allNightPhaseRoles = [];
    
    // Reset selections
    selectedRoles = [];
    
    // Reset team toggles
    activeTeams = { human: true, alien: true };
    humanTeamToggle.checked = true;
    alienTeamToggle.checked = true;

    stopBackgroundMusic();
    
    // Switch to role selection screen
    dayPhaseScreen.classList.remove('active');
    nightPhaseScreen.classList.remove('active');
    roleSelectionScreen.classList.add('active');
    
    // Reset UI
    renderRoleSelection();
    startNightPhaseBtn.disabled = true;
}

// Handle team toggle changes
function handleTeamToggle(event) {
    const isHuman = event.target.id === 'human-team-toggle';
    const isAlien = event.target.id === 'alien-team-toggle';
    
    // Prevent unchecking if it's the last checked toggle
    if (!event.target.checked) {
        const otherChecked = isHuman ? alienTeamToggle.checked : humanTeamToggle.checked;
        if (!otherChecked) {
            // Re-check this toggle if the other is also unchecked
            event.target.checked = true;
            return;
        }
    }
    
    // Update active teams
    if (isHuman) {
        activeTeams.human = event.target.checked;
    } else if (isAlien) {
        activeTeams.alien = event.target.checked;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Register a one-time user gesture to unlock audio on mobile browsers
    try { document.addEventListener('touchstart', unlockAudioOnUserGesture, { passive: true }); } catch {}
    try { document.addEventListener('click', unlockAudioOnUserGesture); } catch {}
    startNightPhaseBtn.addEventListener('click', startNightPhase);
    nextRoleBtn.addEventListener('click', nextRole);
    endNightPhaseBtn.addEventListener('click', endNightPhaseFromButton);
    startNightPhaseFromDayBtn.addEventListener('click', startNightPhaseFromDay);
    newGameBtn.addEventListener('click', newGame);
    humanTeamToggle.addEventListener('change', handleTeamToggle);
    alienTeamToggle.addEventListener('change', handleTeamToggle);

    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            applySettingsFromUi();
            closeSettingsModal();

            // If a night phase is running, reset the current countdown to the new autoplay seconds.
            if (isNightPhaseActive && !isTransitioning && roleTimerIntervalId !== null) {
                startRoleTimer();
            } else if (isNightPhaseActive && !isTransitioning && wasTimerRunningBeforeSettings) {
                startRoleTimer();
            }
        });
    }

    // Update displayed values live while dragging.
    if (sfxVolumeSlider) sfxVolumeSlider.addEventListener('input', updateSettingsUiFromSliders);
    if (musicVolumeSlider) musicVolumeSlider.addEventListener('input', updateSettingsUiFromSliders);
    if (autoplaySecondsSlider) autoplaySecondsSlider.addEventListener('input', updateSettingsUiFromSliders);
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
