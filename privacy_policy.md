# Privacy Policy for Page Summary

_Last updated: 2026-10-20_

## Overview

Page Summary is a Chrome extension that summarizes web page content using AI language model APIs (Claude, OpenAI, Gemini). This policy explains what data is handled and how.

## Data Collection

**We do not collect, store, or transmit any personal data to our own servers.**

Page Summary has no backend server. All data stays between your browser and the AI API providers you configure.

## Data Handled Locally

The following data is stored locally in your browser using Chrome's `storage` API:

- AI provider selection (Claude / OpenAI / Gemini)
- API keys you enter in the Options page
- Display preferences (summary length, popup size, etc.)
- Your configured save folder path for Markdown export (see below)

This data never leaves your device except as described below.

## Saving Summaries as Markdown Files

When you click "Markdownで保存" (Save as Markdown), the summary text is saved as a local `.md` file using Chrome's `downloads` API. This happens only when you explicitly click the button.

- The file is saved to your browser's configured download directory (optionally inside a subfolder you specify in the Options page).
- No file content is uploaded anywhere; this is purely a local file save using the browser's built-in download mechanism.
- Chrome's `downloads` API does not allow saving outside the download directory, so this feature cannot write to arbitrary locations on your device.

## Data Sent to Third-Party AI APIs

When you click "要約する" (Summarize), the text content of the current web page is sent to the AI API provider you have selected:

| Provider | API | Privacy Policy |
|---|---|---|
| Anthropic | Claude API | https://www.anthropic.com/privacy |
| OpenAI | OpenAI API | https://openai.com/privacy |
| Google | Gemini API | https://policies.google.com/privacy |

Your API key is included in the request header for authentication. Page content is used solely to generate the summary and is subject to each provider's data handling policies.

## Permissions

- **activeTab**: To read the content of the current tab when you activate the extension.
- **scripting**: To extract text content from the page.
- **storage**: To save your settings and API keys locally.
- **downloads**: To save summary results as Markdown files to your local download folder, only when you click "Markdownで保存" (Save as Markdown).
- **host_permissions (https://*/*)**: Required to send page content to AI API endpoints.

## Children's Privacy

This extension is not intended for use by children under 13.

## Changes to This Policy

If this policy is updated, the "Last updated" date above will be revised.

## Contact

For questions, please open an issue on the GitHub repository.
