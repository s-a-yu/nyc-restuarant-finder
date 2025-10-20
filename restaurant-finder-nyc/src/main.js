import './style.css'

// Define the model and base URL
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025'
const API_KEY = import.meta.env.VITE_API_KEY || ''
const API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`

// System instruction guiding the model's behavior
const SYSTEM_PROMPT = "You are a friendly, expert NYC Restaurant Concierge. Your goal is to provide concise (2-3 sentence max) and highly relevant restaurant recommendations in New York City based on the user's cuisine, neighborhood, and price range preferences. You MUST use Google Search to find real, current restaurant information. Always mention the restaurant name, a brief description, and the neighborhood. If you use external information, you must include the citation source in your final response text."

/**
 * Constructs the payload required for the Gemini API call.
 * @param {string} userQuery - The text input from the user.
 */
function createPayload(userQuery) {
  return {
    contents: [{ parts: [{ text: userQuery }] }],
    // This is the key for real-time data access (Search Grounding)
    tools: [{ google_search: {} }],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
  }
}

// This function handles the network call with built-in retries
async function fetchGeminiResponse(userQuery) {
  const payload = createPayload(userQuery)
  const maxRetries = 3 // Reduced from 5 to 3 for faster fallback
  let currentRetry = 0

  while (currentRetry < maxRetries) {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Check for server errors (which we might retry)
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`Transient API error: ${response.status}`)
        }
        // Non-retryable error (e.g., 400 Bad Request)
        throw new Error(`Non-retryable API error: ${response.statusText}`)
      }

      // Success! Return the JSON result.
      return await response.json()
    } catch (error) {
      console.error(`Attempt ${currentRetry + 1} failed:`, error.message)
      currentRetry++

      if (currentRetry < maxRetries) {
        // Shorter delay for faster retries
        const delay = Math.pow(1.5, currentRetry) * 1000 + Math.random() * 300
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        // Max retries reached, throw the final error
        throw new Error('Failed to connect to Gemini API after multiple retries.')
      }
    }
  }
}

/**
 * Processes the raw Gemini JSON response to extract text and sources.
 * @param {Object} result - The JSON object from the Gemini API.
 */
function processResponse(result) {
  const candidate = result.candidates?.[0]

  // 1. Get the generated text
  const text = candidate?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a recommendation right now."

  // 2. Extract grounding sources
  let sources = []
  const groundingMetadata = candidate?.groundingMetadata

  if (groundingMetadata && groundingMetadata.groundingAttributions) {
    sources = groundingMetadata.groundingAttributions
      .map((attribution) => ({
        uri: attribution.web?.uri,
        title: attribution.web?.title,
      }))
      .filter((source) => source.uri && source.title) // Only keep valid sources
  }

  return { text, sources }
}

document.querySelector('#app').innerHTML = `
  <div>
    <h1>lets eat!</h1>
    
    <div class="chatbot-container">
      <div class="chatbot-messages" id="chatbot-messages">
        <div class="message bot-message">
          <p>Hi! I'm your NYC Restaurant Concierge. I can help you find the best restaurants in New York City with real-time information. What are you in the mood for?</p>
        </div>
      </div>
      <div class="chatbot-input">
        <input type="text" id="chatbot-input" placeholder="Ask me about food..." />
        <button id="chatbot-send">Send</button>
      </div>
    </div>
  </div>
`

// Chatbot functionality
const chatbotMessages = document.getElementById('chatbot-messages')
const chatbotInput = document.getElementById('chatbot-input')
const chatbotSend = document.getElementById('chatbot-send')

// Fallback responses for when API is not available
const fallbackResponses = {
  'pizza': 'Great choice! Pizza is always a good option. I recommend checking out local pizzerias or trying different styles like Neapolitan, New York, or Chicago deep dish!',
  'sushi': 'Sushi is delicious! Look for fresh fish and good quality rice. Try different types like nigiri, sashimi, or rolls with your favorite ingredients.',
  'burger': 'Burgers are a classic! Look for places with fresh beef, good buns, and creative toppings. Don\'t forget the fries!',
  'pasta': 'Pasta is comfort food at its finest! Try different shapes and sauces - carbonara, marinara, alfredo, or pesto. The possibilities are endless!',
  'tacos': 'Tacos are amazing! Look for authentic Mexican places with fresh tortillas, good meat, and plenty of salsa options.',
  'salad': 'Healthy choice! Look for places with fresh greens, good variety of toppings, and homemade dressings.',
  'breakfast': 'Breakfast is the most important meal! Look for places with fresh eggs, good coffee, and maybe some pancakes or waffles.',
  'dessert': 'Sweet tooth! Look for bakeries, ice cream shops, or restaurants with good dessert menus. Maybe try something new!',
  'help': 'I can help you find food recommendations! Just tell me what you\'re in the mood for - pizza, sushi, burgers, pasta, tacos, salad, breakfast, or dessert!',
  'default': 'That sounds interesting! I\'d love to help you find something great to eat. Try asking about pizza, sushi, burgers, pasta, tacos, salad, breakfast, or dessert!'
}

function addMessage(text, isBot = false, sources = []) {
  const messageDiv = document.createElement('div')
  messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`
  
  let content = `<p>${text}</p>`
  
  // Add sources if provided
  if (sources && sources.length > 0) {
    content += '<div class="sources"><strong>Sources:</strong><ul>'
    sources.forEach(source => {
      content += `<li><a href="${source.uri}" target="_blank" rel="noopener noreferrer">${source.title}</a></li>`
    })
    content += '</ul></div>'
  }
  
  messageDiv.innerHTML = content
  chatbotMessages.appendChild(messageDiv)
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight
}

