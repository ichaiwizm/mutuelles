chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  const currentUrl = tabs[0].url;
  const messageElement = document.getElementById('message');
  const specialMessage = document.getElementById('special-message');
  
  if (currentUrl && currentUrl.includes('swisslifeone.fr')) {
    messageElement.textContent = 'Bonjour utilisateur SwissLife One !';
    specialMessage.style.display = 'block';
  } else {
    messageElement.textContent = 'Bonjour !';
    specialMessage.style.display = 'none';
  }
});