// --- 1. CONFIGURATION ---
const targetY = 500; // Coordonnée Y de la bonne réponse
const targetX = 500; // Coordonnée X de la bonne réponse
const maxScore = 5000;

// --- 2. 360 PANORAMA ---
const viewer = pannellum.viewer('panorama', {
    "type": "equirectangular",
    "panorama": "pano1.jpg", 
    "autoLoad": true,
    "showZoomCtrl": false,
    "mouseZoom": false // Évite de zoomer dans le jeu quand on molette sur la carte
});

// --- 3. LA CARTE ---
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomControl: false // On cache les boutons +/- pour que ça fasse plus propre
});

const bounds = [[0, 0], [1000, 1000]]; // Taille de ton image map.png
L.imageOverlay('map.png', bounds).addTo(map);
map.fitBounds(bounds);

let marker = null;
const guessBtn = document.getElementById('guess-btn');
const mapContainer = document.getElementById('map-container');

// ASTUCE : Leaflet bug parfois quand sa taille CSS change (effet d'agrandissement).
// Ce code force la carte à se redessiner proprement à la fin de l'animation CSS.
mapContainer.addEventListener('transitionend', function() {
    map.invalidateSize();
});

// --- 4. CLIQUER SUR LA CARTE ---
map.on('click', function(e) {
    if (marker !== null) {
        map.removeLayer(marker);
    }

    // Place le marqueur
    marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
    
    // Débloque le bouton "Valider"
    guessBtn.disabled = false;
    guessBtn.innerText = "Valider !";
});

// --- 5. VALIDER SON CHOIX ---
guessBtn.addEventListener('click', function() {
    if(!marker) return;

    const clickY = marker.getLatLng().lat;
    const clickX = marker.getLatLng().lng;

    // Calcul de la distance
    const distance = Math.sqrt(Math.pow(targetX - clickX, 2) + Math.pow(targetY - clickY, 2));

    // Calcul du score
    let score = Math.round(maxScore - (distance * 5)); 
    if (score < 0) score = 0;

    // Affiche le score sur l'écran de fin
    document.getElementById('distanceDisplay').innerText = Math.round(distance);
    document.getElementById('scoreDisplay').innerText = score;
    document.getElementById('header-score').innerText = score;
    
    // Affiche l'écran de résultat
    document.getElementById('result-overlay').classList.remove('hidden');

    // Montrer la bonne réponse sur la carte (optionnel, visible si le joueur ferme la modale plus tard)
    L.polyline([[clickY, clickX], [targetY, targetX]], {color: '#00B4D8', weight: 3, dashArray: '10, 10'}).addTo(map);
    L.circleMarker([targetY, targetX], {color: '#0A0A0A', fillColor: '#00B4D8', fillOpacity: 1, radius: 8}).addTo(map);
    
    // Bloque la carte
    map.off('click');
    guessBtn.disabled = true;
});
