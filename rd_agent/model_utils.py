import os
from huggingface_hub import snapshot_download


def ensure_model(model_id: str, local_dir: str):
    """Download model locally if not already present."""
    if not os.path.exists(local_dir) or not os.listdir(local_dir):
        snapshot_download(model_id, local_dir=local_dir, local_files_only=False)
