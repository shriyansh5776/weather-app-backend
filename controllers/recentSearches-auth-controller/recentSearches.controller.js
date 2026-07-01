import RecentSearch from "../../validators/recentSearches.schema.js";
import { errorResponse,successResponse } from "../../utils/Response.js";
async function getRecentSearches(req, res) {
  try {
    const searches = await RecentSearch.find({
      user_id: req.user.id,
    }).sort({ searched_at: -1 });

    return successResponse(
      res,
      200,
      "Recent searches fetched successfully",
      {
        recent_searches: searches,
      }
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function postRecentSearch(req, res) {
  try {
    const {
      query,
      latitude,
      longitude,
      resolved_name,
    } = req.body;

    if (
      !query ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return errorResponse(
        res,
        400,
        "Required fields are missing."
      );
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return errorResponse(
        res,
        400,
        "Invalid coordinates."
      );
    }

    const recentSearch = await RecentSearch.create({
      user_id: req.user.id,
      query,
      latitude,
      longitude,
      resolved_name,
    });

    const count = await RecentSearch.countDocuments({
      user_id: req.user.id,
    });

    if (count > 25) {
      const oldSearches = await RecentSearch.find({
        user_id: req.user.id,
      })
        .sort({ searched_at: 1 })
        .limit(count - 25);

      const ids = oldSearches.map((item) => item._id);

      await RecentSearch.deleteMany({
        _id: { $in: ids },
      });
    }

    return successResponse(
      res,
      201,
      "Recent search added successfully",
      {
        recent_search: recentSearch,
      }
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function deleteRecentSearch(req, res) {
  try {
    const { id } = req.params;

    const search = await RecentSearch.findOne({
      id,
      user_id: req.user.id,
    });

    if (!search) {
      return errorResponse(
        res,
        404,
        "Recent search not found."
      );
    }

    await search.deleteOne();

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function clearRecentSearches(req, res) {
  try {
    await RecentSearch.deleteMany({
      user_id: req.user.id,
    });

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

export {getRecentSearches,deleteRecentSearch,clearRecentSearches,postRecentSearch}