# Training your own MoSim script model

The Scripts page can export your script library as a JSONL fine-tuning dataset.
This guide walks through training a small coding model on that dataset and loading
it into Ollama so you can use it inside the app (select "Local model via Ollama"
in the AI panel).

## 1 — Export the dataset

1. Open the app, go to **Scripts**.
2. Fill in a description for every script (the description becomes the "prompt"
   half of each training pair — better descriptions = better fine-tunes).
3. Click **Export training dataset (JSONL)** → downloads `mosim-scripts-dataset.jsonl`.

Each line in that file looks like:

```json
{"messages":[
  {"role":"system","content":"You are a MoSim robot modding assistant..."},
  {"role":"user","content":"Write a MoSim robot script for team 9496 Lynk...\n\nGenerate the complete robot script now."},
  {"role":"assistant","content":"```csharp\n...\n```"}
]}
```

You need at least ~20–50 diverse scripts for a fine-tune to pick up style; under
that, few-shot prompting (feeding scripts as examples) works better than training.

---

## 2 — Pick a base model

Fine-tune a **coding-focused 7B model** — they fit in 16 GB VRAM at 4-bit precision
and produce good C# output:

| Model                  | HuggingFace ID                          | Notes                    |
|------------------------|-----------------------------------------|--------------------------|
| Qwen2.5-Coder-7B-Instruct | `Qwen/Qwen2.5-Coder-7B-Instruct`   | Best C# quality          |
| DeepSeek-Coder-V2-Lite | `deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct` | Strong reasoning    |
| CodeLlama-7B-Instruct  | `codellama/CodeLlama-7b-Instruct-hf`   | Widely tested            |

---

## 3 — Fine-tune (choose one path)

### Path A — Cloud (easiest, free tier available)

**Google Colab** (free T4/A100) or **RunPod** (~$0.50/hr for an A100):

1. Open a new notebook and install deps:

```python
!pip install unsloth transformers datasets trl
```

2. Load the base model with Unsloth (QLoRA — fits in 16 GB):

```python
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="Qwen/Qwen2.5-Coder-7B-Instruct",
    max_seq_length=4096,
    load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(
    model,
    r=16, lora_alpha=16,
    target_modules=["q_proj","k_proj","v_proj","o_proj",
                    "gate_proj","up_proj","down_proj"],
)
```

3. Load your JSONL (upload it to Colab first):

```python
from datasets import load_dataset
ds = load_dataset("json", data_files="mosim-scripts-dataset.jsonl", split="train")
```

4. Train:

```python
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=ds,
    dataset_text_field="messages",   # Unsloth handles chat templates
    max_seq_length=4096,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=True,
        output_dir="mosim-coder-lora",
    ),
)
trainer.train()
```

5. Save a merged model in GGUF format for Ollama:

```python
# Merge LoRA weights back into the base model
model.save_pretrained_merged("mosim-coder-merged", tokenizer)

# Export as GGUF (Q4_K_M quantization — good quality/size trade-off)
model.save_pretrained_gguf("mosim-coder-gguf", tokenizer, quantization_method="q4_k_m")
# This writes mosim-coder-gguf/mosim-coder-q4_k_m.gguf
```

Download that `.gguf` file to your machine.

---

### Path B — Local on Windows (AMD RX 9070 XT)

Your GPU has 16 GB GDDR6 (RDNA 4). AMD ROCm support on Windows is improving but
is still behind Linux. The most reliable local path right now:

**Option B1 — WSL2 + ROCm (recommended for AMD fine-tuning)**

WSL2 gives you a full Linux environment with GPU passthrough:

```powershell
# Install WSL2 if you haven't already
wsl --install
# Inside WSL2 (Ubuntu 22.04):
```

```bash
# Install ROCm (check https://rocm.docs.amd.com for the latest version)
wget https://repo.radeon.com/amdgpu-install/latest/ubuntu/jammy/amdgpu-install_*.deb
sudo apt install ./amdgpu-install_*.deb
sudo amdgpu-install --usecase=rocm

# Verify your GPU is detected
rocm-smi

# Install Python deps inside WSL2
pip install unsloth torch torchvision --extra-index-url https://download.pytorch.org/whl/rocm6.2
```

Then follow the same training code from Path A, running it inside WSL2.

**Option B2 — llama.cpp with ROCm (inference + small fine-tunes)**

If you just want to run a model (not fine-tune), llama.cpp works well:

```powershell
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
cmake -B build -DGGML_HIPBLAS=ON   # ROCm HIP backend
cmake --build build --config Release -j
```

**Option B3 — Axolotl on Windows (DirectML, no ROCm needed)**

Axolotl + DirectML lets you fine-tune on AMD without ROCm:

```powershell
pip install axolotl[directml]
```

Create `axolotl-config.yaml`:

```yaml
base_model: Qwen/Qwen2.5-Coder-7B-Instruct
model_type: AutoModelForCausalLM
tokenizer_type: AutoTokenizer

datasets:
  - path: mosim-scripts-dataset.jsonl
    type: chat_template

load_in_4bit: true
adapter: lora
lora_r: 16
lora_alpha: 16

sequence_len: 4096
num_epochs: 3
learning_rate: 0.0002
output_dir: ./mosim-coder-lora
```

```powershell
axolotl train axolotl-config.yaml
```

---

## 4 — Import into Ollama

Once you have the `.gguf` file:

```bash
# Install Ollama from https://ollama.com if you haven't
# Create a Modelfile
cat > Modelfile << 'EOF'
FROM ./mosim-coder-q4_k_m.gguf

SYSTEM """You are a MoSim robot modding assistant. You write C# robot scripts
using the MoSim Unity API (ReefscapeRobotBase, GenericJoint, GenericElevator,
game piece controllers). Follow the structure of the example scripts in the
conversation. Always output a complete, compilable script."""

PARAMETER temperature 0.3
PARAMETER num_ctx 8192
EOF

# Create the model
ollama create mosim-coder -f Modelfile

# Test it
ollama run mosim-coder "Write a simple swerve robot with a 2-stage elevator"
```

## 5 — Use it in the app

1. Make sure Ollama is running (`ollama serve` or it starts automatically).
2. In the app's AI Script Generator panel, set **Provider** to "Local model via Ollama".
3. **Ollama URL**: `http://localhost:11434` (default).
4. **Model name**: `mosim-coder`.
5. Generate — no API key, no internet, no cost per request.

---

## Tips

- **More data > more epochs**: 3 epochs on 50 scripts beats 10 epochs on 10 scripts.
- **Description quality matters**: vague descriptions ("elevator robot") give vague
  results. Specific ones ("2-stage cascade elevator, wrist coral EE, ground algae
  pivot intake, deep climb winch, L4 back-off before placing") teach the model
  what vocabulary maps to which mechanisms.
- **Quantization**: Q4_K_M is the best quality-per-GB. If you want a smaller file
  at some quality cost, use Q3_K_M; for highest quality use Q5_K_M (~5 GB).
- **LoRA rank**: `r=16` is a good default. Increase to `r=32` if you have 40+
  scripts and want the adapter to absorb more domain knowledge.
