
// ==========================================
// WEATHERPULSE 2.1
// GLOBAL WEATHER DASHBOARD
// ==========================================

"use strict";

// ---------- DOM ELEMENTS ----------
const $ = (id) => document.getElementById(id);

const statusMessage = $("statusMessage");
const cityInput = $("cityInput");
const searchBtn = $("searchBtn");
const locateBtn = $("locateBtn");

const requiredElements = [
    "map", "statusMessage", "cityInput", "searchBtn", "locateBtn",
    "temperatureLayer", "rainLayer", "windLayer", "cityName",
    "condition", "temperature", "feelsLike", "humidity", "windSpeed",
    "pressure", "precipitation", "forecastLocation", "forecastTimeline"
];

const missingElements = requiredElements.filter((id) => !$(id));

if (missingElements.length) {
    console.error("WeatherPulse: Missing HTML elements:", missingElements);
    if (statusMessage) {
        statusMessage.textContent =
            `Application setup error. Missing HTML elements: ${missingElements.join(", ")}`;
    }
    throw new Error(`Missing required HTML elements: ${missingElements.join(", ")}`);
}

let map = null;
let weatherMarkers = [];
let selectedLayer = "temperature";
let isLoadingGlobalWeather = false;

// ---------- GLOBAL MONITORING CITIES ----------
const globalCities = [
    // Asia — 16
    { name: "Hyderabad", country: "India", lat: 17.385, lon: 78.4867 },
    { name: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
    { name: "New Delhi", country: "India", lat: 28.6139, lon: 77.209 },
    { name: "Bengaluru", country: "India", lat: 12.9716, lon: 77.5946 },
    { name: "Chennai", country: "India", lat: 13.0827, lon: 80.2707 },
    { name: "Kolkata", country: "India", lat: 22.5726, lon: 88.3639 },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
    { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
    { name: "Beijing", country: "China", lat: 39.9042, lon: 116.4074 },
    { name: "Shanghai", country: "China", lat: 31.2304, lon: 121.4737 },
    { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
    { name: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456 },
    { name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708 },
    { name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lon: 46.6753 },
    { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784 },

    // Europe — 7
    { name: "London", country: "UK", lat: 51.5072, lon: -0.1276 },
    { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
    { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
    { name: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038 },
    { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
    { name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173 },

    // North America — 6
    { name: "New York", country: "USA", lat: 40.7128, lon: -74.006 },
    { name: "Los Angeles", country: "USA", lat: 34.0522, lon: -118.2437 },
    { name: "Chicago", country: "USA", lat: 41.8781, lon: -87.6298 },
    { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
    { name: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207 },
    { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332 },

    // South America — 4
    { name: "Sao Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333 },
    { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729 },
    { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816 },
    { name: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428 },

    // Africa — 5
    { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
    { name: "Nairobi", country: "Kenya", lat: -1.2921, lon: 36.8219 },
    { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241 },
    { name: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792 },
    { name: "Casablanca", country: "Morocco", lat: 33.5731, lon: -7.5898 },

    // Oceania — 2
    { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
    { name: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631 }
];

console.info(`WeatherPulse: ${globalCities.length} monitoring cities configured.`);

// ---------- WEATHER CODE DESCRIPTIONS ----------
const weatherDescriptions = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Moderate drizzle", "🌦️"],
    55: ["Heavy drizzle", "🌧️"],
    61: ["Light rain", "🌧️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    71: ["Light snow", "🌨️"],
    73: ["Moderate snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    80: ["Rain showers", "🌦️"],
    81: ["Moderate showers", "🌧️"],
    82: ["Heavy showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Thunderstorm with heavy hail", "⛈️"]
};

function getWeatherInfo(code) {
    return weatherDescriptions[code] || ["Unknown conditions", "🌡️"];
}

function setStatus(message) {
    statusMessage.textContent = message;
}

// ---------- API REQUEST ----------
async function fetchJson(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Weather service returned HTTP ${response.status}.`);
        }

        return await response.json();
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
        }
        if (error instanceof TypeError) {
            throw new Error("Network error. Check your internet connection.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function getWeather(latitude, longitude) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "surface_pressure"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min"
        ].join(","),
        timezone: "auto",
        forecast_days: "7"
    });

    const data = await fetchJson(url);

    if (!data.current || !data.daily) {
        throw new Error("The weather service returned incomplete data.");
    }

    return data;
}

// ---------- MAP INITIALIZATION ----------
function initializeMap() {
    if (typeof L === "undefined") {
        setStatus("Map library did not load. Check your internet connection.");
        console.error("WeatherPulse: Leaflet (L) is undefined.");
        return;
    }

    try {
        map = L.map("map", {
            center: [20, 10],
            zoom: 2,
            minZoom: 2,
            maxZoom: 12,
            worldCopyJump: true
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }).addTo(map);

        requestAnimationFrame(() => map.invalidateSize());

        loadGlobalWeather();
    } catch (error) {
        console.error("WeatherPulse map initialization failed:", error);
        setStatus("Could not initialize the map. See the browser console.");
    }
}

// ---------- MARKER COLORS ----------
function getMarkerColor(weather) {
    const current = weather.current;

    if (selectedLayer === "temperature") {
        const temp = current.temperature_2m;
        if (temp <= 5) return "#38a9ef";
        if (temp <= 15) return "#43d6bd";
        if (temp <= 25) return "#a5d957";
        if (temp <= 32) return "#ffc34d";
        return "#ff684d";
    }

    if (selectedLayer === "rain") {
        const rain = current.precipitation;
        if (rain <= 0) return "#687385";
        if (rain <= 2) return "#55c7ed";
        if (rain <= 10) return "#378bfa";
        return "#9a69ed";
    }

    const wind = current.wind_speed_10m;
    if (wind <= 10) return "#54d6a0";
    if (wind <= 25) return "#f1c65b";
    return "#f36c55";
}

// ---------- ADD CITY MARKER ----------
function addWeatherMarker(city, weather) {
    const current = weather.current;

    const marker = L.circleMarker([city.lat, city.lon], {
        radius: 6,
        color: "#ffffff",
        weight: 1,
        fillColor: getMarkerColor(weather),
        fillOpacity: 0.95
    });

    const popup = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${city.name}, ${city.country}`;

    const temperature = document.createElement("p");
    temperature.textContent = `Temperature: ${current.temperature_2m}°C`;

    const humidity = document.createElement("p");
    humidity.textContent = `Humidity: ${current.relative_humidity_2m}%`;

    const wind = document.createElement("p");
    wind.textContent = `Wind: ${current.wind_speed_10m} km/h`;

    popup.append(title, temperature, humidity, wind);

    marker.bindPopup(popup);
    marker.bindTooltip(`${city.name}, ${city.country}`, {
        direction: "top",
        offset: [0, -8]
    });

    marker.on("click", () => selectCity(city, weather));
    marker.addTo(map);

    weatherMarkers.push({ marker, city, weather });
}

// ---------- LOAD ALL GLOBAL CITIES ----------
async function loadGlobalWeather() {
    if (isLoadingGlobalWeather) return;
    isLoadingGlobalWeather = true;

    weatherMarkers.forEach((item) => map.removeLayer(item.marker));
    weatherMarkers = [];

    let successful = 0;
    const failedCities = [];
    const batchSize = 5;

    setStatus(`Loading weather for ${globalCities.length} global cities...`);

    try {
        for (let start = 0; start < globalCities.length; start += batchSize) {
            const batch = globalCities.slice(start, start + batchSize);

            const results = await Promise.allSettled(
                batch.map(async (city) => ({
                    city,
                    weather: await getWeather(city.lat, city.lon)
                }))
            );

            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    addWeatherMarker(result.value.city, result.value.weather);
                    successful++;
                } else {
                    failedCities.push({
                        city: batch[index].name,
                        error: result.reason?.message || "Unknown error"
                    });
                }
            });

            const checked = Math.min(start + batchSize, globalCities.length);
            setStatus(
                `Loading global weather: ${checked}/${globalCities.length} checked · ${successful} loaded`
            );
        }

        const hyderabad = weatherMarkers.find(
            (item) => item.city.name === "Hyderabad"
        );

        if (hyderabad) {
            await selectCity(hyderabad.city, hyderabad.weather, false, false);
        }

        if (failedCities.length === 0) {
            setStatus(`${successful}/${globalCities.length} global locations loaded successfully.`);
        } else {
            setStatus(
                `${successful}/${globalCities.length} locations loaded; ${failedCities.length} failed. See console for details.`
            );
            console.warn("WeatherPulse failed city requests:", failedCities);
            console.table(failedCities);
        }

        console.info(`WeatherPulse result: ${successful}/${globalCities.length} cities loaded.`);
        console.info(`WeatherPulse markers on map: ${weatherMarkers.length}`);
    } finally {
        isLoadingGlobalWeather = false;
    }
}

// ---------- MAP LAYER CONTROL ----------
function updateMapLayer(layer) {
    const validLayers = ["temperature", "rain", "wind"];
    if (!validLayers.includes(layer)) return;

    selectedLayer = layer;

    document.querySelectorAll(".layer-btn").forEach((button) => {
        button.classList.remove("active");
    });

    const buttonIds = {
        temperature: "temperatureLayer",
        rain: "rainLayer",
        wind: "windLayer"
    };

    $(buttonIds[layer]).classList.add("active");

    weatherMarkers.forEach((item) => {
        item.marker.setStyle({ fillColor: getMarkerColor(item.weather) });
    });

    const settings = {
        temperature: {
            title: "Temperature",
            labels: ["Cold", "Moderate", "Hot"],
            gradient: "linear-gradient(90deg, #38a9ef, #43d6bd, #a5d957, #ffc34d, #ff684d)"
        },
        rain: {
            title: "Precipitation",
            labels: ["None", "Light", "Heavy"],
            gradient: "linear-gradient(90deg, #687385, #55c7ed, #378bfa, #9a69ed)"
        },
        wind: {
            title: "Wind speed",
            labels: ["Low", "Moderate", "High"],
            gradient: "linear-gradient(90deg, #54d6a0, #f1c65b, #f36c55)"
        }
    };

    const selected = settings[layer];
    document.querySelector(".map-legend p").textContent = selected.title;

    document.querySelectorAll(".legend-labels span").forEach((element, index) => {
        element.textContent = selected.labels[index];
    });

    document.querySelector(".legend-gradient").style.background = selected.gradient;
}

// ---------- SELECT A CITY ----------
async function selectCity(city, suppliedWeather = null, shouldFly = true, updateStatus = true) {
    if (updateStatus) setStatus(`Loading weather for ${city.name}...`);

    try {
        const weather = suppliedWeather || await getWeather(city.lat, city.lon);
        const current = weather.current;
        const [description, icon] = getWeatherInfo(current.weather_code);

        $("cityName").textContent = `${city.name}, ${city.country}`;
        $("condition").textContent = `${icon} ${description}`;
        $("temperature").textContent = `${current.temperature_2m}°C`;
        $("feelsLike").textContent = `${current.apparent_temperature}°C`;
        $("humidity").textContent = `${current.relative_humidity_2m}%`;
        $("windSpeed").textContent = `${current.wind_speed_10m} km/h`;
        $("pressure").textContent = `${current.surface_pressure} hPa`;
        $("precipitation").textContent = `${current.precipitation} mm`;
        $("forecastLocation").textContent = city.name;

        displayForecast(weather);

        if (shouldFly && map) {
            map.flyTo([city.lat, city.lon], 5, { duration: 1.2 });
        }

        if (updateStatus) {
            setStatus(`Weather updated for ${city.name}, ${city.country}.`);
        }

        return weather;
    } catch (error) {
        console.error(`WeatherPulse could not load ${city.name}:`, error);
        if (updateStatus) setStatus(error.message);
        return null;
    }
}

// ---------- SEVEN-DAY FORECAST ----------
function displayForecast(weather) {
    const container = $("forecastTimeline");
    container.replaceChildren();

    const daily = weather.daily;
    const days = Math.min(
        daily.time.length,
        daily.weather_code.length,
        daily.temperature_2m_max.length,
        daily.temperature_2m_min.length
    );

    for (let index = 0; index < days; index++) {
        const [description, icon] = getWeatherInfo(daily.weather_code[index]);

        const dayName = index === 0
            ? "Today"
            : new Date(`${daily.time[index]}T00:00:00`).toLocaleDateString(
                "en-IN",
                { weekday: "short" }
            );

        const card = document.createElement("div");
        card.className = "forecast-day";

        const day = document.createElement("span");
        day.textContent = dayName;

        const weatherIcon = document.createElement("div");
        weatherIcon.className = "forecast-icon";
        weatherIcon.textContent = icon;
        weatherIcon.title = description;

        const maximum = document.createElement("strong");
        maximum.textContent = `${Math.round(daily.temperature_2m_max[index])}°C`;

        const minimum = document.createElement("small");
        minimum.textContent = `Low ${Math.round(daily.temperature_2m_min[index])}°`;

        card.append(day, weatherIcon, maximum, minimum);
        container.appendChild(card);
    }
}

// ---------- CITY SEARCH ----------
async function searchCity(cityName) {
    const query = cityName.trim();

    if (!query) {
        setStatus("Please enter a city name.");
        cityInput.focus();
        return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";

    try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.search = new URLSearchParams({
            name: query,
            count: "1",
            language: "en",
            format: "json"
        });

        const data = await fetchJson(url);

        if (!data.results?.length) {
            throw new Error("City not found. Try another name.");
        }

        const result = data.results[0];
        const city = {
            name: result.name,
            country: result.country || "Unknown",
            lat: result.latitude,
            lon: result.longitude
        };

        await selectCity(city);
    } catch (error) {
        console.error("WeatherPulse city search failed:", error);
        setStatus(error.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = "Search";
    }
}

// ---------- USER LOCATION ----------
function locateUser() {
    if (!navigator.geolocation) {
        setStatus("Geolocation is not supported by this browser.");
        return;
    }

    setStatus("Requesting location permission...");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const city = {
                name: "My Location",
                country: "Current position",
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };

            await selectCity(city);
        },
        (error) => {
            const messages = {
                1: "Location permission was denied. Allow access in browser settings.",
                2: "Your location could not be determined.",
                3: "Location request timed out. Try again."
            };
            setStatus(messages[error.code] || "Location is unavailable.");
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
}

// ---------- EVENT LISTENERS ----------
searchBtn.addEventListener("click", () => searchCity(cityInput.value));

cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchCity(cityInput.value);
});

$("temperatureLayer").addEventListener("click", () => updateMapLayer("temperature"));
$("rainLayer").addEventListener("click", () => updateMapLayer("rain"));
$("windLayer").addEventListener("click", () => updateMapLayer("wind"));
locateBtn.addEventListener("click", locateUser);

// ---------- START APPLICATION ----------
console.info("WEATHERPULSE UPDATED SCRIPT LOADED");
console.info("Configured city count:", globalCities.length);
initializeMap();
