// --- 1. CONFIGURATION DU LIEU ---
// Coordonnées de la BONNE réponse sur ton image (en pixels ou blocs, à calibrer)
const targetY = 500; 
const targetX = 500; 
const maxScore = 5000; // Score max façon GeoGuessr

// --- 2. INITIALISATION DU PANORAMA (Pannellum) ---
// Remplace 'pano1.jpg' par ton image equirectangulaire 360°
viewer = pannellum.viewer('panorama', {
    "type": "equirectangular",
    "panorama": "pano1.jpg", 
    "autoLoad": true,
    "compass": false,
    "showZoomCtrl": false
});

// --- 3. INITIALISATION DE LA CARTE (Leaflet) ---
// On utilise CRS.Simple car c'est une image custom (pas la planète Terre)
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2
});

// Définir la taille de l'image de ta map (Ex: 1000x1000)
// Ajuste ces valeurs selon la résolution de ton image "map.png"
const bounds = [[0, 0], [1000, 1000]]; 

// Remplace 'map.png' par l'image de la map vue de haut de ton serveur
L.imageOverlay('map.png', bounds).addTo(map);
map.fitBounds(bounds);

let marker = null; // Pour stocker le point cliqué par le joueur

// --- 4. LOGIQUE DE JEU (Le clic) ---
map.on('click', function(e) {
    // Si un marqueur existe déjà, on le retire (le joueur change d'avis)
    if (marker !== null) {
        map.removeLayer(marker);
    }

    // Récupérer les coordonnées X et Y du clic
    const clickY = e.latlng.lat;
    const clickX = e.latlng.lng;

    // Placer un marqueur visuel
    marker = L.marker([clickY, clickX]).addTo(map);

    // Calcul de la distance (Théorème de Pythagore simple)
    const distance = Math.sqrt(Math.pow(targetX - clickX, 2) + Math.pow(targetY - clickY, 2));

    // Calcul du score (plus on est loin, plus on perd de points)
    // Le "/ 5" est un facteur de difficulté, à ajuster selon la taille de ta map !
    let score = Math.round(maxScore - (distance * 5)); 
    if (score < 0) score = 0;

    // Afficher les résultats
    document.getElementById('scoreBoard').style.display = 'block';
    document.getElementById('scoreDisplay').innerText = score;
    document.getElementById('distanceDisplay').innerText = Math.round(distance);
    
    // (Bonus visuel) Tracer une ligne entre le clic et la vraie réponse
    L.polyline([[clickY, clickX], [targetY, targetX]], {color: '#00B4D8', weight: 3, dashArray: '10, 10'}).addTo(map);
    
    // Placer un marqueur sur la vraie réponse
    L.circleMarker([targetY, targetX], {color: '#0A0A0A', fillColor: '#00B4D8', fillOpacity: 1, radius: 8}).addTo(map);
    
    // Désactiver les clics une fois joué
    map.off('click');
});
