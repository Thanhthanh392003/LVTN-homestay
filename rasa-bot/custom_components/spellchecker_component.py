from spellchecker import SpellChecker
from rasa.shared.nlu.training_data.message import Message
from rasa.shared.nlu.constants import TEXT

from rasa.engine.graph import GraphComponent, ExecutionContext
from rasa.engine.storage.resource import Resource
from rasa.engine.storage.storage import ModelStorage
from rasa.engine.recipes.default_recipe import DefaultV1Recipe

from typing import Any, Dict


# ---- ĐÚNG CÚ PHÁP CHO VERSION RASA CỦA BẠN ----
@DefaultV1Recipe.register(
    component_types=["nlu"],   # hoặc ["NLU"], tùy version (2 dạng đều chạy)
    is_trainable=False
)
class VietnameseSpellChecker(GraphComponent):

    @staticmethod
    def get_default_config() -> Dict[str, Any]:
        return {}

    def __init__(self, config, model_storage: ModelStorage, resource: Resource,
                 execution_context: ExecutionContext):
        self.spell = SpellChecker(language=None)
        self.spell.word_frequency.load_text_file(
            "custom_components/vietnamese_words.txt"
        )

    @classmethod
    def create(cls, config, model_storage: ModelStorage, resource: Resource,
               execution_context: ExecutionContext):
        return cls(config, model_storage, resource, execution_context)

    def process(self, message: Message, **kwargs: Any) -> None:
        text = message.get(TEXT)
        if not text:
            return
        corrected = " ".join(self.spell.correction(w) for w in text.split())
        message.set(TEXT, corrected)
