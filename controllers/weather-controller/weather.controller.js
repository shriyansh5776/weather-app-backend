import axios from "axios";
import { errorResponse, successResponse } from "../../utils/Response.js";

async function getCurrent(req, res) {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    const unit = req.query.units || "metric";
    const language = req.query.lang || "en";
    if (!["metric", "imperial"].includes(unit)) {
      return errorResponse(res, 400, "Invalid units.");
    }
    if (!lat || !lon) {
      return errorResponse(res, 400, "Latitude and longitude are required.");
    }
    if (
      Number(lat) < -90 ||
      Number(lat) > 90 ||
      Number(lon) < -180 ||
      Number(lon) > 180
    ) {
      return errorResponse(res, 400, "Invalid coordinates.");
    }
    const temperatureUnit = unit === "imperial" ? "fahrenheit" : "celsius";
    const windSpeedUnit = unit === "imperial" ? "mph" : "kmh";
    let weather;
    try {
      const {
        data: { current },
      } = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}&timezone=auto`,
      );
      weather = data;
    } catch (error) {
      return errorResponse(res, 502, "Weather service unavailable.");
    }
    const current = weather.current;
    const userResponse = {
      temperature: current.temperature_2m,
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind: current.wind_speed_10m,
      pressure: current.surface_pressure,
      condition_code: current.weather_code,
      observation_time: current.time,
    };
    return successResponse(res, 200, "Data fetched successfully", userResponse);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getHourly(req, res) {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    const unit = req.query.units || "metric";
    const language = req.query.lang || "en";
    const hours = Number(req.query.hours) || 24;

    if (!["metric", "imperial"].includes(unit)) {
      return errorResponse(res, 400, "Invalid units.");
    }

    if (!lat || !lon) {
      return errorResponse(res, 400, "Latitude and longitude are required.");
    }

    if (
      Number(lat) < -90 ||
      Number(lat) > 90 ||
      Number(lon) < -180 ||
      Number(lon) > 180
    ) {
      return errorResponse(res, 400, "Invalid coordinates.");
    }

    if (hours < 24 || hours > 48) {
      return errorResponse(res, 400, "Hours must be between 24 and 48.");
    }

    const temperatureUnit = unit === "imperial" ? "fahrenheit" : "celsius";
    const windSpeedUnit = unit === "imperial" ? "mph" : "kmh";

    let hourly;

    try {
      const {
        data: { hourly: hourlyData },
      } = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m&forecast_hours=${hours}&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}&timezone=auto`,
      );

      hourly = hourlyData;
    } catch (error) {
      return errorResponse(res, 502, "Weather service unavailable.");
    }

    const userResponse = {
      hourly: hourly.time.map((time, index) => ({
        time,
        temperature: hourly.temperature_2m[index],
        feels_like: hourly.apparent_temperature[index],
        humidity: hourly.relative_humidity_2m[index],
        wind: hourly.wind_speed_10m[index],
        pressure: hourly.surface_pressure[index],
        condition_code: hourly.weather_code[index],
      })),
    };

    return successResponse(
      res,
      200,
      "Hourly forecast fetched successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getWeekly(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const days = Number(req.query.days) || 7;
    const unit = req.query.units || "metric";
    const lang = req.query.lang || "en";
    if (!["metric", "imperial"].includes(unit)) {
      return errorResponse(res, 400, "Invalid units.");
    }
    if (isNaN(lat) || isNaN(lon)) {
      return errorResponse(res, 400, "Latitude and longitude are required.");
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return errorResponse(res, 400, "Invalid coordinates.");
    }
    if (days < 7 || days > 14) {
      return errorResponse(res, 400, "Days must be between 7 and 14.");
    }
    const temperatureUnit = unit === "imperial" ? "fahrenheit" : "celsius";
    const windSpeedUnit = unit === "imperial" ? "mph" : "kmh";
    let daily;
    try {
      const {
        data: { daily: dailyData },
      } = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&forecast_days=${days}&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}&timezone=auto`,
      );
      daily = dailyData;
    } catch (error) {
      return errorResponse(res, 502, "Weather service unavailable.");
    }
    const userResponse = {
      weekly: daily.time.map((time, index) => ({
        date: time,
        max_temperature: daily.temperature_2m_max[index],
        min_temperature: daily.temperature_2m_min[index],
        max_wind: daily.wind_speed_10m_max[index],
        condition_code: daily.weather_code[index],
      })),
    };
    return successResponse(
      res,
      200,
      "Weekly forecast fetched successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function getAirQuality(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return errorResponse(res, 400, "Latitude and longitude are required.");
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return errorResponse(res, 400, "Invalid coordinates.");
    }
    let airQuality;
    try {
      const {
        data: { hourly },
      } = await axios.get(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=auto`,
      );
      airQuality = hourly;
    } catch (error) {
      return errorResponse(res, 502, "Air quality service unavailable.");
    }
    const userResponse = {
      observation_time: airQuality.time[0],
      aqi: airQuality.us_aqi[0],
      pollutants: {
        pm2_5: airQuality.pm2_5[0],
        pm10: airQuality.pm10[0],
        o3: airQuality.ozone[0],
        no2: airQuality.nitrogen_dioxide[0],
        so2: airQuality.sulphur_dioxide[0],
        co: airQuality.carbon_monoxide[0],
      },
    };
    return successResponse(
      res,
      200,
      "Air quality fetched successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getByCity(req, res) {
  try {
    const city = req.query.q;
    const unit = req.query.units || "metric";
    const language = req.query.lang || "en";
    if (!city) {
      return errorResponse(res, 400, "City name is required.");
    }
    if (!["metric", "imperial"].includes(unit)) {
      return errorResponse(res, 400, "Invalid units.");
    }
    const temperatureUnit = unit === "imperial" ? "fahrenheit" : "celsius";
    const windSpeedUnit = unit === "imperial" ? "mph" : "kmh";
    let location;
    try {
      const {
        data: { results },
      } = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city,
        )}&count=1&language=${language}&format=json`,
      );
      if (!results || results.length === 0) {
        return errorResponse(res, 404, "Unknown city.");
      }
      location = results[0];
    } catch (error) {
      return errorResponse(res, 502, "Geocoding service unavailable.");
    }
    let current;
    try {
      const {
        data: { current: weather },
      } = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}&timezone=auto`,
      );
      current = weather;
    } catch (error) {
      return errorResponse(res, 502, "Weather service unavailable.");
    }
    const userResponse = {
      location: {
        city: location.name,
        region: location.admin1,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      current: {
        temperature: current.temperature_2m,
        feels_like: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        wind: current.wind_speed_10m,
        pressure: current.surface_pressure,
        condition_code: current.weather_code,
        observation_time: current.time,
      },
    };
    return successResponse(
      res,
      200,
      "Weather fetched successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getGeocode(req, res) {
  try {
    const q = req.query.q;
    if (!q) {
      return errorResponse(res, 400, "Search query is required.");
    }
    let locations;
    try {
      const {
        data: { results },
      } = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q,
        )}&count=10&language=en&format=json`,
      );
      locations = results || [];
    } catch (error) {
      return errorResponse(res, 502, "Geocoding service unavailable.");
    }
    const userResponse = {
      locations: locations.map((location) => ({
        name: location.name,
        country: location.country,
        region: location.admin1,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
      })),
    };
    return successResponse(
      res,
      200,
      "Locations fetched successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getReverseGeocode(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return errorResponse(res, 400, "Latitude and longitude are required.");
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return errorResponse(res, 400, "Invalid coordinates.");
    }
    let location;
    try {
      const {
        data: { features },
      } = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${process.env.GEO_API_KEY}`,
      );
      if (!features || features.length === 0) {
        return errorResponse(res, 404, "Location not found.");
      }
      location = features[0].properties;
    } catch (error) {
      return errorResponse(res, 502, "Reverse geocoding service unavailable.");
    }
    const userResponse = {
      country: location.country,
      region: location.state,
      city:
        location.city || location.town || location.village || location.county,
      formatted_address: location.formatted,
    };
    return successResponse(
      res,
      200,
      "Location fetched successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

export {
  getCurrent,
  getHourly,
  getWeekly,
  getAirQuality,
  getByCity,
  getGeocode,
  getReverseGeocode,
};
