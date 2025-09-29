// Content script for GitWars Sync extension
console.log('GitWars Sync content script loaded');

// Function to extract challenge name from the first h4 element
function getChallengeName() {
  console.log('Extracting challenge name...');
  
  // Try different selectors for challenge name
  const nameSelectors = [
    'h4',
    'h1',
    'h2',
    'h3',
    '[data-testid="challenge-title"]',
    '.kata-title',
    '.challenge-title',
    '.problem-title',
    '.title'
  ];
  
  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      const challengeName = element.textContent.trim()
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[^\w\-_]/g, '')       // Remove special characters except hyphens and underscores
        .replace(/_{2,}/g, '_')         // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '');       // Remove leading/trailing underscores
      
      if (challengeName.length > 0) {
        console.log('Found challenge name:', challengeName);
        return challengeName;
      }
    }
  }
  
  // Fallback: try to extract from URL
  const urlPath = window.location.pathname;
  const urlMatch = urlPath.match(/\/kata\/([^\/]+)/);
  if (urlMatch && urlMatch[1]) {
    const challengeName = urlMatch[1].replace(/[\-]+/g, '_');
    console.log('Extracted challenge name from URL:', challengeName);
    return challengeName;
  }
  
  // Fallback: try to extract from page title
  const pageTitle = document.title;
  if (pageTitle && pageTitle.includes('|')) {
    const challengeName = pageTitle.split('|')[0].trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-_]/g, '')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
    
    if (challengeName.length > 0) {
      console.log('Extracted challenge name from page title:', challengeName);
      return challengeName;
    }
  }
  
  console.log('Could not extract challenge name, using fallback');
  return 'unknown_challenge';
}

