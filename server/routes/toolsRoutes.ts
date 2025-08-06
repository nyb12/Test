import express, { Request, Response } from "express";
import { storage } from "../storage";

const router = express.Router();



// Get all tools with optional filtering by showWithGreeting and showInToolbox
router.get("/", async (req: Request, res: Response) => {
  try {
    const options: any = {};
    
    if (req.query.showWithGreeting !== undefined) {
      options.showWithGreeting = req.query.showWithGreeting === 'true';
    }
    
    if (req.query.showInToolbox !== undefined) {
      options.showInToolbox = req.query.showInToolbox === 'true';
    }
    
    const tools = await storage.getTools(options);
    
    // Ensure FleetSpan has the bypass flag set correctly
    const processedTools = tools.map((tool: any) => {
      if (tool.name === 'FleetSpan') {
        return {
          ...tool,
          bypassselectiveactionwhenaircraftiselected: true
        };
      }
      return tool;
    });
    
    console.log('FleetSpan processed tool:', processedTools.find((t: any) => t.name === 'FleetSpan'));
    
    res.status(200).json(processedTools);
  } catch (error) {
    console.error(`Error fetching tools: ${error}`);
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});

export default router;