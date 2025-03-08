// popup.js
/**
 * Enrichmatic LI Cookies Extension
 *
 * This script extracts LinkedIn cookies needed for authentication with Enrichmatic tools.
 *
 * Permission usage:
 * - cookies: Used only to access LinkedIn domain cookies for authentication purposes
 * - tabs: Used to check if the user is currently on LinkedIn before activating functionality
 * - storage: Used to store only the timestamp of when cookies were last extracted
 * - clipboardWrite: Used to copy the formatted cookies to clipboard for easy pasting
 * - host permissions: Limited to LinkedIn domains only to access necessary cookies
 *
 * Privacy notes:
 * - No data is sent to any servers
 * - No personal information is stored
 * - Cookies are only copied to the user's clipboard
 * - All processing happens locally on the user's device
 */
document.addEventListener('DOMContentLoaded', function() {
  const extractButton = document.getElementById('extractButton');
  const statusMessage = document.getElementById('statusMessage');
  const cookieContainer = document.getElementById('cookieContainer');
  const cookieData = document.getElementById('cookieData');

  // Essential LinkedIn cookies we want to extract
  const essentialCookieNames = [
    'li_at',
    'JSESSIONID',
    'liap',
    'bcookie',
    'bscookie',
    'lang'
  ];

  // Check if we're on LinkedIn
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (!activeTab.url.includes('linkedin.com')) {
      statusMessage.className = 'status status-error';
      statusMessage.textContent = 'Please navigate to LinkedIn before extracting cookies.';
      extractButton.disabled = true;
    }
  });

  // Extract cookies when button is clicked
  extractButton.addEventListener('click', function() {
    extractButton.disabled = true;
    statusMessage.className = 'status status-warning';
    statusMessage.textContent = 'Extracting cookies...';

    // Get LinkedIn cookies
    chrome.cookies.getAll({domain: '.linkedin.com'}, function(cookies) {
      if (chrome.runtime.lastError) {
        showError('Error accessing cookies: ' + chrome.runtime.lastError.message);
        return;
      }

      if (!cookies || cookies.length === 0) {
        showError('No LinkedIn cookies found. Please make sure you are logged in to LinkedIn.');
        return;
      }

      // Filter for essential cookies and format them
      const formattedCookies = cookies
        .filter(cookie =>
          essentialCookieNames.includes(cookie.name) ||
          cookie.name.startsWith('li_')
        )
        .map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || '.linkedin.com'
        }));

      if (formattedCookies.length === 0) {
        showError('Essential LinkedIn cookies not found. Please make sure you are properly logged in.');
        return;
      }

      // Check for the most important cookie
      if (!formattedCookies.some(c => c.name === 'li_at')) {
        showError('Critical cookie "li_at" not found. Please log in to LinkedIn again.');
        return;
      }

      // Format as JSON
      const cookiesJson = JSON.stringify(formattedCookies, null, 2);

      // Copy to clipboard
      navigator.clipboard.writeText(cookiesJson)
        .then(() => {
          // Show success message
          statusMessage.className = 'status status-success';
          statusMessage.textContent = 'LinkedIn cookies extracted and copied to clipboard!';

          // Display the cookie data
          cookieData.textContent = cookiesJson;
          cookieContainer.style.display = 'block';

          // Save the last extraction time
          chrome.storage.local.set({
            lastExtraction: {
              timestamp: Date.now(),
              cookieCount: formattedCookies.length
            }
          });

          // Re-enable button after a delay
          setTimeout(() => {
            extractButton.disabled = false;
          }, 2000);
        })
        .catch(err => {
          showError('Failed to copy cookies to clipboard: ' + err.message);
        });
    });
  });

  function showError(message) {
    statusMessage.className = 'status status-error';
    statusMessage.textContent = message;
    extractButton.disabled = false;
  }

  // Check if user previously extracted cookies
  chrome.storage.local.get(['lastExtraction'], function(result) {
    if (result.lastExtraction) {
      const lastExtraction = result.lastExtraction;
      const timeDiff = Date.now() - lastExtraction.timestamp;
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff < 7) {
        statusMessage.className = 'status status-success';
        statusMessage.textContent = `Last extracted ${lastExtraction.cookieCount} cookies ${daysDiff === 0 ? 'today' : daysDiff + ' days ago'}.`;
      }
    }
  });
});
