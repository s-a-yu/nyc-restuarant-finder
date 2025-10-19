import './style.css'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>lets eat!</h1>
    
    <div class="chatbot-container">
      <div class="chatbot-header">
        <h3>Food Assistant</h3>
      </div>
      <div class="chatbot-messages" id="chatbot-messages">
        <div class="message bot-message">
          <p>Hi! I'm here to help you find great food. What are you in the mood for?</p>
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

// Sample responses for the chatbot
const responses = {
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

function addMessage(text, isBot = false) {
  const messageDiv = document.createElement('div')
  messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`
  messageDiv.innerHTML = `<p>${text}</p>`
  chatbotMessages.appendChild(messageDiv)
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight
}

function getBotResponse(userInput) {
  const lowerInput = userInput.toLowerCase()
  
  for (const [key, response] of Object.entries(responses)) {
    if (lowerInput.includes(key)) {
      return response
    }
  }
  
  return responses.default
}

function handleSendMessage() {
  const message = chatbotInput.value.trim()
  if (message) {
    addMessage(message, false)
    chatbotInput.value = ''
    
    // Simulate bot thinking time
    setTimeout(() => {
      const response = getBotResponse(message)
      addMessage(response, true)
    }, 500)
  }
}

// Event listeners
chatbotSend.addEventListener('click', handleSendMessage)
chatbotInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSendMessage()
  }
})
