// Content script for KataSync extension
console.log('KataSync content script loaded'); 
// Function to extract challenge name from the page title
function getChallengeName() {
  const pageTitle = document.title;
  
  // Pattern: "Training on {challenge title} | Codewars"
  const titleMatch = pageTitle.match(/Training on (.+?) \| Codewars/i);
  if (titleMatch && titleMatch[1]) {
    const challengeTitle = titleMatch[1].trim();
    const challengeName = challengeTitle
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/[^\w\-_]/g, '')       // Remove special characters except hyphens and underscores
      .replace(/_{2,}/g, '_')         // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '');       // Remove leading/trailing underscores
    
    if (challengeName.length > 0) {
      return challengeName;
    }
  }
  // Final fallback with timestamp
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
  return `unknown_challenge_${timestamp}`;
}

// Function to extract user's code from the code editor
function extractCode() {
  console.log('Attempting to extract code...');
  // Try different possible selectors for code editors on Codewars
  // Prioritizing CodeMirror since Codewars uses it
  const selector = ".CodeMirror";
  
  const element = document.querySelector(".CodeMirror");
  if (element) {
    console.log('Found element with selector:', selector, 'classList:', element.classList.toString());
    console.log('Element type:', element.tagName, 'contentEditable:', element.contentEditable);
    
    // For CodeMirror (prioritized since Codewars uses it)
    if (element.classList.contains('CodeMirror') || element.closest('.CodeMirror')) {
      console.log('🎯 DETECTED CODE EDITOR: CodeMirror (DOM Element)');
      // Try to get the actual CodeMirror element if we found a child
      const codeMirrorElement = element.classList.contains('CodeMirror') ? element : element.closest('.CodeMirror');
      // Try to get text from lines with more comprehensive selectors
      const lineSelector = ".CodeMirror-line";
      const lines = codeMirrorElement.querySelectorAll(lineSelector);
      if (lines.length > 0) {
        console.log('Extracting from CodeMirror lines using selector:', lineSelector, 'count:', lines.length);
        const codeText = Array.from(lines).map(line => line.textContent).join('\n');
        if (codeText && codeText.trim()) {
          return codeText;
        }
      }
    }
      // Fallback: try to get all text content from CodeMirror
    const allText = codeMirrorElement.textContent;
    if (allText && allText.trim().length > 10) {
      console.log('Extracting all text content from CodeMirror element');
      return allText;
    }
  }
}

// Function to get current date in dd-mm-yy format
function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

// Function to find and monitor the submit button
function monitorSubmitButton() {
  console.log('Looking for submit button...');
  console.log('DOM readyState:', document.readyState);
  console.log('Total buttons on page:', document.querySelectorAll('button').length);

  let submitButton = null;
  
  // Try to find the submit button
  const selector = "#submit_btn";
  submitButton = document.querySelector(selector);
  if (submitButton) {
    console.log('Found submit button with selector:', selector, 'text:', submitButton.textContent?.trim());
    console.log('Monitoring submit button:', submitButton);

    // Remove any existing listeners to avoid duplicates
    submitButton.removeEventListener('click', handleSubmitClick, true);
    
    // Add click event listener with capture phase
    submitButton.addEventListener('click', handleSubmitClick, true);
    
    // Also monitor for form submissions
    const form = submitButton.closest('form');
    if (form) {
      form.removeEventListener('submit', handleSubmitClick, true);
      form.addEventListener('submit', handleSubmitClick, true);
    }
    
    // Store reference to avoid duplicate monitoring
    submitButton.dataset.kataSyncMonitored = 'true';
  } else {
    console.log('Submit button not found, will retry...');
    // Retry after DOM updates
    setTimeout(monitorSubmitButton, 2000);
  }
}

// Handle submit button click
async function handleSubmitClick(event) {
  console.log('Submit button clicked!');
  console.log('Event type:', event.type);
  console.log('Event target:', event.target);
  
  try {
    // Extract code and challenge information
    const code = extractCode();
    const challengeName = getChallengeName();
    const currentDate = getCurrentDate();
    
    if (!code) {
      console.error('Could not extract code from the page');
      return;
    }
    
    console.log('Extracted code:', code.substring(0, 100) + '...');
    console.log('Challenge name:', challengeName);
    
    // Get settings from storage
    console.log('Retrieving settings from storage...');
    const settings = await chrome.storage.sync.get([
      'githubToken',
      'repoOwner',
      'repoName',
      'language',
      'extension'
    ]);
    console.log('Settings retrieved:', {
      hasToken: !!settings.githubToken,
      repoOwner: settings.repoOwner,
      repoName: settings.repoName,
      language: settings.language,
      extension: settings.extension
    });
    
    if (!settings.githubToken || !settings.repoOwner || !settings.repoName) {
      console.error('KataSync: Settings not configured');
      showNotification('Please configure KataSync settings first!', 'error');
      return;
    }
    
    // Create filename: {language}-{dd-mm-yy}-{challenge_name}.{extension}
    const filename = `${settings.language}-${currentDate}-${challengeName}.${settings.extension}`;
    console.log('Generated filename:', filename);
    console.log('Code to upload length:', code.length);
    
    // Send message to background script to upload to GitHub
    console.log('Sending message to background script...');
    chrome.runtime.sendMessage({
      action: 'uploadToGitHub',
      data: {
        filename: filename,
        content: code,
        token: settings.githubToken,
        owner: settings.repoOwner,
        repo: settings.repoName
      }
    }, (response) => {
      if (response && response.success) {
        showNotification('Code uploaded to GitHub successfully!', 'success');
      } else {
        const error = response ? response.error : 'Unknown error';
        showNotification('Failed to upload to GitHub: ' + error, 'error');
      }
    });
    
  } catch (error) {
    console.error('Error in handleSubmitClick:', error);
    showNotification('Error: ' + error.message, 'error');
  }
}

// Function to show notifications to the user
function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Start monitoring when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(monitorSubmitButton, 1000);
  });
} else {
  setTimeout(monitorSubmitButton, 1000);
}
// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'testCodeExtraction') {
    console.log('🧪 TEST CODE EXTRACTION TRIGGERED FROM POPUP');
    console.log('==========================================');
    
    try {
      const code = extractCode();
      const challengeName = getChallengeName();
      
      console.log('📝 EXTRACTED CODE:');
      console.log('==================');
      if (code) {
        console.log(code);
        console.log('\n📊 CODE STATS:');
        console.log('Length:', code.length, 'characters');
        console.log('Lines:', code.split('\n').length);
      } else {
        console.log('❌ No code extracted');
      }
      
      console.log('\n🏷️ CHALLENGE NAME:');
      console.log('==================');
      console.log(challengeName);
      
      console.log('\n🔍 PAGE INFO:');
      console.log('=============');
      console.log('URL:', window.location.href);
      console.log('Title:', document.title);
      console.log('CodeMirror available:', !!window.CodeMirror);
      console.log('Monaco available:', !!(window.monaco && window.monaco.editor));
      
      console.log('\n==========================================');
      
      sendResponse({ 
        success: true, 
        code: code, 
        challengeName: challengeName,
        codeLength: code ? code.length : 0
      });
    } catch (error) {
      console.error('❌ Error during test extraction:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open for async response
  }
});