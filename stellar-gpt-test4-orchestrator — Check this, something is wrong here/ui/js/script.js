
const outputDiv = document.getElementById('output');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'ru-RU'; // Set the language


const BASE_URL = "http://localhost:5000"

const toggleButton = document.getElementById('toggleButton');
const micIcon = document.getElementById('micIcon');
const messageText = document.getElementById('messageText');

let isRecognizing = false; // Флаг, указывающий, запущено ли распознавание речи

recognition.onstart = () => {
    console.log("Recognition started");
    isRecognizing = true;
};

recognition.onend = () => {
    console.log("Recognition ended");
    isRecognizing = false;

    // Если кнопка всё ещё включена, перезапускаем распознавание
    if (toggleButton.checked && !toggleButton.disabled) {
        console.log("Restarting listener...");
        recognition.start();
    }
};

// * The speech recognition class will turn off after a few seconds of silence.
// * This variable will be used to determine when that happens.
// * The recognition needs to be constantly listening unless switched off. 
let endedFromSilence = false;

// * Awake helps determine the color of the audio main animation.
// * The color will signal to the user if Stella is awake and listening or not.
let awake = false;

document.addEventListener("keydown", function (event) {
    if (event.key === "CapsLock") {
        if (!recognition.recognizing) {
            toggleButton.checked = true;
            startListener();
            recognition.start();
        }
    }
});

document.addEventListener("keyup", function (event) {
    if (event.key === "CapsLock") {
        if (recognition.recognizing) {
            toggleButton.checked = false;
            stopListener();
            recognition.stop();
        }
    }
});

eel.expose(toggle_microphone);
function toggle_microphone() {
    const isActive = toggleButton.checked;

    if (!isActive) {
        toggleButton.checked = true;
        startListener();
        recognition.start();
    } else {
        toggleButton.checked = false;
        stopListener();
        recognition.stop();
    }
}

// ***************
// * Utility functions
function setText(text) {
    messageText.innerHTML = text
}

function setEndedFromSilence(value) {

    endedFromSilence = value
}


//* Check if the user's microphone is available
async function checkMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (error) {
        return false;
    }
}

function startListener(text="", holdText=false) {
    /**
     * Toggles the appropriate elements that let the user
     * know that their microphone is being recorded
     * 
     * @param {str} text - Set the helper text. If not set, 
     * then it is reset to the starting text.
     * 
     * @param {bool} holdText - If set to true, the text
     * will stay as it is on the screen.
     */


    micIcon.classList.remove('fa-microphone-lines-slash');

    micIcon.classList.add("mic-active")

    micIcon.classList.add('fa-microphone-lines');
    
    // * If the button was disabled, re-enable it
    if (toggleButton.disabled) {
        toggleButton.disabled = false;
    }


    if (!holdText) {
        
        if (!text) {
            text = awake ? "Слушаю..." : `что хотите?`
        }
        messageText.innerHTML = text
    }

}

function stopListener(text="", holdText=false, temporary=false) {
    /**
     * Toggles the appropriate elements will let the user 
     * know that they're microphone is no longer being recorded.
     * 
     * @param {str} text - Set the helper text. If not set, 
     * then it is reset to the starting text.
     * 
     * @param {bool} temporary - If set to true, the toggle button
     * for the microhphone will be disabled. Use this whenever the 
     * program is waiting for a resposne from ChatGPT.
     */

    micIcon.classList.remove('fa-microphone-lines');
    micIcon.classList.remove('mic-active');
    micIcon.classList.add('fa-microphone-lines-slash');

    if (temporary) {
        toggleButton.disabled = true
    } 

    if (!holdText) {
        if (!text) {

            text = `Переключите микрофон и скажите`
        }
    
        messageText.innerHTML = text
    }

    // * If the button isn't disabled 
    if (!toggleButton.disabled && toggleButton.checked) {
        toggleButton.checked = false
    } 
}


// ******************************
// * Speech recognition functions
recognition.onstart = () => {
    console.log("recording...")
};

recognition.onresult = async (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }

    messageText.innerHTML = `<strong>You:</strong> ${interimTranscript}`
   
    if (finalTranscript.trim() !== "") {
        console.log("FINAL TRANSCRIPT: ", finalTranscript);
        eel.process_input(finalTranscript.trim())(function(response) {
            console.log("Ответ от агента:", response);
        });
    }

};

recognition.onend = () => {

    // * This event is also where we determine if the 

    if (toggleButton.checked) {

        if (toggleButton.disabled) {
            setEndedFromSilence(true);
            stopListener();
        }

        // * If the toggle button isn't disabled, and the button is checked
        // * Then the recognition turned off on its own. Turn the recognition back on.
        // * This ensures the recognition is constantly listening.
        else {
            console.log("Restarting listener...")
            recognition.start()
        }
    }

};