function addLoadingMessage() {
  const messageDiv = document.createElement('div')
  messageDiv.className = 'message bot-message loading'
  messageDiv.innerHTML = '<p>🔍 Searching for the best restaurants...</p>'
  chatbotMessages.appendChild(messageDiv)
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight
  
  // Add progressive loading messages
  const loadingMessages = [
    '🔍 Searching for the best restaurants...',
    '🍽️ Checking current menus and reviews...',
    '📍 Finding the perfect location for you...',
    '⭐ Almost ready with recommendations...'
  ]
  
  let messageIndex = 0
  const interval = setInterval(() => {
    messageIndex = (messageIndex + 1) % loadingMessages.length
    messageDiv.querySelector('p').textContent = loadingMessages[messageIndex]
  }, 2000)
  
  // Store interval ID for cleanup
  messageDiv.intervalId = interval
  
  return messageDiv
}

function removeLoadingMessage(loadingElement) {
  if (loadingElement && loadingElement.parentNode) {
    // Clear the interval to stop the loading animation
    if (loadingElement.intervalId) {
      clearInterval(loadingElement.intervalId)
    }
    loadingElement.parentNode.removeChild(loadingElement)
  }
}

function getFallbackResponse(userInput) {
  const lowerInput = userInput.toLowerCase()
  
  for (const [key, response] of Object.entries(fallbackResponses)) {
    if (lowerInput.includes(key)) {
      return response
    }
  }
  
  return fallbackResponses.default
}

async function getBotResponse(userInput) {
  // Check if API key is available
  if (!API_KEY || API_KEY.trim() === '') {
    console.log('API key not available, using fallback responses')
    return { text: getFallbackResponse(userInput), sources: [] }
  }

  // For very simple queries, provide immediate response while API loads in background
  const simpleQueries = ['help', 'hi', 'hello', 'what can you do']
  const lowerInput = userInput.toLowerCase()
  
  if (simpleQueries.some(query => lowerInput.includes(query))) {
    // Show immediate response for simple queries
    setTimeout(async () => {
      try {
        const result = await fetchGeminiResponse(userInput)
        const { text, sources } = processResponse(result)
        // Update the message with real data
        const lastMessage = chatbotMessages.lastElementChild
        if (lastMessage && lastMessage.classList.contains('bot-message')) {
          lastMessage.innerHTML = `<p>${text}</p>`
          if (sources && sources.length > 0) {
            let content = `<p>${text}</p>`
            content += '<div class="sources"><strong>Sources:</strong><ul>'
            sources.forEach(source => {
              content += `<li><a href="${source.uri}" target="_blank" rel="noopener noreferrer">${source.title}</a></li>`
            })
            content += '</ul></div>'
            lastMessage.innerHTML = content
          }
        }
      } catch (error) {
        console.log('Background API call failed, keeping fallback response')
      }
    }, 0)
    
    return { text: getFallbackResponse(userInput), sources: [] }
  }

  try {
    const result = await fetchGeminiResponse(userInput)
    const { text, sources } = processResponse(result)
    return { text, sources }
  } catch (error) {
    console.error('API call failed:', error)
    return { 
      text: `I'm having trouble connecting to my restaurant database right now. ${getFallbackResponse(userInput)}`, 
      sources: [] 
    }
  }
}

async function handleSendMessage() {
  const message = chatbotInput.value.trim()
  if (message) {
    addMessage(message, false)
    chatbotInput.value = ''
    
    // Disable input while processing
    chatbotInput.disabled = true
    chatbotSend.disabled = true
    
    // Add loading message
    const loadingElement = addLoadingMessage()
    
    try {
      const { text, sources } = await getBotResponse(message)
      removeLoadingMessage(loadingElement)
      addMessage(text, true, sources)
    } catch (error) {
      console.error('Error getting bot response:', error)
      removeLoadingMessage(loadingElement)
      addMessage("I'm sorry, I encountered an error. Please try again.", true)
    } finally {
      // Re-enable input
      chatbotInput.disabled = false
      chatbotSend.disabled = false
      chatbotInput.focus()
    }
  }
}

// Event listeners
chatbotSend.addEventListener('click', handleSendMessage)
chatbotInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSendMessage()
  }
})
