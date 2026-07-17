# Training your own MoSim script model

Fine-tune a coding model on your own robot scripts so the AI generator produces
code that matches your style, uses the exact MoSim API calls you know work, and
doesn't make up hallucinated methods.

**Goal:** A 7B model fine-tuned on your library that runs locally in Ollama,
free, offline, faster than the Claude API, and tuned to your exact codebase.

---

## How it works

The Scripts page exports a JSONL file where each line is:
```json
{
  "messages": [
    {"role": "system",  "content": "<MoSim scripting instructions>"},
    {"role": "user",    "content": "Write a robot script for team 9496 Lynk... Generate the complete robot script now."},
    {"role": "assistant","content": "```csharp\nusing UnityEngine;\n...```"}
  ]
}
```

You fine-tune a base coding model on these pairs. The model learns:
- Which C# patterns, class names, and method signatures are real MoSim API
- Your naming conventions, code structure, and setpoint organization
- How you describe mechanisms → which code patterns to generate

---

## Part 1 — Build a good dataset

This is the most important step. A small high-quality dataset beats a large
mediocre one every time.

### Minimum viable

- **20+ complete scripts** covering different robot architectures (elevator only,
  elevator + pivot, double-jointed arm, climber, etc.)
- **Every script needs a description** — this is the "prompt" half of the training
  pair. Go to the Scripts page and fill in the description box for every script
  before exporting.

### What makes a good description

Bad (too vague):
> 2025 robot with elevator

