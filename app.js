// ==========================================
// 1. CONFIGURATION (MODE DEV - JUSTE 17, 18, 19)
// ==========================================

const allLocations = [
    { id: 'Lieu17', x: 500, y: 500 },
    { id: 'Lieu18', x: 500, y: 500 },
    { id: 'Lieu19', x: 500, y: 500 }
];

const maxScorePerRound = 5000;
const totalRounds = allLocations.length; // Sera égal à 3

let currentRound = 1;
let totalScore = 0;
let gameLocations = allLocations; 
let marker = null;
let hasValidated = false;

// Met à jour l'affichage du total (3) en haut à droite
const totalDisplay = document.getElementById('total-rounds-display');
if (totalDisplay) totalDisplay.innerText = totalRounds;

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
const nextBtn = document.getElementById('next-btn');

const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize({ pan: false });
});
resizeObserver.observe(document.getElementById('map-container'));

document.getElementById('map-container').addEventListener('transitionend', function(e) {
    if (e.target.id === 'map-container' && !hasValidated) {
        map.fitBounds(bounds);
    }
});

// ==========================================
// 4. LOGIQUE DES ROUNDS
// ==========================================

function startRound() {
    hasValidated = false;
    document.getElementById('timer-display').innerText = "DEV";
    enableMapClick();
}

function enableMapClick() {
    map.on('click', function(e) {
        if (hasValidated) return;
        
        // 🕵️‍♂️ LES COORDONNÉES APPARAISSENT ICI DANS TA CONSOLE F12
        console.log("📍 " + gameLocations[currentRound - 1].id + " -> x: " + e.latlng.lng + ", y: " + e.latlng.lat);

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
// 5. CINÉMATIQUE DE RÉSULTAT
// ==========================================

function processRoundResult() {
    hasValidated = true; 
    map.off('click'); 
    guessBtn.disabled = true;

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
        }, 1500);
    }, 500);
}

// ==========================================
// 6. BOUTON SUIVANT MANUEL
// ==========================================

nextBtn.addEventListener('click', () => {
    if (currentRound >= totalRounds) {
        alert("Terminé ! Tu as les coordonnées des 3 derniers lieux dans ta console.");
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
        map.fitBounds(bounds);
        viewer.loadScene(gameLocations[currentRound - 1].id);
        startRound();
    }, 500);
});

startRound();
