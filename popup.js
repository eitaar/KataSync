// Popup script for KataSync extension
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.sync.get([
    'githubToken',
    'repoOwner', 
    'repoName',
    'language',
    'extension'
  ]);
  
  // Populate form with saved values
  if (settings.githubToken) {
    document.getElementById('githubToken').value = settings.githubToken;
  }
  if (settings.repoOwner) {
    document.getElementById('repoOwner').value = settings.repoOwner;
  }
  if (settings.repoName) {
    document.getElementById('repoName').value = settings.repoName;
  }
  if (settings.language) {
    document.getElementById('language').value = settings.language;
  }
  if (settings.extension) {
    document.getElementById('extension').value = settings.extension;
  }
  
  // Update extension when language changes
  document.getElementById('language').addEventListener('change', (e) => {
    const languageExtensionMap = {
      'javascript': 'js',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'ruby': 'rb',
      'php': 'php',
      'typescript': 'ts'
    };
    
    const extension = languageExtensionMap[e.target.value] || 'txt';
    document.getElementById('extension').value = extension;
  });
  
  // Save settings
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const settings = {
      githubToken: document.getElementById('githubToken').value,
      repoOwner: document.getElementById('repoOwner').value,
      repoName: document.getElementById('repoName').value,
      language: document.getElementById('language').value,
      extension: document.getElementById('extension').value
    };
    
    // Validate required fields
    if (!settings.githubToken || !settings.repoOwner || !settings.repoName) {
      showStatus('Please fill in all required fields.', 'error');
      return;
    }
    
    try {
      await chrome.storage.sync.set(settings);
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}