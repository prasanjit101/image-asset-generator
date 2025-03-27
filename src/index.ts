#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create MCP server
const server = new McpServer({
  name: "image-asset-generator",
  version: "1.0.0"
});

// Define the image generation tool
server.tool(
  "generate_image",
  "Generates an image from a text description and saves it to a file",
  { // Pass the schema properties directly (ZodRawShape)
    description: z.string().describe("Text description of the image to generate"),
    outputFolder: z.string().describe("The folder path where the image should be saved"),
    filename: z.string().describe("The desired filename for the image (without extension)")
  },
  async (args) => { // Handler receives validated arguments directly
    const { description, outputFolder, filename } = args; // Destructure from the args object
    try {
      // Generate image using DALL-E
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: description,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      });

      const imageData = response.data[0].b64_json;
      if (!imageData) {
        throw new Error("No image data received from OpenAI");
      }

      // Ensure output directory exists
      await mkdir(outputFolder, { recursive: true });

      // Save image to file
      const filePath = path.join(outputFolder, `${filename}.png`);
      const buffer = Buffer.from(imageData, "base64");
      await writeFile(filePath, buffer);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            filePath: filePath,
            description: description
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          })
        }],
        isError: true
      };
    }
  }
);

// Start the server with stdio transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("Image Asset Generator MCP server running");
}).catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
