import axios from "axios";

import logger from "../utils/logger.js";

const TAG = "WeatherTool";

const WMO_CODES = {
    0:   "Clear sky",
    1:   "Mainly clear",
    2:   "Partly cloudy",
    3:   "Overcast",
    45:  "Foggy",
    48:  "Rime fog",
    51:  "Light drizzle",
    53:  "Moderate drizzle",
    55:  "Dense drizzle",
    61:  "Slight rain",
    63:  "Moderate rain",
    65:  "Heavy rain",
    71:  "Slight snow",
    73:  "Moderate snow",
    75:  "Heavy snow",
    77:  "Snow grains",
    80:  "Slight showers",
    81:  "Moderate showers",
    82:  "Violent showers",
    85:  "Slight snow showers",
    86:  "Heavy snow showers",
    95:  "Thunderstorm",
    96:  "Thunderstorm with slight hail",
    99:  "Thunderstorm with heavy hail",
};

async function geocodeCity(city) {
    const response = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
        params:  { name: city, count: 1, language: "en", format: "json" },
        timeout: 10_000,
    });

    const results = response.data.results;

    if (!results || results.length === 0) {
        throw new Error(`City not found: "${city}". Try a more specific name.`);
    }

    const location = results[0];
    return {
        name:      location.name,
        country:   location.country,
        latitude:  location.latitude,
        longitude: location.longitude,
    };
}

export default {
    name: "get_weather",

    description:
        "Get the current weather conditions and a 3-day forecast for any city in the world. " +
        "Returns temperature, humidity, wind speed, and weather description. " +
        "Use this whenever the user asks about weather, temperature, or forecast. " +
        "This tool is free and requires no API key.",

    parameters: {
        city: {
            type:        "string",
            description: "The city name to get weather for (e.g., 'Tokyo', 'New York', 'London').",
            required:    true,
        },
        unit: {
            type:        "string",
            description: "Temperature unit: 'celsius' (default) or 'fahrenheit'.",
            required:    false,
            enum:        ["celsius", "fahrenheit"],
        },
    },

    async execute({ city, unit = "celsius" }) {
        if (!city || typeof city !== "string") {
            return { error: "A city name is required to fetch weather." };
        }

        logger.info(`Fetching weather for: ${city}`, TAG);

        let location;
        try {
            location = await geocodeCity(city.trim());
        } catch (geoError) {
            return { error: geoError.message };
        }

        const tempUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
        const tempSymbol = tempUnit === "fahrenheit" ? "°F" : "°C";

        const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
            params: {
                latitude:              location.latitude,
                longitude:             location.longitude,
                current:               [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "apparent_temperature",
                    "weather_code",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "precipitation",
                ].join(","),
                daily:                 [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                ].join(","),
                temperature_unit:      tempUnit,
                wind_speed_unit:       "kmh",
                precipitation_unit:    "mm",
                timezone:              "auto",
                forecast_days:         4,
            },
            timeout: 15_000,
        });

        const current = response.data.current;
        const daily   = response.data.daily;

        const forecast = daily.time.slice(1, 4).map((date, i) => ({
            date:       date,
            condition:  WMO_CODES[daily.weather_code[i + 1]] ?? "Unknown",
            tempMax:    `${daily.temperature_2m_max[i + 1]}${tempSymbol}`,
            tempMin:    `${daily.temperature_2m_min[i + 1]}${tempSymbol}`,
            precipitation: `${daily.precipitation_sum[i + 1]} mm`,
        }));

        return {
            location: `${location.name}, ${location.country}`,
            current: {
                condition:        WMO_CODES[current.weather_code] ?? "Unknown",
                temperature:      `${current.temperature_2m}${tempSymbol}`,
                feelsLike:        `${current.apparent_temperature}${tempSymbol}`,
                humidity:         `${current.relative_humidity_2m}%`,
                windSpeed:        `${current.wind_speed_10m} km/h`,
                windDirection:    `${current.wind_direction_10m}°`,
                precipitation:    `${current.precipitation} mm`,
            },
            forecast,
        };
    },
};