// Function to extract user's code from the code editor
function extractCode() {
  console.log('Attempting to extract code...');
  
  // First, try to find Monaco Editor (VS Code editor)
  if (window.monaco && window.monaco.editor) {
    const models = window.monaco.editor.getModels();
    if (models && models.length > 0) {
      console.log('Found Monaco editor models');
      return models[0].getValue();
    }
  }
  
  // Try to find CodeMirror instances directly
  if (window.CodeMirror) {
    // Look for CodeMirror instances in the global scope
    for (let prop in window) {
      try {
        if (window[prop] && window[prop].constructor && 
            window[prop].constructor.name === 'CodeMirror') {
          console.log('Found CodeMirror instance');
          return window[prop].getValue();
        }
      } catch (e) {
        // Ignore errors when checking properties
      }
    }
  }
  
  // Try different possible selectors for code editors on Codewars
  const codeSelectors = [
    // CodeMirror selectors
    '.CodeMirror',
    '.CodeMirror-code',
    '.cm-editor .cm-content',
    '.cm-content',
    
    // Monaco/VS Code editor selectors
    '.monaco-editor',
    '.view-lines',
    '[data-testid="editor"]',
    
    // Ace editor selectors
    '.ace_editor',
    '.ace_content',
    '.ace_text-input',
    
    // Generic code editor selectors
    'textarea[name="code"]',
    'textarea[class*="code"]',
    'textarea[id*="code"]',
    '#code',
    '.code-editor',
    '[role="textbox"]'
  ];
  
  for (const selector of codeSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Found element with selector:', selector);
      
      // For CodeMirror
      if (element.classList.contains('CodeMirror')) {
        if (element.CodeMirror) {
          console.log('Found CodeMirror instance on element');
          return element.CodeMirror.getValue();
        }
        
        // Try to get text from lines
        const lines = element.querySelectorAll('.CodeMirror-line, .cm-line');
        if (lines.length > 0) {
          console.log('Extracting from CodeMirror lines');
          return Array.from(lines).map(line => line.textContent).join('\n');
        }
      }
      
      // For Monaco editor
      if (element.classList.contains('monaco-editor') || element.classList.contains('view-lines')) {
        const lines = element.querySelectorAll('.view-line, .mtk1, [class*="mtk"]');
        if (lines.length > 0) {
          console.log('Extracting from Monaco editor lines');
          return Array.from(lines).map(line => line.textContent).join('\n');
        }
      }
      
      // For Ace editor
      if (element.classList.contains('ace_content') || element.classList.contains('ace_editor')) {
        const lines = element.querySelectorAll('.ace_line');
        if (lines.length > 0) {
          console.log('Extracting from Ace editor lines');
          return Array.from(lines).map(line => line.textContent).join('\n');
        }
      }
      
      // For textarea or other input elements
      if (element.value !== undefined) {
        console.log('Extracting from textarea/input');
        return element.value;
      }
      
      // For contenteditable elements
      if (element.contentEditable === 'true') {
        console.log('Extracting from contenteditable');
        return element.textContent || element.innerText;
      }
      
      // For other elements with text content
      const textContent = element.textContent || element.innerText;
      if (textContent && textContent.trim().length > 10) {
        console.log('Extracting from text content');
        return textContent;
      }
    }
  }
  
  // Fallback: try to find any textarea with code-like content
  const textareas = document.querySelectorAll('textarea');
  for (const textarea of textareas) {
    if (textarea.value && textarea.value.trim().length > 10) {
      // Check if it looks like code (contains common programming patterns)
      const codePatterns = [
        /function\s*\(/,
        /def\s+\w+\s*\(/,
        /class\s+\w+/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/,
        /return\s+/,
        /console\.log/,
        /print\s*\(/
      ];
      
      if (codePatterns.some(pattern => pattern.test(textarea.value))) {
        console.log('Found code-like content in textarea');
        return textarea.value;
      }
    }
  }
  
  console.log('Could not extract code from any source');
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
  console.log('Looking for submit button...');
  
  // Common selectors for submit buttons on Codewars
  const submitSelectors = [
    '#submit_btn',
    '[data-testid="submit"]',
    '[data-testid="submit-button"]',
    'button[type="submit"]',
    '.submit-button',
    '.btn-submit',
    'button:contains("Submit")',
    'input[value="Submit"]',
    '[aria-label*="submit" i]',
    '[title*="submit" i]'
  ];
  
  let submitButton = null;
  
  // Try to find the submit button
  for (const selector of submitSelectors) {
    try {
      submitButton = document.querySelector(selector);
      if (submitButton) {
        console.log('Found submit button with selector:', selector);
        break;
      }
    } catch (e) {
      // Ignore invalid selectors like :contains()
    }
  }
  
  // If not found by selector, try finding by text content
  if (!submitButton) {
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
    for (const button of buttons) {
      const text = (button.textContent || button.value || button.getAttribute('aria-label') || '').toLowerCase();
      if (text.includes('submit') || text.includes('answer') || text.includes('run tests') || button.id === 'submit_btn') {
        submitButton = button;
        console.log('Found submit button by text/id:', text, button.id);
        break;
      }
    }
  }
  
  // Also look for buttons that might be submit buttons based on their parent context
  if (!submitButton) {
    const possibleSubmitButtons = document.querySelectorAll('button');
    for (const button of possibleSubmitButtons) {
      const parent = button.closest('.submit-container, .button-container, .actions, .kata-actions');
      if (parent && (button.textContent || '').toLowerCase().includes('submit')) {
        submitButton = button;
        console.log('Found submit button in container context');
        break;
      }
    }
  }
  
  if (submitButton) {
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
    submitButton.dataset.gitwarsMonitored = 'true';
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
  let shouldCheckForSubmitButton = false;
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // Check if submit button was added
      const addedNodes = Array.from(mutation.addedNodes);
      const hasSubmitButton = addedNodes.some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the node itself is a submit button or contains one
          return node.querySelector && (
            node.querySelector('#submit_btn, [data-testid="submit"], button[type="submit"]') ||
            node.id === 'submit_btn' ||
            (node.tagName === 'BUTTON' && node.textContent.toLowerCase().includes('submit')) ||
            // Check if it's a form or container that might contain submit buttons
            node.querySelector && node.querySelector('button, input[type="submit"]')
          );
        }
        return false;
      });
      
      if (hasSubmitButton) {
        shouldCheckForSubmitButton = true;
      }
    }
  });
  
  if (shouldCheckForSubmitButton) {
    // Debounce the monitoring check to avoid excessive calls
    clearTimeout(window.gitwarsSubmitButtonTimeout);
    window.gitwarsSubmitButtonTimeout = setTimeout(() => {
      // Only monitor if we don't already have a monitored button
      const existingMonitoredButton = document.querySelector('[data-gitwars-monitored="true"]');
      if (!existingMonitoredButton) {
        monitorSubmitButton();
      }
    }, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});