toggleButton.addEventListener('change', function () {
    if (this.checked) {
        // Пользователь включает микрофон
        if (checkMicrophone()) {
            startListener(); // визуальное оформление UI
            if (!isRecognizing) {
                recognition.start(); 
            }
        } else {
            alert('Микрофон недоступен или отказано в доступе.');
        }
    } else {
        // Пользователь выключает микрофон
        stopListener(); // визуальное оформление UI
        if (isRecognizing) {
            recognition.stop();
        }
    }
});

function processUserInput(userText) {
    const trigger = "обратись к gpt";
    const lowerText = userText.toLowerCase();
    if (lowerText.startsWith(trigger)) {
        // Извлекаем всё, что идёт после триггера, как единый запрос
        const query = userText.substring(trigger.length).trim();
        if (query.length > 0) {
            console.log(`Запрос для ChatGPT через браузер: ${query}`);
            // Вызываем функцию оркестратора через Eel
            eel.orchestrate_browser_chat(query)(function(result){
                console.log("Результат оркестрации:", result);
            });
        } else {
            console.log("Не указан текст запроса после 'обратись к gpt'.");
        }
    } else {
        console.log("Обычный запрос:", userText);
        // Вызываем обычное взаимодействие через Eel
        eel.handle_user_input(userText)(function(response) {
            console.log("Ответ от агента:", response);
        });
    }
}

function speakText(text) {
    if (!text || text.trim() === "") {
        console.warn("Пустая строка для озвучки. Пропускаем.");
        return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[^a-zA-Zа-яА-Я0-9 .,!?]/g, ""));
    utterance.lang = "ru-RU";

    function setVoice() {
        const voices = synth.getVoices();
        let selectedVoice = voices.find(voice => voice.name.includes("Dmitry"));

        if (!selectedVoice) {
            selectedVoice = voices.find(voice => voice.name.includes("ru-RU-SvetlanaNeural"));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`Используется голос: ${selectedVoice.name}`);
        } else {
            console.warn("Голос Dmitry и Svetlana не найден. Используется стандартный голос.");
        }

        synth.speak(utterance);
    }

    if (synth.getVoices().length > 0) {
        setVoice();
    } else {
        synth.onvoiceschanged = setVoice;
    }
}



// * Main function that handles the user input
async function handleInput(text = "") {
    /**
     * Handles the user input by sending it to python
     * to generate a ChatGPT response.
     * 
     * @param {str} text - The user input
     */

    console.log("WHATS BEING SENT: ", text)

    if (!awake) {
        if (text.toLowerCase().includes("Адам")) {
            awake = true
        }
        else {
            startListener("", false)
        }

    }

    if (awake) {

        // * If awake, send the input to chatGPT and wait for a response
        recognition.stop()
    
        stopListener("Waiting for response...", false, true);
    
        let gptResponse = await eel.generate_gpt_response(text)()
        gptResponse = JSON.parse(gptResponse)

        let gptStatus = gptResponse["status"]
        console.log(gptResponse)

        if (gptStatus === 200) {
            let gptMessage = gptResponse["gptMessage"]
    
            let gptSleep = gptResponse["go_to_sleep"]
            
            // * Code for if the user needs no more assistance.
            awake = gptSleep ? false : true
        
            // * Get the audio and start playing it.
            // * Then set the corresponding text.
            startAudio()
        
            let htmlMessage = `<strong>Stella:</strong> ${gptMessage}`
        
            setText(htmlMessage)
        }
        else {
            setText(gptResponse["statusMessage"])

            startListener("", true)
            recognition.start()
        }


    }

}

// *****************************************
// * Canvas configuration
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');

// * Setting the intial size and color of the circle animation
const initialRadius = 50;

const initialColor = "rgb(194, 189, 255)";
const listeningColor = "rgb(134, 225, 255)";

let listening = false;
let audioPlaying = false;

initializeCircle(initialColor, initialRadius);

