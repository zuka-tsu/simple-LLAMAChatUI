var mainurl = 'http://yourllamaserver/v1/chat/completions';

document.addEventListener('DOMContentLoaded', function() {
    // Load chat history from localStorage
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const chatDisplay = document.getElementById('chat-display');

    // Function to render chat history
    function renderChatHistory() {
        chatDisplay.innerHTML = '';

        chatHistory.forEach(item => {
            const message = document.createElement('div');
            message.classList.add('mb-2', item.from === 'user' ? 'text-right' : 'text-left');
            message.innerHTML = `<div class="inline-block ${item.from === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded-bl-none'} p-2 rounded-lg" style="max-width:80%">${item.message}</div>`;
            chatDisplay.appendChild(message);
	    chatDisplay.scrollTo({ top: chatDisplay.scrollHeight, behavior: 'smooth' });
        });
    }

    // Function to save message to chat history and localStorage
    function saveMessage(message, from) {
        const newMessage = {
            from: from,
            message: message
        };
        chatHistory.push(newMessage);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    // Render chat history on page load
    renderChatHistory();

document.getElementById('chat-clear').addEventListener('click', function (event) {
        chatDisplay.innerHTML = '';
	chatHistory.length = 0;
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
});

document.getElementById('chat-input').addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                if (event.shiftKey) {
                    // Allow new line
                    return;
                } else {
                    // Submit form on Enter
                    event.preventDefault();
                    document.getElementById('chat-form').dispatchEvent(new Event('submit', {cancelable: true}));
                }
            }
        });


document.getElementById('chat-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const chatInput = document.getElementById('chat-input');
    const chatBtnTxt = document.getElementById('chat-btn-text');
    const chatLoading = document.getElementById('chat-loading');

    // Disable the textarea
    chatInput.disabled = true;
    chatInput.placeholder = "Memproses...";
    chatBtnTxt.classList.add('hidden');
    // Show loading message
    chatLoading.classList.remove('hidden');

    const input = chatInput.value.trim();
    if (input === '') return;
    chatInput.value = '';
    
    // Save user message to chat history
    saveMessage(input, 'user');

    const chatDisplay = document.getElementById('chat-display');
    const userMessage = document.createElement('div');
    userMessage.classList.add('mb-2', 'text-right');
    userMessage.innerHTML = `<div class="inline-block bg-blue-500 text-white p-2 rounded-lg rounded-br-none" style="max-width:80%">${input}</div>`;
    chatDisplay.appendChild(userMessage);
    chatDisplay.scrollTo({ top: chatDisplay.scrollHeight, behavior: 'smooth' });

    // Send input to backend and handle response
    try {
	let prompt = [
		{
                        "content": "Anda adalah personal assistant bernama Ulala, berikan jawaban singkat, padat dan jelas.",
                        "role": "system"
                }
	]

	chatHistory.forEach(item => {
	    prompt.push({
		"content": item.message,
		"role": item.from
	    })
        });

	prompt.push({
                "content": input,
                "role": "user"
        });
        const response = await fetch(mainurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
		"stream":true,
		"messages":prompt
	    })
	});

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';

            while (true) {
            const { done, value } = await reader.read();
            if (done) break;

	    const text = decoder.decode(value);
            const lines = text.split('\n');
	    
            lines.forEach(line => {
                if (line.startsWith('data: ')) {
                    const jsonString = line.replace('data: ', '').trim();
                    if (jsonString && jsonString != '[DONE]') {
                        try {
                            const chunk = JSON.parse(jsonString);
                            if (chunk.choices[0].delta.content) {
                                const delta = chunk.choices[0].delta.content;
                                content += delta;

				// Create a new div or update the last message with the incoming data
                                if (!chatDisplay.lastElementChild.classList.contains('streaming')) {
                                    const botMessage = document.createElement('div');
                                    botMessage.classList.add('mb-2', 'text-left', 'streaming');
                                    chatDisplay.appendChild(botMessage);
                                }

                                chatDisplay.lastElementChild.innerHTML = `<div class="inline-block bg-gray-300 dark:bg-gray-600 text-black dark:text-white p-2 rounded-lg rounded-bl-none" style="max-width:80%">${content}</div>`;
                           	chatDisplay.scrollTo({ top: chatDisplay.scrollHeight, behavior: 'smooth' }); 
			    }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }else if (jsonString == '[DONE]'){
			// Disable the textarea
			chatInput.disabled = false;
			chatInput.placeholder = "Tanya apapun...";
			// Show btn text
			chatBtnTxt.classList.remove('hidden');
                        // Hide loading message
                        chatLoading.classList.add('hidden');

			// Save bot message to chat history
                        saveMessage(content, 'assistant');
		    }
                }
            });

        }

        chatDisplay.lastElementChild.classList.remove('streaming');
    } catch (error) {
        console.error('Error:', error);
    }
});
});
