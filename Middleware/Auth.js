import jwt from "jsonwebtoken";
import User from "../Schemas/User.js";

export const Auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"], // prevents alg attack
    });

    // Attach ONLY what is needed
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired",
    });
  }
};


// 🔹 Role-based access middleware
export const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Authorization header missing", result: "Missing authorization header" });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, message: "Invalid authorization format", result: "Token must be in Bearer format" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"], // prevents alg attack
      });

      // ✅ Note: use userId, not id
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found", result: "No user exists with this ID" });
      }

      // ✅ Case-insensitive role check
      const isAllowed = allowedRoles
        .map((r) => r.toLowerCase())
        .includes(user.role.toLowerCase());

      if (!isAllowed) {
        return res
          .status(403)
          .json({ success: false, message: `Access denied: ${allowedRoles.join(", ")} only`, result: "Insufficient permissions" });
      }

      // Attach user info to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Token invalid or expired", result: "Authentication failed" });
    }
  };
};