function initializeCircle(initialColor, initialRadius) {
    /**
     * * This creates the circle that is the focus of the animation.
     * * It then starts the idle animation (pulsate)
     */
    // Draw the initial glowing ball
    ctx.beginPath();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const gradient = ctx.createRadialGradient(centerX, centerY, initialRadius / 2, centerX, centerY, initialRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(1, initialColor);
    ctx.fillStyle = gradient;
    ctx.arc(centerX, centerY, initialRadius, 0, Math.PI * 2);
    ctx.fill();

    pulsateAnimation()
}

// * Pulsating animation
function pulsateAnimation() {
    /**
     * * This animation occurs whenever the audio is not playing.
     */

    if (!audioPlaying) {
        // Calculate the pulsation radius based on a sine wave
        const baseRadius = 50; // Initial radius
        const pulsationAmplitude = 2.5; // Amplitude of the pulsation
        const pulsationFrequency = 1.25; // Frequency of the pulsation (in Hz)

        const pulsationPhase = Date.now() * 0.001 * pulsationFrequency; // Phase based on time
        const pulsatingRadius = baseRadius + pulsationAmplitude * Math.sin(pulsationPhase);

        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the pulsating ball
        ctx.beginPath();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gradient = ctx.createRadialGradient(centerX, centerY, pulsatingRadius / 2, centerX, centerY, pulsatingRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, awake ? listeningColor : initialColor); // Use the same initial color
        ctx.fillStyle = gradient;
        ctx.arc(centerX, centerY, pulsatingRadius, 0, Math.PI * 2);
        ctx.fill();

        // Call the function recursively for the pulsating effect

        requestAnimationFrame(() => pulsateAnimation());
    }
}
// *****************************************

// * Инициализация переменных анализа аудио
let audioContext = null;
let analyser = null;
let dataArray = null;

let audio = null

async function startAudio()  {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }


    // * Retrieve the audio from this local route.
    const response = await fetch('http://localhost:5000/audio')

    const audioBlob = await response.blob()

    const newAudio = new Audio(URL.createObjectURL(audioBlob));

    // * Configuring the audio context and audio analyzer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaElementSource(newAudio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // * Copy the byte frequency data to our intialized Uint8Array (dataArray)
    // analyser.getByteFrequencyData(dataArray)

    audio = newAudio
    await audio.play();

    // Set audioPlaying flag to true
    audioPlaying = true;
    
    audio.addEventListener('ended', async () => {
        // Set audioPlaying flag to false when audio playback ends
        audioPlaying = false;
        startListener("", true)
        recognition.start()
    });
    
    animate(analyser, dataArray);


};

// ************************
// * Main vocal animation
function animate(analyser, dataArray, prevRadius = null) {

    if (audioPlaying) {
        analyser.getByteFrequencyData(dataArray);
    
        // * Calculate the average frequency
        const averageFrequency = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    
        // * Calculate the ball radius based on the average frequency (with a larger range)
        const minRadius = 50;
        const maxRadius = 125;
        const radius = minRadius + (maxRadius - minRadius) * (averageFrequency / 255);

        // * Inside the animate function
        const blueRGB = [134, 225, 255]; // RGB values for pink hue
        const purpleRGB = [255, 190, 242]; // RGB values for purple hue

        // * Calculate the RGB values based on audio frequency using pink and purple hues
        const red = Math.round(blueRGB[0] + (purpleRGB[0] - blueRGB[0]) * (averageFrequency / 255));
        const green = Math.round(blueRGB[1] + (purpleRGB[1] - blueRGB[1]) * (averageFrequency / 255));
        const blue = Math.round(blueRGB[2] + (purpleRGB[2] - blueRGB[2]) * (averageFrequency / 255));

        // Create the RGB color string
        const color = `rgb(${red}, ${green}, ${blue})`;
    
        // Clear the canvas with a transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Draw the glowing ball
        ctx.beginPath();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gradient = ctx.createRadialGradient(centerX, centerY, radius / 2, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, color);
        ctx.fillStyle = gradient;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    
        // Call the animate function recursively
        const prevRadius = radius
        requestAnimationFrame(() => animate(analyser, dataArray, prevRadius));
    }

    else {

        pulsateAnimation()

    }
}


const chatContainer = document.getElementById("chat");

// Функция для добавления сообщений в чат
function addMessageToChat(role, message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add(role === "user" ? "user-message" : "assistant-message");
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Прокрутка вниз
}

// Основная обработка ввода
async function handleInput(text = "") {
    // Добавляем сообщение пользователя в чат
    addMessageToChat("user", text);

    // Останавливаем распознавание, чтобы ждать ответа
    recognition.stop();
    stopListener("печатаю...");

    // Отправляем запрос в GPT через Python
    let gptResponse = await eel.generate_gpt_response(text)();
    gptResponse = JSON.parse(gptResponse);

    // Проверяем статус и добавляем сообщение GPT в чат
    if (gptResponse.status === 200) {
        addMessageToChat("assistant", gptResponse.gptMessage);
        async function playAudio() {
            try {
                const response = await fetch('http://localhost:5000/audio', { cache: "no-store" });
        
                if (!response.ok) {
                    console.error("Ошибка при получении аудиофайла");
                    return;
                }
        
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.play().then(() => {
                    console.log("Аудио запущено");
                }).catch(error => {
                    console.error("Ошибка воспроизведения аудио:", error);
                    alert("Браузер заблокировал автозапуск звука. Кликните для воспроизведения.");
                    document.addEventListener("click", () => audio.play(), { once: true });
                });
        
            } catch (error) {
                console.error("Ошибка при загрузке аудиофайла:", error);
            }
        }
}

    // Возобновляем распознавание
    startListener();
}
function executeCommand(command) {
    switch (command) {
        case "go_back":
            history.back();
            break;
        case "go_forward":
            history.forward();
            break;
        case "scroll_up":
            window.scrollBy(0, -window.innerHeight);
            break;
        case "scroll_down":
            window.scrollBy(0, window.innerHeight);
            break;
    }
}

