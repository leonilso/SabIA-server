FROM node:20-slim

# ─────────────────────────────────────
# Sistema
# ─────────────────────────────────────
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    libzbar0 \
    && rm -rf /var/lib/apt/lists/*

# ─────────────────────────────────────
# Python (venv isolado)
# ─────────────────────────────────────
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir \
    opencv-python \
    numpy \
    pyzbar \
    Pillow 

# ─────────────────────────────────────
# Node
# ─────────────────────────────────────
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# ─────────────────────────────────────
# Runtime
# ─────────────────────────────────────
EXPOSE 3000

CMD ["node", "server.js"]
