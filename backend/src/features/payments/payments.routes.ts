import { Router } from "express";
import express from "express";
import * as paymentsController from "./payments.controller.js";

const router = Router();

router.post("/webhook", express.raw({ type: "*/*" }), paymentsController.handleWebhook);

export default router;
