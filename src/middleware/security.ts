import { NextFunction, Request, Response } from "express";
import aj from "../config/arcjet";
import {slidingWindow, ArcjetNodeRequest} from "@arcjet/node";


const securityMiddleware = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    if (process.env.NODE_ENV === "test") {
        return next();
    };

    try {
        const role: RateLimitRole = req.user?.role ?? "guest"

        let limit: number;
        let message: string;

        switch (role) {
            case "admin":
                limit = 20;
                message = "Admin requests are limited to 20 per minute. Please try again later.";
                break;
            case "teacher":
            case "student":
                limit = 10;
                message = "User requests limit exceeded (10 per minute), please try again later.";
                break;
            default:
                limit = 5;
                message = "Guest request limit exceeded (5 per minute), please try again later.";
        }

        const client = aj.withRule(
            slidingWindow({
                mode: "LIVE",
                interval: "1m",
                max: limit,
            })
        );

        const arcjetRequest: ArcjetNodeRequest = {
            method: req.method,
            headers: req.headers,
            url: req.originalUrl ?? req.url,
            socket: {
                remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
            },
        };

        const decision = await client.protect(arcjetRequest);

        if (decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Automated requests are not allowed.",
            });
        }

        if (decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Request blocked by security policy.",
            });
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(429).json({
                error: "Too many requests",
                message,
            });
        }

        next();
    } catch (error) {
        console.error("Arcjet middleware error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export default securityMiddleware;