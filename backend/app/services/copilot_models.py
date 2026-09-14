"""
Registry of Ollama chat models selectable for the KijaniAI Copilot.

Admins choose the active model via PUT /api/admin/copilot-model; the choice is
persisted in SystemSetting (key="copilot_model") and read by the Copilot chat
endpoint (app.routers.copilot) on every request.
"""

AVAILABLE_COPILOT_MODELS = [
    {
        "id": "llama3.3",
        "label": "Llama 3.3",
        "description": "Meta Llama 3.3 (70B) - balanced default for bilingual agronomic assistance."
    },
    {
        "id": "llama4",
        "label": "Llama 4",
        "description": "Meta Llama 4 Scout - latest-generation multimodal mixture-of-experts model."
    },
    {
        "id": "gemma2:2b",
        "label": "Gemma 2 (2B)",
        "description": "Compact Google Gemma model - fastest option on CPU-only deployments."
    },
]

DEFAULT_COPILOT_MODEL = "llama3.3"
