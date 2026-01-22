import mongoose from "mongoose";
import TechnicianProfile from "../Schemas/TechnicianProfile.js";
import TechnicianKyc from "../Schemas/TechnicianKYC.js";

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Find eligible technicians for a given service + customer location.
 * Rules:
 * - workStatus=approved
 * - profileComplete=true
 * - availability.isOnline=true
 * - skill match on serviceId
 * - KYC verificationStatus=approved
 * - if coordinates available, prefer nearby (nearSphere)
 * - fallback to pincode/city match when geo not possible
 */
export const findEligibleTechniciansForService = async ({
  serviceId,
  address = {},
  radiusMeters = 5000,
  limit = 50,
  enableGeo = true,
  session,
} = {}) => {
  if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
    return [];
  }

  const serviceObjectId = new mongoose.Types.ObjectId(serviceId);

  let approvedKycQuery = TechnicianKyc.find({ verificationStatus: "approved" }).select(
    "technicianId"
  );
  if (session) approvedKycQuery = approvedKycQuery.session(session);
  const approvedKyc = await approvedKycQuery;

  const approvedTechnicianIds = approvedKyc
    .map((d) => d.technicianId)
    .filter(Boolean);

  if (approvedTechnicianIds.length === 0) {
    return [];
  }

  const baseQuery = {
    _id: { $in: approvedTechnicianIds },
    workStatus: "approved",
    profileComplete: true,
    trainingCompleted: true, // 🔒 Only trained technicians receive broadcasts
    "availability.isOnline": true,
    "skills.serviceId": serviceObjectId,
  };

  const lat = Number(address?.latitude);
  const lng = Number(address?.longitude);

  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  // 1) Prefer geo query when possible (requires technicians to have `location`)
  if (enableGeo && hasCoords) {
    const geoQuery = {
      ...baseQuery,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radiusMeters,
        },
      },
    };

    let nearbyQuery = TechnicianProfile.find(geoQuery).select("_id").limit(limit);
    if (session) nearbyQuery = nearbyQuery.session(session);
    const nearby = await nearbyQuery;

    if (nearby.length > 0) return nearby;
  }

  // 2) Fallback: pincode / city matching (no coordinates available or no geo matches)
  const fallbackQuery = { ...baseQuery };

  if (address?.pincode) {
    fallbackQuery.pincode = String(address.pincode).trim();
  } else if (address?.city) {
    fallbackQuery.city = new RegExp(`^${escapeRegExp(String(address.city).trim())}$`, "i");
  } else if (address?.state) {
    fallbackQuery.state = new RegExp(`^${escapeRegExp(String(address.state).trim())}$`, "i");
  }

  let fallbackFindQuery = TechnicianProfile.find(fallbackQuery)
    .select("_id")
    .limit(limit);
  if (session) fallbackFindQuery = fallbackFindQuery.session(session);
  return fallbackFindQuery;
};
