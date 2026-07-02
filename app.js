// ==========================================
// 1. CONFIGURATION (BASE DE DONNÉES FINALE)
// ==========================================

const allLocations = [
    { id: 'Lieu1', x: 634.0625, y: 809.5625 },
    { id: 'Lieu2', x: 377.5, y: 779.4375 }, 
    { id: 'Lieu3', x: 496.375, y: 992.4375 },
    { id: 'Lieu4', x: 293.06264472481286, y: 958.6056737754375 },
    { id: 'Lieu5', x: 505.5625, y: 730.3125 },
    { id: 'Lieu6', x: 273.3125, y: 912.1875 },
    { id: 'Lieu7', x: 930.6405894730218, y: 841.7385479362847 },
    { id: 'Lieu8', x: 944.4112590713203, y: 630.8679668762923 },
    { id: 'Lieu9', x: 1047.249507588725, y: 551.226798181108 },
    { id: 'Lieu10', x: 1072.8678913777107, y: 601.7731135589685 },
    { id: 'Lieu11', x: 1019.6200190354904, y: 582.2998689750975 },
    { id: 'Lieu12', x: 1037.2179155741558, y: 152.22015514203198 },
    { id: 'Lieu13', x: 875.5116584116552, y: 375.5173030727776 },
    { id: 'Lieu14', x: 878.4948340752787, y: 431.1085119913018 },
    { id: 'Lieu15', x: 728.6828241093921, y: 428.20462478819366 },
    // On skip le 16 !
    { id: 'Lieu17', x: 631.5622699443798, y: 327.5529679698231 },
    { id: 'Lieu18', x: 482.4032682804576, y: 230.4027768947771 },
    { id: 'Lieu19', x: 662.6477195672688, y: 100.57379001605248 }
];

const maxScorePerRound = 5000;
const totalRounds = 5; // On tire 5 lieux au hasard par partie
const roundTime = 30; // 30 secondes pour trouver

let currentRound = 1;
let totalScore = 0;
let gameLocations = []; 
let marker = null;

let timerInterval;
let waitInterval;
let timeLeft = roundTime;
let transitionTime = 5;
let hasValidated = false;
let isTransitioning = false;

// ==========================================
// 2. PRÉPARATION 360 (PANNELLUM)
// ==========================================

const pannellumScenes = {};
allLocations.forEach(loc => {
    pannellumScenes[loc.id] = {
        "type": "cubemap",
        "cubeMap": [
            `panoramas/${loc.id}/panorama_0.png`,
            `panoramas/${loc.id}/panorama_1.png`,
            `panoramas/${loc.id}/panorama_2.png`,
            `panoramas/${loc.id}/panorama_3.png`,
            `panoramas/${loc.id}/panorama_4.png`,
            `panoramas/${loc.id}/panorama_5.png`
        ]
    };
});

// Mélange des lieux pour chaque nouvelle partie !
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
shuffleArray(allLocations);
gameLocations = allLocations.slice(0, totalRounds); 

const viewer = pannellum.viewer('panorama', {
    "default": {
        "firstScene": gameLocations[0].id,
        "autoLoad": true,
        "showZoomCtrl": false,
        "mouseZoom": true
    },
    "scenes": pannellumScenes
});

// ==========================================
// 3. LA CARTE (LEAFLET)
// ==========================================

const bounds = [[0, 0], [1427, 1427]];

const map = L.map('map', { 
    crs: L.CRS.Simple, 
    minZoom: -5, 
    maxZoom: 4, 
    zoomSnap: 0, 
    zoomDelta: 0.5,
    zoomControl: false, 
    attributionControl: false,
    maxBounds: bounds,         
    maxBoundsViscosity: 1.0    
});

L.imageOverlay('maps/map.png', bounds).addTo(map);
map.fitBounds(bounds);

const gameLayer = L.layerGroup().addTo(map);

const guessBtn = document.getElementById('guess-btn');
const mapWrapper = document.getElementById('map-wrapper');
const timerDisplay = document.getElementById('timer-display');
const msgBox = document.getElementById('waiting-msg');

// 📍 C'est ici que la magie opère ! On garde uniquement l'observer 
// pour la fluidité, mais on a retiré le code qui forçait la carte à se remettre à zéro au survol.
const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize({ pan: false });
});
resizeObserver.observe(document.getElementById('map-container'));


// ==========================================
// 4. ANIMATION DE ROUND & CHRONO
// ==========================================

function announceRound() {
    const announcer = document.getElementById('round-announcer');
    const announcerText = document.getElementById('round-title-text');
    
    // Reset l'animation CSS
    announcerText.style.animation = 'none';
    announcerText.offsetHeight; 
    announcerText.style.animation = null;

    announcerText.innerText = "ROUND " + currentRound;
    announcer.classList.remove('hidden');
    
    map.off('click');
    guessBtn.disabled = true;
    timerDisplay.innerText = roundTime;
    
    setTimeout(() => {
        announcer.classList.add('hidden');
        
        map.invalidateSize(); 
        map.fitBounds(bounds); // La carte se remet à zéro SEULEMENT au début du round !
        
        enableMapClick();
        startTimer();
    }, 2000);
}

