FROM python:3.12-slim

WORKDIR /app

# Copia primeiro apenas o requirements.txt
COPY ./requirements.txt /app/requirements.txt

# Instala dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante dos arquivos
COPY . .

CMD ["python", "consumer.py"]