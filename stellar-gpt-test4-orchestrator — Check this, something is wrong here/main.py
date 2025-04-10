
import elevenlabs as eleven
import openai
import json
import eel
import os
import webbrowser
from typing import Dict, Any
from dotenv import load_dotenv
from core.agent import async_chat_completion  # Вспомогательная функция для стандартного запроса
from integrations.orchestrator import orchestrate_browser_chat  # Функция оркестратора для браузерного запроса

# * Custom python files
from commands import *
from commands.commands_as_json import *
from spotify_player import Spotify_Player   
from core.conversation import Conversation
from utils.tts import generate_audio
import asyncio

import keyboard
import threading
from commands.commands import go_back, go_forward, scroll_up, scroll_down, open_website, open_ekyzmet, search_web, get_news, get_weather, click_button, switch_tab_by_number, refresh_page, clear_cache, clear_cache_and_cookies, play_pause_media
# *******************************
from concurrent.futures import ThreadPoolExecutor
# * Environment variables
executor = ThreadPoolExecutor(max_workers=1)

load_dotenv( dotenv_path='.evn')

# * Set the following variables in your .env file.
OPENAI_API_KEY: str = os.getenv("")

ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY")

# * Setting the API Keys
openai.api_key = ''
eleven.set_api_key(ELEVENLABS_API_KEY if ELEVENLABS_API_KEY else "")

from commands import commands as cmd_functions
from commands.commands_as_json import commands  # это список описаний команд
available_commands = {}
for command in commands:
    command_name = command["name"]
    try:
        # Получаем функцию из модуля cmd_functions по имени
        available_commands[command_name] = getattr(cmd_functions, command_name)
    except AttributeError:
        print(f"Команда {command_name} не найдена в модуле commands.")




def listen_capslock():
    """
    Глобально отслеживает нажатие CapsLock и отправляет сигнал в JavaScript,
    даже если окно программы свернуто.
    """
    def toggle_microphone():
        print("🎤 CapsLock нажат — отправляем сигнал в JavaScript")
        eel.toggle_microphone()()  # Отправляем сигнал в браузер

    keyboard.add_hotkey("caps lock", toggle_microphone)  # ✅ Теперь работает всегда

# ✅ Запускаем обработчик CapsLock в отдельном потоке
capslock_thread = threading.Thread(target=listen_capslock, daemon=True)
capslock_thread.start()




# *******************************
# * Utility functions
def extract_args(args: dict) -> list:
    """
    Extracts the arguments from ChatGPT's response when
    it wants to call a function.
    """
    args_to_call = []
    for arg in args: 
        args_to_call.append(args.get(arg))
    
    return args_to_call

# *******************************
# * ElevenLabs Voice Setup

def get_voices():
    """
    Use this to view the list of voices that can be used
    for text-to-speech.
    """
    return eleven.voices()  


# * The following Voice ID is for my preferred voice --> Caroline
# * You can view all the voices available to you with this link, 
# * then set the ID of the voice you want:
# https://api.elevenlabs.io/docs#/voices/Get_voices_v1_voices_get
VOICE_ID : str = "XrExE9yKIg1WjnnlVkGX"

try:
    voices = get_voices()

    main_voice = list(filter(lambda voice: voice.voice_id == VOICE_ID, voices))

    # * If my voice isn't available to you, then a default voice is selected.
    if len(main_voice) > 0:
        main_voice = main_voice[0]
    else:
        main_voice = list(filter(lambda voice: voice.name.lower() == "matilda", voices))[0]
except:
    main_voice = None
# *******************************

#available_commands = {}

#for command in commands:

    # * eval() converts a string type into a function
#    command_name = command["name"]
#    available_commands[command_name] = eval(command_name)

# *******************************
import asyncio
import json
import eel
from core.agent import async_chat_completion

@eel.expose
def generate_gpt_response(text: str) -> str:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(async_chat_completion(text))
    except Exception as e:
        print("Ошибка в generate_gpt_response:", e)
        return json.dumps({"status": 500, "statusMessage": str(e)})
    finally:
        loop.close()
    return json.dumps(result)

def handle_user_input(user_text: str) -> str:
    trigger = "обратись к gpt"
    if user_text.lower().startswith(trigger):
        # Извлекаем всё, что идет после триггера, как единый запрос
        query = user_text[len(trigger):].strip()
        if query:
            print(f"Обнаружен триггер, запрос для браузерного чата: {query}")
            result = orchestrate_browser_chat(query)
            print("Результат оркестрации:", result)
            # Возвращаем сообщение о том, что запрос обработан через браузер
            return "Запрос выполнен через браузер."
        else:
            print("Не указан текст запроса после 'обратись к gpt'.")
            return "Ошибка: не указан запрос после 'обратись к gpt'."
    else:
        print("Обычный запрос:", user_text)
        # Для обычного запроса вызываем функцию generate_gpt_response
        return generate_gpt_response(user_text)

# Eel-экспонируем новую функцию обработки пользовательского ввода
@eel.expose
def process_input(text: str) -> str:
    return handle_user_input(text)

def main():
    eel.init('ui')
    eel.start('main.html')

if __name__ == '__main__':
    main()