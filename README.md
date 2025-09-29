# KataSync

A Chrome extension that automatically syncs your Codewars solutions to a GitHub repository.

## Features

- **Automatic Detection**: Detects when you submit a solution on Codewars
- **Code Extraction**: Automatically captures your solution code from the editor
- **Smart Naming**: Creates files with the format `{language}-{dd-mm-yy}-{challenge_name}.{extension}`
- **GitHub Integration**: Uploads your solutions directly to your specified GitHub repository
- **Customizable**: Choose your preferred programming language and file extension
- **Easy Setup**: Simple popup interface for configuration

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The KataSync extension should now appear in your extensions list

## Configuration

1. Click on the KataSync extension icon in your Chrome toolbar
2. Fill in the required information:
   - **GitHub Personal Access Token**: Create one at https://github.com/settings/tokens with `repo` permissions
   - **Repository Owner**: Your GitHub username or organization
   - **Repository Name**: The name of the repository where solutions will be stored
   - **Programming Language**: Select your preferred language
   - **File Extension**: Choose the appropriate file extension (auto-updates based on language)
3. Click "Save Settings"

## Usage

1. Navigate to any Codewars challenge page
2. Write your solution in the code editor
3. Click the "Submit" button to submit your solution
4. The extension will automatically:
   - Extract your code from the editor
   - Get the challenge name from the page
   - Generate a filename with the current date
   - Upload the file to your specified GitHub repository
5. You'll see a notification confirming the upload

## File Naming Convention

Files are saved with the following format:
```
{language}-{dd-mm-yy}-{challenge_name}.{extension}
```

For example:
- `javascript-29-09-23-Two_Sum.js`
- `python-29-09-23-FizzBuzz.py`
- `java-29-09-23-Reverse_String.java`

## Requirements

- Chrome browser
- GitHub account with a repository for storing solutions
- GitHub Personal Access Token with repository permissions

## Permissions

The extension requires the following permissions:
- `activeTab`: To access the current Codewars page
- `storage`: To save your configuration settings
- `scripting`: To inject content scripts into Codewars pages
- Access to `https://www.codewars.com/*`: To detect and interact with Codewars pages
- Access to `https://api.github.com/*`: To upload files to GitHub

## Supported Languages

The extension supports the following programming languages:
- JavaScript (.js)
- Python (.py)
- Java (.java)
- C++ (.cpp)
- C# (.cs)
- Go (.go)
- Rust (.rs)
- Ruby (.rb)
- PHP (.php)
- TypeScript (.ts)

## Troubleshooting

### Extension not detecting submit button
- Make sure you're on a Codewars challenge page (URL should contain `/kata/`)
- Refresh the page and try again
- Check the browser console for any error messages

### Code not uploading to GitHub
- Verify your GitHub token has the correct permissions
- Check that the repository exists and you have write access
- Ensure your token hasn't expired

### Settings not saving
- Make sure all required fields are filled
- Check that your GitHub credentials are correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.