// Role Configuration
const roles = [
    { name: "Bodyguard", order: 1, instructions: "Bodyguard: Select a player to protect tonight. This player cannot be eliminated." },
    { name: "Captain", order: 2, instructions: "Captain: Choose a player to investigate. You will learn their alignment." },
    { name: "Scientist", order: 3, instructions: "Scientist: Select a player to analyze. You will receive information about their role." },
    { name: "Technician", order: 4, instructions: "Technician: Choose a player to repair or modify. Your action will affect their abilities." },
    { name: "Saboteur", order: 5, instructions: "Saboteur: Select a player to sabotage. This will disrupt their night action." },
];

// State Management
let selectedRoles = [];
let nightPhaseRoles = [];
let allNightPhaseRoles = []; // Store all possible roles for filtering
let currentRoleIndex = 0;
let isNightPhaseActive = false;
let activeTeams = { human: true, alien: true }; // Track which teams are active

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

// Initialize the app
function initializeApp() {
    initializeRoles();
    renderRoleSelection();
    setupEventListeners();
}

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
        const roleCheckbox = document.createElement('div');
        roleCheckbox.className = 'role-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `role-${index}`;
        checkbox.value = role.name;
        checkbox.addEventListener('change', handleRoleSelection);
        
        const label = document.createElement('label');
        label.className = 'role-label';
        label.htmlFor = `role-${index}`;
        label.textContent = role.name;
        
        roleCheckbox.appendChild(checkbox);
        roleCheckbox.appendChild(label);
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
function startNightPhase() {
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

// Show current role and instructions
function showCurrentRole() {
    if (currentRoleIndex >= nightPhaseRoles.length) {
        return;
    }
    
    const currentRole = nightPhaseRoles[currentRoleIndex];
    
    // Update progress indicator
    progressIndicator.textContent = `Role ${currentRoleIndex + 1} of ${nightPhaseRoles.length}`;
    
    // Update role name with team indicator
    roleNameDisplay.textContent = `${currentRole.name} - ${currentRole.team}`;
    
    // Add team class for styling
    roleNameDisplay.className = 'role-name';
    roleNameDisplay.classList.add(`team-${currentRole.team.toLowerCase()}`);
    
    // Update role display container with team class
    const roleDisplayContainer = document.getElementById('current-role-display');
    roleDisplayContainer.className = 'current-role-display';
    roleDisplayContainer.classList.add(`has-${currentRole.team.toLowerCase()}-team`);
    
    // Update instructions with team context
    instructionTextDisplay.textContent = `[${currentRole.team} Team]\n\n${currentRole.instructions}`;
    
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
}

// Advance to next role
function nextRole() {
    if (currentRoleIndex < nightPhaseRoles.length - 1) {
        currentRoleIndex++;
        showCurrentRole();
    }
}

// End night phase and go to day phase
function endNightPhase() {
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
}

// Start night phase from day phase (loops back)
function startNightPhaseFromDay() {
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
    startNightPhaseBtn.addEventListener('click', startNightPhase);
    nextRoleBtn.addEventListener('click', nextRole);
    endNightPhaseBtn.addEventListener('click', endNightPhase);
    startNightPhaseFromDayBtn.addEventListener('click', startNightPhaseFromDay);
    newGameBtn.addEventListener('click', newGame);
    humanTeamToggle.addEventListener('change', handleTeamToggle);
    alienTeamToggle.addEventListener('change', handleTeamToggle);
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
