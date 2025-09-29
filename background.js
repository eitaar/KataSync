// Background script for KataSync extension
console.log('KataSync background script loaded');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadToGitHub') {
    uploadToGitHub(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Function to upload file to GitHub repository
async function uploadToGitHub({ filename, content, token, owner, repo }) {
  try {
    console.log('Uploading to GitHub:', { filename, owner, repo });
    
    // Validate inputs
    if (!filename || !content || !token || !owner || !repo) {
      throw new Error('Missing required parameters for GitHub upload');
    }
    
    // First, check if the file already exists
    const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    let sha = null;
    
    try {
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KataSync-Extension'
        }
      });
      
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
        console.log('File exists, will update with SHA:', sha);
      } else if (checkResponse.status === 404) {
        console.log('File does not exist, will create new file');
      } else {
        // Handle other HTTP errors
        const errorData = await checkResponse.json().catch(() => ({}));
        throw new Error(`Failed to check file existence: ${errorData.message || checkResponse.statusText}`);
      }
    } catch (error) {
      if (error.message.includes('Failed to check file existence')) {
        throw error;
      }
      console.log('File does not exist, will create new file');
    }
    
    // Prepare the upload data
    const uploadData = {
      message: sha ? `KataSync: Updated solution for ${filename}` : `KataSync: Added solution for ${filename}`,
      content: btoa(String.fromCharCode(...new TextEncoder().encode(content))), // Base64 encode with UTF-8 support
      branch: 'main'
    };
    
    // If file exists, include the SHA for update
    if (sha) {
      uploadData.sha = sha;
    }
    
    // Upload/update the file
    const uploadResponse = await fetch(checkUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'KataSync-Extension'
      },
      body: JSON.stringify(uploadData)
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      
      // Provide more specific error messages
      if (uploadResponse.status === 401) {
        throw new Error('Invalid GitHub token or insufficient permissions');
      } else if (uploadResponse.status === 404) {
        throw new Error('Repository not found or you do not have access to it');
      } else if (uploadResponse.status === 403) {
        throw new Error('Access forbidden. Check your token permissions or repository access');
      } else if (uploadResponse.status === 422) {
        throw new Error('Invalid request. Please check your repository settings');
      } else {
        throw new Error(`GitHub API error (${uploadResponse.status}): ${errorData.message || uploadResponse.statusText}`);
      }
    }
    
    const result = await uploadResponse.json();
    console.log('Successfully uploaded to GitHub:', result.content.html_url);
    
    return {
      url: result.content.html_url,
      sha: result.content.sha,
      filename: filename
    };
    
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    
    // Enhance error messages for common issues
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to GitHub. Please check your internet connection.');
    } else if (error.message.includes('NetworkError')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    } else {
      throw error;
    }
  }
}

// Function to validate GitHub repository access
async function validateGitHubAccess(token, owner, repo) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'KataSync-Extension'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Repository access error: ${response.statusText}`);
    }
    
    const repoData = await response.json();
    return {
      valid: true,
      permissions: repoData.permissions
    };
    
  } catch (error) {
    console.error('GitHub validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}