Good (specific mechanisms and scoring behavior):
> 2-stage cascade elevator (max 78"), wrist coral end effector on a pivot joint,
> ground-level algae pivot intake, deep cage climb with a motorized winch. Scores
> L4 coral with a back-off-then-drop sequence. Algae stows at angle 15. Elevator
> height constants: L1=18, L2=28, L3=44, L4=78. Auto-align enabled for L3/L4.

The more specific, the better the model learns the mapping between mechanism
descriptions and code patterns.

### Export the dataset

1. Scripts page → fill all descriptions → **Export training dataset (JSONL)**
2. Save the downloaded `mosim-scripts-dataset.jsonl` somewhere you can find it.

### Augmenting small datasets

If you have fewer than 20 scripts, you can augment:
- **Rephrase descriptions:** duplicate a row in the JSONL, reword the user message
  differently. The same script with a different prompt description teaches the model
  to recognize different phrasings.
- **Partial scripts:** include "skeleton" scripts that only do one mechanism — the
  model learns individual building blocks.
- **Add the MoSim example scripts** from the public mod repos as additional training
  examples (write descriptions for them too).

---

## Part 2 — Choose a base model

Fine-tune one of these. They all run in 16 GB VRAM at 4-bit precision:

| Model | HuggingFace ID | C# quality | Context |
|-------|---------------|------------|---------|
| **Qwen2.5-Coder-7B-Instruct** | `Qwen/Qwen2.5-Coder-7B-Instruct` | ⭐⭐⭐⭐⭐ | 128K |
| DeepSeek-Coder-V2-Lite-Instruct | `deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct` | ⭐⭐⭐⭐⭐ | 16K |
| Qwen2.5-Coder-14B-Instruct | `Qwen/Qwen2.5-Coder-14B-Instruct` | ⭐⭐⭐⭐⭐ | 128K |

**Recommendation: start with Qwen2.5-Coder-7B-Instruct.** Best C# output, huge
context window (fits many example scripts), and well-supported by Unsloth.
If results aren't good enough after fine-tuning, step up to the 14B — it needs
~12 GB at 4-bit, which fits your 16 GB GPU.

---

## Part 3 — Training environment

You have an AMD RX 9070 XT (16 GB GDDR6, RDNA 4). You have two paths:

### Path A — WSL2 + ROCm (local, free, recommended for AMD)

ROCm 6.3+ added full RDNA 4 support. This runs on your existing hardware.

**Step 1: Set up WSL2** (if you haven't already)

In PowerShell as admin:
```powershell
wsl --install
# Restart when prompted, then Ubuntu opens automatically
# Create a username and password
```

**Step 2: Install ROCm inside WSL2**

```bash
# Update Ubuntu
sudo apt update && sudo apt upgrade -y

# Add the AMD ROCm repo (check https://rocm.docs.amd.com for latest version)
wget https://repo.radeon.com/amdgpu-install/6.3/ubuntu/noble/amdgpu-install_6.3.60300-1_all.deb
sudo apt install ./amdgpu-install_6.3.60300-1_all.deb
sudo amdgpu-install --usecase=rocm --no-dkms   # --no-dkms = WSL2 doesn't need kernel drivers

# Add yourself to the render group so you can use the GPU without sudo
sudo usermod -aG render,video $USER
newgrp render

# Verify GPU is visible
rocm-smi
# Should show your RX 9070 XT with memory usage
```

**Step 3: Install Python packages in WSL2**

```bash
# Install pip if not already there
sudo apt install python3-pip python3-venv -y

# Create a virtualenv (keeps your install clean)
python3 -m venv ~/mosim-train
source ~/mosim-train/bin/activate

# Install PyTorch with ROCm backend
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.2

# Verify GPU is usable
python3 -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
# Should print: True, AMD Radeon RX 9070 XT

# Install Unsloth (handles efficient fine-tuning; ROCm fork)
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes
```

**Step 4: Copy your dataset into WSL2**

WSL2 can access your Windows files at `/mnt/c/Users/Seb/`:
```bash
cp /mnt/c/Users/Seb/Downloads/mosim-scripts-dataset.jsonl ~/mosim-scripts-dataset.jsonl
```

---

### Path B — Google Colab (free, easiest, no local setup)

If WSL2/ROCm setup is painful, Colab gives you a free T4 (16 GB) or A100.

1. Go to [colab.research.google.com](https://colab.research.google.com)
2. Runtime → Change runtime type → **GPU** (T4 for free, A100 if you have Colab Pro)
3. Upload your `mosim-scripts-dataset.jsonl` using the file panel on the left

All the training code below works identically on Colab — just run it in cells.

---

### Path C — RunPod (paid, fast, A100/H100)

If you want to train the 14B model or want faster iteration:
- [runpod.io](https://runpod.io) → GPU Pods → PyTorch template
- A100 40GB: ~$1.40/hr (a full training run takes ~30 min = $0.70)
- H100: ~$3/hr (overkill for 7B fine-tuning)

---

## Part 4 — Fine-tune with Unsloth

This is the full training script. Run it in WSL2 (or Colab/RunPod):

```python
# train.py
# Run: python3 train.py
# Adjust the paths at the top if needed.

import json
from datasets import Dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer, DataCollatorForSeq2Seq
from transformers import TrainingArguments

# ── Config ────────────────────────────────────────────────────────────────
BASE_MODEL   = "Qwen/Qwen2.5-Coder-7B-Instruct"
DATASET_FILE = "mosim-scripts-dataset.jsonl"
OUTPUT_DIR   = "./mosim-coder-lora"
MERGED_DIR   = "./mosim-coder-merged"
GGUF_DIR     = "./mosim-coder-gguf"

MAX_SEQ_LEN  = 8192   # raise to 16384 if scripts are very long (needs more VRAM)
LORA_RANK    = 16     # 16 is the sweet spot; raise to 32 if you have 40+ scripts
EPOCHS       = 4      # 3–5 is usually right; more risks overfitting small datasets
BATCH_SIZE   = 2
GRAD_ACCUM   = 4      # effective batch = 2 * 4 = 8

# ── Load model ────────────────────────────────────────────────────────────
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name    = BASE_MODEL,
    max_seq_length = MAX_SEQ_LEN,
    dtype          = None,   # auto-detect (bfloat16 on modern GPUs)
    load_in_4bit   = True,   # QLoRA: quantize the frozen base weights to 4-bit
)

# Apply LoRA adapters (only these small weight matrices are trained)
model = FastLanguageModel.get_peft_model(
    model,
    r               = LORA_RANK,
    lora_alpha      = LORA_RANK,   # usually == r
    target_modules  = [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout    = 0,
    bias            = "none",
    use_gradient_checkpointing = "unsloth",  # saves ~30% VRAM
    random_state    = 42,
)

# ── Load and format dataset ───────────────────────────────────────────────
def load_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]

raw = load_jsonl(DATASET_FILE)

def format_example(example):
    # Apply the model's native chat template so the format matches what Ollama
    # and the app will send at inference time.
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
    )
    return {"text": text}

dataset = Dataset.from_list(raw).map(format_example)
print(f"Dataset: {len(dataset)} examples")
print("First example (truncated):")
print(dataset[0]["text"][:600])

# ── Train ─────────────────────────────────────────────────────────────────
trainer = SFTTrainer(
    model      = model,
    tokenizer  = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length     = MAX_SEQ_LEN,
    data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer),
    args = TrainingArguments(
        output_dir               = OUTPUT_DIR,
        per_device_train_batch_size = BATCH_SIZE,
        gradient_accumulation_steps = GRAD_ACCUM,
        num_train_epochs         = EPOCHS,
        learning_rate            = 2e-4,
        lr_scheduler_type        = "cosine",
        warmup_ratio             = 0.05,
        fp16                     = False,
        bf16                     = True,   # bfloat16 is more stable than fp16
        logging_steps            = 5,
        save_strategy            = "epoch",
        optim                    = "adamw_8bit",  # 8-bit Adam saves VRAM
        seed                     = 42,
        report_to                = "none",  # disable wandb
    ),
)

print("\nTraining...")
trainer.train()
trainer.save_model(OUTPUT_DIR)
print(f"LoRA adapter saved to {OUTPUT_DIR}")

# ── Export to GGUF for Ollama ──────────────────────────────────────────────
print("\nMerging LoRA into base model...")
model.save_pretrained_merged(MERGED_DIR, tokenizer, save_method="merged_16bit")

print("Exporting to GGUF (Q4_K_M quantization)...")
model.save_pretrained_gguf(GGUF_DIR, tokenizer, quantization_method="q4_k_m")

print(f"\nDone. GGUF file is in {GGUF_DIR}/")
print("Next step: import into Ollama (see Part 5 in TRAINING.md)")
```

Save as `train.py` in your WSL2 home directory, then:
```bash
source ~/mosim-train/bin/activate
python3 train.py
```

Training a 7B model on ~30 scripts for 4 epochs takes:
- AMD RX 9070 XT via WSL2/ROCm: ~20–40 minutes
- Colab T4: ~45–60 minutes
- Colab A100: ~10–15 minutes
- RunPod A100: ~10–15 minutes

You'll see loss numbers printed every 5 steps. Healthy loss curve:
- Starts around 2.0–3.0
- Drops quickly to 0.8–1.2 in the first epoch
- Continues slowly down to 0.3–0.7 by the final epoch
- If it goes below 0.2, you're overfitting — reduce epochs or increase dataset size

---

## Part 5 — Import into Ollama

Once training finishes, you have a `.gguf` file. On Windows (not WSL2):

**Install Ollama** if you haven't: [ollama.com/download](https://ollama.com/download)

Copy the GGUF from WSL2 to Windows:
```powershell
# In PowerShell — WSL2 files are at \\wsl$\Ubuntu\
Copy-Item "\\wsl$\Ubuntu\root\mosim-coder-gguf\unsloth.Q4_K_M.gguf" "$env:USERPROFILE\mosim-coder.gguf"
```

Create a Modelfile (save this as `Modelfile` in your home directory):
```
FROM C:\Users\Seb\mosim-coder.gguf

SYSTEM """You are an expert MoSim (FRC robot simulator, Unity/C#) mod script writer.
You write complete robot behavior scripts for MoSim robot mods using the real
MoSim APIs: ReefscapeRobotBase, GenericJoint, GenericElevator, PidConstants,
game piece controllers. Follow the structure and conventions of your training
examples. Output one complete compilable C# file in a ```csharp block, then
a short bullet list of inspector setup the script needs."""

PARAMETER temperature 0.25
PARAMETER num_ctx 8192
PARAMETER num_predict 4096
```

Create the model in Ollama:
```powershell
ollama create mosim-coder -f "$env:USERPROFILE\Modelfile"
```

Test it:
```powershell
ollama run mosim-coder "Write a robot script for a 2-stage elevator with a coral wrist and algae pivot intake"
```

---

## Part 6 — Use it in the app

1. Make sure Ollama is running (`ollama serve` or it starts automatically on Windows).
2. Open the app → any robot's page → **AI Script Generator** panel.
3. Set **Provider** to "Local model via Ollama".
4. **Ollama URL**: `http://localhost:11434`
5. **Model name**: `mosim-coder`
6. Fill in the robot description and click **Generate script**.

No API key, no cost, works offline.

---

## Part 7 — Evaluate and iterate

### Quick evaluation

After importing, test with robots you know:
```powershell
ollama run mosim-coder "Write a script for team 9496 Lynk: 2-stage cascade elevator max 78 inches, wrist coral end effector, ground pivot algae intake, deep winch climb. Setpoints: Stow, L1=18, L2=28, L3=44, L4=78, Processor=20, Barge=78. Back-off before L4 place."
```

Check the output for:
- ✅ Correct class name format (`namespace Prefabs.Reefscape.Robots...`)
- ✅ Extends `ReefscapeRobotBase`
- ✅ Uses `GenericElevator.SetTarget()` and `GenericJoint.SetTargetAngle()`
- ✅ Has a `FixedUpdate` switch on `CurrentSetpoint`
- ✅ Has `SetSetpoint()` and `UpdateSetpoints()` helpers
- ✅ Setpoint heights match what you described
- ❌ If it makes up method names like `elevator.GoTo()` → needs more training data

### If results aren't good enough

**Add more data** (biggest lever):
- Every new script you write, add it to the library with a detailed description
- Re-export the JSONL and retrain with the new data
- 50+ scripts with good descriptions usually produces excellent results

**Increase LoRA rank:**
```python
LORA_RANK = 32   # was 16
```

**Add more epochs** (carefully — watch for overfitting):
```python
EPOCHS = 5   # was 4
```

**Try the 14B model** if 7B consistently makes API errors:
```python
BASE_MODEL = "Qwen/Qwen2.5-Coder-14B-Instruct"
# Needs ~12 GB at 4-bit; fits in your 16 GB GPU but tight
# May need to reduce MAX_SEQ_LEN to 4096 to avoid OOM
```

**Better prompting at inference time**: The description you type in the app's AI
panel is the most direct lever. Specific mechanism descriptions → specific code.
The model learns from your training data, but the prompt at inference still guides it.

### Iterative workflow

The loop that actually makes the model good:

1. Generate a script with the current model
2. Use it in a real robot mod — fix the bugs Unity finds
3. Add the corrected final script to your library with a description
4. Re-export JSONL → retrain → reimport into Ollama
5. Repeat

After 3–4 cycles you'll have a model that produces scripts that compile on the
first try for common robot architectures.

---

## GGUF quantization options

The GGUF format quantizes the model to save disk and VRAM.
`Q4_K_M` is the default recommendation, but others are available:

| Quantization | File size | Quality | VRAM (7B) |
|-------------|-----------|---------|-----------|
| Q8_0 | ~7 GB | Best | ~8 GB |
| **Q4_K_M** | ~4.1 GB | Great | ~5 GB |
| Q3_K_M | ~3.1 GB | Good | ~4 GB |
| Q2_K | ~2.3 GB | Acceptable | ~3 GB |

To export multiple quantizations at once:
```python
for quant in ["q8_0", "q4_k_m", "q3_k_m"]:
    model.save_pretrained_gguf(f"./gguf-{quant}", tokenizer, quantization_method=quant)
```

---

## Using Claude API as a fallback

While you're building your training dataset, the Claude API in the app gives
excellent results right now with zero setup (just an API key). Typical cost:

- claude-sonnet-5: ~$0.01–0.05 per script
- claude-haiku-4-5: ~$0.001–0.005 per script (faster, cheaper, slightly weaker)

Use Claude to generate your first scripts, clean them up, add them to your
library with descriptions, then train your local model on those. The API pays
for itself by bootstrapping the training data.
