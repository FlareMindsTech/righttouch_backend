import jwt from "jsonwebtoken";


export const Auth = async (req, res, next) => {
  const token = req.headers.token; 

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  if (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
  // console.log("Decoded token:", decoded);
  req.user = decoded;
  next();
  });
  } 
  else {
    return res.status(401).json({ message: "Authorization token required" });
  }
};



export const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await UserSchema.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!allowedRoles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
        return res.status(403).json({ message: `Access denied: ${allowedRoles.join(", ")} only` });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Token invalid or expired" });
    }
  };
};