// Background script for GitWars Sync extension
console.log('GitWars Sync background script loaded');

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
    
    // First, check if the file already exists
    const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    let sha = null;
    
    try {
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitWars-Sync-Extension'
        }
      });
      
      if (checkResponse.ok) {
        const existingFile = await checkResponse.json();
        sha = existingFile.sha;
        console.log('File exists, will update with SHA:', sha);
      }
    } catch (error) {
      console.log('File does not exist, will create new file');
    }
    
    // Prepare the upload data
    const uploadData = {
      message: `Add solution: ${filename}`,
      content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
      branch: 'main'
    };
    
    // If file exists, include the SHA for update
    if (sha) {
      uploadData.sha = sha;
      uploadData.message = `Update solution: ${filename}`;
    }
    
    // Upload/update the file
    const uploadResponse = await fetch(checkUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'GitWars-Sync-Extension'
      },
      body: JSON.stringify(uploadData)
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`GitHub API error: ${errorData.message || uploadResponse.statusText}`);
    }
    
    const result = await uploadResponse.json();
    console.log('Successfully uploaded to GitHub:', result.content.html_url);
    
    return {
      url: result.content.html_url,
      sha: result.content.sha
    };
    
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    throw error;
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
        'User-Agent': 'GitWars-Sync-Extension'
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