function startTimer() {
    timeLeft = roundTime;
    hasValidated = false;
    isTransitioning = false;
    
    timerDisplay.innerText = timeLeft;
    timerDisplay.classList.remove('timer-warning');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;
        
        if (timeLeft <= 5 && !hasValidated) {
            timerDisplay.classList.add('timer-warning');
        }

        if (hasValidated && !isTransitioning) {
            msgBox.innerHTML = `En attente des autres joueurs... (<span id="auto-next-timer">${timeLeft}</span>s)`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.classList.remove('timer-warning');
            
            if (!hasValidated) {
                processRoundResult(); 
            } else {
                startWaitingLobby(); 
            }
        }
    }, 1000);
}

function enableMapClick() {
    map.on('click', function(e) {
        if (hasValidated) return;
        
        if (marker !== null) gameLayer.removeLayer(marker);
        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(gameLayer);
        
        guessBtn.disabled = false;
        guessBtn.innerText = "Valider !";
    });
}

guessBtn.addEventListener('click', () => {
    if(marker && !hasValidated) processRoundResult();
});

// ==========================================
// 5. CINÉMATIQUE DE RÉSULTAT ET SCORE
// ==========================================

function processRoundResult() {
    hasValidated = true; 
    map.off('click'); 
    guessBtn.disabled = true;
    timerDisplay.classList.remove('timer-warning');

    const targetLocation = gameLocations[currentRound - 1];
    let score = 0;
    
    const pointsToFit = [[targetLocation.y, targetLocation.x]];

    if (marker !== null) {
        const clickY = marker.getLatLng().lat;
        const clickX = marker.getLatLng().lng;
        pointsToFit.push([clickY, clickX]); 

        const distance = Math.sqrt(Math.pow(targetLocation.x - clickX, 2) + Math.pow(targetLocation.y - clickY, 2));
        let displayDistance = Math.round(distance);
        
        if (displayDistance <= 2) {
            displayDistance = 0; 
            score = maxScorePerRound; 
        } else {
            score = Math.round(maxScorePerRound - (distance * 3.5)); 
            if (score < 0) score = 0;
        }

        document.getElementById('distanceDisplay').innerText = displayDistance + " blocs";
        L.polyline([[clickY, clickX], [targetLocation.y, targetLocation.x]], {color: '#00B4D8', weight: 3, dashArray: '10, 10'}).addTo(gameLayer);
    } else {
        document.getElementById('distanceDisplay').innerText = "Temps écoulé !";
    }

    totalScore += score;
    document.getElementById('scoreDisplay').innerText = score;
    document.getElementById('header-score').innerText = totalScore;

    L.circleMarker([targetLocation.y, targetLocation.x], {color: '#0A0A0A', fillColor: '#00B4D8', fillOpacity: 1, radius: 8}).addTo(gameLayer);

    document.getElementById('result-overlay').classList.remove('hidden');
    mapWrapper.classList.add('result-mode'); 

    setTimeout(() => {
        map.flyToBounds(pointsToFit, { padding: [60, 60], duration: 1.5 });

        setTimeout(() => {
            document.getElementById('result-modal').classList.remove('hidden');

            if (timeLeft <= 0) {
                startWaitingLobby();
            } else {
                msgBox.innerHTML = `En attente des autres joueurs... (<span id="auto-next-timer">${timeLeft}</span>s)`;
            }
        }, 1500);
    }, 500);
}

// ==========================================
// 6. COMPTE À REBOURS DE TRANSITION (5s)
// ==========================================

function startWaitingLobby() {
    if(isTransitioning) return;
    isTransitioning = true;
    transitionTime = 5;

    function updateMsg() {
        if (currentRound >= totalRounds) {
            msgBox.innerHTML = `Partie terminée ! Fin dans <span id="auto-next-timer">${transitionTime}</span>s...`;
        } else {
            msgBox.innerHTML = `Prochain round dans <span id="auto-next-timer">${transitionTime}</span>s...`;
        }
    }
    
    updateMsg();

    clearInterval(waitInterval);
    waitInterval = setInterval(() => {
        transitionTime--;
        updateMsg();

        if (transitionTime <= 0) {
            clearInterval(waitInterval);
            goToNextRound();
        }
    }, 1000);
}

function goToNextRound() {
    if (currentRound >= totalRounds) {
        location.reload(); 
        return;
    }

    currentRound++;
    document.getElementById('round-display').innerText = currentRound;

    gameLayer.clearLayers();
    marker = null;
    document.getElementById('result-overlay').classList.add('hidden');
    document.getElementById('result-modal').classList.add('hidden');
    mapWrapper.classList.remove('result-mode');
    guessBtn.innerText = "Placer le point";

    setTimeout(() => {
        viewer.loadScene(gameLocations[currentRound - 1].id);
        announceRound();
    }, 500);
}

// Lancement initial
announceRound();
