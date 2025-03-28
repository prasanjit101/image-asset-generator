# Image Asset Generator MCP Server Documentation

## Overview

This MCP server provides a tool (`generate_images`) to generate multiple images based on text descriptions and save them to a specified output folder.

## Features

*   **Multiple Image Generation:** Generate several images in parallel from a list of descriptions and filenames.
*   **Dual Provider Support:** Supports image generation using either:
    *   OpenAI DALL-E 3
    *   Google Gemini (currently targeting `gemini-1.5-flash-latest`)
*   **Automatic Provider Selection:** The server automatically detects which service to use based on the environment variables provided when starting the server.

## Configuration

The server requires an API key for one of the supported image generation services. Set **one** of the following environment variables:

*   `OPENAI_API_KEY`: Your API key for OpenAI services.
*   `GEMINI_API_KEY`: Your API key for Google Cloud / Gemini services.

**Priority:**

1.  If `GEMINI_API_KEY` is set, Google Gemini will be used.
2.  If only `OPENAI_API_KEY` is set, OpenAI DALL-E 3 will be used.
3.  If **neither** key is set, the server will log an error and exit upon startup.
4.  It is recommended to set only the key for the service you intend to use.

## Tools

### `generate_images`

Generates multiple images and saves them.

**Description:** Generates multiple images from text descriptions and saves them to a specified folder. Uses either OpenAI or Gemini based on the configured API key.

**Input Schema:**

```json
{
  "outputFolder": "string (folder path)",
  "images": [
    {
      "description": "string (text description of the image)",
      "filename": "string (desired filename without extension)"
    }
  ]
}
```

**Output:**

Returns a JSON object detailing the success or failure of each image generation attempt.

```json
{
  "overallSuccess": "boolean",
  "results": [
    {
      "success": "boolean",
      "filePath": "string (path to saved image, if successful)",
      "error": "string (error message, if failed)",
      "description": "string (original description)",
      "filename": "string (original filename)"
    }
    // ... more results
  ]
}
```

**Note on Gemini Implementation:** The current integration with Gemini uses the `generateContent` method and includes placeholder logic for extracting image data from the response. This part may require adjustments based on the official Gemini image generation API specifications and response structure.
