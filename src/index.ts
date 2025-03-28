#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// --- API Key Check and Client Initialization ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let imageGeneratorService: 'openai' | 'gemini' | null = null;
let openai: OpenAI | null = null;
let genAI: GoogleGenerativeAI | any = null;

console.log("OPENAI_API_KEY", OPENAI_API_KEY);
console.log("GEMINI_API_KEY", GEMINI_API_KEY);

if (GEMINI_API_KEY) {
  console.log("Using Google Gemini API Key.");
  imageGeneratorService = 'gemini';
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else if (OPENAI_API_KEY) {
  console.log("Using OpenAI API Key.");
  imageGeneratorService = 'openai';
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.error("Error: No API Key found. Please set either OPENAI_API_KEY or GEMINI_API_KEY environment variable.");
  process.exit(1); // Exit if no key is provided
}
// --- End API Key Check ---


// Create MCP server
const server = new McpServer({
  name: "image-asset-generator",
  version: "1.0.0"
});

// Define the multiple image generation tool
server.tool(
  "generate_images",
  "Generates multiple images from text descriptions and saves them to a specified folder",
  {
    outputFolder: z.string().describe("The folder path where the images should be saved"),
    images: z.array(z.object({
      description: z.string().describe("Text description of the image to generate"),
      filename: z.string().describe("The desired filename for the image (without extension)")
    })).describe("An array of image descriptions and filenames")
  },
  async (args) => {
    const { outputFolder, images } = args;
    console.log(`Received request to generate ${images.length} images in folder: ${outputFolder}`);

    try {
      // Ensure output directory exists
      await mkdir(outputFolder, { recursive: true });
      console.log(`Ensured output directory exists: ${outputFolder}`);

      // Generate images in parallel
      const generationPromises = images.map(async (imageInfo) => {
        const { description, filename } = imageInfo;
        const filePath = path.join(outputFolder, `${filename}.png`);
        console.log(`Generating image for: ${description} -> ${filename}.png using ${imageGeneratorService}`);

        try {
          let buffer: Buffer | undefined;

          if (imageGeneratorService === 'openai' && openai) {
            // --- OpenAI Logic ---
            console.log(`[OpenAI] Requesting image for: "${description}"`);
            const response = await openai.images.generate({
              model: "dall-e-3",
              prompt: description,
              n: 1,
              size: "1024x1024", // Consider if Gemini needs different sizes
              response_format: "b64_json"
            });

            const imageData = response.data[0].b64_json;
            if (!imageData) {
              console.error(`[OpenAI] No image data received for: ${description}`);
              throw new Error("No image data received from OpenAI");
            }
            buffer = Buffer.from(imageData, "base64");
            console.log(`[OpenAI] Received image data for: "${description}"`);
            // --- End OpenAI Logic ---

          } else if (imageGeneratorService === 'gemini' && genAI) {
            // --- Gemini Logic ---
            console.log(`[Gemini] Requesting image for: "${description}"`);
            const model = genAI.getGenerativeModel({
              model: "gemini-2.0-flash-exp-image-generation",
              generationConfig: {
                responseModalities: ['Text', 'Image']
              },
              temperature: 0.6,
              responseMimeType: "text/plain",
            });

            const response = await model.generateContent(`Generate an image based on the following description: ${description}. Output format should be suitable for saving as a PNG file.`);

            const candidates = response.response.candidates;
            if (!candidates || candidates.length === 0) {
              throw new Error('No candidates in response');
            }

            const parts = candidates[0].content.parts;
            if (!parts) {
              throw new Error('No parts in response');
            }

            for (const part of parts) {
              if (part.inlineData) {
                const imageData = part.inlineData.data;
                console.log("Received image data, length:", imageData.length);
                buffer = Buffer.from(imageData, "base64");
                console.log(`[Gemini] Received image data for: "${description}"`);
              } else {
                console.error(`[Gemini] No image data found in response for: ${description}`);
                throw new Error("Could not extract image data from Gemini response");
              }
            }
          } else {
            throw new Error("Image generation service not properly initialized.");
          }

          if (!buffer) {
            throw new Error("Failed to generate image buffer");
          }

          // Save image to file (common logic)
          await writeFile(filePath, buffer);
          console.log(`Successfully saved image: ${filePath}`);

          return {
            success: true,
            filePath: filePath,
            description: description,
            filename: filename
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error during image generation";
          console.error(`Error generating image for "${description}": ${errorMessage}`);
          return {
            success: false,
            error: errorMessage,
            description: description,
            filename: filename
          };
        }
      });

      // Wait for all promises to settle
      const results = await Promise.all(generationPromises);
      console.log("All image generation attempts finished.");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            overallSuccess: results.every(r => r.success),
            results: results
          })
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error during setup or processing";
      console.error(`Overall error: ${errorMessage}`);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            overallSuccess: false,
            error: errorMessage,
            results: images.map(img => ({ // Return failure status for all requested images
              success: false,
              error: "Processing failed before generation attempt",
              description: img.description,
              filename: img.filename
            }))
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
