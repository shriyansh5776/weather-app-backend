import { Router } from "express";
import {
  getCurrent,
  getHourly,
  getWeekly,
  getAirQuality,
  getByCity,
  getGeocode,
  getReverseGeocode,
} from "../../controllers/weather-controller/weather.controller.js";

const weatherRouter = Router();
weatherRouter.get("/current", getCurrent);
weatherRouter.get("/hourly", getHourly);
weatherRouter.get("/weekly", getWeekly);
weatherRouter.get("/weekly", getWeekly);
weatherRouter.get("/air-quality", getAirQuality);
weatherRouter.get("/by-city", getByCity);
weatherRouter.get("/geocode", getGeocode);
weatherRouter.get("/reverse-geocode", getReverseGeocode);
export default weatherRouter;
