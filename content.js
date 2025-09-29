// Content script for GitWars Sync extension
console.log('GitWars Sync content script loaded');

// Function to extract challenge name from the first h4 element
function getChallengeName() {
  const h4Element = document.querySelector('h4');
  if (h4Element) {
    return h4Element.textContent.trim().replace(/\s+/g, '_');
  }
  return 'unknown_challenge';
}

// Function to extract user's code from the code editor
function extractCode() {
  // Try different possible selectors for code editors on Codewars
  const codeSelectors = [
    '.CodeMirror-code',
    '[data-testid="editor"]',
    '.ace_content',
    'textarea[name="code"]',
    '#code',
    '.cm-content'
  ];
  
  for (const selector of codeSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      // For CodeMirror
      if (element.classList.contains('CodeMirror-code')) {
        const lines = element.querySelectorAll('.CodeMirror-line');
        return Array.from(lines).map(line => line.textContent).join('\n');
      }
      
      // For Ace editor
      if (element.classList.contains('ace_content')) {
        const lines = element.querySelectorAll('.ace_line');
        return Array.from(lines).map(line => line.textContent).join('\n');
      }
      
      // For textarea or other input elements
      if (element.value !== undefined) {
        return element.value;
      }
      
      // For other elements with text content
      return element.textContent || element.innerText;
    }
  }
  
  // Fallback: try to find CodeMirror instance
  if (window.CodeMirror && window.CodeMirror.fromTextArea) {
    const textAreas = document.querySelectorAll('textarea');
    for (const textarea of textAreas) {
      if (textarea.nextSibling && textarea.nextSibling.classList && 
          textarea.nextSibling.classList.contains('CodeMirror')) {
        const cm = textarea.nextSibling.CodeMirror;
        if (cm) {
          return cm.getValue();
        }
      }
    }
  }
  
  return null;
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
  // Common selectors for submit buttons on Codewars
  const submitSelectors = [
    '#submit_btn',
    '[data-testid="submit"]',
    'button[type="submit"]',
    '.submit-button',
    'button:contains("Submit")',
    'input[value="Submit"]'
  ];
  
  let submitButton = null;
  
  // Try to find the submit button
  for (const selector of submitSelectors) {
    submitButton = document.querySelector(selector);
    if (submitButton) {
      console.log('Found submit button with selector:', selector);
      break;
    }
  }
  
  // If not found by selector, try finding by text content
  if (!submitButton) {
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
    for (const button of buttons) {
      const text = button.textContent || button.value || '';
      if (text.toLowerCase().includes('submit') || button.id === 'submit_btn') {
        submitButton = button;
        console.log('Found submit button by text/id:', text, button.id);
        break;
      }
    }
  }
  
  if (submitButton) {
    console.log('Monitoring submit button:', submitButton);
    
    // Add click event listener
    submitButton.addEventListener('click', handleSubmitClick, true);
    
    // Also monitor for form submissions
    const form = submitButton.closest('form');
    if (form) {
      form.addEventListener('submit', handleSubmitClick, true);
    }
  } else {
    console.log('Submit button not found, will retry...');
    // Retry after DOM updates
    setTimeout(monitorSubmitButton, 2000);
  }
}

// Handle submit button click
async function handleSubmitClick(event) {
  console.log('Submit button clicked!');
  
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
    const settings = await chrome.storage.sync.get([
      'githubToken',
      'repoOwner',
      'repoName',
      'language',
      'extension'
    ]);
    
    if (!settings.githubToken || !settings.repoOwner || !settings.repoName) {
      console.error('GitWars Sync: Settings not configured');
      showNotification('Please configure GitWars Sync settings first!', 'error');
      return;
    }
    
    // Create filename: {language}-{dd-mm-yy}-{challenge_name}.{extension}
    const filename = `${settings.language}-${currentDate}-${challengeName}.${settings.extension}`;
    
    // Send message to background script to upload to GitHub
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

// Also monitor for dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // Check if submit button was added
      const addedNodes = Array.from(mutation.addedNodes);
      const hasSubmitButton = addedNodes.some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return node.querySelector && (
            node.querySelector('#submit_btn') ||
            node.id === 'submit_btn' ||
            (node.tagName === 'BUTTON' && node.textContent.toLowerCase().includes('submit'))
          );
        }
        return false;
      });
      
      if (hasSubmitButton) {
        setTimeout(monitorSubmitButton, 500);
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});