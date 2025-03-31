## Image generator MCP Server

This MCP server provides a tool to generate image assets based on natural language descriptions using either OpenAI's DALL-E 3 or Google's Gemini API. It automatically selects the service based on the provided API key.

## Features

-   Generate multiple image assets from text descriptions in parallel.
-   Supports image generation via OpenAI (DALL-E 3) or Google Gemini (currently `gemini-2.0-flash-exp-image-generation`).
-   Automatically detects which service to use based on environment variable configuration.
-   Saves generated images (as PNG) to a specified output folder.
-   Returns detailed results for each image generation attempt.

## Prerequisites

-   Node.js (check `package.json` for specific engine requirements if any)
-   npm or yarn
-   An API key for either OpenAI or Google Gemini.

## Installation

1.  Clone the repository (if applicable).
2.  Navigate to the project directory.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Build the server:
    ```bash
    npm run build
    ```

## Tools

### `generate_images`

**Description:** Generates multiple images from text descriptions and saves them to a specified folder. Uses either OpenAI or Gemini based on the configured API key.

**Args:**

-   `outputFolder` (string): The path to the folder where the generated images should be saved. The folder will be created if it doesn't exist.
-   `images` (array of objects): An array containing details for each image to be generated. Each object has:
    -   `description` (string): The natural language text description of the image.
    -   `filename` (string): The desired name for the output file (without the `.png` extension).

**Input Schema Example:**

```json
{
  "outputFolder": "path/to/your/assets",
  "images": [
    {
      "description": "A futuristic cityscape at sunset",
      "filename": "cityscape_sunset"
    },
    {
      "description": "A cute robot waving hello",
      "filename": "friendly_robot"
    }
  ]
}
```

**Returns:**

A JSON object containing the overall success status and individual results for each requested image.

**Return Schema Example (Success):**

```json
{
  "overallSuccess": true,
  "results": [
    {
      "success": true,
      "filePath": "path/to/your/assets/cityscape_sunset.png",
      "description": "A futuristic cityscape at sunset",
      "filename": "cityscape_sunset"
    },
    {
      "success": true,
      "filePath": "path/to/your/assets/friendly_robot.png",
      "description": "A cute robot waving hello",
      "filename": "friendly_robot"
    }
  ]
}
```

**Return Schema Example (Partial Failure):**

```json
{
  "overallSuccess": false,
  "results": [
    {
      "success": true,
      "filePath": "path/to/your/assets/cityscape_sunset.png",
      "description": "A futuristic cityscape at sunset",
      "filename": "cityscape_sunset"
    },
    {
      "success": false,
      "error": "Could not extract image data from Gemini response",
      "description": "A cute robot waving hello",
      "filename": "friendly_robot"
    }
  ]
}
```

## Configuration

The server requires an API key for one of the supported image generation services. Set **one** of the following environment variables when running the server (e.g., via MCP settings):

-   `OPENAI_API_KEY`: Your API key for OpenAI services.
-   `GEMINI_API_KEY`: Your API key for Google Cloud / Gemini services.

**Priority:**

1.  If `GEMINI_API_KEY` is set, Google Gemini will be used.
2.  If only `OPENAI_API_KEY` is set, OpenAI DALL-E 3 will be used.
3.  If **neither** key is set, the server will log an error and exit upon startup.
4.  It is recommended to set only the key for the service you intend to use.

## Development

-   The server is written in TypeScript (`src/index.ts`).
-   Compile the TypeScript code to JavaScript using:
    ```bash
    npm run build
    ```
    This will output the executable file to the `build/` directory.
-   To run the compiled server directly:
    ```bash
    node build/index.js
    ```
    (Ensure API keys are set in the environment).

## Dependencies

-   `@google/generative-ai`: Google Gemini API client library.
-   `@modelcontextprotocol/sdk`: MCP SDK for building servers.
-   `fs-extra`: Used for file system operations (like ensuring directory existence). *(Note: The code currently uses native `fs` promises, not `fs-extra`)*
-   `openai`: OpenAI API client library.
-   `zod`: Schema validation library used for tool inputs.

## Contributing

Pull requests welcome! Open an issue to discuss changes first.
