import { errorResponse, successResponse } from "../../utils/Response.js";
import favouriteModel from "../../validators/favourite.schema.js";
import FavouriteModel from "../../validators/favourite.schema.js";

async function getFavourites(req, res) {
  try {
    const favourites = await FavouriteModel.find({
      user_id: req.user.id,
    }).sort({ sort_order: 1 });

    return successResponse(res, 200, "Favorites fetched successfully", {
      favorites: favourites,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function postFavourites(req, res) {
  try {
    const { label, latitude, longitude, country_code, region, city } = req.body;
    if (
      !label ||
      latitude === undefined ||
      longitude === undefined ||
      !country_code
    ) {
      return errorResponse(res, 400, "Required fields are missing.");
    }
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return errorResponse(res, 400, "Invalid coordinates.");
    }
    const count = await FavouriteModel.countDocuments({
      user_id: req.user.id,
    });
    if (count >= 50) {
      return errorResponse(res, 422, "Favorites limit reached.");
    }
    const duplicate = await FavouriteModel.findOne({
      user_id: req.user.id,
      latitude,
      longitude,
    });
    if (duplicate) {
      return errorResponse(res, 409, "Favorite already exists.");
    }
    const last = await FavouriteModel.findOne({
      user_id: req.user.id,
    }).sort({ sort_order: -1 });
    const sort_order = last ? last.sort_order + 1 : 0;
    const favourite = await FavouriteModel.create({
      user_id: req.user.id,
      label,
      latitude,
      longitude,
      country_code,
      region,
      city,
      sort_order,
    });
    return successResponse(res, 201, "Favorite added successfully", {
      favorite: favourite,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function patchFavourite(req, res) {
  try {
    const { id } = req.params;
    const { label, sort_order } = req.body;
    if (label === undefined && sort_order === undefined) {
      return errorResponse(res, 400, "Nothing to update.");
    }
    const favourite = await favouriteModel.findOne({
      id,
      user_id: req.user.id,
    });
    if (!favourite) {
      return errorResponse(res, 404, "Favorite not found.");
    }
    if (label !== undefined) {
      favourite.label = label;
    }
    if (sort_order !== undefined) {
      favourite.sort_order = sort_order;
    }
    await favourite.save();
    return successResponse(res, 200, "Favorite updated successfully", {
      favorite: favourite,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function deleteFavourite(req, res) {
  try {
    const { id } = req.params;
    const favourite = await favouriteModel.findOne({
      id,
      user_id: req.user.id,
    });
    if (!favourite) {
      return errorResponse(res, 404, "Favorite not found.");
    }
    await favourite.deleteOne();
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

export { getFavourites, postFavourites,patchFavourite,deleteFavourite };
