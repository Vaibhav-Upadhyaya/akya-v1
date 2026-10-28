import os
import time
from chatbots import *


def clean_generated_code(raw_code):
    return extract_code_LLM(raw_code).replace("`", "").replace("python", "").strip()


def resolve_step_limit(configured_limit):
    if configured_limit is None:
        return None

    normalized_limit = str(configured_limit).strip()
    if not normalized_limit:
        return None

    try:
        parsed_limit = int(normalized_limit)
    except (TypeError, ValueError):
        return None

    return parsed_limit if parsed_limit > 0 else None


def systemAutomation(task=None, max_steps=None):
    task_text = str(task or "").strip()
    if not task_text:
        task_text = input("Task : ").strip()

    if not task_text:
        return "No task provided."

    configured_limit = max_steps if max_steps is not None else os.environ.get("AKYA_SYSTEM_MAX_STEPS")
    step_limit = resolve_step_limit(configured_limit)
    step_index = 0

    while step_limit is None or step_index < step_limit:
        current_step = str(step(task=task_text)).strip()
        if current_step:
            print(current_step)

        current_step_lower = current_step.lower()
        if "action: done" in current_step_lower:
            completion_message = "System automation task completed successfully."
            print(completion_message)
            return completion_message

        if "action: wait" in current_step_lower:
            wait_message = "System automation paused because no safe next step was visible."
            print(wait_message)

        define = str(uiDecisionMaker(task_text, current_step)).strip()
        if define:
            print(define)

        code = ""

        try:
            if "open app" in define:
                raw_code = openApplication(current_step)
            elif "hotkey" in define:
                raw_code = hotkey(current_step)
            elif "click" in define:
                raw_code = webClicker(current_step)
            elif "field" in define:
                raw_code = nget_step(task_text, current_step)
            else:
                unsupported_message = "No supported UI automation route was returned."
                print(unsupported_message)
                return unsupported_message

            code = clean_generated_code(str(raw_code))
            if not code:
                empty_code_message = "No executable automation code was generated."
                print(empty_code_message)
                return empty_code_message

            print(code)
            exec(compile(code, "<akya-generated>", "exec"), {})
        except Exception as error:
            if not code:
                raise

            raw_fixed_code = codeErrorFixer(code, str(error))
            fixed_code = clean_generated_code(str(raw_fixed_code))
            if not fixed_code:
                raise

            print(fixed_code)
            exec(compile(fixed_code, "<akya-generated-fixed>", "exec"), {})

        step_index += 1
        if step_limit is None or step_index < step_limit:
            time.sleep(1)

    limit_message = f"Reached the UI automation step limit ({step_limit}) before completion."
    print(limit_message)
    return limit_message
