import { Router, type IRouter } from "express";
import healthRouter from "./health";
import videosRouter from "./videos";
import plansRouter from "./plans";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plansRouter);
router.use("/openai", openaiRouter);
router.use(videosRouter);

export default router;
