FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY app/ ./app/
COPY run.py .

EXPOSE 8000

CMD ["python", "run.py"]
