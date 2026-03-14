import { Request, Response, NextFunction } from "express";

// [5.4] Factory function for Dynamic RBAC — restrictTo('admin', 'instructor')
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        status: "error",
        message: `Access denied. This route is restricted to: ${roles.join(", ")}.`,
      });
      return;
    }
    next();
  };
};
