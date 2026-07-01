// ==========================================
// 1. CONFIGURATION
// ==========================================

const allLocations = [
    { id: 'Lieu1', x: 665.5, y: 556.625 }, 
    { id: 'Lieu2', x: 500, y: 500 }, // Mets tes vrais points ici !
    { id: 'Lieu3', x: 500, y: 500 },
    { id: 'Lieu4', x: 500, y: 500 },
    { id: 'Lieu5', x: 500, y: 500 },
    { id: 'Lieu6', x: 500, y: 500 }
];

const maxScorePerRound = 5000;
const totalRounds = 5;
const roundTime = 30; // Chrono

let currentRound = 1;
let totalScore = 0;
let gameLocations = []; 
let marker = null;
let timerInterval;
let timeLeft = roundTime;

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

const map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, maxZoom: 3, zoomControl: false, attributionControl: false });
const bounds = [[0, 0], [1000, 1000]];
L.imageOverlay('maps/map.png', bounds).addTo(map);
map.fitBounds(bounds);

const gameLayer = L.layerGroup().addTo(map);

const guessBtn = document.getElementById('guess-btn');
const mapWrapper = document.getElementById('map-wrapper');
const timerDisplay = document.getElementById('timer-display');

// ==========================================
// 4. CHRONO ET CLICS
// ==========================================

function startTimer() {
    timeLeft = roundTime;
    timerDisplay.innerText = timeLeft;
    timerDisplay.classList.remove('timer-warning');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;
        
        if (timeLeft <= 5) timerDisplay.classList.add('timer-warning');
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            validateRound(); 
        }
    }, 1000);
}

function enableMapClick() {
    map.on('click', function(e) {
        if (marker !== null) gameLayer.removeLayer(marker);
        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(gameLayer);
        
        guessBtn.disabled = false;
        guessBtn.innerText = "Valider !";
    });
}

guessBtn.addEventListener('click', () => {
    if(marker) validateRound();
});

// ==========================================
// 5. CINÉMATIQUE DE RÉSULTAT
// ==========================================

function validateRound() {
    clearInterval(timerInterval);
    map.off('click'); 
    guessBtn.disabled = true;

    const targetLocation = gameLocations[currentRound - 1];
    let score = 0;
    let distance = 0;
    
    // Tableau des points pour calculer le zoom de la caméra (Le vrai point est toujours là)
    const pointsToFit = [[targetLocation.y, targetLocation.x]];

    if (marker !== null) {
        const clickY = marker.getLatLng().lat;
        const clickX = marker.getLatLng().lng;

        pointsToFit.push([clickY, clickX]); // On ajoute le clic du joueur à la caméra

        distance = Math.sqrt(Math.pow(targetLocation.x - clickX, 2) + Math.pow(targetLocation.y - clickY, 2));
        score = Math.round(maxScorePerRound - (distance * 5)); 
        if (score < 0) score = 0;

        document.getElementById('distanceDisplay').innerText = Math.round(distance) + " blocs";
        L.polyline([[clickY, clickX], [targetLocation.y, targetLocation.x]], {color: '#00B4D8', weight: 3, dashArray: '10, 10'}).addTo(gameLayer);
    } else {
        document.getElementById('distanceDisplay').innerText = "Temps écoulé !";
    }

    totalScore += score;
    document.getElementById('scoreDisplay').innerText = score;
    document.getElementById('header-score').innerText = totalScore;

    // Place la vraie réponse
    L.circleMarker([targetLocation.y, targetLocation.x], {color: '#0A0A0A', fillColor: '#00B4D8', fillOpacity: 1, radius: 8}).addTo(gameLayer);

    // 🎬 Lancement de l'animation
    document.getElementById('result-overlay').classList.remove('hidden');
    mapWrapper.classList.add('result-mode'); // Fait grossir la carte au milieu

    // On attend 0.5s que la carte ait fini de grossir pour lancer le déplacement de caméra Leaflet
    setTimeout(() => {
        map.invalidateSize(); // Met à jour les dimensions de la carte
        
        // Mouvement fluide de la carte vers les points
        map.flyToBounds(pointsToFit, { padding: [60, 60], duration: 1.5 });

        // On attend la fin du mouvement (1.5s) pour afficher les scores
        setTimeout(() => {
            document.getElementById('result-modal').classList.remove('hidden');
            startWaitingLobby();
        }, 1500);

    }, 500);
}

// ==========================================
// 6. COMPTE À REBOURS MULTIJOUEUR
// ==========================================

function startWaitingLobby() {
    let waitTime = 5;
    const nextTimerDisplay = document.getElementById('auto-next-timer');
    const msgBox = document.getElementById('waiting-msg');
    
    if (currentRound >= totalRounds) {
        msgBox.innerHTML = `Partie terminée ! Fin dans <span id="auto-next-timer">${waitTime}</span>s...`;
    } else {
        msgBox.innerHTML = `En attente des autres joueurs... (<span id="auto-next-timer">${waitTime}</span>s)`;
    }

    const waitInterval = setInterval(() => {
        waitTime--;
        document.getElementById('auto-next-timer').innerText = waitTime;
        
        if (waitTime <= 0) {
            clearInterval(waitInterval);
            goToNextRound();
        }
    }, 1000);
}

function goToNextRound() {
    if (currentRound >= totalRounds) {
        location.reload(); // Fin du jeu : recharge la page
        return;
    }

    // Manche suivante
    currentRound++;
    document.getElementById('round-display').innerText = currentRound;

    // Reset UI
    gameLayer.clearLayers();
    marker = null;
    document.getElementById('result-overlay').classList.add('hidden');
    document.getElementById('result-modal').classList.add('hidden');
    mapWrapper.classList.remove('result-mode');
    
    guessBtn.innerText = "Placer le point";

    // On attend que la carte ait rétréci avant de redémarrer
    setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds);
        
        // Charger la nouvelle zone 360
        viewer.loadScene(gameLocations[currentRound - 1].id);
        
        enableMapClick();
        startTimer();
    }, 500);
}

// Démarrage initial
enableMapClick();
startTimer();
