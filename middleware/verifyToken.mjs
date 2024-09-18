import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to the request (optional)
    next();
  } catch (err) {
    console.log("THIS IS THE ERROR", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
