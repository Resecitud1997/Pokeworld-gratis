import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, ShoppingBag, Sword, Package, Zap, Navigation } from 'lucide-react';

const PokeWorld = () => {
  const [gameState, setGameState] = useState({
    money: 1000,
    pokeballs: 5,
    greatballs: 0,
    ultraballs: 0,
    pokemon: [],
    location: { lat: -33.0246, lng: -71.5518 }
  });
  
  const [nearbyPokemon, setNearbyPokemon] = useState([]);
  const [nearbyTrainers, setNearbyTrainers] = useState([]);
  const [activeScreen, setActiveScreen] = useState('map');
  const [battleState, setBattleState] = useState(null);
  const [captureState, setCaptureState] = useState(null);
  const [notification, setNotification] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  // Obtener ubicación del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLoc);
          setGameState(prev => ({ ...prev, location: newLoc }));
        },
        (error) => {
          console.log('Usando ubicación por defecto');
          setUserLocation(gameState.location);
        }
      );
    }
  }, []);

  // Inicializar mapa con Leaflet (OpenStreetMap - 100% GRATIS)
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapLoaded) return;
      
      // Cargar Leaflet dinámicamente
      const L = await loadLeaflet();
      
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([gameState.location.lat, gameState.location.lng], 15);
      
      // Capa de OpenStreetMap (100% gratis, sin límites)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      
      // Marcador del jugador
      const playerIcon = L.divIcon({
        html: '<div style="background: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
        className: 'player-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      L.marker([gameState.location.lat, gameState.location.lng], { icon: playerIcon })
        .addTo(map)
        .bindPopup('¡Tú estás aquí!')
        .openPopup();
      
      leafletMapRef.current = { map, L };
      setMapLoaded(true);
    };

    initMap();
  }, [userLocation]);

  // Cargar Leaflet desde CDN
  const loadLeaflet = () => {
    return new Promise((resolve) => {
      if (window.L) {
        resolve(window.L);
        return;
      }
      
      // CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(cssLink);
      
      // JS
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = () => resolve(window.L);
      document.head.appendChild(script);
    });
  };

  // Generar Pokémon cercanos
  useEffect(() => {
    if (mapLoaded && leafletMapRef.current) {
      generateNearbyPokemon();
      generateNearbyTrainers();
    }
  }, [mapLoaded, gameState.location]);

  const generateNearbyPokemon = async () => {
    if (!leafletMapRef.current) return;
    
    const { map, L } = leafletMapRef.current;
    
    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    const pokemon = [];
    for (let i = 0; i < 5; i++) {
      const id = Math.floor(Math.random() * 151) + 1;
      
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await response.json();
        
        const offsetLat = (Math.random() - 0.5) * 0.01;
        const offsetLng = (Math.random() - 0.5) * 0.01;
        
        const pokemonData = {
          id: data.id,
          name: data.name,
          sprite: data.sprites.front_default,
          types: data.types.map(t => t.type.name),
          stats: data.stats,
          location: {
            lat: gameState.location.lat + offsetLat,
            lng: gameState.location.lng + offsetLng
          },
          distance: Math.floor(Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng) * 111000)
        };
        
        pokemon.push(pokemonData);
        
        // Crear marcador en el mapa
        const pokemonIcon = L.divIcon({
          html: `<div style="text-align: center;">
            <img src="${data.sprites.front_default}" style="width: 40px; height: 40px; image-rendering: pixelated; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" />
          </div>`,
          className: 'pokemon-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });
        
        const marker = L.marker(
          [gameState.location.lat + offsetLat, gameState.location.lng + offsetLng],
          { icon: pokemonIcon }
        ).addTo(map);
        
        marker.on('click', () => {
          setCaptureState(pokemonData);
          setActiveScreen('capture');
        });
        
        marker.bindPopup(`<b>${data.name.toUpperCase()}</b><br>${pokemonData.distance}m`);
        
        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error cargando pokemon:', error);
      }
    }
    setNearbyPokemon(pokemon);
  };

  const generateNearbyTrainers = () => {
    if (!leafletMapRef.current) return;
    
    const { map, L } = leafletMapRef.current;
    const trainerNames = ["Ash", "Misty", "Brock", "Gary", "May", "Dawn"];
    const trainers = [];
    
    for (let i = 0; i < 3; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.015;
      const offsetLng = (Math.random() - 0.5) * 0.015;
      
      const trainer = {
        id: i,
        name: trainerNames[Math.floor(Math.random() * trainerNames.length)],
        level: Math.floor(Math.random() * 20) + 10,
        reward: Math.floor(Math.random() * 500) + 200,
        location: {
          lat: gameState.location.lat + offsetLat,
          lng: gameState.location.lng + offsetLng
        },
        distance: Math.floor(Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng) * 111000)
      };
      
      trainers.push(trainer);
      
      // Marcador de entrenador
      const trainerIcon = L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">⚔️</div>',
        className: 'trainer-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      const marker = L.marker(
        [gameState.location.lat + offsetLat, gameState.location.lng + offsetLng],
        { icon: trainerIcon }
      ).addTo(map);
      
      marker.on('click', () => {
        startBattle(trainer);
      });
      
      marker.bindPopup(`<b>Entrenador ${trainer.name}</b><br>Nivel ${trainer.level}<br>Premio: $${trainer.reward}`);
      
      markersRef.current.push(marker);
    }
    setNearbyTrainers(trainers);
  };

  const centerOnPlayer = () => {
    if (leafletMapRef.current && gameState.location) {
      leafletMapRef.current.map.setView([gameState.location.lat, gameState.location.lng], 15);
    }
  };

  const attemptCapture = (ballType) => {
    if (!captureState) return;
    
    const captureRates = { pokeballs: 0.4, greatballs: 0.6, ultraballs: 0.8 };
    
    if (gameState[ballType] < 1) {
      showNotification('¡No tienes esa Poké Ball!');
      return;
    }
    
    const success = Math.random() < captureRates[ballType];
    
    setGameState(prev => ({
      ...prev,
      [ballType]: prev[ballType] - 1,
      pokemon: success ? [...prev.pokemon, captureState] : prev.pokemon
    }));
    
    if (success) {
      showNotification(`¡Capturaste a ${captureState.name}!`);
      setNearbyPokemon(prev => prev.filter(p => p.id !== captureState.id));
      setCaptureState(null);
      setActiveScreen('map');
    } else {
      showNotification(`¡${captureState.name} se escapó!`);
    }
  };

  const startBattle = (trainer) => {
    setBattleState({
      trainer: trainer,
      trainerHP: 100,
      playerHP: 100,
      turn: 'player'
    });
    setActiveScreen('battle');
  };

  const attack = () => {
    if (!battleState || battleState.turn !== 'player') return;
    
    const damage = Math.floor(Math.random() * 30) + 20;
    const newTrainerHP = Math.max(0, battleState.trainerHP - damage);
    
    if (newTrainerHP === 0) {
      setGameState(prev => ({ ...prev, money: prev.money + battleState.trainer.reward }));
      showNotification(`¡Ganaste $${battleState.trainer.reward}!`);
      setNearbyTrainers(prev => prev.filter(t => t.id !== battleState.trainer.id));
      setBattleState(null);
      setActiveScreen('map');
      return;
    }
    
    setBattleState(prev => ({ ...prev, trainerHP: newTrainerHP, turn: 'enemy' }));
    
    setTimeout(() => {
      const enemyDamage = Math.floor(Math.random() * 25) + 15;
      setBattleState(prev => {
        if (!prev) return null;
        const newPlayerHP = Math.max(0, prev.playerHP - enemyDamage);
        if (newPlayerHP === 0) {
          showNotification('¡Perdiste la batalla!');
          setTimeout(() => {
            setBattleState(null);
            setActiveScreen('map');
          }, 2000);
          return prev;
        }
        return { ...prev, playerHP: newPlayerHP, turn: 'player' };
      });
    }, 1500);
  };

  const buyItem = (item, cost) => {
    if (gameState.money < cost) {
      showNotification('¡No tienes suficiente dinero!');
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      money: prev.money - cost,
      [item]: prev[item] + 1
    }));
    showNotification(`¡Compraste 1 ${item}!`);
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">PokéWorld</h1>
            <p className="text-xs text-red-200">100% Gratis - OpenStreetMap</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
              ${gameState.money}
            </div>
            <div className="bg-white text-red-600 px-3 py-1 rounded-full font-bold">
              🔴 {gameState.pokeballs}
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-500 px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          {notification}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeScreen === 'map' && (
          <div className="h-full flex flex-col relative">
            <div ref={mapRef} className="flex-1 bg-green-100"></div>
            
            {/* Botón para centrar */}
            <button
              onClick={centerOnPlayer}
              className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-10"
            >
              <Navigation size={24} />
            </button>
            
            <div className="bg-gray-800 p-4 max-h-64 overflow-y-auto">
              <h3 className="font-bold mb-2 text-yellow-400">🔥 Pokémon Cercanos</h3>
              <div className="grid grid-cols-2 gap-2">
                {nearbyPokemon.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => { setCaptureState(p); setActiveScreen('capture'); }}
                    className="bg-gray-700 p-3 rounded-lg cursor-pointer hover:bg-gray-600 transition"
                  >
                    <img src={p.sprite} alt={p.name} className="w-16 h-16 mx-auto" style={{imageRendering: 'pixelated'}} />
                    <p className="text-center font-bold capitalize">{p.name}</p>
                    <p className="text-xs text-gray-400 text-center">{p.distance}m</p>
                  </div>
                ))}
              </div>
              
              <h3 className="font-bold mt-4 mb-2 text-blue-400">⚔️ Entrenadores</h3>
              <div className="space-y-2">
                {nearbyTrainers.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => startBattle(t)}
                    className="bg-blue-900 p-3 rounded-lg cursor-pointer hover:bg-blue-800 transition flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold">{t.name} (Nv. {t.level})</p>
                      <p className="text-xs text-gray-400">{t.distance}m</p>
                    </div>
                    <div className="text-yellow-400 font-bold">${t.reward}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'capture' && captureState && (
          <div className="h-full bg-gradient-to-b from-blue-400 to-green-400 flex flex-col items-center justify-center p-8">
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md">
              <h2 className="text-3xl font-bold text-gray-800 mb-4 capitalize">
                ¡Un {captureState.name} salvaje apareció!
              </h2>
              <img src={captureState.sprite} alt={captureState.name} className="w-48 h-48 mx-auto mb-4" style={{imageRendering: 'pixelated'}} />
              <div className="flex gap-2 mb-4 justify-center">
                {captureState.types.map(type => (
                  <span key={type} className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm">
                    {type}
                  </span>
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button 
                  onClick={() => attemptCapture('pokeballs')}
                  disabled={gameState.pokeballs < 1}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold"
                >
                  Poké Ball<br/>{gameState.pokeballs}
                </button>
                <button 
                  onClick={() => attemptCapture('greatballs')}
                  disabled={gameState.greatballs < 1}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold"
                >
                  Great Ball<br/>{gameState.greatballs}
                </button>
                <button 
                  onClick={() => attemptCapture('ultraballs')}
                  disabled={gameState.ultraballs < 1}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold"
                >
                  Ultra Ball<br/>{gameState.ultraballs}
                </button>
              </div>
              
              <button 
                onClick={() => { setCaptureState(null); setActiveScreen('map'); }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
              >
                Huir
              </button>
            </div>
          </div>
        )}

        {activeScreen === 'battle' && battleState && (
          <div className="h-full bg-gradient-to-b from-purple-600 to-purple-900 flex flex-col justify-between p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">¡Entrenador {battleState.trainer.name}!</h2>
              <div className="bg-red-500 h-4 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{ width: `${battleState.trainerHP}%` }}
                ></div>
              </div>
              <p className="text-sm">HP: {battleState.trainerHP}/100</p>
            </div>
            
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center text-6xl">
                👤
              </div>
            </div>
            
            <div>
              <div className="bg-blue-500 h-4 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{ width: `${battleState.playerHP}%` }}
                ></div>
              </div>
              <p className="text-sm mb-4">Tu HP: {battleState.playerHP}/100</p>
              
              <button 
                onClick={attack}
                disabled={battleState.turn !== 'player'}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-4 rounded-lg font-bold text-xl"
              >
                {battleState.turn === 'player' ? '⚡ ATACAR' : '⏳ Turno del rival...'}
              </button>
            </div>
          </div>
        )}

        {activeScreen === 'shop' && (
          <div className="h-full bg-gray-800 p-6 overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-center text-yellow-400">🏪 Tienda Pokémon</h2>
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-red-700 p-6 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Poké Ball</h3>
                  <p className="text-sm text-gray-300">Tasa de captura: 40%</p>
                </div>
                <button 
                  onClick={() => buyItem('pokeballs', 100)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold"
                >
                  $100
                </button>
              </div>
              
              <div className="bg-blue-700 p-6 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Great Ball</h3>
                  <p className="text-sm text-gray-300">Tasa de captura: 60%</p>
                </div>
                <button 
                  onClick={() => buyItem('greatballs', 300)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold"
                >
                  $300
                </button>
              </div>
              
              <div className="bg-yellow-600 p-6 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Ultra Ball</h3>
                  <p className="text-sm text-gray-300">Tasa de captura: 80%</p>
                </div>
                <button 
                  onClick={() => buyItem('ultraballs', 600)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold"
                >
                  $600
                </button>
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'pokemon' && (
          <div className="h-full bg-gray-800 p-6 overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-center text-blue-400">📦 Mis Pokémon</h2>
            {gameState.pokemon.length === 0 ? (
              <p className="text-center text-gray-400 mt-20">No has capturado ningún Pokémon todavía</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {gameState.pokemon.map((p, idx) => (
                  <div key={idx} className="bg-gray-700 p-4 rounded-lg text-center">
                    <img src={p.sprite} alt={p.name} className="w-24 h-24 mx-auto" style={{imageRendering: 'pixelated'}} />
                    <p className="font-bold capitalize mt-2">{p.name}</p>
                    <div className="flex gap-1 justify-center mt-2">
                      {p.types.map(type => (
                        <span key={type} className="bg-gray-600 text-xs px-2 py-1 rounded">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-gray-800 border-t border-gray-700 flex justify-around p-2">
        <button 
          onClick={() => setActiveScreen('map')}
          className={`flex flex-col items-center p-2 rounded ${activeScreen === 'map' ? 'bg-gray-700' : ''}`}
        >
          <MapPin size={24} />
          <span className="text-xs mt-1">Mapa</span>
        </button>
        <button 
          onClick={() => setActiveScreen('shop')}
          className={`flex flex-col items-center p-2 rounded ${activeScreen === 'shop' ? 'bg-gray-700' : ''}`}
        >
          <ShoppingBag size={24} />
          <span className="text-xs mt-1">Tienda</span>
        </button>
        <button 
          onClick={() => setActiveScreen('pokemon')}
          className={`flex flex-col items-center p-2 rounded ${activeScreen === 'pokemon' ? 'bg-gray-700' : ''}`}
        >
          <Package size={24} />
          <span className="text-xs mt-1">Pokémon</span>
        </button>
      </div>
    </div>
  );
};

export default PokeWorld;
