# integrations/browser_chat.py
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def send_query_to_chatgpt(query: str) -> str:
    chrome_options = Options()
    # Подключаемся к уже запущенному браузеру с удалённой отладкой
    chrome_options.debugger_address = "127.0.0.1:9222"
    chrome_options.add_argument("--start-maximized")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Открываем новую вкладку с нужным URL
        driver.execute_script("window.open('https://chatgpt.com/', '_blank');")
        # Переключаемся на новую вкладку
        driver.switch_to.window(driver.window_handles[-1])
        
        print("Открываем https://chatgpt.com/ в новой вкладке...")
        driver.get("https://chatgpt.com/")
        
        # Даем странице время загрузиться
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Используем поиск по ID для contenteditable элемента:
        input_box = WebDriverWait(driver, 90).until(
            EC.element_to_be_clickable((By.ID, "prompt-textarea"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true); arguments[0].focus();", input_box);
        try:
            driver.execute_script("arguments[0].click();", input_box);
        except Exception as click_error:
            print("Не удалось кликнуть через JS:", click_error);
        time.sleep(1);

        # Прокручиваем элемент в видимую область и устанавливаем фокус через JS
        driver.execute_script("arguments[0].scrollIntoView(true); arguments[0].focus();", input_box)
        try:
            driver.execute_script("arguments[0].click();", input_box)
        except Exception as click_error:
            print("Не удалось кликнуть через JS:", click_error)
            
        time.sleep(1)

        # Очищаем содержимое. Для div с contenteditable можно использовать JS для очистки:
        driver.execute_script("arguments[0].innerHTML = '';", input_box)

        # Вводим запрос. Для contenteditable div можно использовать send_keys, как обычно:
        input_box.send_keys(query)
        input_box.send_keys(Keys.RETURN)
        
        print("Ожидаем появления ответа...")
        answer_element = WebDriverWait(driver, 90).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".flex.flex-col.gap-3"))
        )
        
        messages = driver.find_elements(By.CSS_SELECTOR, ".flex.flex-col.gap-3")
        answer_text = messages[-1].text if messages else "Ответ не найден."
        print("Получен ответ:", answer_text)
        return answer_text
    except Exception as e:
        print("Ошибка при получении ответа:", e)
        return f"Ошибка: {str(e)}"
    finally:
        driver.quit()

if __name__ == "__main__":
    result = send_query_to_chatgpt("Расскажи о Казахстане")
    print("Ответ от ChatGPT:", result)
