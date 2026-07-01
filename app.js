// ==========================================
// 1. CONFIGURATION DES LIEUX ET DU JEU
// ==========================================

// ⚠️ Remplace les "500" par tes vraies coordonnées trouvées avec F12
const allLocations = [
    { id: 'Lieu1', x: 665.5, y: 556.625 }, // Celles que tu m'as données !
    { id: 'Lieu2', x: 500, y: 500 },
    { id: 'Lieu3', x: 500, y: 500 },
    { id: 'Lieu4', x: 500, y: 500 },
    { id: 'Lieu5', x: 500, y: 500 },
    { id: 'Lieu6', x: 500, y: 500 }
];

const maxScorePerRound = 5000;
const totalRounds = 5;
const roundTime = 30; // 30 secondes par manche

// Variables de progression
let currentRound = 1;
let totalScore = 0;
let gameLocations = []; // Les 5 lieux tirés au sort
let marker = null;
let timerInterval;
let timeLeft = roundTime;

// ==========================================
// 2. PRÉPARATION DES SCÈNES (PANNELLUM)
// ==========================================

// On crée l'objet "scenes" qui contient les chemins vers toutes tes images .png
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

// Mélanger la liste pour que les parties soient aléatoires
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
shuffleArray(allLocations);
gameLocations = allLocations.slice(0, totalRounds); // On en garde seulement 5

// On lance le visualiseur 360 avec le 1er lieu de la liste
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
// 3. INITIALISATION DE LA CARTE (LEAFLET)
// ==========================================

const map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, maxZoom: 3, zoomControl: false, attributionControl: false });
const bounds = [[0, 0], [1000, 1000]];
L.imageOverlay('maps/map.png', bounds).addTo(map);
map.fitBounds(bounds);

// Un groupe (calque) pour pouvoir effacer facilement le point du joueur et la vraie réponse entre chaque manche
const gameLayer = L.layerGroup().addTo(map);

const guessBtn = document.getElementById('guess-btn');
const mapContainer = document.getElementById('map-container');
const timerDisplay = document.getElementById('timer-display');
const nextBtn = document.getElementById('next-btn');

mapContainer.addEventListener('transitionend', () => map.invalidateSize());

// ==========================================
// 4. LOGIQUE DE JEU (CHRONO ET CLICS)
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
        
        // TEMPS ÉCOULÉ !
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            validateRound(); // Force la validation même sans point
        }
    }, 1000);
}

function enableMapClick() {
    map.on('click', function(e) {
        console.log("Coordonnées -> targetY: " + e.latlng.lat + " | targetX: " + e.latlng.lng);

        if (marker !== null) gameLayer.removeLayer(marker);
        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(gameLayer);
        
        guessBtn.disabled = false;
        guessBtn.innerText = "Valider !";
    });
}

// Clic sur le bouton valider
guessBtn.addEventListener('click', () => {
    if(marker) validateRound();
});

// ==========================================
// 5. RÉSULTAT DE LA MANCHE
// ==========================================

function validateRound() {
    clearInterval(timerInterval); // Stoppe le chrono
    map.off('click'); // Bloque la carte
    guessBtn.disabled = true;

    const targetLocation = gameLocations[currentRound - 1];
    let score = 0;
    let distance = 0;

    // Si le joueur a eu le temps de mettre un point
    if (marker !== null) {
        const clickY = marker.getLatLng().lat;
        const clickX = marker.getLatLng().lng;

        distance = Math.sqrt(Math.pow(targetLocation.x - clickX, 2) + Math.pow(targetLocation.y - clickY, 2));
        score = Math.round(maxScorePerRound - (distance * 5)); 
        if (score < 0) score = 0;

        document.getElementById('distanceDisplay').innerText = Math.round(distance) + " blocs";
        L.polyline([[clickY, clickX], [targetLocation.y, targetLocation.x]], {color: '#00B4D8', weight: 3, dashArray: '10, 10'}).addTo(gameLayer);
    } 
    // S'il n'a rien fait (temps écoulé)
    else {
        document.getElementById('distanceDisplay').innerText = "Temps écoulé !";
    }

    totalScore += score;
    document.getElementById('scoreDisplay').innerText = score;
    document.getElementById('header-score').innerText = totalScore;

    // Affiche la vraie réponse
    L.circleMarker([targetLocation.y, targetLocation.x], {color: '#0A0A0A', fillColor: '#00B4D8', fillOpacity: 1, radius: 8}).addTo(gameLayer);
    
    // Change le bouton si c'est la fin du jeu
    if (currentRound >= totalRounds) {
        nextBtn.innerText = "Rejouer une partie";
    } else {
        nextBtn.innerText = "Lieu suivant";
    }

    document.getElementById('result-overlay').classList.remove('hidden');
}

// ==========================================
// 6. PASSER AU LIEU SUIVANT
// ==========================================

nextBtn.addEventListener('click', () => {
    // Si la partie est finie (Round 5), on recharge la page pour relancer un tirage
    if (currentRound >= totalRounds) {
        location.reload();
        return;
    }

    // Sinon, on passe à la manche suivante
    currentRound++;
    document.getElementById('round-display').innerText = currentRound;

    // Nettoyer la carte et l'interface
    gameLayer.clearLayers();
    marker = null;
    document.getElementById('result-overlay').classList.add('hidden');
    guessBtn.innerText = "Placer le point";

    // Charger le nouveau paysage 360
    viewer.loadScene(gameLocations[currentRound - 1].id);

    // Relancer la machine
    enableMapClick();
    startTimer();
});

// DÉMARRAGE DE LA PREMIÈRE MANCHE
enableMapClick();
startTimer();
