# Python Web IDE - Python Code Editor in the Browser

This is a web-based Python code editor that allows you to write, edit, and run Python code directly in your browser. It leverages [Pyodide](https://pyodide.org/) to execute Python code without any server-side processing. It supports multiple files, offline usage, and provides a familiar coding experience with the Monaco editor.

## Features

- **Write and Run Python Code**: Edit Python code and execute it instantly in the browser.
- **Multiple File Support**: Create, edit, and manage multiple Python files within the editor.
- **Monaco Editor Integration**: Experience a powerful code editor with syntax highlighting, code completion, and more.
- **Offline Support**: Works offline after the initial load; all dependencies are stored locally.
- **Local Storage Persistence**: Your code is saved in the browser's local storage and persists across sessions.
- **VSCode-like Output Panel**: View the output of your code in a toggleable output panel, similar to VSCode.
- **Keyboard Shortcuts**:
  - **Run Code**: `Ctrl+R`
  - **Toggle Output Panel**: `Ctrl+J` (Windows/Linux) or `Cmd+J` (Mac)
- **File Management**: Add new files, close existing ones, and navigate between files with ease.

## Testing

This project uses [Playwright](https://playwright.dev/) for testing. To run the tests, use the following command:

```bash
npm test
```

## Demo

Check out the live demo: [Live Demo](https://pywebide.com)

## Screenshot

![Alt text](/screenshots/1.png)
