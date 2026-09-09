import { Router } from "express";
import { sendSuccess } from "#shared/utils/response.js";

const router = Router();

/**
 * GET /api/health
 *
 * Returns 200 {"success":true,"statusCode":200,"message":"OK","data":{"status":"ok"}}
 * Used by load balancers and smoke tests to verify the process is alive.
 * Does NOT check the database — if you need a readiness probe (DB connectivity),
 * add GET /api/ready separately.
 */
router.get("/", (_req, res) => {
  sendSuccess(res, { status: "ok" }, "OK");
});

export default router;
